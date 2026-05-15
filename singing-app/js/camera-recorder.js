/* ==========================================
   CameraRecorder
   Camera overlay + beauty filter + canvas recording
   ========================================== */

const CameraRecorder = {

  // 'off' | 'bubble-sm' | 'bubble' | 'bubble-lg' | 'box'
  size: 'bubble',

  _videoEl: null,
  _camStream: null,
  _recorder: null,
  _chunks: [],
  _recordedBlob: null,
  isRecording: false,

  // Bubble position in display coords (set at first draw if not yet placed)
  _bubbleX: null,
  _bubbleY: null,
  _dragging: false,
  _dragOffX: 0,
  _dragOffY: 0,

  // ── Camera lifecycle ──────────────────────────────────────────────

  async startCamera() {
    try {
      this._camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      if (!this._videoEl) {
        this._videoEl = document.createElement('video');
        this._videoEl.muted = true;
        this._videoEl.playsInline = true;
      }
      this._videoEl.srcObject = this._camStream;
      await this._videoEl.play();

      // Also feed the setup preview if it exists
      const setupVid = document.getElementById('cam-setup-video');
      if (setupVid) {
        setupVid.srcObject = this._camStream;
        setupVid.play().catch(() => {});
      }
      // Initialise bubble hint once layout is settled
      requestAnimationFrame(() => this._updatePreviewHint(this.size));
    } catch (e) {
      console.warn('CameraRecorder: camera unavailable', e);
      this._camStream = null;
    }
  },

  stopCamera() {
    if (this._camStream) {
      this._camStream.getTracks().forEach(t => t.stop());
      this._camStream = null;
    }
    const setupVid = document.getElementById('cam-setup-video');
    if (setupVid) { setupVid.srcObject = null; }
  },

  // ── Recording lifecycle ──────────────────────────────────────────

  startRecording(canvas) {
    this._chunks = [];
    this._recordedBlob = null;
    if (!canvas || !canvas.captureStream) return;

    const canvasStream = canvas.captureStream(30);
    const micStream = typeof PitchDetector !== 'undefined' ? PitchDetector.stream : null;
    const tracks = [
      ...canvasStream.getVideoTracks(),
      ...(micStream ? micStream.getAudioTracks() : []),
    ];

    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    try {
      this._recorder = new MediaRecorder(new MediaStream(tracks), {
        mimeType,
        videoBitsPerSecond: 3_500_000,
      });
      this._recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) this._chunks.push(e.data);
      };
      this._recorder.start(1000);
      this.isRecording = true;
    } catch (e) {
      console.warn('CameraRecorder: MediaRecorder failed', e);
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
    if (size === 'off') this.stopCamera();
    document.querySelectorAll('.cam-picker-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
    this._updatePreviewHint(size);
  },

  _updatePreviewHint(size) {
    const hint = document.getElementById('cam-preview-hint');
    const wrap = hint && hint.parentElement;
    if (!hint || !wrap) return;
    if (size === 'off') { hint.style.opacity = '0'; return; }
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    const radiusMap = { 'bubble-sm': 0.08, 'bubble': 0.12, 'bubble-lg': 0.17 };
    const ratio = radiusMap[size] || 0.12;
    const r = Math.round(Math.min(W, H) * ratio);
    const cx = Math.round(W * 0.12);
    const cy = H - r - Math.round(H * 0.05);
    hint.style.width  = (r * 2) + 'px';
    hint.style.height = (r * 2) + 'px';
    hint.style.left   = cx + 'px';
    hint.style.top    = cy + 'px';
    hint.style.opacity = '1';
  },

  hasClip() {
    return !!this._recordedBlob;
  },

  // ── Drag-to-reposition ───────────────────────────────────────────
  // Attach pointer events to the game canvas so players can drag the bubble anywhere

  initDrag(canvas) {
    canvas.addEventListener('pointerdown', e => {
      if (this.size === 'off' || !this._videoEl) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const { cx, cy, r } = this._bubbleGeometry(W, H);
      const dist = Math.hypot(px - cx, py - cy);
      if (dist <= r + 18) {  // 18px grab margin
        this._dragging = true;
        this._dragOffX = px - cx;
        this._dragOffY = py - cy;
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    }, { passive: false });

    canvas.addEventListener('pointermove', e => {
      if (!this._dragging) return;
      const rect = canvas.getBoundingClientRect();
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const r = this._bubbleRadius(Math.min(W, H));
      const px = e.clientX - rect.left - this._dragOffX;
      const py = e.clientY - rect.top  - this._dragOffY;
      this._bubbleX = Math.max(r, Math.min(W - r, px));
      this._bubbleY = Math.max(r, Math.min(H - r, py));
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('pointerup', () => { this._dragging = false; });
    canvas.addEventListener('pointercancel', () => { this._dragging = false; });
  },

  _bubbleRadius(minDim) {
    const radiusMap = { 'bubble-sm': 0.08, 'bubble': 0.12, 'bubble-lg': 0.17, 'box': 0 };
    return Math.round(minDim * (radiusMap[this.size] || 0.12));
  },

  _bubbleGeometry(W, H) {
    const r = this._bubbleRadius(Math.min(W, H));
    if (this._bubbleX === null) {
      this._bubbleX = Math.round(W * 0.12);
      this._bubbleY = Math.round(H - r - H * 0.05);
    }
    return { cx: this._bubbleX, cy: this._bubbleY, r };
  },

  // ── Canvas overlay ────────────────────────────────────────────────

  drawOverlay(ctx, W, H) {
    if (this.size === 'off' || !this._videoEl || !this._camStream) return;
    if (this._videoEl.readyState < 2) return;

    if (this.size === 'box') {
      const bw = Math.round(W * 0.24);
      const bh = Math.round(bw * 0.75);
      const bx = Math.round(W * 0.03);
      const by = H - bh - Math.round(H * 0.04);
      this._drawFrame(ctx, bx, by, bw, bh, 'rect', 14);
    } else {
      // Bubble sizes: sm / default / lg
      const { cx, cy, r } = this._bubbleGeometry(W, H);
      this._drawFrame(ctx, cx - r, cy - r, r * 2, r * 2, 'circle', r);

      // Drag handle hint — small grabber dot visible when not recording
      if (!this.isRecording) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx, cy - r + Math.round(r * 0.22), Math.round(r * 0.1), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  },

  _drawFrame(ctx, x, y, w, h, shape, cornerR) {
    const vid = this._videoEl;
    const vw = vid.videoWidth  || 640;
    const vh = vid.videoHeight || 480;

    // Object-fit: cover
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

    // ── Layer 1: base — TikTok beauty grade ──────────────────────────
    // Low contrast (0.82) flattens skin texture; warm hue lifts tone;
    // high saturation (1.50) gives the vivid "filter" pop
    ctx.filter = 'brightness(1.18) contrast(0.82) saturate(1.50) hue-rotate(-8deg)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);

    // ── Layer 2: skin smoothing — soft-light blur pass ───────────────
    // Higher alpha (0.38) than before = more porcelain skin effect
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = 'blur(10px) brightness(1.06)';
    ctx.globalAlpha = 0.38;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);

    // ── Layer 3: eye & feature pop — overlay at low opacity ──────────
    ctx.globalCompositeOperation = 'overlay';
    ctx.filter = 'contrast(1.55) brightness(0.92)';
    ctx.globalAlpha = 0.09;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.filter = 'none';

    // ── Border ring ──────────────────────────────────────────────────
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
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
