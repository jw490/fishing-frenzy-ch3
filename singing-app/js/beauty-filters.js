/* ==========================================
   BeautyFilters — single Beautify toggle
   Face-oval skin smoothing + eye restoration via MediaPipe landmarks.
   ========================================== */

const BeautyFilters = {

  current: 'natural', // 'natural' | 'beautify'

  _fl: null,
  _loading: false,
  _lm: null,
  _lastT: -1,

  FACE_OVAL: [10,338,297,332,284,251,389,356,454,323,361,288,
              397,365,379,378,400,377,152,148,176,149,150,136,
              172,58,132,93,234,127,162,21,54,103,67,109],
  RIGHT_EYE: [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246],
  LEFT_EYE:  [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398],

  // ── Init (called when camera starts) ────────────────────────────────

  initAsync() {
    if (this._fl || this._loading) return;
    this._loading = true;
    import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm')
      .then(({ FaceLandmarker, FilesetResolver }) =>
        FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        ).then(fs => FaceLandmarker.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        }))
      )
      .then(fl => { this._fl = fl; this._loading = false; })
      .catch(e => { console.warn('BeautyFilters: MediaPipe unavailable', e); this._loading = false; });
  },

  // ── Toggle ───────────────────────────────────────────────────────────

  toggle() {
    this.set(this.current === 'natural' ? 'beautify' : 'natural');
  },

  set(id) {
    this.current = id;
    const btn = document.getElementById('beautify-btn');
    if (btn) btn.classList.toggle('active', id === 'beautify');
    const vid = document.getElementById('cam-setup-video');
    if (vid) vid.style.filter = id === 'beautify' ? 'brightness(1.06) contrast(0.93)' : 'none';
  },

  // ── Main draw entry ──────────────────────────────────────────────────

  apply(ctx, vid, sx, sy, sw, sh, x, y, w, h) {
    if (this.current === 'natural') {
      ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
      return;
    }
    const lm = this._detect(vid);
    ctx.filter = 'brightness(1.06) contrast(0.93)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
    this._skinSmooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm);
    this._reset(ctx);
    this._restoreEyes(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm);
  },

  // ── Face-oval skin smoothing ─────────────────────────────────────────

  _skinSmooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm) {
    ctx.save();
    if (lm) {
      ctx.beginPath();
      this.FACE_OVAL.forEach((idx, i) => {
        const p = this._pt(lm, idx, x, y, w, h);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.clip();
    }
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = 'blur(14px) brightness(1.06)';
    ctx.globalAlpha = lm ? 0.44 : 0.28;
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  },

  // ── Eye restoration ──────────────────────────────────────────────────

  _restoreEyes(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm) {
    if (!lm) return;
    [this.RIGHT_EYE, this.LEFT_EYE].forEach(idxs => {
      ctx.save();
      ctx.beginPath();
      idxs.forEach((idx, i) => {
        const p = this._pt(lm, idx, x, y, w, h);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'brightness(1.05) contrast(1.10)';
      ctx.globalAlpha = 0.90;
      ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
      ctx.restore();
    });
    this._reset(ctx);
  },

  // ── Landmark detection ───────────────────────────────────────────────

  _detect(vid) {
    if (!this._fl) return null;
    const now = performance.now();
    if (now - this._lastT < 40) return this._lm;
    try {
      const r = this._fl.detectForVideo(vid, now);
      this._lm = r.faceLandmarks?.[0] ?? null;
      this._lastT = now;
    } catch (_) {}
    return this._lm;
  },

  _pt(lm, idx, x, y, w, h) {
    const p = lm[idx];
    return { x: x + p.x * w, y: y + p.y * h };
  },

  _reset(ctx) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  },
};
