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
    const lyricsHeight = document.querySelector('.lyrics-bar')?.offsetHeight || 60;
    const h = window.innerHeight - hudHeight - lyricsHeight;

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

      this.syllableBars = this._expandToSyllables(this.notes);

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
    const mvAudioActive = !!(this.song.mvSrc && this._isKaraokeOff);
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
    // MV karaoke-OFF: audio came from the video element, not Synth — don't stop what wasn't started
    const wasMvAudio = !!(this.song && this.song.mvSrc && this._isKaraokeOff);
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
        if (now - this._lastParticleTime > 80) {
          this._lastParticleTime = now;
          const playheadX = this.displayWidth * this.PLAYHEAD_X;
          const py = this._midiToY(data.midi);
          const intensity = this._consecutiveGoodFrames > 10 ? 3 : this._consecutiveGoodFrames > 5 ? 2 : 1;
          for (let p = 0; p < intensity; p++) {
            this.particles.push({
              x: playheadX + (Math.random() - 0.5) * 20,
              y: py + (Math.random() - 0.5) * 16,
              vx: (Math.random() - 0.5) * 3 + 1.5,
              vy: (Math.random() - 0.5) * 3 - 1,
              life: 1.0,
              decay: 0.015 + Math.random() * 0.01,
              size: 4 + Math.random() * 6,
              type: acc >= 1.0 ? 'perfect' : 'good',
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.15,
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
      const _MILESTONES = [5, 10, 20];
      for (const _m of _MILESTONES) {
        if (this.currentStreak >= _m && (this._lastStreakMilestone || 0) < _m) {
          this._lastStreakMilestone = _m;
          if (_m === 5)  this._showGradeBomb('NICE!', '#00ff88');
          if (_m === 10) this._showGradeBomb('ON FIRE! 🔥', '#ffd700');
          if (_m === 20) this._showGradeBomb('UNSTOPPABLE! ⚡', '#ff6b35');
        }
      }
      if (this.currentStreak === 0) this._lastStreakMilestone = 0;

      // Line-completion grade bomb: fires when we transition to a new lyric line
      // and the just-finished line was sung well. Skipped if a streak bomb is live.
      if (this._lastScoredLineIdx >= 0 && lineIdx !== this._lastScoredLineIdx) {
        const _prevNs = this.noteScores[this._lastScoredLineIdx];
        if (_prevNs && _prevNs.samples > 0 && !this._gradeBombTimer) {
          const _avgAcc = _prevNs.pitchAcc / _prevNs.samples;
          if (_avgAcc >= 0.88) this._showGradeBomb('PERFECT! ✨', '#ffd700');
          else if (_avgAcc >= 0.70) this._showGradeBomb('GREAT!', '#00ff88');
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

      const color = p.type === 'perfect' ? '#ffd700' : '#00ff88';
      const glowColor = p.type === 'perfect' ? 'rgba(255,215,0,' : 'rgba(0,255,136,';

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

    // Cap particle count
    if (this.particles.length > 100) {
      this.particles.splice(0, this.particles.length - 100);
    }
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

    // Draw syllable bars
    const nh = this.NOTE_HEIGHT * 0.7;
    const cornerR = Math.min(nh / 2, 4);

    for (const bar of this.syllableBars) {
      const x = playheadX + (bar.start - time) * pxPerSec;
      const w = bar.dur * pxPerSec;
      const y = this._midiToY(bar.midi);

      // Skip if off screen
      if (x + w < -10 || x > W + 10) continue;

      const isPast = bar.start + bar.dur < time;
      const isActive = time >= bar.start && time <= bar.start + bar.dur;
      const isSinging = this.currentPitch.freq > 0;

      ctx.save();

      if (isPast) {
        // Past bars: check if user was singing
        const wasHit = bar.hit;
        if (wasHit) {
          ctx.fillStyle = 'rgba(0,255,136,0.25)';
          ctx.strokeStyle = 'rgba(0,255,136,0.5)';
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        }
        ctx.lineWidth = 1;
      } else if (isActive) {
        // Active bar — bar.hit is set authoritatively by _scorePitch, not here.
        if (isSinging) {
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 12;
          ctx.fillStyle = 'rgba(0,255,136,0.4)';
          ctx.strokeStyle = '#00ff88';
        } else {
          ctx.fillStyle = 'rgba(0,212,255,0.3)';
          ctx.strokeStyle = 'rgba(0,212,255,0.8)';
        }
        ctx.lineWidth = 1.5;
      } else {
        // Upcoming bars
        ctx.fillStyle = 'rgba(0,212,255,0.12)';
        ctx.strokeStyle = 'rgba(0,212,255,0.35)';
        ctx.lineWidth = 1;
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
        if (consec >= 18)     ctx.strokeStyle = `rgba(255,107,53,${alpha})`; // 🔥 orange
        else if (consec >= 8) ctx.strokeStyle = `rgba(255,215,0,${alpha})`;   // gold
        else if (consec >= 1) ctx.strokeStyle = `rgba(0,255,136,${alpha})`;   // green
        else                  ctx.strokeStyle = `rgba(0,212,255,${alpha})`; // blue (off pitch)
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
      const mins = Math.floor(this.currentTime / 60);
      const secs = Math.floor(this.currentTime % 60);
      timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Live 0-100 score. Same formula as getResults() but computed over only
    // the windows that have been sung so far, so the HUD number IS the final
    // score scale — no more raw points that grow with song length.
    this.liveScore = this._computeLiveScore();
    if (scoreEl) {
      if (this.liveScore > 0) {
        scoreEl.textContent = Math.round(this.liveScore);
        scoreEl.classList.remove('hud-score--waiting');
      } else {
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
  _updateCountdown() {
    const el = document.getElementById('singing-countdown');
    if (!el) return;
    if (this._countdownDone) { el.hidden = true; return; }

    // Find the first singing note. song.firstVocalSec always wins (explicit
    // per-song calibration); fall back to JSON first note; then MV fallback.
    const firstNote = (this.song && this.song.firstVocalSec)
      ? { start: this.song.firstVocalSec }
      : (this.notes.find(n => n.start > 0.5)
          || (this.song && this.song.mvSrc && this.syllableBars && this.syllableBars.length === 0
              ? { start: 8 } : null));
    if (!firstNote) { el.hidden = true; return; }

    const t = firstNote.start - this.currentTime; // seconds until first note

    if (t > 5.5 || t < -0.3) {
      if (t < -0.3) this._countdownDone = true;
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

  _updateLyrics() {
    const el = document.getElementById('game-lyrics');
    if (!el) return;

    const time = this.currentTime;
    const isLyricsMode = this.song && this.song.lyricsMode;

    if (isLyricsMode) {
      // Karaoke mode: show current line big, next line smaller
      let currentLine = null;
      let nextLine = null;
      let currentIdx = -1;

      for (let i = 0; i < this.notes.length; i++) {
        const note = this.notes[i];
        if (!note.lyric) continue;
        if (time >= note.start && time <= note.start + note.dur) {
          currentLine = note;
          currentIdx = i;
        } else if (time < note.start && !nextLine) {
          nextLine = note;
          if (currentLine) break;
        }
      }

      // If between lines, show the upcoming one as current
      if (!currentLine && nextLine && nextLine.start - time < 3) {
        currentLine = nextLine;
        nextLine = null;
        for (let i = this.notes.indexOf(currentLine) + 1; i < this.notes.length; i++) {
          if (this.notes[i].lyric) { nextLine = this.notes[i]; break; }
        }
      }

      // Pick a color class for the active line based on how the user's
      // been doing in the last ~1s. Only applies once we have real data
      // in the window (avoids flashing red before the first frame scores).
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
      if (currentLine) {
        html += `<div class="karaoke-current${accClass}">${currentLine.lyric}</div>`;
      }
      if (nextLine) {
        html += `<div class="karaoke-next">${nextLine.lyric}</div>`;
      }
      if (!currentLine && !nextLine) {
        // Intro or interlude
        html += `<div class="karaoke-wait">\u266A \u266A \u266A</div>`;
      }

      el.innerHTML = html;
    }
  },

  // Flashes a centered grade label over the canvas (e.g. "PERFECT! ✨").
  // Streak milestones fire automatically; line-completion bombs are triggered
  // from _scorePitch. If a bomb is already showing it's left alone (streak
  // milestones have higher emotional impact than line-completion labels).
  _showGradeBomb(text, color) {
    const el = document.getElementById('grade-bomb');
    if (!el) return;
    // Don't interrupt a streak-milestone bomb with a line-completion one.
    if (this._gradeBombTimer && el.classList.contains('bomb-show')) return;
    el.classList.remove('bomb-show');
    void el.offsetWidth; // force reflow to restart animation
    el.textContent = text;
    el.style.color = color || '#ffffff';
    el.classList.add('bomb-show');
    if (this._gradeBombTimer) clearTimeout(this._gradeBombTimer);
    this._gradeBombTimer = setTimeout(() => {
      el.classList.remove('bomb-show');
      this._gradeBombTimer = null;
    }, 1500);
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
