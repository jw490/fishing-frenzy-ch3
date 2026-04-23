/* ==========================================
   Pitch Detection Engine
   Autocorrelation-based (YIN-inspired)
   Real-time fundamental frequency detection
   ========================================== */

const PitchDetector = {

  audioContext: null,
  analyser: null,
  mediaStream: null,
  source: null,
  isRunning: false,
  buffer: null,
  listeners: [],

  // Minimum RMS threshold to consider as voice input
  NOISE_THRESHOLD: 0.010,
  // Frequency range for human singing voice
  MIN_FREQ: 80,   // ~E2
  MAX_FREQ: 1100, // ~C6

  async init() {
    if (this.audioContext) return true;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      return true;
    } catch (e) {
      console.error('AudioContext not supported:', e);
      return false;
    }
  },

  async startMic() {
    if (this.isRunning) return true;
    try {
      await this.init();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // echoCancellation OFF: AEC is the root cause of speaker ducking —
          // the browser detects its own output as "echo" and suppresses it
          // the moment the mic goes live. Must stay off.
          echoCancellation: false,
          // noiseSuppression OFF: applies a spectral filter that distorts the
          // fundamental frequency and hurts pitch detection accuracy.
          noiseSuppression: false,
          // autoGainControl OFF: AGC takes ~5 seconds to stabilise on a new
          // stream — during warm-up the gain ramps unpredictably, causing
          // confidence to spike low and leaving singers with a blank screen
          // for the first 5 s of every song.  We lower NOISE_THRESHOLD to
          // 0.010 instead so quiet voices are still captured without AGC.
          autoGainControl: false,
          sampleRate: 44100,
        }
      });

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0;
      this.source.connect(this.analyser);

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.isRunning = true;
      this._loop();
      return true;
    } catch (e) {
      console.error('Microphone access denied:', e);
      return false;
    }
  },

  stop() {
    this.isRunning = false;
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.analyser = null;
  },

  onPitch(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  },

  _emit(data) {
    for (const fn of this.listeners) fn(data);
  },

  _loop() {
    if (!this.isRunning) return;
    this.analyser.getFloatTimeDomainData(this.buffer);

    // Compute RMS volume
    let rms = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      rms += this.buffer[i] * this.buffer[i];
    }
    rms = Math.sqrt(rms / this.buffer.length);

    if (rms < this.NOISE_THRESHOLD) {
      this._emit({ freq: -1, midi: -1, note: '--', cents: 0, volume: rms, confidence: 0 });
    } else {
      const result = this._detectPitch(this.buffer, this.audioContext.sampleRate);
      if (result.freq > 0) {
        const midi = Songs.freqToMidi(result.freq);
        const note = Songs.freqToName(result.freq);
        const cents = Songs.freqToCents(result.freq);
        this._emit({ freq: result.freq, midi, note, cents, volume: rms, confidence: result.confidence });
      } else {
        this._emit({ freq: -1, midi: -1, note: '--', cents: 0, volume: rms, confidence: 0 });
      }
    }

    requestAnimationFrame(() => this._loop());
  },

  /**
   * YIN-inspired pitch detection using normalized square difference function.
   * Returns { freq, confidence }
   */
  _detectPitch(buf, sampleRate) {
    const SIZE = buf.length;
    const minLag = Math.floor(sampleRate / this.MAX_FREQ);
    const maxLag = Math.floor(sampleRate / this.MIN_FREQ);

    if (maxLag >= SIZE) {
      return { freq: -1, confidence: 0 };
    }

    // Step 1: Compute the difference function d(tau)
    const diff = new Float32Array(maxLag + 1);
    for (let tau = 0; tau <= maxLag; tau++) {
      let sum = 0;
      for (let i = 0; i < SIZE - maxLag; i++) {
        const delta = buf[i] - buf[i + tau];
        sum += delta * delta;
      }
      diff[tau] = sum;
    }

    // Step 2: Cumulative mean normalized difference function
    const cmnd = new Float32Array(maxLag + 1);
    cmnd[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= maxLag; tau++) {
      runningSum += diff[tau];
      cmnd[tau] = diff[tau] / (runningSum / tau);
    }

    // Step 3: Absolute threshold - find first valley below threshold
    const threshold = 0.2;
    let bestTau = -1;

    for (let tau = minLag; tau <= maxLag; tau++) {
      if (cmnd[tau] < threshold) {
        // Walk to the local minimum
        while (tau + 1 <= maxLag && cmnd[tau + 1] < cmnd[tau]) {
          tau++;
        }
        bestTau = tau;
        break;
      }
    }

    // If no value below threshold, find the global minimum
    if (bestTau === -1) {
      let minVal = Infinity;
      for (let tau = minLag; tau <= maxLag; tau++) {
        if (cmnd[tau] < minVal) {
          minVal = cmnd[tau];
          bestTau = tau;
        }
      }
      // Only accept if reasonably confident
      if (minVal > 0.5) {
        return { freq: -1, confidence: 0 };
      }
    }

    // Step 4: Parabolic interpolation for sub-sample accuracy
    if (bestTau > 0 && bestTau < maxLag) {
      const s0 = cmnd[bestTau - 1];
      const s1 = cmnd[bestTau];
      const s2 = cmnd[bestTau + 1];
      const shift = (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
      if (Math.abs(shift) < 1) {
        bestTau += shift;
      }
    }

    const freq = sampleRate / bestTau;
    const confidence = 1 - (cmnd[Math.round(bestTau)] || 0);

    // Sanity check
    if (freq < this.MIN_FREQ || freq > this.MAX_FREQ) {
      return { freq: -1, confidence: 0 };
    }

    return { freq, confidence: Math.max(0, Math.min(1, confidence)) };
  },

  // Generate a reference tone
  playTone(freq, duration = 1.0) {
    if (!this.audioContext) this.init();
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  },

  // Play a metronome click
  playClick() {
    if (!this.audioContext) this.init();
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }
};
