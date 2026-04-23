/* ==========================================
   App Shell - Screen management, routing, glue
   ========================================== */

const App = {

  currentScreen: 'home',
  currentSong: null,
  warmupActive: false,
  _warmupUnsub: null,
  _warmupFrame: null,

  // Stats (persisted in localStorage)
  stats: {
    sessions: 0,
    bestScore: 0,
    streak: 0,
    lastDate: null,
    songBests: {},
  },

  init() {
    this._loadStats();
    this._renderSongGrid();
    this._setupFilters();
    this._updateHomeStats();
    Game.init('game-canvas');
    this._preloadAudioTracks();
  },

  // Pre-load bundled audio tracks as backing music
  async _preloadAudioTracks() {
    for (const song of Songs.library) {
      if (song.audioSrc) {
        try {
          const response = await fetch(song.audioSrc);
          if (!response.ok) continue;
          const blob = await response.blob();
          const file = new File([blob], song.audioSrc.split('/').pop(), { type: 'audio/mpeg' });
          await Synth.loadAudioTrack(file);
          song._audioLoaded = true;
          console.log(`Loaded backing track: "${song.title}"`);
          this._renderSongGrid();
        } catch (e) {
          console.warn(`Failed to load ${song.audioSrc}:`, e);
        }
      }
    }
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
  },

  // ---- SONG SELECT ----

  _renderSongGrid(filter = 'all') {
    const grid = document.getElementById('song-grid');
    if (!grid) return;

    const songs = filter === 'all'
      ? Songs.library
      : Songs.library.filter(s => s.difficulty === filter);

    grid.innerHTML = songs.map(song => {
      const best = this.stats.songBests[song.id];
      const dur = Songs.getDuration(song);
      const mins = Math.floor(dur / 60);
      const secs = Math.floor(dur % 60);
      const hasTrack = song.hasAudioTrack;
      const trackLoaded = Synth.audioTrackLoaded;

      return `
        <div class="song-card" data-difficulty="${song.difficulty}" data-song-id="${song.id}">
          <div class="song-card-main" onclick="App.selectSong('${song.id}')">
            <div class="song-art" style="background: ${song.color}20; color: ${song.color}">
              ${song.icon}
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
          ${hasTrack ? `
          <div class="song-audio-upload">
            <label class="upload-btn ${song._analyzed ? 'loaded' : ''}" onclick="event.stopPropagation()">
              <input type="file" accept="audio/*" onchange="App.loadAndAnalyzeSong(this.files[0], '${song.id}')" hidden>
              ${song._analyzed ? '\u2713 Song Loaded & Analyzed' : '\uD83C\uDFB5 Load Song MP3'}
            </label>
            <span class="upload-hint">${song._analyzed ? 'Notes extracted from audio \u2014 ready to play!' : 'Upload the song \u2014 melody is auto-extracted'}</span>
            <span class="analyze-progress" id="progress-${song.id}" style="display:none">
              <span class="progress-bar-bg"><span class="progress-bar-fill" id="progress-fill-${song.id}"></span></span>
              <span class="progress-text" id="progress-text-${song.id}">Analyzing...</span>
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

    this.showScreen('game');
    Game.loadSong(songId);

    // Small delay to let screen render
    setTimeout(() => {
      Game._resize();
      Game.start();
    }, 100);
  },

  quitGame() {
    Game.stop();
    this.showScreen('songs');
  },

  replaySong() {
    if (this.currentSong) {
      this.selectSong(this.currentSong);
    }
  },

  onGameEnd() {
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
    this._showResults(results, song);
  },

  _showResults(results, song) {
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

    // Breakdown bars (animate after delay)
    setTimeout(() => {
      document.getElementById('bar-pitch').style.width = results.pitchAccuracy + '%';
      document.getElementById('val-pitch').textContent = results.pitchAccuracy + '%';
      document.getElementById('bar-timing').style.width = results.timing + '%';
      document.getElementById('val-timing').textContent = results.timing + '%';

      const streakPct = Math.min(100, (results.bestStreak / results.totalNotes) * 100);
      document.getElementById('bar-streak').style.width = streakPct + '%';
      document.getElementById('val-streak').textContent = results.bestStreak;
    }, 500);

    // Feedback text
    const feedback = this._generateFeedback(results);
    document.getElementById('feedback-text').textContent = feedback;

    // Reset ring for next time
    this._resetScoreRing = () => {
      ring.style.transition = 'none';
      ring.style.strokeDashoffset = circumference;
    };
  },

  _generateFeedback(results) {
    const { score, pitchAccuracy, timing, bestStreak, notesHit, totalNotes } = results;

    if (score >= 90) {
      return `Outstanding performance! Your pitch accuracy of ${pitchAccuracy}% is exceptional. You hit ${notesHit} out of ${totalNotes} notes with a best streak of ${bestStreak}. You're a natural!`;
    } else if (score >= 75) {
      return `Great singing! ${pitchAccuracy}% pitch accuracy shows strong ear training. ${bestStreak > 5 ? `Your streak of ${bestStreak} notes was impressive!` : 'Try to maintain longer streaks of on-pitch notes.'} Keep practicing to push into the 90s.`;
    } else if (score >= 60) {
      return `Good effort! You're hitting the right notes most of the time. Focus on the sections where your pitch drifted — try singing slower and really listening to each note before matching it. ${timing < 70 ? 'Make sure to start each note on time.' : ''}`;
    } else if (score >= 40) {
      return `Nice start! Singing takes practice. Try the warm-up exercises to get comfortable with matching pitches. ${pitchAccuracy < 50 ? 'Focus on hitting one note at a time — accuracy matters more than keeping up.' : 'Your pitch sense is developing — keep at it!'}`;
    } else {
      return `Everyone starts somewhere! Try the C Major Scale warm-up to practice matching notes one at a time. Sing softly and focus on listening to the guide tone, then matching it with your voice. You'll improve quickly with practice.`;
    }
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

  // ---- AUDIO TRACK UPLOAD ----

  async loadAndAnalyzeSong(file, songId) {
    if (!file) return;
    const song = Songs.get(songId);
    if (!song) return;

    // Show progress UI
    const progressEl = document.getElementById('progress-' + songId);
    const fillEl = document.getElementById('progress-fill-' + songId);
    const textEl = document.getElementById('progress-text-' + songId);
    if (progressEl) progressEl.style.display = 'flex';

    try {
      // Step 1: Load as backing track
      if (textEl) textEl.textContent = 'Loading audio...';
      if (fillEl) fillEl.style.width = '10%';

      const fileClone = new File([await file.arrayBuffer()], file.name, { type: file.type });
      const trackOk = await Synth.loadAudioTrack(file);

      // Step 2: Analyze melody
      if (textEl) textEl.textContent = 'Extracting melody...';
      const result = await AudioAnalyzer.analyze(fileClone, (progress) => {
        if (fillEl) fillEl.style.width = (10 + progress * 80) + '%';
        if (textEl && progress < 0.75) textEl.textContent = 'Detecting pitches...';
        else if (textEl && progress < 0.95) textEl.textContent = 'Building notes...';
      });

      if (fillEl) fillEl.style.width = '95%';
      if (textEl) textEl.textContent = 'Mapping lyrics...';

      // Update song with extracted notes
      const oldNotes = song.notes;
      const newNotes = result.notes;

      // Map existing lyrics onto new notes by nearest time position
      if (oldNotes.length > 0 && oldNotes[0].lyric) {
        const oldNotesInSec = Songs.getNotesInSeconds(song);
        const secPerBeat = 60 / result.bpm;

        for (const newNote of newNotes) {
          const newTimeSec = newNote.start * secPerBeat;
          // Find closest old note by time
          let bestDist = Infinity;
          let bestLyric = '';
          for (const oldNote of oldNotesInSec) {
            const dist = Math.abs(oldNote.start - newTimeSec);
            if (dist < bestDist) {
              bestDist = dist;
              bestLyric = oldNote.lyric;
            }
          }
          if (bestDist < 1.0 && bestLyric) {
            newNote.lyric = bestLyric;
          }
        }
      }

      song.notes = newNotes;
      song.bpm = result.bpm;
      song._analyzed = true;

      const dur = Songs.getDuration(song);
      console.log(`Audio analyzed: ${newNotes.length} notes, BPM: ${result.bpm}, duration: ${Math.round(dur)}s`);

      if (fillEl) fillEl.style.width = '100%';
      if (textEl) textEl.textContent = `Done! ${newNotes.length} notes extracted`;

      setTimeout(() => {
        if (progressEl) progressEl.style.display = 'none';
        this._renderSongGrid();
      }, 1500);

    } catch (e) {
      console.error('Analysis error:', e);
      if (progressEl) progressEl.style.display = 'none';
      alert('Could not analyze audio: ' + e.message);
    }
  },

  // ---- MICROPHONE ----

  async _ensureMic() {
    if (PitchDetector.isRunning) return true;

    // Check if we already have permission
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      if (result.state === 'granted') {
        return await PitchDetector.startMic();
      }
    } catch (e) {
      // permissions API not supported, try directly
    }

    // Show modal
    return new Promise(resolve => {
      this._micResolve = resolve;
      document.getElementById('mic-modal').classList.add('active');
    });
  },

  async requestMic() {
    document.getElementById('mic-modal').classList.remove('active');
    const ok = await PitchDetector.startMic();
    if (this._micResolve) {
      this._micResolve(ok);
      this._micResolve = null;
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

  _loadStats() {
    try {
      const saved = localStorage.getItem('vocalstar_stats');
      if (saved) this.stats = JSON.parse(saved);
    } catch (e) {}
  },

  _saveStats() {
    try {
      localStorage.setItem('vocalstar_stats', JSON.stringify(this.stats));
    } catch (e) {}
  },

  _updateHomeStats() {
    document.getElementById('stat-sessions').textContent = this.stats.sessions;
    document.getElementById('stat-best').textContent = this.stats.bestScore || '--';
    document.getElementById('stat-streak').textContent = this.stats.streak;
  },

  // ---- UTILS ----

  _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
