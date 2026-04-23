/* ==========================================
   Audio Melody Extractor
   Analyzes an audio file (MP3/WAV) offline
   and extracts the vocal melody using pitch
   detection. Outputs notes in song format.
   ========================================== */

const AudioAnalyzer = {

  /**
   * Analyze an audio file and extract the melody.
   * @param {File} file - Audio file (MP3, WAV, etc)
   * @param {function} onProgress - Progress callback (0-1)
   * @returns {{ bpm: number, notes: Array }} Song-format note data
   */
  async analyze(file, onProgress = () => {}) {
    const ctx = new OfflineAudioContext(1, 1, 44100); // temp context for decoding
    const arrayBuffer = await file.arrayBuffer();

    // Decode to get sample rate and duration
    const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
    tempCtx.close();

    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const channelData = audioBuffer.getChannelData(0); // mono

    onProgress(0.05);

    // --- Pitch detection on audio frames ---
    const FRAME_SIZE = 2048;
    const HOP_SIZE = 2048; // ~46ms at 44100Hz -> ~21 frames/sec (faster analysis)
    const MIN_FREQ = 100;  // ~G2, low male voice
    const MAX_FREQ = 900;  // ~A5, high female voice
    const NOISE_THRESHOLD = 0.01;

    const pitchFrames = []; // { time, freq, confidence, rms }
    const totalFrames = Math.floor((channelData.length - FRAME_SIZE) / HOP_SIZE);

    for (let i = 0; i < totalFrames; i++) {
      const startSample = i * HOP_SIZE;
      const frame = channelData.slice(startSample, startSample + FRAME_SIZE);

      // RMS
      let rms = 0;
      for (let j = 0; j < frame.length; j++) rms += frame[j] * frame[j];
      rms = Math.sqrt(rms / frame.length);

      const time = startSample / sampleRate;

      if (rms < NOISE_THRESHOLD) {
        pitchFrames.push({ time, freq: -1, confidence: 0, rms });
      } else {
        const result = this._detectPitch(frame, sampleRate, MIN_FREQ, MAX_FREQ);
        pitchFrames.push({ time, freq: result.freq, confidence: result.confidence, rms });
      }

      if (i % 200 === 0) {
        onProgress(0.05 + 0.7 * (i / totalFrames));
        await new Promise(r => setTimeout(r, 0));
      }
    }

    onProgress(0.75);

    // --- Convert pitch frames to notes ---
    const notes = this._framesToNotes(pitchFrames, sampleRate);

    onProgress(0.9);

    // --- Estimate BPM ---
    const bpm = this._estimateBPM(notes);

    // --- Convert time (seconds) to beats ---
    const secPerBeat = 60 / bpm;
    const songNotes = notes.map(n => ({
      midi: n.midi,
      start: Math.round((n.start / secPerBeat) * 100) / 100,
      dur: Math.round((n.dur / secPerBeat) * 100) / 100,
      lyric: '',
    }));

    onProgress(1.0);

    return {
      bpm,
      notes: songNotes,
      rawFrames: pitchFrames.length,
      duration,
    };
  },

  /**
   * Convert pitch frames into discrete notes.
   * Groups consecutive frames with similar pitch into single notes.
   */
  _framesToNotes(frames, sampleRate) {
    const notes = [];
    let currentNote = null;
    const CENT_THRESHOLD = 80; // cents tolerance for "same note"
    const MIN_NOTE_DURATION = 0.08; // minimum 80ms to count as a note
    const MAX_GAP = 0.15; // max silence gap to bridge

    for (const frame of frames) {
      if (frame.freq <= 0 || frame.confidence < 0.5) {
        // No pitch detected
        if (currentNote) {
          // End current note
          currentNote.end = frame.time;
          currentNote.dur = currentNote.end - currentNote.start;
          if (currentNote.dur >= MIN_NOTE_DURATION) {
            notes.push(currentNote);
          }
          currentNote = null;
        }
        continue;
      }

      const midi = 69 + 12 * Math.log2(frame.freq / 440);
      const roundedMidi = Math.round(midi);

      if (currentNote) {
        const centsDiff = Math.abs(midi - currentNote.midi) * 100;
        if (centsDiff < CENT_THRESHOLD) {
          // Same note continues - update running average
          currentNote.end = frame.time;
          currentNote.midiSum += midi;
          currentNote.midiCount++;
          currentNote.midi = Math.round(currentNote.midiSum / currentNote.midiCount);
        } else {
          // Different note - close current and start new
          currentNote.end = frame.time;
          currentNote.dur = currentNote.end - currentNote.start;
          if (currentNote.dur >= MIN_NOTE_DURATION) {
            notes.push(currentNote);
          }
          currentNote = {
            midi: roundedMidi,
            start: frame.time,
            end: frame.time,
            dur: 0,
            midiSum: midi,
            midiCount: 1,
          };
        }
      } else {
        // Start new note
        currentNote = {
          midi: roundedMidi,
          start: frame.time,
          end: frame.time,
          dur: 0,
          midiSum: midi,
          midiCount: 1,
        };
      }
    }

    // Close last note
    if (currentNote) {
      currentNote.dur = currentNote.end - currentNote.start;
      if (currentNote.dur >= MIN_NOTE_DURATION) {
        notes.push(currentNote);
      }
    }

    // Filter to vocal range (C3-C6, MIDI 48-84)
    const vocalNotes = notes.filter(n => n.midi >= 48 && n.midi <= 84);

    // Merge very short gaps (bridge tiny silences)
    const merged = [];
    for (let i = 0; i < vocalNotes.length; i++) {
      const n = vocalNotes[i];
      if (merged.length > 0) {
        const prev = merged[merged.length - 1];
        const gap = n.start - (prev.start + prev.dur);
        if (gap < MAX_GAP && n.midi === prev.midi) {
          // Extend previous note
          prev.dur = (n.start + n.dur) - prev.start;
          continue;
        }
      }
      merged.push({ midi: n.midi, start: n.start, dur: n.dur });
    }

    return merged;
  },

  /**
   * Rough BPM estimation from note onsets.
   */
  _estimateBPM(notes) {
    if (notes.length < 4) return 120;

    // Collect inter-onset intervals
    const intervals = [];
    for (let i = 1; i < notes.length; i++) {
      const ioi = notes[i].start - notes[i - 1].start;
      if (ioi > 0.1 && ioi < 2.0) {
        intervals.push(ioi);
      }
    }

    if (intervals.length === 0) return 120;

    // Find the most common interval using histogram
    const binSize = 0.02; // 20ms bins
    const histogram = {};
    for (const ioi of intervals) {
      const bin = Math.round(ioi / binSize) * binSize;
      histogram[bin] = (histogram[bin] || 0) + 1;
    }

    // Find peak
    let peakBin = 0.5;
    let peakCount = 0;
    for (const [bin, count] of Object.entries(histogram)) {
      if (count > peakCount) {
        peakCount = count;
        peakBin = parseFloat(bin);
      }
    }

    // Convert interval to BPM (assume the peak is a beat or half-beat)
    let bpm = 60 / peakBin;

    // Normalize to common BPM range (80-180)
    while (bpm < 80) bpm *= 2;
    while (bpm > 180) bpm /= 2;

    return Math.round(bpm);
  },

  /**
   * YIN-style pitch detection (same as PitchDetector but standalone)
   */
  _detectPitch(buf, sampleRate, minFreq, maxFreq) {
    const SIZE = buf.length;
    const minLag = Math.floor(sampleRate / maxFreq);
    const maxLag = Math.floor(sampleRate / minFreq);

    if (maxLag >= SIZE) return { freq: -1, confidence: 0 };

    // Difference function
    const diff = new Float32Array(maxLag + 1);
    for (let tau = 0; tau <= maxLag; tau++) {
      let sum = 0;
      for (let i = 0; i < SIZE - maxLag; i++) {
        const delta = buf[i] - buf[i + tau];
        sum += delta * delta;
      }
      diff[tau] = sum;
    }

    // Cumulative mean normalized difference
    const cmnd = new Float32Array(maxLag + 1);
    cmnd[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= maxLag; tau++) {
      runningSum += diff[tau];
      cmnd[tau] = diff[tau] / (runningSum / tau);
    }

    // Find first valley below threshold
    const threshold = 0.2;
    let bestTau = -1;

    for (let tau = minLag; tau <= maxLag; tau++) {
      if (cmnd[tau] < threshold) {
        while (tau + 1 <= maxLag && cmnd[tau + 1] < cmnd[tau]) tau++;
        bestTau = tau;
        break;
      }
    }

    if (bestTau === -1) {
      let minVal = Infinity;
      for (let tau = minLag; tau <= maxLag; tau++) {
        if (cmnd[tau] < minVal) { minVal = cmnd[tau]; bestTau = tau; }
      }
      if (minVal > 0.5) return { freq: -1, confidence: 0 };
    }

    // Parabolic interpolation
    if (bestTau > 0 && bestTau < maxLag) {
      const s0 = cmnd[bestTau - 1];
      const s1 = cmnd[bestTau];
      const s2 = cmnd[bestTau + 1];
      const shift = (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
      if (Math.abs(shift) < 1) bestTau += shift;
    }

    const freq = sampleRate / bestTau;
    const confidence = 1 - (cmnd[Math.round(bestTau)] || 0);

    if (freq < minFreq || freq > maxFreq) return { freq: -1, confidence: 0 };

    return { freq, confidence: Math.max(0, Math.min(1, confidence)) };
  },
};
