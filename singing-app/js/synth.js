/* ==========================================
   Synthesizer - Backing music engine
   Generates accompaniment using Web Audio API
   Piano chords + bass + light melody guide
   ========================================== */

const Synth = {

  ctx: null,
  masterGain: null,
  isPlaying: false,
  scheduledNodes: [],
  audioBuffer: null,              // legacy single-buffer slot (used by sync tool)
  audioBuffers: {},               // songId -> full-mix AudioBuffer
  instrumentalBuffers: {},        // songId -> Demucs no_vocals AudioBuffer
  audioSource: null,              // currently playing audio source
  audioStartedAt: null,           // ctx.currentTime when current source was kicked off
  audioTrackLoaded: false,
  // Runtime override: set to true/false before playSong to force karaoke mode
  // on/off regardless of the song's stripVocals flag. null = use song default.
  stripVocalsOverride: null,

  // Chord progressions for each song
  chordData: {
    'twinkle': {
      // Each chord: [startBeat, durationBeats, root, type]
      chords: [
        [0, 4, 'C', 'maj'], [4, 4, 'F', 'maj'],
        [8, 4, 'C', 'maj'], [12, 4, 'G', 'maj'],
        [16, 4, 'C', 'maj'], [20, 4, 'F', 'maj'],
        [24, 4, 'C', 'maj'], [28, 2, 'G', 'maj'], [30, 2, 'C', 'maj'],
        [32, 4, 'C', 'maj'], [36, 4, 'F', 'maj'],
        [40, 4, 'C', 'maj'], [44, 2, 'G', 'maj'], [46, 2, 'C', 'maj'],
      ],
    },
    'ode-to-joy': {
      chords: [
        [0, 4, 'C', 'maj'], [4, 4, 'G', 'maj'],
        [8, 4, 'Am', 'min'], [12, 2, 'C', 'maj'], [14, 2, 'G', 'maj'],
        [16, 4, 'C', 'maj'], [20, 4, 'G', 'maj'],
        [24, 4, 'Am', 'min'], [28, 2, 'G', 'maj'], [30, 2, 'C', 'maj'],
        [32, 4, 'Dm', 'min'], [36, 2, 'C', 'maj'], [38, 2, 'G', 'maj'],
        [40, 4, 'Am', 'min'], [44, 4, 'C', 'maj'],
        [48, 4, 'G', 'maj'], [52, 4, 'Am', 'min'],
        [56, 2, 'G', 'maj'], [58, 2, 'C', 'maj'],
      ],
    },
    'happy-birthday': {
      chords: [
        [0, 3, 'C', 'maj'], [3, 3, 'G', 'maj'],
        [6, 3, 'C', 'maj'], [9, 3, 'G', 'maj'],
        [12, 3, 'C', 'maj'], [15, 3, 'F', 'maj'],
        [18, 2, 'C', 'maj'],
        [19, 3, 'F', 'maj'], [22, 3, 'C', 'maj'],
      ],
    },
    'amazing-grace': {
      chords: [
        [0, 3, 'G', 'maj'], [3, 3, 'G', 'maj'],
        [6, 3, 'C', 'maj'], [9, 3, 'G', 'maj'],
        [13, 3, 'G', 'maj'], [16, 3, 'Em', 'min'],
        [19, 3, 'D', 'maj'],
        [24, 3, 'G', 'maj'], [27, 3, 'G', 'maj'],
        [30, 3, 'C', 'maj'], [33, 3, 'G', 'maj'],
        [37, 3, 'Em', 'min'], [40, 3, 'D', 'maj'],
        [43, 3, 'G', 'maj'],
      ],
    },
    'scale-warmup': {
      chords: [
        [0, 4, 'C', 'maj'], [4, 4, 'G', 'maj'],
        [8, 4, 'Am', 'min'], [12, 4, 'C', 'maj'],
        [18, 4, 'C', 'maj'], [22, 4, 'G', 'maj'],
        [26, 4, 'Am', 'min'], [30, 6, 'C', 'maj'],
      ],
    },
    'when-the-saints': {
      chords: [
        [0, 3, 'C', 'maj'], [3, 3, 'C', 'maj'],
        [6, 3, 'C', 'maj'], [9, 3, 'C', 'maj'],
        [12, 4, 'C', 'maj'], [16, 2, 'Am', 'min'], [18, 2, 'C', 'maj'],
        [20, 2, 'G', 'maj'], [22, 3, 'G', 'maj'],
        [25, 2, 'C', 'maj'], [27, 2, 'F', 'maj'],
        [29, 2, 'C', 'maj'], [31, 2, 'G', 'maj'],
        [33, 2, 'Am', 'min'], [35, 2, 'F', 'maj'],
        [37, 2, 'C', 'maj'], [39, 2, 'G', 'maj'],
        [42, 5, 'C', 'maj'],
      ],
    },
    'miss-you-3000': {
      chords: [
        // Intro
        [0, 4, 'G', 'maj'], [4, 4, 'D', 'maj'], [8, 4, 'Em', 'min'], [12, 4, 'C', 'maj'],
        // Verse 1
        [16, 4, 'G', 'maj'], [20, 4, 'D', 'maj'], [24, 4, 'Em', 'min'], [28, 2, 'C', 'maj'], [30, 2, 'D', 'maj'],
        // Pre-chorus 1
        [34, 4, 'Em', 'min'], [38, 4, 'C', 'maj'], [42, 2, 'D', 'maj'], [44, 4, 'G', 'maj'],
        // Chorus 1
        [48, 4, 'G', 'maj'], [52, 4, 'D', 'maj'], [56, 4, 'Em', 'min'], [60, 4, 'C', 'maj'],
        [64, 4, 'G', 'maj'], [68, 4, 'D', 'maj'], [72, 4, 'Em', 'min'], [76, 4, 'C', 'maj'],
        [80, 4, 'G', 'maj'], [84, 4, 'D', 'maj'], [88, 2, 'C', 'maj'],
        // Interlude
        [90, 4, 'G', 'maj'], [94, 4, 'D', 'maj'], [98, 4, 'Em', 'min'], [102, 4, 'C', 'maj'],
        // Verse 2
        [106, 4, 'G', 'maj'], [110, 4, 'D', 'maj'], [114, 4, 'Em', 'min'], [118, 4, 'C', 'maj'],
        // Pre-chorus 2
        [124, 4, 'Em', 'min'], [128, 4, 'C', 'maj'], [132, 4, 'Em', 'min'], [136, 2, 'C', 'maj'], [138, 2, 'D', 'maj'],
        [142, 2, 'D', 'maj'], [144, 4, 'G', 'maj'],
        // Chorus 2
        [148, 4, 'G', 'maj'], [152, 4, 'D', 'maj'], [156, 4, 'Em', 'min'], [160, 4, 'C', 'maj'],
        [164, 4, 'G', 'maj'], [168, 4, 'D', 'maj'], [172, 4, 'Em', 'min'], [176, 4, 'C', 'maj'],
        [180, 4, 'G', 'maj'], [184, 4, 'D', 'maj'], [188, 2, 'C', 'maj'],
        // Bridge
        [198, 4, 'C', 'maj'], [202, 4, 'D', 'maj'], [206, 4, 'Em', 'min'],
        [210, 4, 'C', 'maj'], [214, 2, 'D', 'maj'],
        // Final Chorus
        [216, 4, 'G', 'maj'], [220, 4, 'D', 'maj'], [224, 4, 'Em', 'min'], [228, 4, 'C', 'maj'],
        [232, 4, 'G', 'maj'], [236, 4, 'D', 'maj'], [240, 4, 'Em', 'min'], [244, 4, 'C', 'maj'],
        [248, 4, 'G', 'maj'], [252, 4, 'D', 'maj'],
        // Outro
        [256, 4, 'C', 'maj'], [260, 4, 'G', 'maj'],
      ],
    },
  },

  // Note frequencies for chord building
  noteFreqs: {
    'C': 130.81, 'C#': 138.59, 'Db': 138.59,
    'D': 146.83, 'D#': 155.56, 'Eb': 155.56,
    'E': 164.81, 'F': 174.61, 'F#': 185.00,
    'G': 196.00, 'G#': 207.65, 'Ab': 207.65,
    'A': 220.00, 'A#': 233.08, 'Bb': 233.08,
    'B': 246.94,
  },

  _getChordFreqs(root, type) {
    // Parse root - handle Am, Em, Dm etc
    let noteName = root;
    if (root.length > 1 && root[1] !== '#' && root[1] !== 'b') {
      noteName = root[0]; // Am -> A, Em -> E, Dm -> D
    }

    const baseFreq = this.noteFreqs[noteName];
    if (!baseFreq) return [];

    if (type === 'maj') {
      return [baseFreq, baseFreq * Math.pow(2, 4/12), baseFreq * Math.pow(2, 7/12)];
    } else if (type === 'min') {
      return [baseFreq, baseFreq * Math.pow(2, 3/12), baseFreq * Math.pow(2, 7/12)];
    }
    return [baseFreq];
  },

  init() {
    if (this.ctx) return;
    this.ctx = PitchDetector.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.12;
    this.masterGain.connect(this.ctx.destination);
  },

  // Load an audio file (MP3/WAV) as the backing track for a song.
  // kind: 'full' (default) = the original mix with vocals
  //       'instrumental'   = a real vocal-free stem (e.g. Demucs no_vocals)
  // If songId is provided, the decoded buffer is stored in the map so multiple
  // songs and multiple variants can coexist.
  async loadAudioTrack(file, songId, kind = 'full') {
    this.init();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arrayBuffer);
      if (songId) {
        if (kind === 'instrumental') {
          this.instrumentalBuffers[songId] = buffer;
        } else {
          this.audioBuffers[songId] = buffer;
        }
      } else {
        // Legacy single-buffer path (kept for the sync tool / one-off uploads)
        this.audioBuffer = buffer;
        this.audioTrackLoaded = true;
      }
      return true;
    } catch (e) {
      console.error('Failed to decode audio file:', e);
      if (!songId) this.audioTrackLoaded = false;
      return false;
    }
  },

  hasTrackFor(songId) {
    return !!(songId && this.audioBuffers[songId]);
  },

  hasInstrumentalFor(songId) {
    return !!(songId && this.instrumentalBuffers[songId]);
  },

  // Game clock source of truth. Returns the audio buffer's current playback
  // position in seconds, or null if no real audio buffer is playing (in which
  // case the caller should fall back to its own wall clock). Using this keeps
  // the visual game loop locked to what the user is actually hearing, so bars
  // never drift from the music across tab-switches, GC hitches, or audio
  // pipeline latency.
  getPlaybackTime() {
    if (!this.isPlaying || this.audioStartedAt == null || !this.ctx) return null;
    return this.ctx.currentTime - this.audioStartedAt;
  },

  clearAudioTrack() {
    this.audioBuffer = null;
    this.audioTrackLoaded = false;
  },

  // Jump the currently-playing backing track forward (or backward) by
  // `deltaSec` seconds, preserving karaoke mode. Returns the new playback
  // position in seconds, or null if nothing is playing. This only supports
  // real audio-buffer playback (not the synthesized chord fallback), which
  // is fine — synthesized songs are short and don't have long intros to skip.
  seekBy(deltaSec) {
    if (!this.isPlaying || !this.audioSource || !this.audioSource.buffer || this.audioStartedAt == null) {
      return null;
    }
    const buffer = this.audioSource.buffer;
    const currentPos = this.ctx.currentTime - this.audioStartedAt;
    let newPos = currentPos + deltaSec;
    if (newPos < 0) newPos = 0;
    // Leave a small tail so we don't seek past the end and instantly fire
    // the end-of-song handler in the middle of a skip press.
    if (newPos > buffer.duration - 0.5) newPos = Math.max(0, buffer.duration - 0.5);

    // We want the new source to share the same graph as the old one. The
    // simplest honest approach: stop the old source, rebuild a fresh source
    // wired through the same filter chain by replaying with an offset.
    // To do that without re-running the whole playSong() setup (which would
    // also re-schedule a full fresh metronome), we snapshot the karaoke
    // state, stop only the audio source, and start a fresh source with the
    // new offset hooked into masterGain-level chain.

    // Simpler still: tear down and rebuild via _restartAudioAt, which knows
    // how to recreate the karaoke filter chain.
    this._restartAudioAt(newPos, buffer);
    return newPos;
  },

  // Internal: restart the backing audio at `offsetSec` using the same buffer
  // and the same karaoke filter decision as the current playback. Used by
  // seekBy() so the user can skip through long intros without mid-song
  // artifacts.
  _restartAudioAt(offsetSec, buffer) {
    // Tear down only the audio source + its filters. We leave scheduled
    // metronome clicks alone — they're short one-shots that will either
    // have already fired or will fire silently past the end. Doing this
    // avoids double-clicks when the user mashes skip multiple times.
    try { this.audioSource.stop(); } catch (e) {}
    try { this.audioSource.disconnect(); } catch (e) {}

    const now = this.ctx.currentTime;

    // Figure out whether the current source was the instrumental stem. We
    // detect by object identity against our buffer map — if we can find a
    // songId whose instrumental buffer matches, we were in karaoke stem
    // mode and the new source should skip the fake-cancel chain.
    let bufferIsInstrumental = false;
    for (const songId of Object.keys(this.instrumentalBuffers)) {
      if (this.instrumentalBuffers[songId] === buffer) {
        bufferIsInstrumental = true;
        break;
      }
    }

    // Was the previous pipeline a fake L-R cancel? That's true only when
    // the buffer is a stereo full-mix AND we weren't using the instrumental
    // stem. We can't introspect the old graph reliably, so rebuild from
    // state: if stripVocalsOverride was set this run it's already been
    // consumed, so we fall back to "match what the song wants" — but the
    // user's toggle is the source of truth for the next run, not this seek.
    // Reasonable compromise: continue whatever mode we're in via buffer
    // identity.
    const wantFakeCancel = !bufferIsInstrumental && buffer.numberOfChannels >= 2 && this._lastUsedFakeCancel === true;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const trackGain = this.ctx.createGain();
    trackGain.gain.value = 0.85;

    if (wantFakeCancel) {
      const splitter = this.ctx.createChannelSplitter(2);
      const merger = this.ctx.createChannelMerger(2);
      const gL = this.ctx.createGain(); gL.gain.value = 1;
      const gR = this.ctx.createGain(); gR.gain.value = -1;
      const bassL = this.ctx.createGain(); bassL.gain.value = 0.5;
      const bassR = this.ctx.createGain(); bassR.gain.value = 0.5;
      const bassLP = this.ctx.createBiquadFilter();
      bassLP.type = 'lowpass';
      bassLP.frequency.value = 180;
      bassLP.Q.value = 0.7;
      src.connect(splitter);
      splitter.connect(gL, 0);
      splitter.connect(gR, 1);
      splitter.connect(bassL, 0);
      splitter.connect(bassR, 1);
      gL.connect(merger, 0, 0); gL.connect(merger, 0, 1);
      gR.connect(merger, 0, 0); gR.connect(merger, 0, 1);
      bassL.connect(bassLP); bassR.connect(bassLP);
      bassLP.connect(merger, 0, 0); bassLP.connect(merger, 0, 1);
      merger.connect(trackGain);
    } else {
      src.connect(trackGain);
    }
    trackGain.connect(this.ctx.destination);

    src.start(now, offsetSec);
    this.audioSource = src;
    // ctx.currentTime - audioStartedAt must equal offsetSec right now, so
    // that Synth.getPlaybackTime() keeps being the game clock source of truth.
    this.audioStartedAt = now - offsetSec;
    this.scheduledNodes.push(src);
  },

  playSong(songId, bpm) {
    this.init();
    // Resume the AudioContext if it was suspended (e.g. iOS suspends after
    // a period of silence, or after the first song ended and the page was
    // briefly backgrounded). Without this, start() enqueues the source in
    // a suspended context — audio is "playing" internally but outputs nothing.
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('[Synth] ctx.resume failed:', e));
    }
    this.stop();
    this.isPlaying = true;

    const song = Songs.get(songId);
    const now = this.ctx.currentTime;

    // Decide whether the user wants karaoke mode for this song.
    const wantKaraoke = this.stripVocalsOverride !== null
      ? !!this.stripVocalsOverride
      : !!(song && song.stripVocals);
    // One-shot override — reset so the next play uses defaults unless set again
    this.stripVocalsOverride = null;

    // Prefer a real Demucs-extracted instrumental stem when the user is in
    // karaoke mode and we have one bundled. This is the honest karaoke —
    // the vocal is physically gone, so nothing the mic picks up belongs
    // to the original singer. If we don't have a real stem, fall back to
    // the full-mix buffer (and, if requested, the old L-R center-cancel
    // trick — that's a compromise, not a clean cancel).
    let buffer;
    let bufferIsInstrumental = false;
    if (wantKaraoke && this.instrumentalBuffers[songId]) {
      buffer = this.instrumentalBuffers[songId];
      bufferIsInstrumental = true;
    } else {
      buffer = this.audioBuffers[songId] || this.audioBuffer;
    }

    if (buffer) {
      this.audioSource = this.ctx.createBufferSource();
      const trackGain = this.ctx.createGain();
      trackGain.gain.value = 0.85;
      this.audioSource.buffer = buffer;

      // Only apply the fake L-R center-cancel trick as a fallback when:
      //   (a) the user wants karaoke
      //   (b) we're playing the full mix (no real stem available)
      //   (c) the mix is stereo
      const useFakeCancel = wantKaraoke && !bufferIsInstrumental && buffer.numberOfChannels >= 2;
      this._lastUsedFakeCancel = useFakeCancel;
      if (useFakeCancel) {
        const splitter = this.ctx.createChannelSplitter(2);
        const merger = this.ctx.createChannelMerger(2);

        // Side signal: L - R (center content cancels out)
        const gL = this.ctx.createGain(); gL.gain.value = 1;
        const gR = this.ctx.createGain(); gR.gain.value = -1;

        // Bass keeper: lowpass-filtered mono sum of L + R, added back in
        const bassL = this.ctx.createGain(); bassL.gain.value = 0.5;
        const bassR = this.ctx.createGain(); bassR.gain.value = 0.5;
        const bassLP = this.ctx.createBiquadFilter();
        bassLP.type = 'lowpass';
        bassLP.frequency.value = 180;
        bassLP.Q.value = 0.7;

        this.audioSource.connect(splitter);
        splitter.connect(gL, 0);
        splitter.connect(gR, 1);
        splitter.connect(bassL, 0);
        splitter.connect(bassR, 1);

        // Side signal fans out to both output channels (mono)
        gL.connect(merger, 0, 0);
        gL.connect(merger, 0, 1);
        gR.connect(merger, 0, 0);
        gR.connect(merger, 0, 1);

        // Bass sum -> lowpass -> both output channels
        bassL.connect(bassLP);
        bassR.connect(bassLP);
        bassLP.connect(merger, 0, 0);
        bassLP.connect(merger, 0, 1);

        merger.connect(trackGain);
      } else {
        this.audioSource.connect(trackGain);
      }

      trackGain.connect(this.ctx.destination);
      this.audioSource.start(now);
      // Capture the exact audio-clock timestamp when playback began so the
      // game loop can sync its bars to real playback position.
      this.audioStartedAt = now;
      this.scheduledNodes.push(this.audioSource);

      // Still schedule a light metronome click
      const secPerBeat = 60 / bpm;
      const totalBeats = Math.ceil((buffer.duration / secPerBeat)) + 4;
      for (let beat = 0; beat < totalBeats; beat++) {
        this._scheduleClick(now + beat * secPerBeat, beat % 4 === 0);
      }
      return;
    }

    // Otherwise use synthesized backing
    const data = this.chordData[songId];
    if (!data) return;

    const secPerBeat = 60 / bpm;

    // Schedule pad chords
    for (const [startBeat, durBeats, root, type] of data.chords) {
      const startSec = startBeat * secPerBeat;
      const durSec = durBeats * secPerBeat;
      const freqs = this._getChordFreqs(root, type);

      this._schedulePad(freqs, now + startSec, durSec);
      this._scheduleBass(freqs[0] / 2, now + startSec, durSec, secPerBeat);
    }

    // Schedule melody guide (light)
    if (song) {
      const notes = Songs.getNotesInSeconds(song);
      for (const note of notes) {
        this._scheduleMelodyGuide(note.freq, now + note.start, note.dur);
      }
    }

    // Schedule gentle metronome
    const totalBeats = data.chords[data.chords.length - 1][0] + data.chords[data.chords.length - 1][1] + 4;
    for (let beat = 0; beat < totalBeats; beat++) {
      this._scheduleClick(now + beat * secPerBeat, beat % 4 === 0);
    }
  },

  _schedulePad(freqs, startTime, duration) {
    for (const freq of freqs) {
      // Use two detuned oscillators for richness
      for (const detune of [-3, 3]) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = freq * 2; // One octave up for brightness
        osc.detune.value = detune;

        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 0.5;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.06, startTime + 0.08);
        gain.gain.setValueAtTime(0.06, startTime + duration - 0.1);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);

        this.scheduledNodes.push(osc);
      }
    }
  },

  _scheduleBass(freq, startTime, duration, beatDur) {
    // Simple bass notes on beats
    const numNotes = Math.floor(duration / beatDur);
    for (let i = 0; i < numNotes; i++) {
      const t = startTime + i * beatDur;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const noteDur = beatDur * 0.7;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteDur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + noteDur + 0.01);

      this.scheduledNodes.push(osc);
    }
  },

  _scheduleMelodyGuide(freq, startTime, duration) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Very soft melody guide
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.04, startTime + 0.03);
    gain.gain.setValueAtTime(0.04, startTime + Math.max(0, duration - 0.05));
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);

    this.scheduledNodes.push(osc);
  },

  _scheduleClick(time, isDownbeat) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = isDownbeat ? 1000 : 700;

    gain.gain.setValueAtTime(isDownbeat ? 0.06 : 0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.05);

    this.scheduledNodes.push(osc);
  },

  stop() {
    this.isPlaying = false;
    this.audioStartedAt = null;
    for (const node of this.scheduledNodes) {
      try { node.stop(); } catch (e) {}
    }
    this.scheduledNodes = [];
  },

  // Swap the backing track mid-song (karaoke on/off toggle during play).
  // Seeks to the current playback position on the new buffer so the song
  // doesn't restart or skip. No-op if the requested track isn't loaded.
  switchKaraoke(wantKaraoke, songId) {
    if (!this.isPlaying || !this.ctx) return false;
    const currentPos = this.getPlaybackTime();
    if (currentPos === null) return false;

    let buffer;
    if (wantKaraoke && this.instrumentalBuffers[songId]) {
      buffer = this.instrumentalBuffers[songId];
      this._lastUsedFakeCancel = false;
    } else if (!wantKaraoke && this.audioBuffers[songId]) {
      buffer = this.audioBuffers[songId];
    }
    if (!buffer) return false;

    this._restartAudioAt(currentPos, buffer);
    return true;
  },

  // Like playSong() but starts playback at offsetSec instead of 0.
  // Used when switching from MV video audio back to Synth mid-song.
  playSongFrom(songId, bpm, offsetSec) {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('[Synth] ctx.resume failed:', e));
    }
    this.stop();
    this.isPlaying = true;

    const song = Songs.get(songId);
    const wantKaraoke = this.stripVocalsOverride !== null
      ? !!this.stripVocalsOverride
      : !!(song && song.stripVocals);
    this.stripVocalsOverride = null;

    let buffer;
    let bufferIsInstrumental = false;
    if (wantKaraoke && this.instrumentalBuffers[songId]) {
      buffer = this.instrumentalBuffers[songId];
      bufferIsInstrumental = true;
      this._lastUsedFakeCancel = false;
    } else {
      buffer = this.audioBuffers[songId] || this.audioBuffer;
    }
    if (!buffer) return false;

    const clampedOffset = Math.max(0, Math.min(offsetSec, buffer.duration - 0.5));
    this._restartAudioAt(clampedOffset, buffer);
    return true;
  },

  setVolume(vol) {
    if (this.masterGain) {
      this.masterGain.gain.value = vol;
    }
  }
};
