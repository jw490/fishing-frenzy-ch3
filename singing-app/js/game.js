/* ==========================================
   Game Engine
   Scrolling pitch visualizer + scoring
   ========================================== */

const Game = {

  canvas: null,
  ctx: null,
  song: null,
  notes: [],        // notes in seconds
  isPlaying: false,
  startTime: 0,
  currentTime: 0,
  duration: 0,
  animFrameId: null,

  // Scoring state
  currentStreak: 0,
  bestStreak: 0,
  noteScores: [],     // per-note scoring data
  pitchHistory: [],    // { time, midi, targetMidi }

  // Display settings
  VISIBLE_SECONDS: 10,   // seconds of notes visible at once
  PLAYHEAD_X: 0.25,      // playhead position (0-1 of canvas width)
  NOTE_HEIGHT: 0,        // computed per canvas
  MIDI_LOW: 57,          // A3
  MIDI_HIGH: 77,         // F5
  NOTE_RANGE: 20,

  // Colors
  COLORS: {
    bg: '#06060f',
    gridLine: 'rgba(255,255,255,0.03)',
    gridLineAccent: 'rgba(255,255,255,0.06)',
    noteLabel: 'rgba(255,255,255,0.12)',
    playhead: 'rgba(0,212,255,0.4)',
    noteFill: 'rgba(0,212,255,0.2)',
    noteStroke: 'rgba(0,212,255,0.6)',
    noteFillPast: 'rgba(255,255,255,0.05)',
    noteStrokePast: 'rgba(255,255,255,0.15)',
    pitchGood: '#00ff88',
    pitchOk: '#ffd700',
    pitchBad: '#ff4444',
    pitchLine: 'rgba(0,212,255,0.15)',
    trail: '#00d4ff',
  },

  // Detected pitch state
  currentPitch: { freq: -1, midi: -1 },

  // Particle effects
  particles: [],
  _lastParticleTime: 0,
  _consecutiveGoodFrames: 0,

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());
  },

  _resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const hudHeight = document.querySelector('.game-hud')?.offsetHeight || 60;
    // Lyrics bar may be hidden (e.g. has-mv mode) — don't count it when display:none.
    const lyricsEl = document.querySelector('.lyrics-bar');
    const lyricsHeight = (lyricsEl && getComputedStyle(lyricsEl).display !== 'none')
      ? (lyricsEl.offsetHeight || 0) : 0;
    // For has-mv-lyrics mode the video sits above the canvas — subtract its rendered height.
    const mvEl = document.getElementById('game-mv');
    const mvHeight = (mvEl && getComputedStyle(mvEl).display !== 'none' && mvEl.offsetHeight > 0)
      ? mvEl.offsetHeight : 0;
    const h = Math.max(80, window.innerHeight - hudHeight - lyricsHeight - mvHeight);

    const dpr = window.devicePixelRatio;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = h + 'px';
    // setTransform resets then applies — prevents cumulative scaling on
    // repeated resize calls (phone rotation, window drag, etc.)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.displayWidth = rect.width;
    this.displayHeight = h;
    this.NOTE_HEIGHT = this.displayHeight / this.NOTE_RANGE;
  },

  loadSong(songId) {
    this.song = Songs.get(songId);
    if (!this.song) return false;

    this.notes = Songs.getNotesInSeconds(this.song);
    this.duration = Songs.getDuration(this.song);

    // Reset per-song scoring caches so stale state from a previous song
    // doesn't bleed into the new one.
    this._melodyIdx = 0;
    this._streakBadFrames = 0;
    this._consecutiveGoodFrames = 0;

    // For lyricsMode: expand lyric lines into per-syllable bars with melodic contour
    if (this.song.lyricsMode) {
      // Seed the MIDI range from the song's melody so _expandToSyllables has
      // a reasonable fallback lane-center value. We'll re-derive the real
      // range from the expanded bars below.
      if (this.song.melody && this.song.melody.length > 0) {
        let mLo = 999, mHi = 0;
        for (const m of this.song.melody) {
          if (m.midi < mLo) mLo = m.midi;
          if (m.midi > mHi) mHi = m.midi;
        }
        this.MIDI_LOW = mLo;
        this.MIDI_HIGH = mHi;
      } else {
        this.MIDI_LOW = 58;
        this.MIDI_HIGH = 78;
      }

      if (this.notes.length > 0) {
        this.syllableBars = this._expandToSyllables(this.notes);
      } else if (this.song.lyrics && this.song.lyricTimes && this.song.lyricTimes.length > 0) {
        // Newer songs use per-char lyricTimes instead of notes[]. Build bars
        // and synthetic scoring windows directly from that data.
        const built = this._buildBarsFromLyricTimes();
        this.syllableBars = built.bars;
        this.notes = built.notes;
      }

      // Now fit the visible lane to the actual bars that will be drawn.
      // This matters because hardcoded bounds (e.g. 58–78) crush songs whose
      // melody sits in 48–64 against the bottom edge, and clip anything
      // below 58 off the canvas entirely — the user sees empty space where
      // they should be singing, which is the bug that prompted this fix.
      if (this.syllableBars.length > 0) {
        let lo = 999, hi = 0;
        for (const b of this.syllableBars) {
          if (b.midi < lo) lo = b.midi;
          if (b.midi > hi) hi = b.midi;
        }
        // Pad 3 semitones on each side so bars aren't flush against the edges,
        // and enforce a minimum 14-semitone window so short-range songs still
        // look like a real staff rather than a single squashed line.
        const MIN_RANGE = 14;
        let range = hi - lo;
        if (range < MIN_RANGE) {
          const center = (hi + lo) / 2;
          lo = Math.round(center - MIN_RANGE / 2);
          hi = Math.round(center + MIN_RANGE / 2);
        }
        this.MIDI_LOW = lo - 3;
        this.MIDI_HIGH = hi + 3;
      }
      this.NOTE_RANGE = this.MIDI_HIGH - this.MIDI_LOW;
      this.NOTE_HEIGHT = this.displayHeight / this.NOTE_RANGE;
    }

    // Reset scoring
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.noteScores = this.notes.map(() => ({ hit: false, pitchAcc: 0, samples: 0, totalCents: 0 }));
    this.pitchHistory = [];
    this.particles = [];
    this._consecutiveGoodFrames = 0;
    this._lastParticleTime = 0;
    this._melodyIdx = 0;
    this._barIdx = 0;
    this._countdownDone = false;
    this._countdownLast = '';
    this._rollingAcc = [];
    // Lyric cursor — reset so char-level display starts fresh on replay
    this._lyricLineIdx = -1;
    this._lyricPosInLine = -1;
    // Melody-cursor pitch scoring accumulators (renamed from _mvVoicedFrames/_mvTotalFrames).
    // _mvWeightedAcc: sum of per-frame accuracy scores (0–1 each).
    // _mvScoredFrames: count of frames inside an active melody segment.
    this._mvWeightedAcc = 0;
    this._mvScoredFrames = 0;
    // Clear _streakHit flags on melody segments so replay starts fresh.
    if (this.song && this.song.melody) {
      for (const seg of this.song.melody) delete seg._streakHit;
    }
    this.liveScore = 0;
    this._comboLevel = 0;
    this._lastStreakMilestone = 0;
    this._lastScoredLineIdx = -1;
    if (this._gradeBombTimer) { clearTimeout(this._gradeBombTimer); this._gradeBombTimer = null; }

    // Original-audio mode: user turned karaoke OFF on a karaoke-capable song.
    // The mic picks up the original singer's voice bleeding from the speakers,
    // which the pitch detector can't cleanly separate from the user's voice.
    // Grading pitch in this mode produces artificially low / meaningless numbers,
    // so we switch to presence-only scoring and tell the user honestly.
    this._isKaraokeOff = !!(this.song && this.song.stripVocals &&
                            typeof App !== 'undefined' && App.isKaraokeOn &&
                            !App.isKaraokeOn(this.song));

    return true;
  },

  start() {
    this._resize();
    this.isPlaying = true;
    this.startTime = performance.now() / 1000;
    this.currentTime = 0;

    // Listen for pitch data
    this._pitchUnsub = PitchDetector.onPitch(data => {
      this.currentPitch = data;
      if (data.freq > 0) {
        this._scorePitch(data);
      }
    });

    // Inform user when scoring is presence-only due to original audio bleed
    if (this._isKaraokeOff) {
      setTimeout(() => {
        if (typeof App !== 'undefined') {
          App.showToast('Original audio: timing score only. Enable Karaoke Mode for pitch scoring.', 'info', 4000);
        }
      }, 1500);
    }

    // Start backing music.
    // MV songs: video provides audio only when karaoke is OFF (_isKaraokeOff=true).
    // When karaoke is ON, Synth still plays the instrumental stem normally.
    // lyricsMode songs strip the video entirely — Synth always handles audio regardless
    // of karaoke state, so they must never be treated as mvAudioActive.
    const mvAudioActive = !!(this.song.mvSrc && !this.song.lyricsMode && this._isKaraokeOff);
    if (!mvAudioActive) {
      Synth.playSong(this.song.id, this.song.bpm);
    }

    this._gameLoop();
  },

  stop() {
    this.isPlaying = false;
    if (this._pitchUnsub) this._pitchUnsub();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this._gradeBombTimer) { clearTimeout(this._gradeBombTimer); this._gradeBombTimer = null; }
    const _bombEl = document.getElementById('grade-bomb');
    if (_bombEl) _bombEl.classList.remove('bomb-show');
    // MV karaoke-OFF: audio came from the video element, not Synth — don't stop what wasn't started.
    // lyricsMode songs always use Synth (no video), so they are never wasMvAudio.
    const wasMvAudio = !!(this.song && this.song.mvSrc && !this.song.lyricsMode && this._isKaraokeOff);
    if (!wasMvAudio) Synth.stop();
  },

  // Called by App.skipForward after Synth.seekBy jumps the audio buffer.
  // The game clock is already slaved to Synth.getPlaybackTime(), so the
  // visible bars will update on the next RAF automatically. But our
  // scoring state caches need to be rewound/fast-forwarded so notes the
  // user skipped past don't count as "missed" in the final results.
  onSeek(newTime) {
    if (!this.isPlaying) return;

    // Mark every note that ends before the new time as "skipped" — we
    // neither reward nor punish it. Implementation: give it zero samples,
    // which puts it in the "silent" / "missed" bucket in results. That's
    // the honest call: we literally have no data for those windows. If
    // the user mashes skip, their coverage metric goes down — which is
    // fair, because they didn't sing that part.
    // (We do NOT retroactively credit skipped notes, because the whole
    // app's point is to measure what the user actually sang.)
    // For already-finished notes, leave them alone; for in-flight notes
    // partially past the new time, also leave them — the game loop will
    // keep scoring them if they're still within their window.

    // Advance the melody cursor used by _scorePitch so its monotonic
    // march doesn't have to walk frame-by-frame from 0 up to newTime.
    if (this.song && this.song.melody && this.song.melody.length > 0) {
      const melody = this.song.melody;
      let idx = 0;
      while (idx < melody.length - 1 && melody[idx].start + melody[idx].dur < newTime - 0.15) idx++;
      this._melodyIdx = idx;
    }

    // Advance the syllable-bar cursor to the new time.
    if (this.syllableBars && this.syllableBars.length > 0) {
      let bi = 0;
      while (bi < this.syllableBars.length - 1 &&
             this.syllableBars[bi].start + this.syllableBars[bi].dur + 0.1 < newTime) bi++;
      this._barIdx = bi;
    }

    // Reset the streak bad-frame counter so the user doesn't catch a
    // spurious streak break right after the jump.
    this._streakBadFrames = 0;
    this._consecutiveGoodFrames = 0;
    this._rollingAcc = [];
  },

  getResults() {
    // Is this song grading real pitch, or just timing/presence?
    // Pitch grading requires BOTH a real extracted melody AND accurate
    // lyric-window timings in notes[]. A song can explicitly opt out via
    // `pitchGradingReady: false` when its notes[] hasn't been synced yet —
    // without accurate windows, the per-syllable cents grading is noise
    // and we'd be shipping a fake pitch number.
    const hasMelodyData = !!(this.song && this.song.melody && this.song.melody.length > 0);
    const pitchGradingReady = !this.song || this.song.pitchGradingReady !== false;
    // Real pitch grading requires: melody data + pitchGradingReady + karaoke on
    // + actual notes[] windows to score against. Without notes[], syllableBars
    // is empty and _scorePitch never accumulates noteScores — so rawAccuracy = 0
    // and the pitch formula gives much lower scores than presence scoring would.
    const hasNoteWindows = this.notes && this.notes.length > 0;
    const hasRealMelody = hasMelodyData && pitchGradingReady && !this._isKaraokeOff && hasNoteWindows;
    const isLyricsMode = !!(this.song && this.song.lyricsMode);
    const isKaraokeOff = !!this._isKaraokeOff;

    // Presence: how often the user sang during each note window
    let totalPresence = 0;
    let scoredNotes = 0;
    for (const ns of this.noteScores) {
      if (ns.samples > 0) {
        totalPresence += ns.pitchAcc / ns.samples;
        scoredNotes++;
      }
    }
    // Raw metric from the scoring loop. When melody exists it's real pitch
    // accuracy (cents-based). When no melody, it's just "were you vocalising"
    // (0.8 credit per sample). We'll split these into honest fields below.
    const rawAccuracy = scoredNotes > 0 ? (totalPresence / scoredNotes) * 100 : 0;

    // Coverage: how many lyric windows the user sang during at all.
    // For MV songs with no lyric windows, fall back to global frame presence.
    const notesAttempted = this.noteScores.filter(n => n.samples > 0).length;
    const coverage = this.notes.length > 0
      ? (notesAttempted / this.notes.length) * 100
      : (this._mvScoredFrames > 0 ? (this._mvWeightedAcc / this._mvScoredFrames) * 100 : 0);

    // Combined score formula differs based on whether we have real pitch
    let combined;
    if (hasRealMelody) {
      // Real pitch grading.
      // Target curve: average singer (~55% acc, 75% cov) → ~71,
      // good (~72% acc, 85% cov) → ~85, 95+ requires ~90% acc + 97% cov + full streak.
      // Base of 20 lifts the floor; reduced multipliers compress the ceiling.
      combined = Math.round(20 + rawAccuracy * 0.50 + coverage * 0.25 + Math.min(this.bestStreak / 10, 1) * 10);
    } else if (isKaraokeOff) {
      // Original audio — can't grade pitch (singer's voice bleeds into mic).
      // Presence-only: give credit for coverage and streak, but cap at 75 so
      // "sang the whole song with karaoke off" never looks like a perfect score.
      // The toast already tells the user to enable Karaoke Mode for pitch grading.
      combined = Math.min(75, Math.round(coverage * 0.65 + Math.min(this.bestStreak / 10, 1) * 10));
    } else {
      // No melody data (all MV / lyricsMode songs): score is coverage + streak.
      // Target curve: average (~65% cov, streak 6) → ~71, good (~80% cov, streak 8) → ~84,
      // 95+ requires ~92% cov + full streak (genuinely hard).
      combined = Math.round(20 + coverage * 0.65 + Math.min(this.bestStreak / 10, 1) * 15);
    }

    // Per-note breakdown. Status labels differ based on whether we're grading
    // real pitch or just timing/presence.
    const perNote = [];
    for (let i = 0; i < this.notes.length; i++) {
      const n = this.notes[i];
      const ns = this.noteScores[i];
      const avgAcc = ns.samples > 0 ? ns.pitchAcc / ns.samples : 0;
      const avgCents = ns.samples > 0 && ns.totalCents > 0 ? ns.totalCents / ns.samples : 0;
      let status;
      if (hasRealMelody) {
        if (ns.samples === 0) status = 'missed';
        else if (avgAcc >= 0.85) status = 'perfect';
        else if (avgAcc >= 0.6) status = 'good';
        else if (avgAcc >= 0.3) status = 'off';
        else status = 'wrong';
      } else {
        // Timing-only grading: only honest statuses are "sang" or "silent"
        if (ns.samples === 0) status = 'silent';
        else status = 'sang';
      }
      perNote.push({
        index: i,
        start: n.start,
        lyric: (n.lyric || '').trim(),
        accuracy: Math.round(avgAcc * 100),
        cents: Math.round(avgCents),
        status,
        hit: ns.hit,
      });
    }

    return {
      score: Math.min(100, Math.max(0, combined)),
      // Only populated when melody data exists. `null` means "we didn't grade
      // pitch — don't show a number for it."
      pitchAccuracy: hasRealMelody ? Math.round(rawAccuracy) : null,
      // Always honest: how many lyric windows the user sang during
      coverage: Math.round(coverage),
      // Legacy field kept for backwards compat — matches `coverage`
      timing: Math.round(coverage),
      bestStreak: this.bestStreak,
      notesHit: notesAttempted,
      totalNotes: this.notes.length,
      perNote,
      isLyricsMode,
      hasRealMelody,
      isKaraokeOff,
    };
  },

  // ---- INTERNAL ----

  _scorePitch(data) {
    const time = this.currentTime;
    const isLyricsMode = this.song && this.song.lyricsMode;

    // ---- Adaptive noise floor — runs first, gates ALL scoring paths ----
    // Problem: echo cancellation is disabled for pitch accuracy, so karaoke
    // instrumentals (clean piano/guitar) bleed through speakers into the mic
    // Only record to trail if confidence is high enough to be a real voice.
    // Threshold lowered from 0.35 → 0.15: early frames can be slightly noisier.
    if (data.confidence >= 0.15) {
      this.pitchHistory.push({ time, midi: data.midi, consec: 0 });
    }
    // Evict stale entries in one splice() instead of repeated shift() calls.
    // Find how many leading entries have expired, then remove them all at once.
    const cutoff = time - this.VISIBLE_SECONDS;
    let evict = 0;
    while (evict < this.pitchHistory.length && this.pitchHistory[evict].time < cutoff) evict++;
    if (evict > 0) this.pitchHistory.splice(0, evict);

    // --- LYRICS MODE: score against per-syllable quantized target pitch ---
    //
    // Why: the raw extracted melody (pYIN on Demucs stem) is a frame-by-frame
    // f0 contour that wiggles with the original singer's vibrato, slides and
    // ornaments. Comparing a user's steady pitch to that moving target made
    // perfect singers score ~45-80%: every frame that caught the wiggle
    // landed 100-300 cents "off" even though the note was right.
    //
    // Fix: at load time we collapsed the melody into one dominant MIDI per
    // syllable (syllableBars). One lyric = one pitch target. A steady
    // perfect singer now scores 100. A singer a semitone flat still scores 75.
    if (isLyricsMode && this.syllableBars) {
      // Find the active syllable bar. Small ±0.1s grace window.
      // Cursor walk forward — bars are sorted by start time.
      let idx = this._barIdx || 0;
      while (idx < this.syllableBars.length - 1 &&
             this.syllableBars[idx].start + this.syllableBars[idx].dur + 0.1 < time) {
        idx++;
      }
      this._barIdx = idx;
      let activeBar = null;
      for (let k = idx; k < Math.min(this.syllableBars.length, idx + 4); k++) {
        const b = this.syllableBars[k];
        if (time >= b.start - 0.1 && time <= b.start + b.dur + 0.1) {
          activeBar = b;
          break;
        }
      }
      if (!activeBar) {
        // No lyric windows — use melody[] as real-time pitch reference.
        // Old approach (confidence >= 0.3) let instrumental bleed count as
        // "voiced", locking every song at ~85. Now we only score frames that
        // fall inside an active melody segment and require the user to sing
        // close to the target MIDI. Frames outside melody segments are gaps
        // (instrumentals / rests) and don't affect the score either way.
        if (this.syllableBars.length === 0 && this.currentTime > 3) {
          const mel = this.song && this.song.melody;
          if (mel && mel.length > 0) {
            // Advance cursor — melody is time-sorted, walk forward only.
            while (this._melodyIdx < mel.length - 1 &&
                   mel[this._melodyIdx].start + mel[this._melodyIdx].dur + 0.15 < time) {
              this._melodyIdx++;
            }
            // Find the active segment (small ±0.1s grace window).
            let activeSeg = null;
            for (let k = this._melodyIdx; k < Math.min(mel.length, this._melodyIdx + 5); k++) {
              const s = mel[k];
              if (time >= s.start - 0.1 && time <= s.start + s.dur + 0.1) {
                activeSeg = s;
                break;
              }
              if (s.start > time + 0.6) break; // nothing upcoming soon
            }
            if (activeSeg) {
              // Singing window — score pitch accuracy.
              // _mvScoredFrames: frames inside an active melody segment.
              // _mvWeightedAcc: weighted accuracy sum (0–1 per frame).
              this._mvScoredFrames++;
              // Require confidence >= 0.5 to reject instrumental bleed
              // (music notes trigger pitch detector at ~0.2–0.4, real voice ≥ 0.5).
              if (data.confidence >= 0.5) {
                let sung = data.midi;
                const tgt = activeSeg.midi;
                // Fold to nearest octave so male/female both score correctly.
                while (sung - tgt > 6) sung -= 12;
                while (tgt - sung > 6) sung += 12;
                const cents = Math.abs((sung - tgt) * 100);
                // Same thresholds as the syllableBars pitch path above.
                const acc = cents < 80  ? 1.0
                          : cents < 160 ? 0.75
                          : cents < 320 ? 0.35
                          : 0;
                this._mvWeightedAcc += acc;
                // Streak tracking: hitting the note keeps combo alive.
                if (acc >= 0.7) {
                  this._consecutiveGoodFrames++;
                  this._streakBadFrames = 0;
                  // Only tick streak once per segment (use activeSeg as a key).
                  if (!activeSeg._streakHit) {
                    activeSeg._streakHit = true;
                    this.currentStreak++;
                    if (this.currentStreak > this.bestStreak) this.bestStreak = this.currentStreak;
                  }
                } else if (acc === 0 && data.confidence >= 0.5) {
                  // Sung but badly wrong pitch — soft-reset streak.
                  this._consecutiveGoodFrames = 0;
                  this._streakBadFrames = (this._streakBadFrames || 0) + 1;
                  if (this._streakBadFrames >= 3) {
                    this.currentStreak = 0;
                    this._streakBadFrames = 0;
                  }
                }
              }
              // confidence < 0.5 (not singing): _mvTotalFrames++ already counted,
              // no accuracy credited — correctly lowers coverage.
            }
            // Outside active segment (gap/instrumental): no scoring at all.
          } else {
            // No melody data: legacy presence with raised threshold.
            this._mvScoredFrames++;
            if (data.confidence >= 0.65) this._mvWeightedAcc++;
          }
        }
        return;
      }

      const lineIdx = activeBar.lineIdx;
      const targetMidi = activeBar.timingOnly ? -1 : activeBar.midi;

      // Filter out low-confidence noise (instruments, breath, etc.)
      // Noise floor gate is already applied above — this catches remaining
      // low-confidence frames that passed the volume test.
      if (data.confidence < 0.15) return;

      let acc = 0;
      let centsDiff = 0;
      if (this._isKaraokeOff || targetMidi <= 0) {
        // Original-audio mode OR no melody reference → presence-only.
        // Require much higher confidence here: we're just detecting "is the
        // user actively singing" with no pitch reference. 0.15 lets ambient
        // room noise score freely. 0.6 filters it out while still catching
        // genuine (even quiet) singing.
        if (data.confidence < 0.6) return;
        acc = 0.8;
      } else {
        // Normal pitch scoring against extracted melody target.
        // Fold user pitch to nearest octave of target. Male/female voices
        // can both sing along naturally without octave penalty.
        let sung = data.midi;
        while (sung - targetMidi > 6) sung -= 12;
        while (targetMidi - sung > 6) sung += 12;
        centsDiff = Math.abs(sung - targetMidi) * 100;
        if (centsDiff < 80) acc = 1.0;
        else if (centsDiff < 160) acc = 0.75;
        else if (centsDiff < 320) acc = 0.35;
        else acc = 0;
      }

      // Accumulate onto the line-level noteScores (used by getResults).
      this.noteScores[lineIdx].pitchAcc += acc;
      this.noteScores[lineIdx].samples++;
      if (targetMidi > 0) this.noteScores[lineIdx].totalCents += centsDiff;

      // Per-bar hit flag for the canvas bar renderer.
      if (acc >= 0.7) activeBar.hit = true;

      // Rolling accuracy window for the color-coded active-lyric feedback.
      // Last ~1s of frames keeps the signal responsive without flickering.
      this._rollingAcc = this._rollingAcc || [];
      this._rollingAcc.push({ t: time, acc });
      while (this._rollingAcc.length > 0 && this._rollingAcc[0].t < time - 1.0) {
        this._rollingAcc.shift();
      }

      // Streak tracking.
      if (acc >= 0.7 && !this.noteScores[lineIdx].hit) {
        this.noteScores[lineIdx].hit = true;
        this.currentStreak++;
        if (this.currentStreak > this.bestStreak) this.bestStreak = this.currentStreak;
        this._streakBadFrames = 0;
      } else if (acc < 0.3) {
        // Soft reset: require 3 consecutive bad frames.
        this._streakBadFrames = (this._streakBadFrames || 0) + 1;
        if (this._streakBadFrames >= 3) {
          this.currentStreak = 0;
          this._streakBadFrames = 0;
        }
      } else {
        this._streakBadFrames = 0;
      }

      // Particles on good pitch.
      if (acc >= 0.7) {
        this._consecutiveGoodFrames++;
        const now = performance.now();
        const throttle = acc >= 0.95 ? 50 : 80; // perfect notes spawn faster
        if (now - this._lastParticleTime > throttle) {
          this._lastParticleTime = now;
          const playheadX = this.displayWidth * this.PLAYHEAD_X;
          const py = this._midiToY(data.midi);
          // More particles the longer you hold a good note
          const intensity = this._consecutiveGoodFrames > 15 ? 6
                          : this._consecutiveGoodFrames > 8  ? 4
                          : this._consecutiveGoodFrames > 3  ? 2 : 1;
          const isPerfect = acc >= 0.95;
          for (let p = 0; p < intensity; p++) {
            this.particles.push({
              x: playheadX + (Math.random() - 0.5) * 24,
              y: py + (Math.random() - 0.5) * 18,
              vx: (Math.random() - 0.5) * 4 + 2,
              vy: (Math.random() - 0.5) * 4 - 1.5,
              life: 1.0,
              decay: isPerfect ? 0.012 + Math.random() * 0.008 : 0.018 + Math.random() * 0.012,
              size: isPerfect ? 6 + Math.random() * 8 : 4 + Math.random() * 6,
              type: isPerfect ? 'perfect' : 'good',
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.2,
            });
          }
        }
      } else {
        this._consecutiveGoodFrames = 0;
      }

      // Stamp the consecutive good-frame count into the pitch history entry
      // so the trail renderer can color it (blue → green → gold → orange).
      const _lastPH = this.pitchHistory[this.pitchHistory.length - 1];
      if (_lastPH) _lastPH.consec = acc >= 0.7 ? this._consecutiveGoodFrames : 0;

      // Streak milestone grade bombs (fired once per crossing).
      const _MILESTONES = [5, 10, 20, 30];
      for (const _m of _MILESTONES) {
        if (this.currentStreak >= _m && (this._lastStreakMilestone || 0) < _m) {
          this._lastStreakMilestone = _m;
          const playheadX = this.displayWidth * this.PLAYHEAD_X;
          const py = this._midiToY(data.midi);
          if (_m === 5)  { this._showGradeBomb(this._pickMsg('streak5'), '#00ff88', false); this._burstParticles(playheadX, py, 12, 'good'); }
          if (_m === 10) { this._showGradeBomb(this._pickMsg('streak10'), '#ffd700', true);  this._burstParticles(playheadX, py, 22, 'perfect'); }
          if (_m === 20) { this._showGradeBomb(this._pickMsg('streak20'), '#ff6b35', true);  this._burstParticles(playheadX, py, 35, 'legend'); }
          if (_m === 30) { this._showGradeBomb(this._pickMsg('streak30'), '#ff00ff', true);  this._burstParticles(playheadX, py, 50, 'legend'); }
        }
      }
      if (this.currentStreak === 0) this._lastStreakMilestone = 0;

      // Line-completion grade bomb: fires when we transition to a new lyric line
      // and the just-finished line was sung well. Skipped if a streak bomb is live.
      if (this._lastScoredLineIdx >= 0 && lineIdx !== this._lastScoredLineIdx) {
        const _prevNs = this.noteScores[this._lastScoredLineIdx];
        if (_prevNs && _prevNs.samples > 0 && !this._gradeBombTimer) {
          const _avgAcc = _prevNs.pitchAcc / _prevNs.samples;
          if (_avgAcc >= 0.88) this._showGradeBomb(this._pickMsg('perfect'), '#ffd700');
          else if (_avgAcc >= 0.70) this._showGradeBomb(this._pickMsg('good'), '#00ff88');
        }
      }
      this._lastScoredLineIdx = lineIdx;

      return;
    }
  },

  _gameLoop() {
    if (!this.isPlaying) return;

    // Clock source hierarchy:
    //
    // 1. MV mode → slave to the <video> element's currentTime.
    //    The video plays on real wall-clock time and is completely independent
    //    of AudioContext, so this is the most accurate reference for what the
    //    user is actually watching. The instrumental audio is just played on
    //    top; scoring windows must follow the video, not the audio clock.
    //
    // 2. Synth audio → slave to the audio buffer's playback position.
    //    performance.now() drifts from AudioContext.currentTime due to separate
    //    monotonic clocks, output latency, and RAF stutters.
    //
    // 3. Wall clock fallback for Synth-only / no-buffer songs.
    const mvEl = document.getElementById('game-mv');
    const isMvActive = !!(this.song && this.song.mvSrc && mvEl && !mvEl.paused);
    if (isMvActive) {
      this.currentTime = mvEl.currentTime;
    } else {
      const audioTime = (typeof Synth !== 'undefined') ? Synth.getPlaybackTime() : null;
      if (audioTime != null) {
        this.currentTime = audioTime;
      } else {
        const now = performance.now() / 1000;
        this.currentTime = now - this.startTime;
      }
    }

    // Check if song is over
    if (this.currentTime > this.duration + 1.5) {
      this.stop();
      if (typeof App !== 'undefined') App.onGameEnd();
      return;
    }

    this._draw();
    this._updateHUD();
    this._updateCountdown();

    this.animFrameId = requestAnimationFrame(() => this._gameLoop());
  },

  _draw() {
    const ctx = this.ctx;
    const W = this.displayWidth;
    const H = this.displayHeight;
    const time = this.currentTime;

    // Clear
    ctx.fillStyle = this.COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    const playheadX = W * this.PLAYHEAD_X;
    const pxPerSec = W / this.VISIBLE_SECONDS;

    const isLyricsMode = this.song && this.song.lyricsMode;

    // Scrolling syllable bars with playhead
    this._drawLyricsModeBars(ctx, W, H, time, playheadX, pxPerSec);

    // Draw particles
    this._drawParticles(ctx);

    // Progress bar at bottom
    const progress = Math.min(1, this.currentTime / this.duration);
    ctx.fillStyle = 'rgba(0,212,255,0.15)';
    ctx.fillRect(0, H - 3, W, 3);
    ctx.fillStyle = 'rgba(0,212,255,0.6)';
    ctx.fillRect(0, H - 3, W * progress, 3);
  },

  _drawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.05; // slight upward drift
      p.life -= p.decay;
      p.rotation += p.rotSpeed;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.life * 0.9;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      const color = p.type === 'legend' ? '#ff00ff' : p.type === 'perfect' ? '#ffd700' : '#00ff88';
      const glowColor = p.type === 'legend' ? 'rgba(255,0,255,' : p.type === 'perfect' ? 'rgba(255,215,0,' : 'rgba(0,255,136,';

      ctx.shadowColor = color;
      ctx.shadowBlur = 8 * p.life;

      // Draw star shape
      const s = p.size * (0.5 + p.life * 0.5);
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const method = j === 0 ? 'moveTo' : 'lineTo';
        // Outer point
        ctx[method](
          Math.cos((j * 2 * Math.PI) / 5 - Math.PI / 2) * s,
          Math.sin((j * 2 * Math.PI) / 5 - Math.PI / 2) * s
        );
        // Inner point
        ctx.lineTo(
          Math.cos((j * 2 * Math.PI) / 5 + Math.PI / 5 - Math.PI / 2) * s * 0.4,
          Math.sin((j * 2 * Math.PI) / 5 + Math.PI / 5 - Math.PI / 2) * s * 0.4
        );
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Cap particle count (allow more for burst moments)
    if (this.particles.length > 250) {
      this.particles.splice(0, this.particles.length - 250);
    }
  },

  /**
   * Build syllableBars and synthetic scoring notes from song.lyrics / song.lyricTimes.
   * Used for all lyricsMode songs (notes: [] / char_align pipeline).
   *
   * Improvements over v1:
   *  - Melody cursor walks forward only (O(n+m) instead of O(n*m))
   *  - Per-line median octave correction — pYIN subharmonic errors get snapped back
   *  - Isolated-spike smoother — a single outlier bar surrounded by distant neighbours
   *    gets averaged out, removing visual noise between adjacent chars
   */
  _buildBarsFromLyricTimes() {
    const song     = this.song;
    const lyrics   = song.lyrics;
    const times    = song.lyricTimes;
    const melody   = song.melody;
    const hasMelody = !!(melody && melody.length > 0);
    const laneMidi  = Math.round((this.MIDI_LOW + this.MIDI_HIGH) / 2);

    // --- Melody cursor: advance-only, O(n) amortised over all calls. ---
    let cur = 0;
    const pickMidi = (start, end) => {
      if (!hasMelody) return null;
      // Skip past segments that ended before our window.
      while (cur < melody.length - 1 && melody[cur].start + melody[cur].dur < start) cur++;
      let best = null, bestOv = 0;
      for (let k = cur; k < melody.length; k++) {
        const m = melody[k];
        if (m.start >= end) break;
        const ov = Math.min(m.start + m.dur, end) - Math.max(m.start, start);
        if (ov > bestOv) { bestOv = ov; best = m.midi; }
      }
      return best;
    };

    // --- Pre-compute per-line time windows from lyricTimes ---
    const lineWindows = [];
    let _ti = 0;
    for (let li = 0; li < lyrics.length; li++) {
      const ln = lyrics[li];
      if (!ln.length) { lineWindows.push(null); continue; }
      const lStart = times[_ti];
      const lLastCharIdx = _ti + ln.length - 1;
      const lEnd = lLastCharIdx + 1 < times.length
        ? times[lLastCharIdx + 1]
        : times[lLastCharIdx] + 0.35;
      lineWindows.push({ start: lStart, end: lEnd });
      _ti += ln.length;
    }

    // --- Pre-compute per-line melody medians for octave outlier correction ---
    // pYIN occasionally tracks the subharmonic (octave too low). Snapping bars
    // more than 7 semitones away from the line median back by an octave removes
    // the most jarring visual artefacts.
    let _mCur = 0; // separate cursor for this pass
    const lineMedians = lineWindows.map(w => {
      if (!w || !hasMelody) return null;
      // Advance past segments ending before window
      while (_mCur < melody.length - 1 && melody[_mCur].start + melody[_mCur].dur < w.start) _mCur++;
      const win = [];
      for (let k = _mCur; k < melody.length; k++) {
        const m = melody[k];
        if (m.start >= w.end) break;
        win.push(m.midi);
      }
      if (win.length < 3) return null;
      win.sort((a, b) => a - b);
      return win[Math.floor(win.length / 2)];
    });

    // --- Build bars + notes ---
    const bars  = [];
    const notes = [];
    let ti = 0;
    let lastMidi = null;

    for (let lineIdx = 0; lineIdx < lyrics.length; lineIdx++) {
      const line    = lyrics[lineIdx];
      if (!line.length) continue;

      const lineMedian = lineMedians[lineIdx];
      const w = lineWindows[lineIdx];

      // Line-level scoring note (dominant pitch over whole line window)
      let lineMidi = pickMidi(w.start, w.end) ?? lastMidi ?? laneMidi;
      if (lineMedian != null) {
        while (lineMedian - lineMidi >= 7) lineMidi += 12;
        while (lineMidi - lineMedian >= 7) lineMidi -= 12;
      }
      notes.push({
        midi:  lineMidi,
        start: w.start,
        dur:   w.end - w.start,
        lyric: line.join(''),
        freq:  Songs.midiToFreq(lineMidi),
        name:  Songs.midiToName(lineMidi),
      });

      for (let ci = 0; ci < line.length; ci++) {
        const start = times[ti];
        const end   = ti + 1 < times.length ? times[ti + 1] : start + 0.3;
        const dur   = Math.max(0.04, end - start);

        let midi = pickMidi(start, end);
        if (midi === null) midi = lastMidi !== null ? lastMidi : laneMidi;

        // Octave outlier correction — snap notes > 7st from line median by ±12.
        if (lineMedian != null) {
          while (lineMedian - midi >= 7) midi += 12;
          while (midi - lineMedian >= 7) midi -= 12;
        }
        lastMidi = midi;

        bars.push({ midi, start, dur, lyric: line[ci], lineIdx, hit: false, timingOnly: !hasMelody });
        ti++;
      }
    }

    // --- Post-process: smooth isolated spikes within each line ---
    // If a single bar is >= 4 semitones away from BOTH its neighbours and they
    // agree within 3 semitones of each other, it's a pYIN blip — snap to the
    // average of the neighbours.
    for (let i = 1; i < bars.length - 1; i++) {
      const p = bars[i - 1], c = bars[i], n = bars[i + 1];
      if (c.lineIdx !== p.lineIdx || c.lineIdx !== n.lineIdx) continue;
      if (Math.abs(c.midi - p.midi) >= 4 && Math.abs(c.midi - n.midi) >= 4
          && Math.abs(p.midi - n.midi) <= 3) {
        c.midi = Math.round((p.midi + n.midi) / 2);
      }
    }

    return { bars, notes };
  },

  /**
   * Expand lyric lines into per-syllable timing bars.
   * Each Chinese character becomes one bar. Spaces are skipped.
   *
   * When the song has a real extracted `melody[]` (Demucs+pyin pipeline),
   * each bar is placed at the dominant MIDI from that window — the segment
   * with the largest time-overlap with the syllable. Bars then render at
   * their true pitch, so the canvas shows the song's actual melodic contour.
   *
   * When no melody exists, all bars fall back to a single middle-of-range
   * MIDI. `timingOnly: true` then signals "this bar is only a timing cue,
   * do not grade pitch against it" — matching the gated scoring in
   * getResults().
   */
  _expandToSyllables(lines) {
    const bars = [];
    // Only use melody data if the song has it AND has opted into pitch grading.
    // A melody-but-pitchGradingReady-false song falls back to lane-center bars
    // so we don't visually lie about target pitches the grader isn't using.
    const pitchGradingReady = !this.song || this.song.pitchGradingReady !== false;
    const melody = pitchGradingReady ? (this.song && this.song.melody) : null;
    const hasMelody = !!(melody && melody.length > 0);
    // Fallback lane for timing-only bars (songs without extracted melody).
    const laneMidi = Math.round((this.MIDI_LOW + this.MIDI_HIGH) / 2);

    // For melody lookup we walk the array once per syllable, but the melody
    // is sorted by start time so we can cache a cursor that moves forward.
    let melodyCursor = 0;
    const pickDominantMidi = (barStart, barEnd) => {
      if (!hasMelody) return null;
      // Advance cursor past segments that ended before this bar begins.
      while (
        melodyCursor < melody.length - 1 &&
        melody[melodyCursor].start + melody[melodyCursor].dur < barStart
      ) {
        melodyCursor++;
      }
      // Scan forward from cursor collecting overlapping segments.
      let bestMidi = null;
      let bestOverlap = 0;
      for (let k = melodyCursor; k < melody.length; k++) {
        const m = melody[k];
        if (m.start >= barEnd) break; // no more overlaps possible
        const overlap = Math.min(m.start + m.dur, barEnd) - Math.max(m.start, barStart);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestMidi = m.midi;
        }
      }
      return bestMidi;
    };

    // Pre-compute per-line median MIDI for in-line octave outlier correction.
    // pYIN occasionally tracks subharmonic when a strong overtone or harmony
    // voice is present; isolated notes far below the line's median are
    // almost always octave-down errors. We snap them back up.
    const lineMedians = hasMelody ? lines.map(line => {
      if (!line.lyric) return null;
      const win = [];
      for (const m of melody) {
        if (m.start + m.dur < line.start) continue;
        if (m.start >= line.start + line.dur) break;
        win.push(m.midi);
      }
      if (win.length < 4) return null;
      win.sort((a, b) => a - b);
      return win[Math.floor(win.length / 2)];
    }) : [];

    let lineIdx = 0;
    // Carry the last resolved MIDI forward so that syllables in a melodic gap
    // (e.g. quick breath between phrases) still render at a sensible pitch
    // instead of snapping to the fallback lane.
    let lastMidi = hasMelody ? null : laneMidi;

    for (const line of lines) {
      if (!line.lyric) { lineIdx++; continue; }

      // Split lyric into characters (skip spaces)
      const chars = line.lyric.replace(/\s+/g, '').split('');
      const charCount = chars.length;
      if (charCount === 0) { lineIdx++; continue; }

      const gap = 0.03; // small gap between syllables
      const totalGaps = (charCount - 1) * gap;
      const syllDur = (line.dur - totalGaps) / charCount;

      // Per-line explicit octave override. Set `octaveShift: 12` on a notes[]
      // entry to push that whole phrase up an octave when pYIN dropped to
      // subharmonic (common on songs with thick harmony stacks). Multiple of
      // 12 only — anything else is silently ignored.
      const explicitShift = (line.octaveShift && line.octaveShift % 12 === 0)
        ? line.octaveShift : 0;
      const lineMedian = lineMedians[lineIdx];

      for (let ci = 0; ci < charCount; ci++) {
        const start = line.start + ci * (syllDur + gap);
        const end = start + syllDur;

        let midi;
        if (hasMelody) {
          const detected = pickDominantMidi(start, end);
          if (detected !== null) {
            midi = detected;
            // In-line octave outlier smoother: only kicks in when no
            // explicit shift is set, and only nudges by ±12 when the
            // detected pitch is clearly out of family with the line.
            if (!explicitShift && lineMedian != null) {
              while (lineMedian - midi >= 7) midi += 12;
              while (midi - lineMedian >= 7) midi -= 12;
            }
            lastMidi = midi;
          } else {
            // Silent gap in the melody (instrumental interlude / breath).
            // Reuse the previous pitch so the visual doesn't jump to lane.
            midi = lastMidi !== null ? lastMidi : laneMidi;
          }
          midi += explicitShift;
        } else {
          midi = laneMidi;
        }

        bars.push({
          midi,
          start,
          dur: syllDur,
          lyric: chars[ci],
          lineIdx,
          hit: false,
          // Only tag as timing-only when we had no real melody to place the
          // bar. Bars derived from a real melody are legitimate pitch targets.
          timingOnly: !hasMelody,
        });
      }
      lineIdx++;
    }
    return bars;
  },

  _drawLyricsModeBars(ctx, W, H, time, playheadX, pxPerSec) {
    if (!this.syllableBars) return;

    // Faint grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 0.5;
    for (let midi = this.MIDI_LOW; midi <= this.MIDI_HIGH; midi += 2) {
      const y = this._midiToY(midi);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Playhead line
    ctx.save();
    const grad = ctx.createLinearGradient(playheadX, 0, playheadX, H);
    grad.addColorStop(0, 'rgba(0,212,255,0)');
    grad.addColorStop(0.15, 'rgba(0,212,255,0.6)');
    grad.addColorStop(0.85, 'rgba(0,212,255,0.6)');
    grad.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, H);
    ctx.stroke();
    ctx.restore();

    // Pitch-zone labels: HIGH on top, LOW on bottom — helps players understand direction.
    const labelX = 8;
    ctx.save();
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.letterSpacing = '0.08em';
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffd700';
    ctx.fillText('HIGH', labelX, 18);
    ctx.fillStyle = '#6ab0ff';
    ctx.fillText('LOW', labelX, H - 8);
    ctx.restore();

    // Helper: interpolate bar color based on pitch fraction (0=low, 1=high)
    // Low → sky blue, High → warm gold/orange (Guitar Hero style)
    const pitchBarColor = (pitchFrac, alpha) => {
      // Two-segment lerp: blue(0) → cyan(0.5) → gold(1)
      let r, g, b;
      if (pitchFrac < 0.5) {
        const t = pitchFrac * 2;
        r = 0;
        g = Math.round(130 + t * 82);  // 130 → 212
        b = 255;
      } else {
        const t = (pitchFrac - 0.5) * 2;
        r = Math.round(t * 255);
        g = Math.round(212 - t * 52);  // 212 → 160
        b = Math.round(255 - t * 255); // 255 → 0
      }
      return `rgba(${r},${g},${b},${alpha})`;
    };

    // Draw syllable bars
    const nh = this.NOTE_HEIGHT * 0.85; // slightly taller than before
    const cornerR = Math.min(nh / 2, 5);

    for (const bar of this.syllableBars) {
      const x = playheadX + (bar.start - time) * pxPerSec;
      const w = bar.dur * pxPerSec;
      const y = this._midiToY(bar.midi);

      // Skip if off screen
      if (x + w < -10 || x > W + 10) continue;

      const pitchFrac = Math.max(0, Math.min(1, (bar.midi - this.MIDI_LOW) / Math.max(1, this.NOTE_RANGE)));
      const isPast = bar.start + bar.dur < time;
      const isActive = time >= bar.start && time <= bar.start + bar.dur;
      const isSinging = this.currentPitch.freq > 0;

      ctx.save();

      if (isPast) {
        const wasHit = bar.hit;
        if (wasHit) {
          ctx.fillStyle = 'rgba(0,255,136,0.22)';
          ctx.strokeStyle = 'rgba(0,255,136,0.45)';
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        }
        ctx.lineWidth = 1;
      } else if (isActive) {
        if (isSinging) {
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 16;
          ctx.fillStyle = 'rgba(0,255,136,0.45)';
          ctx.strokeStyle = '#00ff88';
        } else {
          // Pulse the active bar even when not singing yet
          const pulse = 0.5 + 0.3 * Math.sin(performance.now() / 200);
          ctx.fillStyle = pitchBarColor(pitchFrac, 0.25 + pulse * 0.15);
          ctx.strokeStyle = pitchBarColor(pitchFrac, 0.7 + pulse * 0.3);
          ctx.shadowColor = pitchBarColor(pitchFrac, 0.5);
          ctx.shadowBlur = 8 + pulse * 6;
        }
        ctx.lineWidth = 2;
      } else {
        // Upcoming bars — color-coded by pitch for immediate visual clarity
        ctx.fillStyle = pitchBarColor(pitchFrac, 0.18);
        ctx.strokeStyle = pitchBarColor(pitchFrac, 0.55);
        ctx.lineWidth = 1.2;
      }

      this._roundRect(ctx, x, y - nh / 2, w, nh, cornerR);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Draw user's pitch dot on playhead
    if (this.currentPitch.freq > 0) {
      const py = this._midiToY(this.currentPitch.midi);
      if (py > 0 && py < H) {
        ctx.save();
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(playheadX, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(playheadX, py, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Pitch trail behind playhead
    if (this.pitchHistory.length > 1) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 1; i < this.pitchHistory.length; i++) {
        const prev = this.pitchHistory[i - 1];
        const curr = this.pitchHistory[i];
        const x1 = playheadX + (prev.time - time) * pxPerSec;
        const x2 = playheadX + (curr.time - time) * pxPerSec;
        if (x2 > playheadX + 5 || x1 < 0) continue;
        if (prev.midi <= 0 || curr.midi <= 0) continue; // silence — don't draw
        const y1 = this._midiToY(prev.midi);
        const y2 = this._midiToY(curr.midi);
        const age = time - curr.time;
        const alpha = Math.max(0.05, 0.5 - age / (this.VISIBLE_SECONDS * 0.6));
        const consec = curr.consec || 0;
        // Combo level shifts the "good pitch" trail accent:
        //   level 0 → cyan base, green on-pitch
        //   level 1 (×2, streak 5+) → green base, gold on-pitch
        //   level 2 (×3, streak 10+) → gold base, orange on-pitch
        //   level 3 (×5, streak 20+) → whole trail goes purple/hot
        const cl = this._comboLevel || 0;
        if (consec <= 0) {
          ctx.strokeStyle = `rgba(0,212,255,${alpha})`; // blue (off pitch, always)
        } else if (cl >= 3) {
          // Streak 20+: purple trail for all good frames, hot orange for sustained
          if (consec >= 10) ctx.strokeStyle = `rgba(255,107,53,${alpha})`;
          else              ctx.strokeStyle = `rgba(180,60,255,${alpha})`;
        } else if (cl >= 2) {
          // Streak 10+: gold → orange
          if (consec >= 12) ctx.strokeStyle = `rgba(255,107,53,${alpha})`;
          else              ctx.strokeStyle = `rgba(255,215,0,${alpha})`;
        } else if (cl >= 1) {
          // Streak 5+: green → gold
          if (consec >= 14) ctx.strokeStyle = `rgba(255,215,0,${alpha})`;
          else              ctx.strokeStyle = `rgba(0,255,136,${alpha})`;
        } else {
          // No combo: classic green → gold → orange ladder
          if (consec >= 18)     ctx.strokeStyle = `rgba(255,107,53,${alpha})`;
          else if (consec >= 8) ctx.strokeStyle = `rgba(255,215,0,${alpha})`;
          else                  ctx.strokeStyle = `rgba(0,255,136,${alpha})`;
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  _midiToY(midi) {
    const range = this.MIDI_HIGH - this.MIDI_LOW;
    const normalized = (midi - this.MIDI_LOW) / range;
    return this.displayHeight * (1 - normalized);
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  _updateHUD() {
    const timeEl = document.getElementById('game-time');
    const scoreEl = document.getElementById('game-score');
    const streakEl = document.getElementById('streak-count');
    const streakIndicator = document.getElementById('streak-indicator');

    if (timeEl) {
      if (window._lyricDebug) {
        // Debug mode: show precise time to 1dp so lyricTimes can be calibrated
        timeEl.textContent = this.currentTime.toFixed(1) + 's';
      } else {
        const mins = Math.floor(this.currentTime / 60);
        const secs = Math.floor(this.currentTime % 60);
        timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }
    }

    // Live 0-100 score. Same formula as getResults() but computed over only
    // the windows that have been sung so far, so the HUD number IS the final
    // score scale — no more raw points that grow with song length.
    this.liveScore = this._computeLiveScore();
    if (scoreEl) {
      if (this.liveScore > 0) {
        // Smoothly interpolate the displayed score toward liveScore so it
        // ticks up rather than jumping. Max step of 2 per frame (~120ms/pt at 60fps).
        const displayed = parseFloat(scoreEl.dataset.displayed || '0');
        const target = Math.round(this.liveScore);
        const step = Math.max(1, Math.ceil(Math.abs(target - displayed) * 0.12));
        const next = displayed < target
          ? Math.min(target, displayed + step)
          : Math.max(target, displayed - step);
        scoreEl.dataset.displayed = next;
        scoreEl.textContent = Math.round(next);
        scoreEl.classList.remove('hud-score--waiting');
      } else {
        scoreEl.dataset.displayed = '0';
        scoreEl.textContent = '—';
        scoreEl.classList.add('hud-score--waiting');
      }
    }

    // Live rank — computed by App against cached leaderboard scores.
    if (typeof App !== 'undefined' && App._getGameRank) {
      const rankEl = document.getElementById('game-rank');
      const rankNum = document.getElementById('game-rank-num');
      const rank = App._getGameRank(this.liveScore);
      if (rankEl && rankNum) {
        if (rank) {
          rankNum.textContent = rank;
          rankEl.hidden = false;
        } else {
          rankEl.hidden = true;
        }
      }
    }

    if (streakEl) streakEl.textContent = this.currentStreak;
    if (streakIndicator) {
      if (this.currentStreak >= 3) {
        streakIndicator.classList.add('active');
      } else {
        streakIndicator.classList.remove('active');
      }
    }

    // Combo multiplier badge — ×2 at 5, ×3 at 10, ×5 at 20.
    const multEl = document.getElementById('streak-mult');
    let newComboLevel = 0;
    if (this.currentStreak >= 20) newComboLevel = 3;
    else if (this.currentStreak >= 10) newComboLevel = 2;
    else if (this.currentStreak >= 5) newComboLevel = 1;
    if (multEl && newComboLevel !== this._comboLevel) {
      this._comboLevel = newComboLevel;
      const labels = ['', '×2', '×3', '×5'];
      if (newComboLevel > 0) {
        multEl.textContent = labels[newComboLevel];
        multEl.style.display = 'inline';
        multEl.classList.remove('mult-pop');
        void multEl.offsetWidth;
        multEl.classList.add('mult-pop');
      } else {
        multEl.style.display = 'none';
        multEl.classList.remove('mult-pop');
      }
    }
    if (streakIndicator) {
      streakIndicator.classList.remove('mult-2', 'mult-3', 'mult-5');
      if (newComboLevel === 1) streakIndicator.classList.add('mult-2');
      else if (newComboLevel === 2) streakIndicator.classList.add('mult-3');
      else if (newComboLevel === 3) streakIndicator.classList.add('mult-5');
    }

    // Apply combo level as a class on the lyrics bar so CSS can shift its accent color.
    const lyricsBarEl = document.querySelector('.lyrics-bar');
    if (lyricsBarEl) {
      lyricsBarEl.classList.remove('combo-1', 'combo-2', 'combo-3');
      if (newComboLevel > 0) lyricsBarEl.classList.add(`combo-${newComboLevel}`);
    }

    // Pitch direction arrow — shows ↑/↓ when singer is > 1 semitone off target
    this._updatePitchDirection();

    // Update lyrics
    this._updateLyrics();

    // Mic equaliser bars — traffic-light colour system:
    //   RED    voice heard but pitch is way off the current target note
    //   CYAN   voice heard, pitch partially off (or no scored note active)
    //   GREEN  voice heard and on-pitch
    //   DIM    silent / no voice detected
    const micBarsEl = document.getElementById('mic-bars');
    if (micBarsEl) {
      const conf = (this.currentPitch &&
                    this.currentPitch.confidence >= 0.15 &&
                    this.currentPitch.freq > 0)
                     ? this.currentPitch.confidence : 0;
      const bars = micBarsEl.children;
      const MAX_H = 28;

      let color = 'rgba(255,255,255,0.12)';
      if (conf > 0) {
        // Use the rolling accuracy window (last ~1s of scored frames) to
        // determine pitch quality. Falls back to cyan when outside a scored
        // note window (intro, interlude) so the bars still show voice activity.
        const ra = this._rollingAcc;
        if (ra && ra.length >= 2) {
          let sum = 0;
          for (const r of ra) sum += r.acc;
          const avg = sum / ra.length;
          if (avg >= 0.65)      color = '#00ff88'; // green  — on pitch
          else if (avg >= 0.35) color = '#00d4ff'; // cyan   — close-ish
          else                  color = '#ff4444'; // red    — way off
        } else {
          color = '#00d4ff'; // cyan — singing but no scored note active yet
        }
      }

      for (let i = 0; i < bars.length; i++) {
        const h = conf > 0
          ? Math.max(4, conf * MAX_H * (0.45 + Math.random() * 0.7))
          : 3;
        bars[i].style.height = h + 'px';
        bars[i].style.background = conf > 0 ? color : 'rgba(255,255,255,0.12)';
        bars[i].style.boxShadow = conf > 0.35 ? `0 0 6px ${color}` : 'none';
      }
    }
  },

  // 5-4-3-2-1 countdown that fires in the 5 seconds before the first sung note.
  // Returns the timestamp (seconds) when the first lyric syllable starts.
  // Priority: syllableBars[0].start (lyricsMode tap-calibrated) → firstVocalSec → notes[0] → 8s fallback.
  getFirstSinging() {
    if (this.syllableBars && this.syllableBars.length > 0) return this.syllableBars[0].start;
    if (this.song && this.song.firstVocalSec) return this.song.firstVocalSec;
    const n = this.notes && this.notes.find(n => n.start > 0.5);
    return n ? n.start : 8;
  },

  _updateCountdown() {
    const el = document.getElementById('singing-countdown');
    if (!el) return;
    if (this._countdownDone) { el.hidden = true; return; }

    // Find the first singing moment. Priority: syllableBars[0].start (tap-calibrated lyricTimes
    // ground truth for lyricsMode songs) → firstVocalSec → notes[0] → MV fallback.
    const firstSing = this.getFirstSinging();
    const firstNote = { start: firstSing };

    // Show / hide Skip Intro button: visible during intro, gone once singing begins.
    const skipBtn = document.getElementById('btn-skip-intro');
    if (skipBtn) {
      skipBtn.hidden = (this.currentTime >= firstSing - 1.0 || this._countdownDone);
    }

    const t = firstNote.start - this.currentTime; // seconds until first note

    if (t > 5.5 || t < -0.3) {
      if (t < -0.3) {
        this._countdownDone = true;
        if (skipBtn) skipBtn.hidden = true;
      }
      el.hidden = true;
      return;
    }

    let label = '';
    if (t > 4.5)      label = '5';
    else if (t > 3.5) label = '4';
    else if (t > 2.5) label = '3';
    else if (t > 1.5) label = '2';
    else if (t > 0.5) label = '1';
    else               label = 'GO!';

    // Only animate when the label changes (fires once per second)
    if (label !== this._countdownLast) {
      this._countdownLast = label;
      el.textContent = label;
      el.classList.remove('countdown-pop');
      void el.offsetWidth; // reflow to restart animation
      el.classList.add('countdown-pop');
    }
    el.hidden = false;
  },

  // Running score on the same 0-100 scale as the final result. Mirrors
  // getResults() logic but uses only notes the user has had a chance to
  // sing (start <= currentTime). Before any singing this is 0; it
  // stabilises toward the final value as the song progresses.
  // Running score on the same 0-100 scale as getResults(). Uses identical
  // formulas so the HUD number IS the final score — no jump at song end.
  _computeLiveScore() {
    if (!this.notes || this.notes.length === 0) {
      // Melody-cursor path: no lyric windows, scored against melody[].
      if (this._mvScoredFrames > 0) {
        const coverage = (this._mvWeightedAcc / this._mvScoredFrames) * 100;
        return Math.min(100, Math.max(0, Math.round(20 + coverage * 0.65 + Math.min(this.bestStreak / 10, 1) * 15)));
      }
      return 0;
    }

    // Notes-based path: syllableBars scoring from notes[].
    const time = this.currentTime;
    const hasMelodyData = !!(this.song && this.song.melody && this.song.melody.length > 0);
    const pitchGradingReady = !this.song || this.song.pitchGradingReady !== false;
    const hasRealMelody = hasMelodyData && pitchGradingReady && !this._isKaraokeOff;

    let notesSoFar = 0, totalPresence = 0, scoredNotes = 0, notesAttempted = 0;
    for (let i = 0; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.start > time) continue;
      notesSoFar++;
      const ns = this.noteScores[i];
      if (ns.samples > 0) {
        totalPresence += ns.pitchAcc / ns.samples;
        scoredNotes++;
        notesAttempted++;
      }
    }
    if (notesSoFar === 0) return 0;

    const rawAccuracy = scoredNotes > 0 ? (totalPresence / scoredNotes) * 100 : 0;
    const coverage = (notesAttempted / notesSoFar) * 100;
    const streakBonus = Math.min(this.bestStreak / 10, 1) * 15;

    let combined;
    if (hasRealMelody) {
      combined = Math.round(20 + rawAccuracy * 0.50 + coverage * 0.25 + Math.min(this.bestStreak / 10, 1) * 10);
    } else if (this._isKaraokeOff) {
      combined = Math.min(75, Math.round(coverage * 0.65 + Math.min(this.bestStreak / 10, 1) * 10));
    } else {
      combined = Math.round(20 + coverage * 0.65 + streakBonus);
    }
    return Math.min(100, Math.max(0, combined));
  },

  _updatePitchDirection() {
    const el = document.getElementById('pitch-direction');
    if (!el) return;

    // Only show when user is actively singing and a target note is active
    const pitch = this.currentPitch;
    const isSinging = pitch && pitch.freq > 0 && pitch.confidence >= 0.5;
    if (!isSinging || this._isKaraokeOff) {
      el.textContent = '';
      el.className = 'pitch-direction';
      return;
    }

    // Find current target MIDI from syllableBars cursor
    let targetMidi = -1;
    if (this.syllableBars && this.syllableBars.length > 0) {
      const time = this.currentTime;
      const idx = this._barIdx || 0;
      for (let k = idx; k < Math.min(this.syllableBars.length, idx + 4); k++) {
        const b = this.syllableBars[k];
        if (time >= b.start - 0.1 && time <= b.start + b.dur + 0.1 && !b.timingOnly) {
          targetMidi = b.midi;
          break;
        }
      }
    }

    if (targetMidi <= 0) {
      el.textContent = '';
      el.className = 'pitch-direction';
      return;
    }

    // Fold sung pitch to nearest octave of target (same as _scorePitch)
    let sung = pitch.midi;
    while (sung - targetMidi > 6) sung -= 12;
    while (targetMidi - sung > 6) sung += 12;

    const diff = sung - targetMidi; // positive = too high, negative = too low

    if (diff > 1) {
      el.textContent = '↑'; // ↑
      el.className = 'pitch-direction pd-high';
    } else if (diff < -1) {
      el.textContent = '↓'; // ↓
      el.className = 'pitch-direction pd-low';
    } else {
      el.textContent = '✓'; // ✓
      el.className = 'pitch-direction pd-good';
    }
  },

  _updateLyrics() {
    const el = document.getElementById('game-lyrics');
    if (!el) return;

    const time = this.currentTime;
    const song = this.song;
    if (!song) return;

    // \u2500\u2500 NEW: character-level timed lyrics (WhisperX-aligned) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // Songs with lyrics[] + lyricTimes[] get char-by-char karaoke highlighting.
    // Each char lights up as playback time passes its timestamp.
    if (song.lyrics && song.lyrics.length && song.lyricTimes && song.lyricTimes.length) {
      const lyrics = song.lyrics;       // [[char,...], [char,...], ...]
      const times  = song.lyricTimes;   // flat: [t0, t1, t2, ...]

      // Binary search: find index of last char whose time \u2264 currentTime
      let lo = 0, hi = times.length - 1, charIdx = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid] <= time) { charIdx = mid; lo = mid + 1; }
        else hi = mid - 1;
      }

      // Map flat charIdx \u2192 lineIdx + posInLine
      let lineIdx = 0, posInLine = -1, offset = 0;
      if (charIdx >= 0) {
        for (let l = 0; l < lyrics.length; l++) {
          const ll = lyrics[l].length;
          if (offset + ll > charIdx) {
            lineIdx = l;
            posInLine = charIdx - offset;
            break;
          }
          offset += ll;
        }
      }

      // Skip re-render if line + position haven't changed (perf: avoid
      // rebuilding 20-char innerHTML at 60fps when nothing visual changed)
      if (this._lyricLineIdx === lineIdx && this._lyricPosInLine === posInLine) return;
      this._lyricLineIdx = lineIdx;
      this._lyricPosInLine = posInLine;

      // Pitch-accuracy tint on past/active chars \u2014 same rolling window as
      // the existing karaoke-current acc-good/ok/bad colour system.
      let accClass = '';
      if (posInLine >= 0 && this._rollingAcc && this._rollingAcc.length >= 3) {
        let sum = 0;
        for (const r of this._rollingAcc) sum += r.acc;
        const avg = sum / this._rollingAcc.length;
        if (avg >= 0.8) accClass = ' acc-good';
        else if (avg >= 0.5) accClass = ' acc-ok';
        else accClass = ' acc-bad';
      }

      const currentLine = lyrics[lineIdx] || [];
      const nextLine    = lyrics[lineIdx + 1] || [];

      // Before first lyric (intro): show musical-note placeholder
      if (charIdx < 0) {
        el.innerHTML = '<div class="karaoke-wait">\u266A \u266A \u266A</div>';
        return;
      }

      // Build current line: past | now | ahead chars
      // Space chars (' ') are rendered as non-highlighted word separators.
      let html = `<div class="lyr-line lyr-current${accClass}">`;
      for (let i = 0; i < currentLine.length; i++) {
        if (currentLine[i] === ' ') {
          html += `<span class="lyr-space"></span>`;
        } else {
          const cls = i < posInLine ? 'lyr-past'
                    : i === posInLine ? 'lyr-now'
                    : 'lyr-ahead';
          html += `<span class="lyr-char ${cls}">${currentLine[i]}</span>`;
        }
      }
      html += '</div>';

      // Preview the next line dim below
      if (nextLine.length) {
        html += '<div class="lyr-line lyr-next">';
        for (const ch of nextLine) {
          if (ch === ' ') {
            html += `<span class="lyr-space"></span>`;
          } else {
            html += `<span class="lyr-char lyr-ahead">${ch}</span>`;
          }
        }
        html += '</div>';
      }

      el.innerHTML = html;
      return;
    }

    // \u2500\u2500 LEGACY: line-level lyricsMode display (notes[] with .lyric field) \u2500\u2500\u2500\u2500
    const isLyricsMode = song.lyricsMode;
    if (isLyricsMode) {
      let currentLine = null;
      let nextLine = null;

      for (let i = 0; i < this.notes.length; i++) {
        const note = this.notes[i];
        if (!note.lyric) continue;
        if (time >= note.start && time <= note.start + note.dur) {
          currentLine = note;
        } else if (time < note.start && !nextLine) {
          nextLine = note;
          if (currentLine) break;
        }
      }

      if (!currentLine && nextLine && nextLine.start - time < 3) {
        currentLine = nextLine;
        nextLine = null;
        for (let i = this.notes.indexOf(currentLine) + 1; i < this.notes.length; i++) {
          if (this.notes[i].lyric) { nextLine = this.notes[i]; break; }
        }
      }

      let accClass = '';
      if (currentLine && this._rollingAcc && this._rollingAcc.length >= 3) {
        let sum = 0;
        for (const r of this._rollingAcc) sum += r.acc;
        const avg = sum / this._rollingAcc.length;
        if (avg >= 0.8) accClass = ' acc-good';
        else if (avg >= 0.5) accClass = ' acc-ok';
        else accClass = ' acc-bad';
      }

      let html = '';
      if (currentLine) html += `<div class="karaoke-current${accClass}">${currentLine.lyric}</div>`;
      if (nextLine)    html += `<div class="karaoke-next">${nextLine.lyric}</div>`;
      if (!currentLine && !nextLine) html += '<div class="karaoke-wait">\u266A \u266A \u266A</div>';

      el.innerHTML = html;
    }
  },

  // Pick a random message from a labelled bucket for grade-bomb variety.
  _pickMsg(bucket) {
    const pools = {
      perfect:  ['完美 ✨', 'NAILED IT', '神了！', 'FLAWLESS', '完璧！', 'PERFECT ✨', '太棒了！'],
      good:     ['良好！', 'Keep it up!', 'GREAT!', '唱得好！', 'Nice one!', '加油！'],
      streak5:  ['🔥 ×5 COMBO', 'NICE!', '连击！', 'Combo!', '5連擊！'],
      streak10: ['ON FIRE 🔥', '×10 连击！', 'AMAZING!', '好厉害！', 'Unstoppable!'],
      streak20: ['LEGEND 👑', '传说！', 'GODLIKE', '无敌！', 'UNSTOPPABLE ⚡'],
      streak30: ['DEMON MODE 👹', '魔王！', 'GODTIER ⚡', '神！', 'UNTOUCHABLE 💜'],
    };
    const arr = pools[bucket] || ['GREAT!'];
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // Fires a burst of particles outward from (x, y) — used for streak milestones.
  _burstParticles(x, y, count, type) {
    const colors = { perfect: '#ffd700', good: '#00ff88', legend: '#ff00ff' };
    const t = type || 'good';
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1.0,
        decay: 0.010 + Math.random() * 0.012,
        size: 5 + Math.random() * 9,
        type: t,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
      });
    }
  },

  // Flashes a centered grade label over the canvas (e.g. "PERFECT! ✨").
  // Streak milestones fire automatically; line-completion bombs are triggered
  // from _scorePitch. Pass mega=true for streak10+ to use bigger animation.
  _showGradeBomb(text, color, mega) {
    const el = document.getElementById('grade-bomb');
    if (!el) return;
    // Don't interrupt a streak-milestone bomb with a line-completion one.
    if (this._gradeBombTimer && el.classList.contains('bomb-show')) return;
    el.classList.remove('bomb-show', 'bomb-mega');
    void el.offsetWidth; // force reflow to restart animation
    el.textContent = text;
    el.style.color = color || '#ffffff';
    if (mega) el.classList.add('bomb-mega');
    el.classList.add('bomb-show');
    if (this._gradeBombTimer) clearTimeout(this._gradeBombTimer);
    const duration = mega ? 1600 : 1200;
    this._gradeBombTimer = setTimeout(() => {
      el.classList.remove('bomb-show', 'bomb-mega');
      this._gradeBombTimer = null;
    }, duration);
  },

  // --- Warm-up pitch meter ---
  drawWarmupMeter(canvas, pitchData) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width / window.devicePixelRatio;
    const H = canvas.height / window.devicePixelRatio;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#0d0d1f';
    ctx.fillRect(0, 0, W, H);

    if (pitchData.freq <= 0) {
      // No input - show "listening" state
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Listening...', W / 2, H / 2);
      ctx.restore();
      return;
    }

    const midi = pitchData.midi;
    const cents = pitchData.cents;

    // Draw cents meter bar
    const barY = H / 2;
    const barW = W * 0.7;
    const barH = 8;
    const barX = (W - barW) / 2;

    // Background bar
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.roundRect(barX, barY - barH / 2, barW, barH, 4);
    ctx.fill();

    // Center marker
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(W / 2 - 1, barY - 16, 2, 32);

    // Cents indicator position
    const centsNorm = Math.max(-50, Math.min(50, cents)) / 50; // -1 to 1
    const indicatorX = W / 2 + centsNorm * (barW / 2);

    // Color based on accuracy
    let color;
    if (Math.abs(cents) < 10) color = '#00ff88';
    else if (Math.abs(cents) < 25) color = '#ffd700';
    else color = '#ff4444';

    // Glow indicator
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(indicatorX, barY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(indicatorX, barY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FLAT', barX + 30, barY + 30);
    ctx.fillText('SHARP', barX + barW - 30, barY + 30);
    ctx.fillText('IN TUNE', W / 2, barY - 24);

    // Volume meter on the side
    const volH = H * 0.6;
    const volW = 6;
    const volX = W - 30;
    const volY = (H - volH) / 2;
    const vol = Math.min(1, pitchData.volume * 10);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.roundRect(volX, volY, volW, volH, 3);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,212,255,0.5)';
    ctx.beginPath();
    ctx.roundRect(volX, volY + volH * (1 - vol), volW, volH * vol, 3);
    ctx.fill();

    ctx.restore();
  }
};
