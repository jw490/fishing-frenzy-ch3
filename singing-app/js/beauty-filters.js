/* ==========================================
   BeautyFilters
   7-filter system: canvas multi-pass + MediaPipe landmarks for Glamour/Freckles
   ========================================== */

const BeautyFilters = {

  current: 'natural',

  _faceLandmarker: null,
  _landmarkLoading: false,
  _lastLandmarks: null,
  _lastDetectMs: -1,
  _detectIntervalMs: 40, // ~25fps landmark detection

  // CSS filter strings shown on the setup preview video (approximate match)
  _CSS: {
    natural:  'none',
    beauty:   'brightness(1.08) contrast(0.90) saturate(1.05)',
    tan:      'brightness(1.08) saturate(1.5) sepia(0.28) hue-rotate(-12deg)',
    angel:    'brightness(1.38) contrast(0.76) saturate(0.80)',
    pink:     'brightness(1.12) contrast(0.92) saturate(1.3) hue-rotate(330deg)',
    glamour:  'brightness(1.12) contrast(1.02) saturate(1.2)',
    freckles: 'brightness(1.05) saturate(1.1) contrast(0.96)',
  },

  set(id) {
    this.current = id;
    document.querySelectorAll('.filter-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.filter === id)
    );
    const vid = document.getElementById('cam-setup-video');
    if (vid) vid.style.filter = this._CSS[id] || 'none';

    if ((id === 'glamour' || id === 'freckles') && !this._faceLandmarker && !this._landmarkLoading) {
      this._initLandmarker();
    }
  },

  async _initLandmarker() {
    this._landmarkLoading = true;
    try {
      const { FaceLandmarker, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm'
      );
      const fs = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      this._faceLandmarker = await FaceLandmarker.createFromOptions(fs, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    } catch (e) {
      console.warn('BeautyFilters: MediaPipe init failed', e);
      if (this.current === 'glamour') { this.current = 'beauty'; this.set('beauty'); }
      if (this.current === 'freckles') { this.current = 'natural'; this.set('natural'); }
    }
    this._landmarkLoading = false;
  },

  _detect(vid) {
    if (!this._faceLandmarker) return null;
    const now = performance.now();
    if (now - this._lastDetectMs < this._detectIntervalMs) return this._lastLandmarks;
    try {
      const res = this._faceLandmarker.detectForVideo(vid, now);
      this._lastLandmarks = res.faceLandmarks?.[0] ?? null;
      this._lastDetectMs = now;
    } catch (_) {
      this._lastLandmarks = null;
    }
    return this._lastLandmarks;
  },

  // ── Main entry point called by CameraRecorder._drawFrame ────────────
  // ctx is already clipped to the bubble/box shape when this is called.

  apply(ctx, vid, sx, sy, sw, sh, x, y, w, h) {
    const f = this.current;

    if (f === 'natural') {
      ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);

    } else if (f === 'beauty') {
      this._beauty(ctx, vid, sx, sy, sw, sh, x, y, w, h);

    } else if (f === 'tan') {
      this._tan(ctx, vid, sx, sy, sw, sh, x, y, w, h);

    } else if (f === 'angel') {
      this._angel(ctx, vid, sx, sy, sw, sh, x, y, w, h);

    } else if (f === 'pink') {
      this._pink(ctx, vid, sx, sy, sw, sh, x, y, w, h);

    } else if (f === 'glamour') {
      this._glamour(ctx, vid, sx, sy, sw, sh, x, y, w, h);

    } else if (f === 'freckles') {
      this._freckles(ctx, vid, sx, sy, sw, sh, x, y, w, h);

    } else {
      ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    }
  },

  // ── Per-filter canvas passes ─────────────────────────────────────────

  _beauty(ctx, vid, sx, sy, sw, sh, x, y, w, h) {
    ctx.filter = 'brightness(1.08) contrast(0.90) saturate(1.05)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = 'blur(14px) brightness(1.06)';
    ctx.globalAlpha = 0.42;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
  },

  _tan(ctx, vid, sx, sy, sw, sh, x, y, w, h) {
    ctx.filter = 'brightness(1.08) saturate(1.5) sepia(0.28) hue-rotate(-12deg) contrast(1.05)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = 'blur(8px)';
    ctx.globalAlpha = 0.22;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
  },

  _angel(ctx, vid, sx, sy, sw, sh, x, y, w, h) {
    ctx.filter = 'brightness(1.38) contrast(0.76) saturate(0.80)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    // Heavenly glow
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'blur(22px) brightness(1.25)';
    ctx.globalAlpha = 0.38;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    // Skin smoothing
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = 'blur(12px)';
    ctx.globalAlpha = 0.30;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
  },

  _pink(ctx, vid, sx, sy, sw, sh, x, y, w, h) {
    ctx.filter = 'brightness(1.12) contrast(0.92) saturate(1.35) hue-rotate(330deg)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = 'blur(12px)';
    ctx.globalAlpha = 0.30;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    // Rose tint
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'none';
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = 'rgba(255, 140, 160, 1)';
    ctx.fillRect(x, y, w, h);
    this._reset(ctx);
  },

  _glamour(ctx, vid, sx, sy, sw, sh, x, y, w, h) {
    // Base: porcelain skin
    ctx.filter = 'brightness(1.12) contrast(1.02) saturate(1.2)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = 'blur(10px) brightness(1.06)';
    ctx.globalAlpha = 0.32;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
    // Makeup overlay from landmarks
    const lm = this._detect(vid);
    if (lm) this._drawMakeup(ctx, lm, x, y, w, h);
  },

  _freckles(ctx, vid, sx, sy, sw, sh, x, y, w, h) {
    ctx.filter = 'brightness(1.05) saturate(1.1) contrast(0.96)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
    const lm = this._detect(vid);
    if (lm) this._drawFreckles(ctx, lm, x, y, w, h);
  },

  _reset(ctx) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },

  // ── Landmark helpers ─────────────────────────────────────────────────

  _pt(lm, idx, x, y, w, h) {
    const p = lm[idx];
    return { x: x + p.x * w, y: y + p.y * h };
  },

  // ── Bold Glamour makeup ──────────────────────────────────────────────

  _drawMakeup(ctx, lm, x, y, w, h) {
    ctx.save();

    // ── Lips: multiply deep red/berry ───────────────────────────────────
    // Outer lip path (upper then lower)
    const upperLip = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
    const lowerLip = [291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61];

    ctx.beginPath();
    upperLip.forEach((i, n) => {
      const p = this._pt(lm, i, x, y, w, h);
      n === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    lowerLip.forEach(i => {
      const p = this._pt(lm, i, x, y, w, h);
      ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(185, 45, 70, 0.60)';
    ctx.fill();

    // Lip gloss highlight
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 200, 210, 0.18)';
    ctx.fill();

    // ── Blush: soft radial gradient on cheeks ───────────────────────────
    const leftCheek  = this._pt(lm, 234, x, y, w, h);
    const rightCheek = this._pt(lm, 454, x, y, w, h);
    const blushR = w * 0.10;

    ctx.globalCompositeOperation = 'multiply';
    [leftCheek, rightCheek].forEach(c => {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, blushR);
      g.addColorStop(0, 'rgba(240, 100, 120, 0.38)');
      g.addColorStop(1, 'rgba(240, 100, 120, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, blushR, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Eyeshadow: soft purple gradient above each upper eyelid ─────────
    // Right eye upper crease center ~(159+160+161) average
    // Left eye upper crease center  ~(386+387+388) average
    const eyeGroups = [
      [159, 160, 161, 158],   // person's right eye
      [386, 387, 388, 385],   // person's left eye
    ];
    ctx.globalCompositeOperation = 'multiply';

    eyeGroups.forEach(idxs => {
      const pts = idxs.map(i => this._pt(lm, i, x, y, w, h));
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length - h * 0.012;
      const er = w * 0.045;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, er);
      g.addColorStop(0, 'rgba(110, 60, 160, 0.50)');
      g.addColorStop(1, 'rgba(110, 60, 160, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, er, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Contour: subtle shadow under cheekbones ──────────────────────────
    // Left jaw ~172, right jaw ~397, chin ~152
    const jawL = this._pt(lm, 172, x, y, w, h);
    const jawR = this._pt(lm, 397, x, y, w, h);
    const contourR = w * 0.07;

    ctx.globalCompositeOperation = 'multiply';
    [jawL, jawR].forEach(c => {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, contourR);
      g.addColorStop(0, 'rgba(100, 65, 55, 0.28)');
      g.addColorStop(1, 'rgba(100, 65, 55, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, contourR, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  // ── Freckles ─────────────────────────────────────────────────────────

  _drawFreckles(ctx, lm, x, y, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    const nose    = this._pt(lm, 1,   x, y, w, h);
    const noseTip = this._pt(lm, 4,   x, y, w, h);
    const cheekL  = this._pt(lm, 117, x, y, w, h);
    const cheekR  = this._pt(lm, 346, x, y, w, h);

    // Seeded pseudo-random stable to face position
    const seed = (Math.floor(nose.x) * 1000 + Math.floor(nose.y)) | 0;
    const rand = (i) => {
      let s = ((seed + i * 997) ^ 0x5A5A5A5A) >>> 0;
      s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
      s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
      return (s >>> 0) / 0xFFFFFFFF;
    };

    const zones = [
      { c: nose,                                                    r: w * 0.065, n: 14 },
      { c: { x: (nose.x + cheekL.x) / 2, y: nose.y - h * 0.005 }, r: w * 0.050, n: 10 },
      { c: { x: (nose.x + cheekR.x) / 2, y: nose.y - h * 0.005 }, r: w * 0.050, n: 10 },
      { c: noseTip,                                                  r: w * 0.035, n:  6 },
    ];

    let fi = 0;
    zones.forEach(({ c, r, n }) => {
      for (let i = 0; i < n; i++) {
        const angle = rand(fi)     * Math.PI * 2;
        const dist  = Math.sqrt(rand(fi + 1)) * r;
        const fx = c.x + Math.cos(angle) * dist;
        const fy = c.y + Math.sin(angle) * dist;
        const fr = w * (0.003 + rand(fi + 2) * 0.007);
        const alpha = 0.30 + rand(fi + 3) * 0.45;
        const R = 120 + Math.floor(rand(fi + 4) * 45);
        const G =  72 + Math.floor(rand(fi + 5) * 30);
        const B =  45 + Math.floor(rand(fi + 6) * 20);
        ctx.fillStyle = `rgba(${R},${G},${B},${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
        fi += 7;
      }
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },
};
