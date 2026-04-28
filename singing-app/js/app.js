/* ==========================================
   App Shell - Screen management, routing, glue
   ========================================== */

// ---- Global error monitoring ----
// Logs uncaught errors to Supabase so we can see crashes from real users.
window.onerror = function(msg, src, line, col, err) {
  try {
    const sb = typeof _getSupabase === 'function' ? _getSupabase() : null;
    if (sb) {
      sb.from('error_logs').insert({
        message: String(msg).slice(0, 500),
        source: String(src).slice(0, 200),
        line: line,
        col: col,
        stack: err?.stack ? String(err.stack).slice(0, 1000) : null,
        user_agent: navigator.userAgent.slice(0, 300),
        url: location.href.slice(0, 200),
        created_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {});
    }
  } catch (e) { /* don't recurse */ }
};
window.addEventListener('unhandledrejection', function(ev) {
  try {
    const sb = typeof _getSupabase === 'function' ? _getSupabase() : null;
    if (sb) {
      const reason = ev.reason;
      sb.from('error_logs').insert({
        message: (reason?.message || String(reason)).slice(0, 500),
        source: 'unhandledrejection',
        stack: reason?.stack ? String(reason.stack).slice(0, 1000) : null,
        user_agent: navigator.userAgent.slice(0, 300),
        url: location.href.slice(0, 200),
        created_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {});
    }
  } catch (e) {}
});

const App = {

  currentScreen: 'home',
  currentSong: null,
  warmupActive: false,
  _warmupUnsub: null,
  _warmupFrame: null,
  _searchQuery: '',

  // Stats (persisted in localStorage)
  stats: {
    sessions: 0,
    bestScore: 0,
    streak: 0,
    lastDate: null,
    songBests: {},
    karaoke: {},  // songId -> bool (true = strip vocals / karaoke mode on)
  },

  // Whether karaoke (vocal-strip) mode is enabled for a song.
  // Defaults to true for songs that declare `stripVocals: true`.
  isKaraokeOn(song) {
    if (!song || !song.stripVocals) return false;
    const stored = this.stats.karaoke && this.stats.karaoke[song.id];
    return stored === undefined ? true : !!stored;
  },

  toggleKaraoke(songId, ev) {
    if (ev) { ev.stopPropagation(); ev.preventDefault(); }
    const song = Songs.get(songId);
    if (!song || !song.stripVocals) return;
    const current = this.isKaraokeOn(song);

    // Turning karaoke ON → no warning needed, just apply.
    if (!current) {
      if (!this.stats.karaoke) this.stats.karaoke = {};
      this.stats.karaoke[songId] = true;
      this._saveStats();
      this._renderSongGrid(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
      return;
    }

    // Turning karaoke OFF → show warning modal before committing.
    // Original audio bleed makes pitch grading unreliable and scores won't
    // count toward rankings. User must confirm they understand this.
    this._pendingKaraokeOffSongId = songId;
    const modal = document.getElementById('original-audio-modal');
    if (modal) modal.classList.add('active');
  },

  confirmOriginalAudio() {
    const songId = this._pendingKaraokeOffSongId;
    this._pendingKaraokeOffSongId = null;
    document.getElementById('original-audio-modal')?.classList.remove('active');
    if (!songId) return;
    if (!this.stats.karaoke) this.stats.karaoke = {};
    this.stats.karaoke[songId] = false;
    this._saveStats();
    this._renderSongGrid(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
  },

  cancelOriginalAudio() {
    this._pendingKaraokeOffSongId = null;
    document.getElementById('original-audio-modal')?.classList.remove('active');
  },

  async init() {
    // Auth (Supabase) MUST init before anything reads stats.
    await Auth.init();
    this._loadStats();
    this._renderSongGrid();
    this._setupFilters();
    this._setupAuthScreen();
    this._updateProfileChip();
    this._updateHomeStats();
    Game.init('game-canvas');
    this._preloadAudioTracks();
    this._installAudioUnlock();

    // If not signed in, route to auth screen.
    if (!Auth.isSignedIn()) {
      this.showScreen('auth');
    }

    // If the URL carries ?vs=<id>, hydrate and route the sing-off.
    // Runs after auth so we can detect "viewing own challenge" correctly.
    try { await this._checkSingOffUrl(); } catch (e) { console.warn('sing-off url check failed', e); }

    // Close the profile menu on any outside click.
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('profile-menu');
      const chip = document.getElementById('profile-chip');
      if (!menu || !chip) return;
      if (menu.hidden) return;
      if (menu.contains(e.target) || chip.contains(e.target)) return;
      menu.hidden = true;
    });
  },

  // iOS Safari (and Chrome with autoplay restrictions) creates AudioContexts
  // in a "suspended" state until a user gesture. We register a persistent
  // pointerdown/touchend handler that resumes both contexts on every gesture.
  // Without this, the backing track plays silently and pitch detection never
  // starts — and if we only run it once the context can auto-suspend between
  // songs (browsers suspend after ~30 s of silence), silencing the second play.
  _installAudioUnlock() {
    const unlock = () => {
      try {
        if (PitchDetector.audioContext && PitchDetector.audioContext.state !== 'running') {
          PitchDetector.audioContext.resume();
        }
      } catch (e) {}
      try {
        if (Synth.ctx && Synth.ctx.state !== 'running') {
          Synth.ctx.resume();
        }
      } catch (e) {}
    };
    // Cover both mouse and touch. Run on capture phase so it fires before
    // any click handler tries to play audio.
    // NOT { once: true } — browsers can auto-suspend AudioContext between
    // songs and we need to re-resume on every user interaction.
    const opts = { capture: true };
    document.addEventListener('pointerdown', unlock, opts);
    document.addEventListener('touchend', unlock, opts);
    document.addEventListener('keydown', unlock, opts);
  },

  // Transient toast for non-blocking errors (backing track failed, mic issues
  // after the modal is gone, etc.). Auto-dismisses.
  showToast(msg, kind = 'info', ms = 3500) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + (kind === 'error' ? 'toast-error' : kind === 'warn' ? 'toast-warn' : '');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.className = 'toast';
    }, ms);
  },

  // Audio is loaded on-demand when a song is selected (see selectSong).
  // This avoids downloading ~140MB of MP3s upfront, which crashes mobile
  // Safari (especially incognito) due to memory limits.
  async _preloadAudioTracks() {
    // No-op — kept for compatibility. All loading happens in selectSong.
  },

  // ---- SCREEN MANAGEMENT ----

  showScreen(id) {
    // Cleanup previous screen
    if (this.currentScreen === 'warmup') this._stopWarmup();
    if (this.currentScreen === 'game') Game.stop();

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-' + id);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = id;
    }

    if (id === 'warmup') this._initWarmupCanvas();
    if (id === 'home') this._updateHomeStats();
    if (id === 'leaderboard') {
      this._populateSongPicker();
      this.loadGlobalLeaderboard();
    }
  },

  // ---- SONG SELECT ----

  onSearchInput(val) {
    this._searchQuery = (val || '').trim().toLowerCase();
    const clearBtn = document.getElementById('song-search-clear');
    if (clearBtn) clearBtn.hidden = !this._searchQuery;
    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    this._renderSongGrid(activeFilter);
  },

  clearSearch() {
    this._searchQuery = '';
    const input = document.getElementById('song-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('song-search-clear');
    if (clearBtn) clearBtn.hidden = true;
    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    this._renderSongGrid(activeFilter);
  },

  _renderSongGrid(filter = 'all') {
    const grid = document.getElementById('song-grid');
    if (!grid) return;

    let songs = filter === 'all'
      ? Songs.library
      : Songs.library.filter(s => s.difficulty === filter);

    // Search filter — match on title, artist, and song ID (pinyin romanisation).
    // Song IDs like 'gu-dan-bei-ban-qiu' are already the pinyin for most
    // Chinese titles, so replacing hyphens with spaces lets users type e.g.
    // "gu dan bei ban qiu" or "gudanbeibanjiu" to find 孤單北半球.
    const q = this._searchQuery;
    if (q) {
      const qNorm = q.replace(/[-\s]+/g, '');
      songs = songs.filter(s => {
        const idFlat = s.id.replace(/-/g, '');
        return (
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.id.replace(/-/g, ' ').includes(q) ||
          idFlat.includes(qNorm)
        );
      });
    }

    if (songs.length === 0) {
      grid.innerHTML = `<div class="song-no-results"><strong>No songs found</strong>Try a different search or filter</div>`;
      return;
    }

    grid.innerHTML = songs.map(song => {
      const best = this.stats.songBests[song.id];
      const dur = Songs.getDuration(song);
      const mins = Math.floor(dur / 60);
      const secs = Math.floor(dur % 60);
      const canKaraoke = !!song.stripVocals;
      const karaokeOn = this.isKaraokeOn(song);

      return `
        <div class="song-card" data-difficulty="${song.difficulty}" data-song-id="${song.id}">
          <div class="song-card-main" onclick="App.selectSong('${song.id}')">
            <div class="song-art" style="--song-color: ${song.color}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 18V6l11-2v12"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="17" cy="16" r="3"/>
              </svg>
            </div>
            <div class="song-info">
              <div class="song-title">${song.title}</div>
              <div class="song-artist">${song.artist}</div>
              <div class="song-meta">
                <span class="song-tag tag-${song.difficulty}">${song.difficulty}</span>
                <span class="song-tag-key">${song.key}</span>
                <span class="song-tag-key">${mins}:${secs.toString().padStart(2, '0')}</span>
              </div>
            </div>
            <div class="song-best">
              ${best ? `<div class="song-best-score">${best}</div><div class="song-best-label">BEST</div>` : '<div class="song-play-hint">\u25B6</div>'}
            </div>
          </div>
          ${canKaraoke ? `
          <div class="song-options">
            <button type="button"
                    class="karaoke-toggle ${karaokeOn ? 'is-on' : 'is-off'}"
                    aria-pressed="${karaokeOn}"
                    onclick="App.toggleKaraoke('${song.id}', event)">
              <span class="karaoke-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="3" width="6" height="12" rx="3"/>
                  <path d="M5 11a7 7 0 0 0 14 0"/>
                  <path d="M12 18v3"/>
                </svg>
              </span>
              <span class="karaoke-label">
                ${karaokeOn ? 'Karaoke Mode' : 'Original Audio'}
              </span>
              <span class="karaoke-state">${karaokeOn ? 'ON' : 'OFF'}</span>
            </button>
            <span class="karaoke-hint">
              ${karaokeOn
                ? 'Vocals removed'
                : 'Use headphones for accurate scoring'}
            </span>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  _setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderSongGrid(btn.dataset.filter);
      });
    });
  },

  // ---- SONG SELECTION & COUNTDOWN ----

  async selectSong(songId) {
    this.currentSong = songId;
    const song = Songs.get(songId);
    if (!song) return;

    // Resume AudioContext synchronously here, while we're still inside the
    // user-gesture callstack (before any awaits). Browsers require a gesture
    // for ctx.resume() — by the time we reach Synth.playSong() we've awaited
    // audio loading, mic, and a 3-second countdown, breaking the gesture chain.
    try { if (Synth.ctx && Synth.ctx.state !== 'running') Synth.ctx.resume(); } catch (e) {}
    try { if (PitchDetector.audioContext && PitchDetector.audioContext.state !== 'running') PitchDetector.audioContext.resume(); } catch (e) {}

    // Usage limit check
    const limit = await Auth.checkSessionLimit();
    if (!limit.allowed) {
      this.showToast(limit.reason, 'warn', 5000);
      return;
    }

    // If this song depends on a backing track and we failed to load it,
    // don't silently proceed into a broken session — tell the user.
    if (song.audioSrc && song._audioLoadFailed) {
      this.showToast(`Couldn't load backing track for "${song.title}". Check your connection and reload.`, 'error', 5000);
      return;
    }

    // Audio still loading — fetch on demand instead of making the user wait.
    // Optimization: when a song has both vocal + instrumental tracks, fetch
    // them in parallel instead of serially. Halves the wait on karaoke songs.
    if (song.audioSrc && !song._audioLoaded) {
      this.showToast('Loading audio\u2026', 'info', 15000);
      const fetchTrack = async (url) => {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        return new File([blob], url.split('/').pop(), { type: 'audio/mpeg' });
      };
      try {
        const [mainResult, instrResult] = await Promise.allSettled([
          fetchTrack(song.audioSrc),
          song.instrumentalSrc ? fetchTrack(song.instrumentalSrc) : Promise.resolve(null),
        ]);
        if (mainResult.status !== 'fulfilled') throw mainResult.reason;
        const ok = await Synth.loadAudioTrack(mainResult.value, song.id, 'full');
        if (!ok) throw new Error('decode failed');
        song._audioLoaded = true;
        if (instrResult.status === 'fulfilled' && instrResult.value) {
          try {
            const ok2 = await Synth.loadAudioTrack(instrResult.value, song.id, 'instrumental');
            if (ok2) song._instrumentalLoaded = true;
          } catch (_) { /* non-fatal */ }
        }
        // Dismiss the loading toast now that we're ready.
        this.showToast('Ready!', 'info', 800);
      } catch (e) {
        song._audioLoadFailed = true;
        this.showToast(`Couldn't load "${song.title}". Check your connection.`, 'error', 4000);
        return;
      }
    }

    // Lazy-load song notes + melody (split out of songs.js for performance).
    // This fetch is tiny (~20-35KB) and typically completes in <100ms behind
    // the audio load, so the user never perceives it.
    await Songs.loadData(songId);

    // Request mic if needed
    const hasMic = await this._ensureMic();
    if (!hasMic) return;

    // Show countdown
    document.getElementById('countdown-title').textContent = song.title;
    this.showScreen('countdown');

    // Countdown 3-2-1
    const numEl = document.getElementById('countdown-num');
    for (let i = 3; i >= 1; i--) {
      numEl.textContent = i;
      numEl.style.animation = 'none';
      void numEl.offsetHeight; // force reflow
      numEl.style.animation = 'countPulse 1s ease-in-out';
      PitchDetector.playClick();
      await this._wait(1000);
    }

    numEl.textContent = '\u266A';
    await this._wait(400);

    // Start game
    this._startGame(songId);
  },

  _startGame(songId) {
    const song = Songs.get(songId);
    document.getElementById('game-title').textContent = song.title;
    document.getElementById('game-artist').textContent = song.artist;
    document.getElementById('game-score').textContent = '0';
    document.getElementById('game-time').textContent = '0:00';
    document.getElementById('game-lyrics').innerHTML = '';

    // Tell Synth whether to strip vocals this run, based on the per-song toggle
    Synth.stripVocalsOverride = this.isKaraokeOn(song);

    // Reset rank state and kick off a background leaderboard fetch so the
    // live rank display has data as soon as possible.
    this._gameRankScores = [];
    this._fetchGameRanks(songId);

    this.showScreen('game');
    this._trackEvent('song_start', { song_id: songId, karaoke: this.isKaraokeOn(song) });
    Game.loadSong(songId);

    // Show/hide karaoke toggle based on whether this song has both tracks
    const karaokeBtn = document.getElementById('game-karaoke-btn');
    if (karaokeBtn) karaokeBtn.hidden = !song.stripVocals;

    // MV mode: if this song has a music-video, swap canvas for video
    const gameScreen = document.getElementById('screen-game');
    const mvEl = document.getElementById('game-mv');
    if (song.mvSrc && mvEl && gameScreen) {
      gameScreen.classList.add('has-mv');
      mvEl.src = song.mvSrc;
      mvEl.currentTime = 0;
      mvEl.load();
    } else if (gameScreen) {
      gameScreen.classList.remove('has-mv');
      if (mvEl) { mvEl.pause(); mvEl.removeAttribute('src'); }
    }

    // Small delay to let screen render
    setTimeout(() => {
      Game._resize();
      Game.start();
      // Start MV in sync with audio
      if (song.mvSrc && mvEl && gameScreen.classList.contains('has-mv')) {
        mvEl.currentTime = 0;
        mvEl.play().catch(() => {/* autoplay may be blocked — video is muted so usually fine */});
      }
      // Sync karaoke button to current state after Game.loadSong() has set _isKaraokeOff
      this._updateKaraokeBtn();
      // Hide rank until we have data
      const rankEl = document.getElementById('game-rank');
      if (rankEl) rankEl.hidden = true;
    }, 100);
  },

  quitGame() {
    Game.stop();
    this._stopMv();
    this.showScreen('songs');
  },

  // End the song early and go straight to results (same as natural end).
  endSong() {
    Game.stop();
    this._stopMv();
    this.onGameEnd();
  },

  _stopMv() {
    const mvEl = document.getElementById('game-mv');
    if (mvEl) { mvEl.pause(); mvEl.currentTime = 0; }
    const gameScreen = document.getElementById('screen-game');
    if (gameScreen) gameScreen.classList.remove('has-mv');
  },

  // Toggle karaoke on/off mid-song. Swaps the audio track at the current
  // position without restarting. Shows a toast (not a blocking modal) when
  // switching to original audio since the session is already in progress.
  toggleKaraokeMidSong() {
    const song = Songs.get(this.currentSong);
    if (!song || !song.stripVocals) return;

    const currentlyOff = Game._isKaraokeOff;
    const wantKaraoke = currentlyOff; // flip

    const switched = Synth.switchKaraoke(wantKaraoke, song.id);
    if (!switched) {
      this.showToast('Track not available', 'warn');
      return;
    }

    Game._isKaraokeOff = !wantKaraoke;
    this._updateKaraokeBtn();

    if (!wantKaraoke) {
      this.showToast('Original audio — rankings disabled for this session', 'warn', 4000);
    } else {
      this.showToast('Karaoke mode on — pitch scoring active', 'info', 2500);
    }
  },

  _updateKaraokeBtn() {
    const btn = document.getElementById('game-karaoke-btn');
    if (!btn) return;
    const isOff = !!Game._isKaraokeOff;
    btn.classList.toggle('karaoke-off', isOff);
    btn.title = isOff ? 'Original audio (tap to switch to karaoke)' : 'Karaoke mode on (tap to switch to original)';
    btn.setAttribute('aria-pressed', String(!isOff));
  },

  // Fetch leaderboard scores for the current song and cache them for
  // rank computation during the game. Uses localStorage cache when available
  // so this is instant on repeat plays — no visible delay.
  async _fetchGameRanks(songId) {
    this._gameRankScores = [];
    try {
      const scope = `song_${songId}`;
      const cached = this._readLbCache(scope);
      if (cached && cached.length) {
        this._gameRankScores = cached.map(e => e.score);
      }
      // Background refresh — updates ranks silently if cache is stale
      const sb = _getSupabase();
      const { data } = await this._withTimeout(
        sb.from('profiles').select('id, stats').not('stats', 'is', null).limit(200),
        8000,
      );
      if (data) {
        const scores = (data || [])
          .filter(p => p.stats && p.stats.songBests && p.stats.songBests[songId] > 0)
          .map(p => p.stats.songBests[songId])
          .sort((a, b) => b - a);
        this._gameRankScores = scores;
        this._writeLbCache(scope,
          (data || [])
            .filter(p => p.stats && p.stats.songBests && p.stats.songBests[songId] > 0)
            .map(p => ({ score: p.stats.songBests[songId], user_id: p.id }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 50)
        );
      }
    } catch (e) { /* non-fatal — rank just won't show */ }
  },

  // Compute current rank from live score vs stored leaderboard scores.
  // Returns a string like "#3" or null if no data.
  _getGameRank(liveScore) {
    if (!this._gameRankScores || this._gameRankScores.length === 0) return null;
    if (liveScore <= 0) return null;
    const rank = this._gameRankScores.filter(s => s > liveScore).length + 1;
    return `#${rank}`;
  },

  replaySong() {
    if (this.currentSong) {
      this.selectSong(this.currentSong);
    }
  },

  async onGameEnd() {
    this._stopMv();
    const results = Game.getResults();
    const song = Songs.get(this.currentSong);

    // Update stats
    this.stats.sessions++;
    if (results.score > this.stats.bestScore) this.stats.bestScore = results.score;

    // Track daily streak
    const today = new Date().toDateString();
    if (this.stats.lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (this.stats.lastDate === yesterday) {
        this.stats.streak++;
      } else if (this.stats.lastDate !== today) {
        this.stats.streak = 1;
      }
      this.stats.lastDate = today;
    }

    // Song best
    if (!this.stats.songBests[this.currentSong] || results.score > this.stats.songBests[this.currentSong]) {
      this.stats.songBests[this.currentSong] = results.score;
    }

    this._saveStats();
    // Record this session for usage limit tracking
    Auth.recordSession().catch(e => console.warn('Session record failed:', e));
    this._trackEvent('song_complete', { song_id: this.currentSong, score: results.score, pitch_accuracy: results.pitchAccuracy, coverage: results.coverage });

    // If the user was playing to settle a sing-off, record the opponent
    // half of the row and show the VS result screen instead of the normal
    // results screen. On failure we fall through to the normal screen.
    // Belt-and-suspenders: race the settle against a hard wall-clock timer
    // so a hung promise can never keep the user on the frozen game screen.
    let settled = false;
    try {
      settled = await Promise.race([
        this._settleSingOffIfNeeded(results),
        new Promise((resolve) => setTimeout(() => resolve(false), 11000)),
      ]);
    } catch (e) {
      console.warn('sing-off settle failed', e);
    }
    if (settled) return;

    try {
      this._showResults(results, song);
    } catch (e) {
      // Last-resort fallback so the user can still leave the game screen.
      console.error('Failed to render results screen', e);
      this.showToast('Results render failed. Returning home.', 'error');
      this.showScreen('home');
    }
  },

  _showResults(results, song) {
    this._lastResults = results;
    this.showScreen('results');

    document.getElementById('results-song-name').textContent = song.title;

    // Animate score circle
    const ring = document.getElementById('score-ring');
    const circumference = 565.48;
    const offset = circumference * (1 - results.score / 100);
    setTimeout(() => {
      ring.style.transition = 'stroke-dashoffset 1.5s ease-out';
      ring.style.strokeDashoffset = offset;
    }, 200);

    // Animate score number
    this._animateNumber('results-score', 0, results.score, 1500);

    // Rank
    const rankEl = document.getElementById('results-rank');
    let rank, rankClass;
    if (results.score >= 90) { rank = 'S RANK'; rankClass = 'rank-s'; }
    else if (results.score >= 75) { rank = 'A RANK'; rankClass = 'rank-a'; }
    else if (results.score >= 60) { rank = 'B RANK'; rankClass = 'rank-b'; }
    else if (results.score >= 40) { rank = 'C RANK'; rankClass = 'rank-c'; }
    else { rank = 'D RANK'; rankClass = 'rank-d'; }
    rankEl.textContent = rank;
    rankEl.className = 'score-rank ' + rankClass;

    // Breakdown bars — what we show depends on whether we actually graded pitch.
    // The second row is ALWAYS labeled "Vocal Coverage": its number is the % of
    // lyric lines where the user made any sound at all. We do not yet measure
    // rhythmic timing (note-onset offset vs the beat), so calling it "Timing"
    // would be a label lie — same "no fake metrics" principle as pitch scoring.
    const pitchItem = document.getElementById('bar-pitch').closest('.breakdown-item');
    const timingLabel = document.querySelector('#screen-results .breakdown-item:nth-of-type(2) .breakdown-label');
    if (timingLabel) timingLabel.textContent = 'Vocal Coverage';
    if (results.hasRealMelody) {
      // Real pitch data — show the pitch row honestly
      if (pitchItem) pitchItem.style.display = '';
      setTimeout(() => {
        document.getElementById('bar-pitch').style.width = results.pitchAccuracy + '%';
        document.getElementById('val-pitch').textContent = results.pitchAccuracy + '%';
        document.getElementById('bar-timing').style.width = results.coverage + '%';
        document.getElementById('val-timing').textContent = results.coverage + '%';
        const streakPct = Math.min(100, (results.bestStreak / results.totalNotes) * 100);
        document.getElementById('bar-streak').style.width = streakPct + '%';
        document.getElementById('val-streak').textContent = results.bestStreak;
      }, 500);
    } else {
      // No melody — hide the pitch row entirely.
      if (pitchItem) pitchItem.style.display = 'none';
      setTimeout(() => {
        document.getElementById('bar-timing').style.width = results.coverage + '%';
        document.getElementById('val-timing').textContent = results.coverage + '%';
        const streakPct = Math.min(100, (results.bestStreak / results.totalNotes) * 100);
        document.getElementById('bar-streak').style.width = streakPct + '%';
        document.getElementById('val-streak').textContent = results.bestStreak;
      }, 500);
    }

    // Feedback text
    const feedback = this._generateFeedback(results);
    document.getElementById('feedback-text').textContent = feedback;

    // Per-line breakdown (expandable)
    this._renderBreakdown(results);

    // Reset ring for next time
    this._resetScoreRing = () => {
      ring.style.transition = 'none';
      ring.style.strokeDashoffset = circumference;
    };
  },

  _renderBreakdown(results) {
    const listEl = document.getElementById('breakdown-list');
    const toggleEl = document.getElementById('breakdown-toggle');
    const labelEl = toggleEl.querySelector('.breakdown-toggle-label');
    if (!listEl || !toggleEl) return;

    // Only show lines with real lyric text (skips instrumental notes)
    const lines = (results.perNote || []).filter(n => n.lyric);

    if (lines.length === 0) {
      document.getElementById('breakdown-details').style.display = 'none';
      return;
    }
    document.getElementById('breakdown-details').style.display = '';

    // Update label with count — language depends on whether we graded pitch
    if (results.hasRealMelody) {
      const offKey = lines.filter(n => n.status === 'off' || n.status === 'wrong' || n.status === 'missed');
      if (offKey.length === 0) {
        labelEl.textContent = 'See your line-by-line breakdown';
      } else {
        labelEl.textContent = `See which lines you sang off key (${offKey.length})`;
      }
    } else {
      const silent = lines.filter(n => n.status === 'silent');
      if (silent.length === 0) {
        labelEl.textContent = 'See your line-by-line breakdown';
      } else {
        labelEl.textContent = `See which lines you missed (${silent.length})`;
      }
    }

    // Build rows
    const fmtTime = (t) => {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    const statusMeta = {
      // Real-pitch statuses
      perfect: { label: 'Perfect', cls: 'row-perfect' },
      good: { label: 'Good', cls: 'row-good' },
      off: { label: 'Off key', cls: 'row-off' },
      wrong: { label: 'Way off', cls: 'row-wrong' },
      missed: { label: 'Missed', cls: 'row-missed' },
      // Timing-only statuses (no pitch claim)
      sang: { label: 'Sang', cls: 'row-good' },
      silent: { label: 'Silent', cls: 'row-missed' },
    };

    let html = '';
    for (const line of lines) {
      const meta = statusMeta[line.status] || statusMeta.off;
      html += `
        <div class="breakdown-row ${meta.cls}">
          <div class="breakdown-row-time">${fmtTime(line.start)}</div>
          <div class="breakdown-row-lyric">${this._escapeHtml(line.lyric)}</div>
          <div class="breakdown-row-status">
            <span class="breakdown-dot"></span>${meta.label}
          </div>
        </div>`;
    }
    listEl.innerHTML = html;

    // Reset expanded state each time results are shown
    listEl.hidden = true;
    toggleEl.setAttribute('aria-expanded', 'false');
    toggleEl.classList.remove('is-open');

    // Toggle handler (re-bind safely)
    toggleEl.onclick = () => {
      const open = listEl.hidden;
      listEl.hidden = !open;
      toggleEl.setAttribute('aria-expanded', String(open));
      toggleEl.classList.toggle('is-open', open);
    };
  },

  _escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  _generateFeedback(results) {
    const { score, pitchAccuracy, coverage, bestStreak, notesHit, totalNotes, hasRealMelody, isKaraokeOff, perNote } = results;

    // --- Timing-only mode: we didn't grade pitch. Be honest. ---
    if (!hasRealMelody) {
      // Different explanations depending on WHY pitch wasn't graded.
      const whyNoGrade = isKaraokeOff
        ? `You were singing with the original audio on — the mic picks up both your voice and the original singer's, so we can't reliably measure your pitch. Enable Karaoke Mode for full pitch scoring.`
        : `Pitch grading isn't enabled for this song yet — we only measured whether you sang through each lyric window, not whether the notes were right.`;
      if (coverage >= 90) {
        return `You sang during ${notesHit} of ${totalNotes} lines. ${whyNoGrade}`;
      } else if (coverage >= 60) {
        return `You sang during ${notesHit} of ${totalNotes} lines. A few lines went silent — try to carry your voice through every phrase. ${whyNoGrade}`;
      } else {
        return `You sang during ${notesHit} of ${totalNotes} lines — a lot of the song went silent on your end. ${whyNoGrade}`;
      }
    }

    // --- Real pitch grading. Feedback is grounded in per-line cents. ---
    const graded = (perNote || []).filter(n => n.status !== 'missed' && n.lyric);

    // Bucket counts (real, not inferred from score)
    const counts = { perfect: 0, good: 0, off: 0, wrong: 0, missed: 0 };
    for (const n of perNote || []) counts[n.status] = (counts[n.status] || 0) + 1;
    const onPitchLines = counts.perfect + counts.good;
    const roughLines = counts.off + counts.wrong;

    // Weakest sung line: lowest accuracy among lines the user actually attempted.
    // We surface it by lyric so the user knows where to focus next.
    let weakest = null;
    for (const n of graded) {
      if (n.status === 'perfect' || n.status === 'good') continue;
      if (!weakest || n.accuracy < weakest.accuracy) weakest = n;
    }

    // Strongest sung line — used for high-score encouragement
    let strongest = null;
    for (const n of graded) {
      if (!strongest || n.accuracy > strongest.accuracy) strongest = n;
    }

    const fmtTime = (t) => {
      const m = Math.floor(t / 60), s = Math.floor(t % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    const shortLyric = (s) => {
      const str = String(s || '').trim();
      return str.length > 28 ? str.slice(0, 27) + '…' : str;
    };

    // --- S / A rank: talk about what was strong, point at the one roughest spot if any. ---
    if (score >= 90) {
      if (weakest && roughLines >= 1) {
        return `Outstanding — ${pitchAccuracy}% pitch accuracy across ${totalNotes} lines, best streak ${bestStreak}. Only rough patch was "${shortLyric(weakest.lyric)}" at ${fmtTime(weakest.start)} (off by ~${weakest.cents}¢). Fix that and you're in S territory.`;
      }
      return `Outstanding — ${pitchAccuracy}% pitch accuracy across ${totalNotes} lines with a best streak of ${bestStreak}. Every section landed. This is a real performance, not a practice run.`;
    }

    if (score >= 75) {
      if (weakest) {
        return `Strong run — ${pitchAccuracy}% pitch, best streak ${bestStreak}. ${onPitchLines} of ${totalNotes} lines were on pitch. Weakest spot was "${shortLyric(weakest.lyric)}" at ${fmtTime(weakest.start)} (off by ~${weakest.cents}¢) — drill that line and you'll push into the 90s.`;
      }
      return `Strong run — ${pitchAccuracy}% pitch, best streak ${bestStreak}. ${onPitchLines} of ${totalNotes} lines were on pitch. Keep the long phrases tight to push into the 90s.`;
    }

    // --- B rank: user is competent but has a few real problem lines. Name them. ---
    if (score >= 60) {
      if (weakest && roughLines >= 2) {
        return `Solid B — ${onPitchLines} of ${totalNotes} lines on pitch, ${roughLines} drifted. Your roughest line was "${shortLyric(weakest.lyric)}" at ${fmtTime(weakest.start)} (off by ~${weakest.cents}¢). Replay that section a few times and your next run should clear 75.`;
      }
      if (weakest) {
        return `Solid B — ${pitchAccuracy}% pitch accuracy. One line tripped you: "${shortLyric(weakest.lyric)}" at ${fmtTime(weakest.start)} (~${weakest.cents}¢ off). Lock that one in and you're in A range.`;
      }
      return `Solid B — ${onPitchLines} of ${totalNotes} lines on pitch. Coverage was ${coverage}%. Keep building streaks — yours capped at ${bestStreak}.`;
    }

    // --- C rank: roughly half-on-pitch. Be specific about the weakest spot and whether it's pitch or coverage. ---
    if (score >= 40) {
      if (coverage < 70) {
        return `Coverage was the bigger issue — you only sang during ${coverage}% of the lyric windows. Before worrying about pitch, try to carry your voice through every phrase. Pitch accuracy (${pitchAccuracy}%) will come up naturally once you're singing through the whole song.`;
      }
      if (weakest) {
        return `${pitchAccuracy}% pitch accuracy — the notes are in reach. Your roughest stretch was around "${shortLyric(weakest.lyric)}" at ${fmtTime(weakest.start)}, drifting ~${weakest.cents}¢. Try humming that line with the backing track first, then sing it with lyrics.`;
      }
      return `${pitchAccuracy}% pitch accuracy. The notes are in reach — slow down, listen to each target note, then match it before moving on.`;
    }

    // --- D rank: either very off pitch, or mostly silent. Diagnose which one. ---
    if (coverage < 50) {
      return `You only sang during ${coverage}% of the song — most lines went silent. Start by just singing along with the lyrics for every line, even softly. Pitch comes after presence.`;
    }
    if (weakest) {
      return `${pitchAccuracy}% pitch accuracy — average drift is large. Try the C Major Scale warm-up first, then come back and focus on one line at a time. The roughest spot was "${shortLyric(weakest.lyric)}" at ${fmtTime(weakest.start)} (~${weakest.cents}¢ off).`;
    }
    return `${pitchAccuracy}% pitch accuracy. Try the warm-up exercises to build the connection between hearing a note and producing it, then come back to this song.`;
  },

  _animateNumber(elId, from, to, duration) {
    const el = document.getElementById(elId);
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  },

  // ---- WARM-UP ----

  _initWarmupCanvas() {
    const canvas = document.getElementById('warmup-canvas');
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = 300 * window.devicePixelRatio;
    canvas.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
  },

  async toggleWarmupMic() {
    const btn = document.getElementById('warmup-mic-btn');
    if (this.warmupActive) {
      this._stopWarmup();
      btn.innerHTML = '<span class="btn-icon">&#127908;</span> Enable Microphone';
      return;
    }

    const hasMic = await this._ensureMic();
    if (!hasMic) return;

    this.warmupActive = true;
    btn.innerHTML = '<span class="btn-icon">&#9632;</span> Stop Listening';

    this._warmupUnsub = PitchDetector.onPitch(data => {
      const canvas = document.getElementById('warmup-canvas');
      if (canvas) Game.drawWarmupMeter(canvas, data);

      document.getElementById('warmup-note').textContent = data.note;
      document.getElementById('warmup-freq').textContent = data.freq > 0 ? Math.round(data.freq) + ' Hz' : '-- Hz';

      const centsEl = document.getElementById('warmup-cents');
      if (data.freq > 0) {
        const c = Math.round(data.cents);
        if (Math.abs(c) < 10) {
          centsEl.textContent = 'In tune!';
          centsEl.className = 'note-cents cents-perfect';
        } else if (c > 0) {
          centsEl.textContent = '+' + c + ' cents (sharp)';
          centsEl.className = 'note-cents cents-sharp';
        } else {
          centsEl.textContent = c + ' cents (flat)';
          centsEl.className = 'note-cents cents-flat';
        }
      } else {
        centsEl.textContent = '';
        centsEl.className = 'note-cents';
      }
    });
  },

  _stopWarmup() {
    this.warmupActive = false;
    if (this._warmupUnsub) {
      this._warmupUnsub();
      this._warmupUnsub = null;
    }
  },

  playTone(freq) {
    PitchDetector.playTone(freq, 1.5);
  },

  // ---- MICROPHONE ----

  async _ensureMic() {
    if (PitchDetector.isRunning) return true;

    // Check current permission state. Safari doesn't support this query, so
    // we gracefully fall through to the ask path.
    let permState = null;
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      permState = result.state;
    } catch (e) {
      // Permissions API not supported — we'll just try startMic() below.
    }

    if (permState === 'granted') {
      const ok = await PitchDetector.startMic();
      if (!ok) this._showMicModal('denied');
      return ok;
    }

    // Already hard-denied at browser level — show instructions modal
    // immediately instead of tricking the user into a retry that will fail.
    if (permState === 'denied') {
      this._showMicModal('denied');
      return new Promise(resolve => { this._micResolve = resolve; });
    }

    // Unknown / prompt — show the "ask" modal
    this._showMicModal('ask');
    return new Promise(resolve => { this._micResolve = resolve; });
  },

  _showMicModal(state) {
    const modal = document.getElementById('mic-modal');
    modal.setAttribute('data-state', state);
    modal.classList.add('active');
  },

  async requestMic() {
    const ok = await PitchDetector.startMic();
    if (ok) {
      document.getElementById('mic-modal').classList.remove('active');
      if (this._micResolve) {
        this._micResolve(true);
        this._micResolve = null;
      }
    } else {
      // getUserMedia rejected — either user denied, no device, or OS-level
      // block. Swap the modal to the instructions state so they have a
      // concrete path forward.
      this._showMicModal('denied');
    }
  },

  closeMicModal() {
    document.getElementById('mic-modal').classList.remove('active');
    if (this._micResolve) {
      this._micResolve(false);
      this._micResolve = null;
    }
  },

  // ---- PERSISTENCE ----

  // Stats now live inside whichever profile is currently signed in. These
  // helpers just proxy to Auth so the rest of the app can keep reading/
  // writing `this.stats` as before. When no profile is signed in we fall
  // back to the in-memory default — rendering can happen but nothing
  // touches persistent storage.
  _loadStats() {
    const fromAuth = Auth.getStats();
    if (fromAuth) {
      // Reset our in-memory stats to this profile's blob. Default-fill
      // any missing keys so older saved profiles get the new `karaoke`
      // map automatically.
      this.stats = Object.assign({
        sessions: 0,
        bestScore: 0,
        streak: 0,
        lastDate: null,
        songBests: {},
        karaoke: {},
      }, fromAuth);
    }
  },

  _saveStats() {
    if (Auth.isSignedIn()) {
      Auth.saveStats(this.stats).catch(e => console.warn('Stats save failed:', e));
    }
  },

  _updateHomeStats() {
    const homeStats = document.querySelector('.home-stats');
    const isReturning = this.stats.sessions > 0;
    // Hide the stats strip entirely for new users — empty "0 / -- / 0" is
    // demoralizing and just wastes real estate. Only show after a session exists.
    if (homeStats) {
      homeStats.style.display = isReturning ? '' : 'none';
    }
    document.getElementById('stat-sessions').textContent = this.stats.sessions;
    document.getElementById('stat-best').textContent = this.stats.bestScore || '--';
    document.getElementById('stat-streak').textContent = this.stats.streak;

    // Show the Loom guide to first-time users; returning users see the devlog link instead.
    const guideVideo = document.getElementById('home-guide-video');
    const devlogLink = document.getElementById('home-devlog-link');
    if (guideVideo) guideVideo.hidden = isReturning;
    if (devlogLink) devlogLink.hidden = !isReturning;
  },

  // ---- AUTH / PROFILES ----
  // This is a local-only profile system. See js/auth.js for the full
  // honesty disclaimer. Everything here is UI glue.

  _setupAuthScreen() {
    // Sign In form submit
    const signinBtn = document.getElementById('auth-signin-submit');
    if (signinBtn) signinBtn.onclick = () => this._doSignIn();

    // Sign Up form submit
    const signupBtn = document.getElementById('auth-signup-submit');
    if (signupBtn) signupBtn.onclick = () => this._doSignUp();

    // Enter key on password fields
    const signinPw = document.getElementById('auth-signin-password');
    if (signinPw) signinPw.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._doSignIn();
    });
    const signupPw = document.getElementById('auth-signup-password');
    if (signupPw) signupPw.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._doSignUp();
    });
  },

  switchAuthTab(tab) {
    const signinForm = document.getElementById('auth-form-signin');
    const signupForm = document.getElementById('auth-form-signup');
    const confirmEl = document.getElementById('auth-confirm');
    const tabSignin = document.getElementById('auth-tab-signin');
    const tabSignup = document.getElementById('auth-tab-signup');
    const tabs = document.querySelector('.auth-tabs');
    const title = document.getElementById('auth-title');

    if (tab === 'signin') {
      signinForm.hidden = false;
      signupForm.hidden = true;
      confirmEl.hidden = true;
      if (tabs) tabs.hidden = false;
      tabSignin.classList.add('active');
      tabSignup.classList.remove('active');
      if (title) title.textContent = 'Sign in to VocalStar';
    } else if (tab === 'signup') {
      signinForm.hidden = true;
      signupForm.hidden = false;
      confirmEl.hidden = true;
      if (tabs) tabs.hidden = false;
      tabSignin.classList.remove('active');
      tabSignup.classList.add('active');
      if (title) title.textContent = 'Create your account';
    } else if (tab === 'confirm') {
      signinForm.hidden = true;
      signupForm.hidden = true;
      confirmEl.hidden = false;
      if (tabs) tabs.hidden = true;
      if (title) title.textContent = 'Almost there!';
    }
    // Clear errors
    document.getElementById('auth-signin-error').hidden = true;
    document.getElementById('auth-signup-error').hidden = true;
  },

  async _doSignIn() {
    const emailEl = document.getElementById('auth-signin-email');
    const pwEl = document.getElementById('auth-signin-password');
    const errEl = document.getElementById('auth-signin-error');
    const btn = document.getElementById('auth-signin-submit');
    errEl.hidden = true;

    const email = (emailEl.value || '').trim();
    const pw = pwEl.value || '';
    if (!email || !pw) {
      errEl.textContent = 'Enter your email and password.';
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    try {
      await Auth.signIn(email, pw);
      this._trackEvent('sign_in');
      this._loadStats();
      this._updateProfileChip();
      this._renderSongGrid();
      this._updateHomeStats();
      this.showScreen('home');
    } catch (e) {
      errEl.textContent = e.message || 'Sign in failed.';
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  },

  async _doSignUp() {
    const nameEl = document.getElementById('auth-signup-name');
    const emailEl = document.getElementById('auth-signup-email');
    const pwEl = document.getElementById('auth-signup-password');
    const errEl = document.getElementById('auth-signup-error');
    const btn = document.getElementById('auth-signup-submit');
    errEl.hidden = true;

    const name = (nameEl.value || '').trim();
    const email = (emailEl.value || '').trim();
    const pw = pwEl.value || '';

    if (!name) { errEl.textContent = 'Pick a display name.'; errEl.hidden = false; return; }
    if (!email) { errEl.textContent = 'Enter your email.'; errEl.hidden = false; return; }
    if (pw.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.hidden = false; return; }

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    try {
      const data = await Auth.signUp(email, pw, name);
      this._trackEvent('sign_up');
      if (data.session) {
        // Auto-confirmed (or confirm disabled) — go straight to home
        this._loadStats();
        this._updateProfileChip();
        this._renderSongGrid();
        this._updateHomeStats();
        this.showScreen('home');
      } else {
        // Email confirmation required — show confirm screen
        this.switchAuthTab('confirm');
      }
    } catch (e) {
      errEl.textContent = e.message || 'Sign up failed.';
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  },

  _updateProfileChip() {
    const chip = document.getElementById('profile-chip');
    const avatar = document.getElementById('profile-chip-avatar');
    const nameEl = document.getElementById('profile-chip-name');
    if (!chip) return;
    const profile = Auth.getCurrent();

    // Update greeting
    const greetingEl = document.getElementById('home-greeting');
    if (greetingEl) {
      if (profile) {
        const firstName = profile.name ? profile.name.split(' ')[0] : profile.name;
        const isReturning = this.stats && this.stats.sessions > 0;
        greetingEl.textContent = isReturning
          ? `Welcome back, ${firstName} 👋`
          : `Welcome, ${firstName} 👋`;
        greetingEl.hidden = false;
      } else {
        greetingEl.hidden = true;
      }
    }

    if (!profile) {
      chip.hidden = true;
      return;
    }
    chip.hidden = false;
    if (profile.avatarUrl) {
      avatar.style.background = `url(${profile.avatarUrl}) center/cover`;
      avatar.textContent = '';
      avatar.classList.add('has-img');
    } else {
      avatar.style.background = profile.color;
      avatar.textContent = profile.initial;
      avatar.classList.remove('has-img');
    }
    nameEl.textContent = profile.name;

    const header = document.getElementById('profile-menu-header');
    if (header) header.textContent = profile.name;
    const emailEl = document.getElementById('profile-menu-email');
    if (emailEl) emailEl.textContent = profile.email || '';

    // Large avatar in menu
    const avatarLg = document.getElementById('profile-menu-avatar-lg');
    if (avatarLg) {
      if (profile.avatarUrl) {
        avatarLg.style.background = `url(${profile.avatarUrl}) center/cover`;
        avatarLg.textContent = '';
        avatarLg.classList.add('has-img');
      } else {
        avatarLg.style.background = profile.color;
        avatarLg.textContent = profile.initial;
        avatarLg.classList.remove('has-img');
      }
    }
  },

  triggerAvatarUpload() {
    document.getElementById('avatar-file-input')?.click();
  },

  async handleAvatarUpload(input) {
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    try {
      this.showToast('Uploading photo...', 'info', 2000);
      await Auth.uploadAvatar(file);
      this._updateProfileChip();
      this.showToast('Photo updated!', 'info', 2000);
    } catch (e) {
      console.warn('Avatar upload failed:', e);
      this.showToast(e.message || 'Upload failed. Try a smaller image.', 'error', 4000);
    }
  },

  toggleProfileMenu(ev) {
    if (ev) ev.stopPropagation();
    const menu = document.getElementById('profile-menu');
    if (!menu) return;
    menu.hidden = !menu.hidden;
  },

  async signOutProfile() {
    document.getElementById('profile-menu').hidden = true;
    await Auth.signOut();
    this.stats = { sessions: 0, bestScore: 0, streak: 0, lastDate: null, songBests: {}, karaoke: {} };
    this._updateProfileChip();
    this._renderSongGrid();
    this._updateHomeStats();
    this.switchAuthTab('signin');
    this.showScreen('auth');
  },

  // ---- SKIP FORWARD ----
  // During the game, nudge the backing track (and the game clock, which
  // is slaved to it via Synth.getPlaybackTime()) forward by 5 seconds.
  // Useful for songs with long instrumental intros.
  skipForward() {
    if (this.currentScreen !== 'game') return;
    const newPos = Synth.seekBy(5);
    if (newPos == null) {
      // Synth path: either no audio buffer (synthesized backing) or not
      // playing yet. Don't silently fail — be honest.
      this.showToast('Skip only works on songs with real backing tracks.', 'warn', 2500);
      return;
    }
    // Tell the game its scoring state needs to resync. Some per-note
    // caches (melody cursor, streak bad-frame counter) should reset so
    // the user doesn't get "missed" penalties for notes they skipped.
    if (typeof Game !== 'undefined' && Game.onSeek) Game.onSeek(newPos);
    this.showToast(`+5s`, 'info', 900);
  },

  // ---- LEADERBOARD ----

  _lbTab: 'global',

  switchLeaderboardTab(tab) {
    this._lbTab = tab;
    document.querySelectorAll('.lb-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.lbTab === tab);
    });
    const picker = document.getElementById('lb-song-picker');
    if (picker) picker.hidden = (tab !== 'song');
    if (tab === 'global') {
      this.loadGlobalLeaderboard();
    } else {
      const sel = document.getElementById('lb-song-select');
      if (sel && sel.value) this.loadSongLeaderboard(sel.value);
    }
  },

  _populateSongPicker() {
    const sel = document.getElementById('lb-song-select');
    if (!sel) return;
    sel.innerHTML = Songs.library.map(s =>
      `<option value="${s.id}">${s.title} — ${s.artist}</option>`
    ).join('');
  },

  // Leaderboard requests have no built-in timeout, so a flaky mobile signal
  // (or a Supabase cold start) leaves the spinner up forever — exactly the
  // bug a user reported. Race every query against a 10s deadline; if it
  // wins, surface a "Tap to retry" so the user has agency.
  _LB_TIMEOUT_MS: 10000,

  _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
  },

  _showLbError(statusEl, msg, retryFn) {
    const safeMsg = this._escapeHtml(msg);
    statusEl.hidden = false;
    statusEl.innerHTML = `
      <div class="lb-status-text">${safeMsg}</div>
      <button class="lb-retry-btn" type="button">Tap to retry</button>`;
    const btn = statusEl.querySelector('.lb-retry-btn');
    if (btn) btn.addEventListener('click', () => retryFn(), { once: true });
  },

  async loadGlobalLeaderboard() {
    const statusEl = document.getElementById('lb-status');
    const listEl = document.getElementById('lb-list');
    listEl.innerHTML = '';

    // Stale-while-revalidate: paint cached rows immediately so the leaderboard
    // feels instant, then refresh in the background. Cache key includes the
    // scope so global/song boards don't collide.
    const cached = this._readLbCache('global');
    let hadCache = false;
    if (cached && cached.length) {
      hadCache = true;
      statusEl.hidden = true;
      const currentUser = Auth.getCurrent();
      listEl.innerHTML = cached.map((e, i) => this._renderLbRow(e, i + 1, currentUser)).join('');
    } else {
      statusEl.hidden = false;
      statusEl.innerHTML = '<div class="lb-status-text">Loading...</div>';
    }

    try {
      const sb = _getSupabase();
      const { data, error } = await this._withTimeout(
        sb.from('profiles')
          .select('id, display_name, color, avatar_url, stats')
          .not('stats', 'is', null)
          .limit(200),
        this._LB_TIMEOUT_MS,
      );

      if (error) throw error;

      const entries = (data || [])
        .filter(p => p.stats && p.stats.bestScore > 0)
        .map(p => ({
          user_id: p.id,
          display_name: p.display_name || 'Singer',
          color: p.color || '#00d4ff',
          avatar_url: p.avatar_url || null,
          score: p.stats.bestScore || 0,
          sessions: p.stats.sessions || 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      this._writeLbCache('global', entries);

      if (entries.length === 0) {
        statusEl.innerHTML = '<div class="lb-empty-icon">&#9733;</div><div class="lb-status-text">No scores yet. Be the first!</div>';
        statusEl.hidden = false;
        return;
      }
      statusEl.hidden = true;

      const currentUser = Auth.getCurrent();
      listEl.innerHTML = entries.map((e, i) => this._renderLbRow(e, i + 1, currentUser)).join('');

      const meRow = listEl.querySelector('.lb-row.is-me');
      if (meRow) meRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (e) {
      console.warn('Leaderboard load failed:', e);
      // If we already painted cached rows, don't blow them away with an error
      // card — a transient timeout shouldn't make the UX worse than cached.
      if (hadCache) return;
      const msg = e && e.message === 'timeout'
        ? 'Leaderboard took too long to load.'
        : 'Could not load leaderboard.';
      this._showLbError(statusEl, msg, () => this.loadGlobalLeaderboard());
    }
  },

  // ---- Leaderboard cache (localStorage, 5 min TTL) ----
  // Purpose: make the leaderboard feel instant on repeat visits. Pure UX win;
  // the fresh fetch still runs in the background and overwrites.
  _LB_CACHE_TTL_MS: 5 * 60 * 1000,
  _lbCacheKey(scope) { return `vs_lb_${scope}`; },
  _readLbCache(scope) {
    try {
      const raw = localStorage.getItem(this._lbCacheKey(scope));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || !Array.isArray(parsed.entries)) return null;
      if (Date.now() - parsed.ts > this._LB_CACHE_TTL_MS) return null;
      return parsed.entries;
    } catch (e) { return null; }
  },
  _writeLbCache(scope, entries) {
    try {
      localStorage.setItem(this._lbCacheKey(scope), JSON.stringify({
        ts: Date.now(),
        entries,
      }));
    } catch (e) { /* quota errors are fine to ignore */ }
  },

  async loadSongLeaderboard(songId) {
    const statusEl = document.getElementById('lb-status');
    const listEl = document.getElementById('lb-list');
    listEl.innerHTML = '';

    const scope = `song_${songId}`;
    const cached = this._readLbCache(scope);
    let hadCache = false;
    if (cached && cached.length) {
      hadCache = true;
      statusEl.hidden = true;
      const currentUser = Auth.getCurrent();
      listEl.innerHTML = cached.map((e, i) => this._renderLbRow(e, i + 1, currentUser)).join('');
    } else {
      statusEl.hidden = false;
      statusEl.innerHTML = '<div class="lb-status-text">Loading...</div>';
    }

    try {
      const sb = _getSupabase();
      const { data, error } = await this._withTimeout(
        sb.from('profiles')
          .select('id, display_name, color, avatar_url, stats')
          .not('stats', 'is', null)
          .limit(200),
        this._LB_TIMEOUT_MS,
      );

      if (error) throw error;

      const entries = (data || [])
        .filter(p => p.stats && p.stats.songBests && p.stats.songBests[songId] > 0)
        .map(p => ({
          user_id: p.id,
          display_name: p.display_name || 'Singer',
          color: p.color || '#00d4ff',
          avatar_url: p.avatar_url || null,
          score: p.stats.songBests[songId],
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      this._writeLbCache(scope, entries);

      if (entries.length === 0) {
        const song = Songs.get(songId);
        statusEl.innerHTML = `<div class="lb-empty-icon">&#9835;</div><div class="lb-status-text">No scores for ${song ? song.title : 'this song'} yet.</div>`;
        statusEl.hidden = false;
        return;
      }
      statusEl.hidden = true;

      const currentUser = Auth.getCurrent();
      listEl.innerHTML = entries.map((e, i) => this._renderLbRow(e, i + 1, currentUser)).join('');

      const meRow = listEl.querySelector('.lb-row.is-me');
      if (meRow) meRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (e) {
      console.warn('Song leaderboard load failed:', e);
      if (hadCache) return;
      const msg = e && e.message === 'timeout'
        ? 'Leaderboard took too long to load.'
        : 'Could not load leaderboard.';
      this._showLbError(statusEl, msg, () => this.loadSongLeaderboard(songId));
    }
  },

  _renderLbRow(entry, rank, currentUser) {
    const isMe = currentUser && entry.user_id === currentUser.id;
    const initial = Auth._initialOf(entry.display_name);
    const medals = { 1: '&#129351;', 2: '&#129352;', 3: '&#129353;' };
    const medal = medals[rank] || `<span class="lb-rank-num">${rank}</span>`;
    const topClass = rank <= 3 ? ` lb-top-${rank}` : '';
    const avatarStyle = entry.avatar_url
      ? `background: url(${this._escapeHtml(entry.avatar_url)}) center/cover`
      : `background: ${this._escapeHtml(entry.color)}`;
    const avatarContent = entry.avatar_url ? '' : initial;
    const imgClass = entry.avatar_url ? ' has-img' : '';

    return `
      <div class="lb-row${isMe ? ' is-me' : ''}${topClass}">
        <div class="lb-rank">${medal}</div>
        <div class="lb-avatar${imgClass}" style="${avatarStyle}">${avatarContent}</div>
        <div class="lb-name">${this._escapeHtml(entry.display_name)}${isMe ? ' <span class="lb-you">YOU</span>' : ''}</div>
        <div class="lb-score">${entry.score}</div>
      </div>`;
  },

  async shareScore() {
    if (!this._lastResults || !this.currentSong) return;
    const r = this._lastResults;
    const song = Songs.get(this.currentSong);
    if (!song) return;

    this.showToast('Generating card...', 'info', 1500);
    const blob = await this._renderShareCard(r, song);

    // Try native share with image (mobile → IG stories, WhatsApp, etc.)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'vocalstar-score.png', { type: 'image/png' });
      const shareData = { files: [file] };
      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (_) { /* user cancelled or failed, fall through to clipboard */ }
      }
    }

    // Desktop / fallback: copy image to clipboard
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      this.showToast('Score card copied to clipboard!', 'info', 2500);
    } catch (_) {
      // Last resort: download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vocalstar-score.png';
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Score card saved!', 'info', 2500);
    }
  },

  _renderShareCard(results, song) {
    const W = 1080, H = 1350; // 4:5 ratio — works for IG feed + stories
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // ---- Background: match results screen (#06060f → #0d1033) ----
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0a1e');
    bg.addColorStop(0.5, '#0d1033');
    bg.addColorStop(1, '#06060f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle glow orbs (match the results-bg orbs)
    const drawOrb = (x, y, r, color, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color.replace('1)', `${alpha})`));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    drawOrb(250, 350, 400, 'rgba(0,212,255,1)', 0.06);
    drawOrb(830, 1000, 450, 'rgba(123,47,255,1)', 0.05);

    // ---- Rank colors (match CSS rank classes) ----
    let rank, rankColor, rankBg;
    if (results.score >= 90) { rank = 'S RANK'; rankColor = '#ffd700'; rankBg = 'rgba(255,215,0,0.15)'; }
    else if (results.score >= 75) { rank = 'A RANK'; rankColor = '#00ff88'; rankBg = 'rgba(0,255,136,0.15)'; }
    else if (results.score >= 60) { rank = 'B RANK'; rankColor = '#00d4ff'; rankBg = 'rgba(0,212,255,0.15)'; }
    else if (results.score >= 40) { rank = 'C RANK'; rankColor = '#ff8844'; rankBg = 'rgba(255,136,68,0.15)'; }
    else { rank = 'D RANK'; rankColor = '#ff4444'; rankBg = 'rgba(255,68,68,0.15)'; }

    // Score ring color (match the scoreGrad gradient: cyan → purple)
    const ringStart = '#00d4ff';
    const ringEnd = '#7b2fff';

    // ---- Header: "Performance Complete!" ----
    ctx.textAlign = 'center';
    ctx.font = '700 48px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Performance Complete!', W / 2, 100);

    // ---- Song name ----
    ctx.font = '400 36px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    const titleLines = this._wrapText(ctx, `${song.title} - ${song.artist}`, W - 160);
    let ty = 160;
    for (const line of titleLines) {
      ctx.fillText(line, W / 2, ty);
      ty += 46;
    }

    // ---- Score circle (match the SVG ring from results screen) ----
    const cx = W / 2, cy = 420, cr = 160;
    // Track ring
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.strokeStyle = '#1a1a3e';
    ctx.lineWidth = 16;
    ctx.stroke();
    // Filled arc
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * results.score / 100);
    const arcGrad = ctx.createLinearGradient(cx - cr, cy, cx + cr, cy);
    arcGrad.addColorStop(0, ringStart);
    arcGrad.addColorStop(1, ringEnd);
    ctx.beginPath();
    ctx.arc(cx, cy, cr, startAngle, endAngle);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Score number
    ctx.font = '900 108px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(results.score.toString(), cx, cy + 36);
    // "POINTS" label
    ctx.font = '500 22px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.letterSpacing = '2px';
    ctx.fillText('POINTS', cx, cy + 70);

    // ---- Rank pill badge (match .score-rank styling) ----
    const rankW = ctx.measureText(rank).width + 60;
    ctx.font = '700 32px "Space Grotesk", sans-serif';
    const pillX = cx - rankW / 2, pillY = cy + 100;
    ctx.beginPath();
    const pillH = 48, pillR = 24;
    ctx.roundRect(pillX, pillY, rankW, pillH, pillR);
    ctx.fillStyle = rankBg;
    ctx.fill();
    ctx.fillStyle = rankColor;
    ctx.fillText(rank, cx, pillY + 34);

    // ---- Breakdown bars (match the gradient bars from results screen) ----
    const barX = 140, barW = W - 280, barH = 14, barR = 7;
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, '#00d4ff');
    barGrad.addColorStop(1, '#7b2fff');

    const drawBar = (label, value, valueText, y) => {
      // Label
      ctx.textAlign = 'left';
      ctx.font = '400 28px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(label, barX, y);
      // Value text
      ctx.textAlign = 'right';
      ctx.font = '600 28px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(valueText, barX + barW, y);
      // Bar background
      const barY = y + 14;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, barR);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      // Bar fill
      const fillW = Math.max(barR * 2, barW * (value / 100));
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, barR);
      ctx.fillStyle = barGrad;
      ctx.fill();
    };

    let barY = 720;
    const barSpacing = 80;
    if (results.hasRealMelody) {
      drawBar('Pitch Accuracy', results.pitchAccuracy, results.pitchAccuracy + '%', barY);
      barY += barSpacing;
    }
    drawBar('Vocal Coverage', results.coverage, results.coverage + '%', barY);
    barY += barSpacing;
    const streakPct = Math.min(100, (results.bestStreak / results.totalNotes) * 100);
    drawBar('Note Streak', streakPct, results.bestStreak.toString(), barY);

    // ---- Footer ----
    ctx.textAlign = 'center';
    ctx.font = '500 28px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('vocalstar.lol', W / 2, H - 60);

    return new Promise(resolve => c.toBlob(resolve, 'image/png'));
  },

  _wrapText(ctx, text, maxWidth) {
    const isCJK = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
    if (isCJK) {
      const lines = [];
      let line = '';
      for (const ch of text) {
        const test = line + ch;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = ch;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  },

  showLeaderboardForSong() {
    const songId = this.currentSong;
    this.showScreen('leaderboard');
    if (songId) {
      this.switchLeaderboardTab('song');
      const sel = document.getElementById('lb-song-select');
      if (sel) {
        sel.value = songId;
        this.loadSongLeaderboard(songId);
      }
    }
  },

  // ---- ANALYTICS ----
  // Lightweight event tracking — logs to Supabase `analytics` table.
  // Fire-and-forget; never blocks UI or throws.

  _trackEvent(event, data = {}) {
    try {
      const sb = _getSupabase();
      const user = Auth.getCurrent();
      sb.from('analytics').insert({
        event,
        data,
        user_id: user?.id || null,
        created_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {});
    } catch (e) { /* silent */ }
  },

  // ---- SING-OFF (async PvP) ----
  //
  // Lifecycle:
  //   1. Challenger plays a song, taps "Challenge a friend" on results.
  //   2. We create a sing_offs row with their score + a short unguessable id,
  //      then hand back a vocalstar.lol/?vs=<id> link to share.
  //   3. Opponent opens the link → app fetches the sing-off, shows the
  //      challenge banner, routes them straight to that song.
  //   4. After the opponent's session ends, we PATCH the same row with their
  //      score and flip status to 'complete', then show the VS results screen.
  //
  // The id is the only access control — it's 8 chars from a 62-char alphabet
  // (~10^14 combinations), public-readable by RLS. Anyone with the link can
  // see and play; you must be signed in to record a result.

  _activeSingOff: null,        // hydrated when ?vs=<id> is in the URL
  _pendingSingOffSongId: null, // song the opponent is about to play to settle a sing-off

  _shortId(len = 8) {
    const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < len; i++) s += alphabet[bytes[i] % alphabet.length];
    return s;
  },

  _gradeFromScore(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  },

  // Try to load a sing-off referenced in the URL (?vs=<id>) and stash it.
  // Called from init(). Tolerant of network errors — a flaky lookup just
  // means the user lands on home as normal.
  async _checkSingOffUrl() {
    const params = new URLSearchParams(location.search);
    const vsId = params.get('vs');
    if (!vsId) return;

    try {
      const sb = _getSupabase();
      const { data, error } = await this._withTimeout(
        sb.from('sing_offs').select('*').eq('id', vsId).maybeSingle(),
        this._LB_TIMEOUT_MS,
      );
      if (error) throw error;
      if (!data) {
        this.showToast('Challenge not found.', 'warn');
        return;
      }
      this._activeSingOff = data;

      // Surface the challenge UI based on its state.
      if (data.status === 'complete') {
        // Both sides done — jump straight to the VS results.
        this._showSingOffResults(data);
      } else {
        // Pending. If the current user IS the challenger, no-op (they already
        // see results). Otherwise show the accept banner.
        const me = Auth.getCurrent();
        if (!me || me.id !== data.challenger_id) {
          this._showSingOffBanner(data);
        }
      }
    } catch (e) {
      console.warn('Sing-off lookup failed:', e);
    }
  },

  // Render the "X challenged you to <song>" banner. Pinned to home screen.
  _showSingOffBanner(singOff) {
    const song = Songs.get(singOff.song_id);
    const songTitle = song ? song.title : singOff.song_id;
    const banner = document.getElementById('singoff-banner');
    if (!banner) return;
    const grade = singOff.challenger_grade || this._gradeFromScore(singOff.challenger_score);
    banner.innerHTML = `
      <div class="singoff-banner-avatar" style="background:${this._escapeHtml(singOff.challenger_color || '#00d4ff')}">
        ${this._escapeHtml(Auth._initialOf(singOff.challenger_name))}
      </div>
      <div class="singoff-banner-text">
        <div class="singoff-banner-title">${this._escapeHtml(singOff.challenger_name)} challenged you</div>
        <div class="singoff-banner-sub">Beat <b>${singOff.challenger_score}</b> (${grade}) on <b>${this._escapeHtml(songTitle)}</b></div>
      </div>
      <button class="btn btn-primary singoff-banner-cta" type="button" onclick="App.acceptSingOff()">Accept &rarr;</button>
      <button class="singoff-banner-dismiss" type="button" onclick="App.dismissSingOff()" aria-label="Dismiss">&times;</button>`;
    banner.hidden = false;
  },

  dismissSingOff() {
    const banner = document.getElementById('singoff-banner');
    if (banner) banner.hidden = true;
    // Clear from URL so a refresh doesn't keep re-showing it.
    if (history.replaceState) {
      const url = new URL(location.href);
      url.searchParams.delete('vs');
      history.replaceState(null, '', url.toString());
    }
    this._activeSingOff = null;
  },

  // Opponent tapped "Accept" — route them into the song with the sing-off
  // remembered so onGameEnd can settle the row.
  acceptSingOff() {
    const so = this._activeSingOff;
    if (!so) return;
    const song = Songs.get(so.song_id);
    if (!song) {
      this.showToast('Song not available.', 'error');
      return;
    }
    if (!Auth.isSignedIn()) {
      this.showToast('Sign in to accept a sing-off.', 'warn');
      this.showScreen('auth');
      return;
    }
    const me = Auth.getCurrent();
    if (me && me.id === so.challenger_id) {
      this.showToast("That's your own challenge — share the link!", 'warn');
      return;
    }
    this._pendingSingOffSongId = so.song_id;
    const banner = document.getElementById('singoff-banner');
    if (banner) banner.hidden = true;
    this.selectSong(so.song_id);
  },

  // Called from onGameEnd. If this game completed a sing-off the user
  // accepted, write their score back to the row and show VS results.
  async _settleSingOffIfNeeded(results) {
    const so = this._activeSingOff;
    if (!so || so.status !== 'pending') return false;
    if (this._pendingSingOffSongId !== so.song_id) return false;
    if (this.currentSong !== so.song_id) return false;

    const me = Auth.getCurrent();
    if (!me) return false;
    if (me.id === so.challenger_id) return false;

    const grade = this._gradeFromScore(results.score);

    try {
      const sb = _getSupabase();
      // Timeout-wrapped. If Supabase hangs, we'd otherwise freeze the game
      // screen forever because onGameEnd awaits this before _showResults.
      const { data, error } = await this._withTimeout(
        sb.from('sing_offs')
          .update({
            opponent_id: me.id,
            opponent_name: me.name || me.email || 'Singer',
            opponent_avatar: me.avatarUrl || null,
            opponent_color: me.color || '#7b2fff',
            opponent_score: Math.round(results.score),
            opponent_grade: grade,
            status: 'complete',
            completed_at: new Date().toISOString(),
          })
          .eq('id', so.id)
          .eq('status', 'pending')
          .select()
          .single(),
        this._LB_TIMEOUT_MS,
      );

      if (error) throw error;
      this._activeSingOff = data;
      this._pendingSingOffSongId = null;
      this._showSingOffResults(data);
      return true;
    } catch (e) {
      console.warn('Sing-off settle failed:', e);
      const msg = e && e.message === 'timeout'
        ? 'Sing-off save timed out. Showing your result.'
        : 'Could not record sing-off result.';
      this.showToast(msg, 'error');
      // Returning false lets the caller fall through to _showResults so the
      // user never stares at a frozen game screen.
      return false;
    }
  },

  // Challenger taps "Challenge a friend" on their own results screen.
  async createSingOffFromLastResult() {
    if (!this._lastResults || !this.currentSong) {
      this.showToast('Finish a song first.', 'warn');
      return;
    }
    if (!Auth.isSignedIn()) {
      this.showToast('Sign in to create a challenge.', 'warn');
      return;
    }
    const me = Auth.getCurrent();
    const id = this._shortId(8);
    const score = Math.round(this._lastResults.score);
    const grade = this._gradeFromScore(score);

    const btn = document.getElementById('btn-singoff-create');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

    try {
      const sb = _getSupabase();
      // Timeout-wrapped so a slow/flaky Supabase can't leave the button
      // stuck on "Creating..." forever. Same pattern as leaderboard + settle.
      const { error } = await this._withTimeout(
        sb.from('sing_offs').insert({
          id,
          song_id: this.currentSong,
          challenger_id: me.id,
          challenger_name: me.name || me.email || 'Singer',
          challenger_avatar: me.avatarUrl || null,
          challenger_color: me.color || '#00d4ff',
          challenger_score: score,
          challenger_grade: grade,
        }),
        this._LB_TIMEOUT_MS,
      );
      if (error) throw error;

      const url = `${location.origin}/?vs=${id}`;
      // Try native share, then fall back to clipboard.
      const song = Songs.get(this.currentSong);
      const shareText = `Sing-off! Beat my ${score} (${grade}) on ${song ? song.title : 'this song'} → ${url}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'VocalStar Sing-Off', text: shareText, url });
          this._trackEvent('singoff_create', { song_id: this.currentSong, score });
          return;
        } catch (e) {
          // user cancelled — fall through to clipboard
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        this.showToast('Challenge link copied!', 'info', 3000);
      } catch (e) {
        // Last resort — show the URL in a prompt.
        prompt('Copy this challenge link:', url);
      }
      this._trackEvent('singoff_create', { song_id: this.currentSong, score });
    } catch (e) {
      console.warn('Sing-off create failed:', e);
      this.showToast('Could not create challenge.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="btn-icon">&#9876;</span> Challenge a friend'; }
    }
  },

  // Render the side-by-side VS result screen.
  _showSingOffResults(so) {
    const song = Songs.get(so.song_id);
    const songTitle = song ? song.title : so.song_id;
    const songArtist = song ? song.artist : '';

    const me = Auth.getCurrent();
    // Determine viewer perspective so we can highlight "YOU".
    const youAreChallenger = me && me.id === so.challenger_id;
    const youAreOpponent = me && so.opponent_id && me.id === so.opponent_id;

    const cScore = so.challenger_score ?? 0;
    const oScore = so.opponent_score ?? 0;
    const cGrade = so.challenger_grade || this._gradeFromScore(cScore);
    const oGrade = so.opponent_grade || this._gradeFromScore(oScore);

    let outcomeText, outcomeClass;
    if (so.status !== 'complete' || so.opponent_score == null) {
      outcomeText = 'Waiting for opponent';
      outcomeClass = 'pending';
    } else if (oScore > cScore) {
      outcomeText = `${this._escapeHtml(so.opponent_name)} wins!`;
      outcomeClass = 'win-opponent';
    } else if (cScore > oScore) {
      outcomeText = `${this._escapeHtml(so.challenger_name)} wins!`;
      outcomeClass = 'win-challenger';
    } else {
      outcomeText = "It's a tie!";
      outcomeClass = 'tie';
    }

    const renderSide = (side, name, color, avatar, score, grade, isYou, isWinner) => {
      const initial = Auth._initialOf(name || 'Singer');
      const avatarStyle = avatar
        ? `background: url(${this._escapeHtml(avatar)}) center/cover`
        : `background: ${this._escapeHtml(color || '#00d4ff')}`;
      const avatarContent = avatar ? '' : initial;
      return `
        <div class="vs-side vs-${side}${isWinner ? ' is-winner' : ''}${isYou ? ' is-you' : ''}">
          <div class="vs-avatar" style="${avatarStyle}">${avatarContent}</div>
          <div class="vs-name">${this._escapeHtml(name || 'Waiting...')}${isYou ? ' <span class="vs-you-tag">YOU</span>' : ''}</div>
          <div class="vs-score">${score == null ? '—' : score}</div>
          <div class="vs-grade">${score == null ? '' : grade}</div>
          ${isWinner ? '<div class="vs-crown">&#9733;</div>' : ''}
        </div>`;
    };

    const cIsWinner = so.status === 'complete' && cScore > oScore;
    const oIsWinner = so.status === 'complete' && oScore > cScore;

    const html = `
      <div class="vs-header">
        <div class="vs-song-title">${this._escapeHtml(songTitle)}</div>
        <div class="vs-song-artist">${this._escapeHtml(songArtist)}</div>
      </div>
      <div class="vs-arena">
        ${renderSide('challenger', so.challenger_name, so.challenger_color, so.challenger_avatar,
                     cScore, cGrade, youAreChallenger, cIsWinner)}
        <div class="vs-divider">VS</div>
        ${renderSide('opponent', so.opponent_name, so.opponent_color, so.opponent_avatar,
                     so.opponent_score, oGrade, youAreOpponent, oIsWinner)}
      </div>
      <div class="vs-outcome vs-outcome-${outcomeClass}">${outcomeText}</div>
      <div class="vs-actions">
        <button class="btn btn-primary" type="button" onclick="App.showScreen('home'); App.dismissSingOff();">
          Done
        </button>
      </div>`;

    const container = document.getElementById('singoff-result-content');
    if (container) container.innerHTML = html;
    this.showScreen('singoff-result');
  },

  // Rematch flips the role: whichever side the viewer is on, they become the
  // new challenger and the other side becomes the (open) opponent.
  async singOffRematch() {
    const so = this._activeSingOff;
    if (!so) return this.showScreen('songs');
    // Just route the user back to the song — they create a fresh sing-off
    // when they finish, same as any normal score. Cleaner than auto-issuing.
    this._pendingSingOffSongId = null;
    this._activeSingOff = null;
    this.selectSong(so.song_id);
  },

  // ---- UTILS ----

  _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
