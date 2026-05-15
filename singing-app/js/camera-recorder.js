/* ==========================================
   CameraRecorder
   Camera overlay + beauty filter + canvas recording
   ========================================== */

const CameraRecorder = {

  // 'off' | 'bubble' | 'box' | 'side'
  size: 'bubble',

  _videoEl: null,
  _camStream: null,
  _recorder: null,
  _chunks: [],
  _recordedBlob: null,
  isRecording: false,

  // ── Camera lifecycle ──────────────────────────────────────────────

  async startCamera() {
    if (this.size === 'off') return;
    try {
      this._camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      this._videoEl = document.createElement('video');
      this._videoEl.srcObject = this._camStream;
      this._videoEl.muted = true;
      this._videoEl.playsInline = true;
      await this._videoEl.play();
    } catch (e) {
      console.warn('CameraRecorder: camera unavailable', e);
      this._camStream = null;
      this._videoEl = null;
    }
  },

  stopCamera() {
    if (this._camStream) {
      this._camStream.getTracks().forEach(t => t.stop());
      this._camStream = null;
    }
    this._videoEl = null;
  },

  // ── Recording lifecycle ──────────────────────────────────────────

  startRecording(canvas) {
    this._chunks = [];
    this._recordedBlob = null;
    if (!canvas || !canvas.captureStream) return;

    const canvasStream = canvas.captureStream(30);

    // Use the mic stream for ambient audio (captures both voice + instrumental bleeding
    // through speakers — same as a manual screen recording would capture).
    const micStream = typeof PitchDetector !== 'undefined' ? PitchDetector.stream : null;

    const tracks = [
      ...canvasStream.getVideoTracks(),
      ...(micStream ? micStream.getAudioTracks() : []),
    ];
    const combined = new MediaStream(tracks);

    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    try {
      this._recorder = new MediaRecorder(combined, {
        mimeType,
        videoBitsPerSecond: 3_500_000,
      });
      this._recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) this._chunks.push(e.data);
      };
      this._recorder.start(1000);
      this.isRecording = true;
    } catch (e) {
      console.warn('CameraRecorder: MediaRecorder setup failed', e);
    }
  },

  stopRecording() {
    return new Promise(resolve => {
      if (!this._recorder || this._recorder.state === 'inactive') {
        this.isRecording = false;
        resolve(null);
        return;
      }
      this._recorder.onstop = () => {
        this._recordedBlob = new Blob(this._chunks, { type: 'video/webm' });
        this.isRecording = false;
        resolve(this._recordedBlob);
      };
      this._recorder.stop();
    });
  },

  downloadClip(songTitle) {
    if (!this._recordedBlob) return;
    const slug = (songTitle || 'vocalstar').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const url = URL.createObjectURL(this._recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = slug + '-vocalstar.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  },

  setSize(size) {
    this.size = size;
    // If switching to 'off', release camera to save resources
    if (size === 'off') this.stopCamera();
    // Update picker UI
    document.querySelectorAll('.cam-picker-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
  },

  hasClip() {
    return !!this._recordedBlob;
  },

  // ── Canvas overlay ────────────────────────────────────────────────

  drawOverlay(ctx, W, H) {
    if (this.size === 'off' || !this._videoEl || !this._camStream) return;
    if (this._videoEl.readyState < 2) return;

    if (this.size === 'bubble') {
      const r = Math.round(Math.min(W, H) * 0.13);
      const cx = Math.round(W * 0.12);
      const cy = H - r - Math.round(H * 0.04);
      this._drawFrame(ctx, cx - r, cy - r, r * 2, r * 2, 'circle', r);

    } else if (this.size === 'box') {
      const bw = Math.round(W * 0.24);
      const bh = Math.round(bw * 0.75);
      const bx = Math.round(W * 0.03);
      const by = H - bh - Math.round(H * 0.04);
      this._drawFrame(ctx, bx, by, bw, bh, 'rect', 14);

    } else if (this.size === 'side') {
      const pw = Math.round(W * 0.28);
      this._drawFrame(ctx, 0, 0, pw, H, 'rect', 0);
      // Separator line
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pw, 0);
      ctx.lineTo(pw, H);
      ctx.stroke();
      ctx.restore();
    }
  },

  _drawFrame(ctx, x, y, w, h, shape, cornerR) {
    const vid = this._videoEl;
    const vw = vid.videoWidth  || 640;
    const vh = vid.videoHeight || 480;

    // Object-fit: cover — crop to fill target rect
    const scale = Math.max(w / vw, h / vh);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;

    ctx.save();

    // Clip mask
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(x + w / 2, y + h / 2, cornerR, 0, Math.PI * 2);
    } else if (cornerR > 0) {
      ctx.roundRect(x, y, w, h, cornerR);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.clip();

    // ── Layer 1: base image — bright, warm, lifted ──────────────────
    // Removes the cold blue webcam cast; sepia(0.06) adds warmth without orange
    ctx.filter = 'brightness(1.18) contrast(1.07) saturate(1.15) sepia(0.06)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);

    // ── Layer 2: skin smoothing — soft-light blur pass ──────────────
    // Fills in pore texture without blurring hard edges (eyes, lips, hair stay sharp
    // because soft-light is a low-contrast blend — large smooth areas are most affected)
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = 'blur(4px) brightness(1.06)';
    ctx.globalAlpha = 0.22;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);

    // ── Layer 3: edge sharpening — overlay at low opacity ──────────
    // High contrast overlay pulls jawline, eyes, and lip lines forward
    ctx.globalCompositeOperation = 'overlay';
    ctx.filter = 'contrast(1.6) brightness(0.92)';
    ctx.globalAlpha = 0.11;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.filter = 'none';

    // ── Border ring ─────────────────────────────────────────────────
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(x + w / 2, y + h / 2, cornerR - 1, 0, Math.PI * 2);
    } else if (cornerR > 0) {
      ctx.roundRect(x, y, w, h, cornerR);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.stroke();

    ctx.restore();
  },

  // ── REC indicator ─────────────────────────────────────────────────
  // Small pulsing dot drawn on the canvas while recording
  drawRecIndicator(ctx, W, H) {
    if (!this.isRecording) return;
    const now = performance.now();
    const pulse = 0.5 + 0.5 * Math.sin(now / 600);
    const r = Math.round(W * 0.007);
    const ix = W - r * 3;
    const iy = r * 3;
    ctx.save();
    ctx.globalAlpha = 0.7 + pulse * 0.3;
    ctx.fillStyle = '#ff3344';
    ctx.shadowColor = '#ff3344';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ix, iy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7 + pulse * 0.3;
    ctx.font = `600 ${Math.round(W * 0.014)}px 'Inter', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('REC', ix + r * 1.8, iy);
    ctx.restore();
  },
};
