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
  audioBuffer: null,     // loaded MP3 backing track
  audioSource: null,     // currently playing audio source
  audioTrackLoaded: false,

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

  // Load an audio file (MP3/WAV) as the backing track for a song
  async loadAudioTrack(file) {
    this.init();
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.audioTrackLoaded = true;
      return true;
    } catch (e) {
      console.error('Failed to decode audio file:', e);
      this.audioTrackLoaded = false;
      return false;
    }
  },

  clearAudioTrack() {
    this.audioBuffer = null;
    this.audioTrackLoaded = false;
  },

  playSong(songId, bpm) {
    this.init();
    this.stop();
    this.isPlaying = true;

    const song = Songs.get(songId);
    const now = this.ctx.currentTime;

    // If we have an uploaded audio track, play it
    if (this.audioTrackLoaded && this.audioBuffer) {
      this.audioSource = this.ctx.createBufferSource();
      const trackGain = this.ctx.createGain();
      trackGain.gain.value = 0.7;
      this.audioSource.buffer = this.audioBuffer;
      this.audioSource.connect(trackGain);
      trackGain.connect(this.ctx.destination);
      this.audioSource.start(now);
      this.scheduledNodes.push(this.audioSource);

      // Still schedule a light metronome click
      const secPerBeat = 60 / bpm;
      const totalBeats = Math.ceil((this.audioBuffer.duration / secPerBeat)) + 4;
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
    for (const node of this.scheduledNodes) {
      try { node.stop(); } catch (e) {}
    }
    this.scheduledNodes = [];
  },

  setVolume(vol) {
    if (this.masterGain) {
      this.masterGain.gain.value = vol;
    }
  }
};
