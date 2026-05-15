/* ==========================================
   BeautyFilters
   Face-landmark-based beauty filters.
   All filters (except Natural) target skin specifically:
   - Blur is clipped to the face oval polygon (skin smoothing)
   - Eyes are re-sharpened inside eye landmark polygons
   - Makeup applied at exact landmark positions
   MediaPipe loads eagerly when camera starts.
   ========================================== */

const BeautyFilters = {

  current: 'natural',
  _fl: null,           // MediaPipe FaceLandmarker
  _loading: false,
  _lm: null,           // last detected landmarks
  _lastT: -1,
  _detectInterval: 40, // ms between landmark detections (~25fps)

  // MediaPipe face oval — outer boundary of the face/skin region
  FACE_OVAL: [10,338,297,332,284,251,389,356,454,323,361,288,
              397,365,379,378,400,377,152,148,176,149,150,136,
              172,58,132,93,234,127,162,21,54,103,67,109],

  RIGHT_EYE: [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246],
  LEFT_EYE:  [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398],
  UPPER_LIP: [61,185,40,39,37,0,267,269,270,409,291],
  LOWER_LIP: [291,375,321,405,314,17,84,181,91,146,61],

  // ── MediaPipe init ──────────────────────────────────────────────────
  // Called from CameraRecorder.startCamera() so it pre-warms while user
  // reads the camera setup screen.

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

  // ── Filter selection ────────────────────────────────────────────────

  set(id) {
    this.current = id;
    document.querySelectorAll('.filter-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.filter === id)
    );
    // Approximate CSS preview on the setup video element (before / when no landmarks)
    const vid = document.getElementById('cam-setup-video');
    if (vid) vid.style.filter = this._previewCSS[id] || 'none';
  },

  _previewCSS: {
    natural:   'none',
    smooth:    'brightness(1.05) contrast(0.93)',
    dewy:      'brightness(1.10) contrast(0.88) saturate(1.05)',
    porcelain: 'brightness(1.16) contrast(0.82)',
    golden:    'brightness(1.10) saturate(1.35) sepia(0.15) hue-rotate(-8deg)',
    glamour:   'brightness(1.12) contrast(1.02) saturate(1.15)',
    freckles:  'brightness(1.05) contrast(0.96)',
  },

  // ── Landmark detection ──────────────────────────────────────────────

  _detect(vid) {
    if (!this._fl) return null;
    const now = performance.now();
    if (now - this._lastT < this._detectInterval) return this._lm;
    try {
      const r = this._fl.detectForVideo(vid, now);
      this._lm = r.faceLandmarks?.[0] ?? null;
      this._lastT = now;
    } catch (_) {}
    return this._lm;
  },

  // ── Main apply — called by CameraRecorder._drawFrame ────────────────
  // ctx is already clipped to the bubble/box shape.

  apply(ctx, vid, sx, sy, sw, sh, x, y, w, h) {
    const f = this.current;
    if (f === 'natural') { ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h); return; }

    const lm = this._detect(vid);

    switch (f) {
      case 'smooth':    this._smooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm); break;
      case 'dewy':      this._dewy(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm); break;
      case 'porcelain': this._porcelain(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm); break;
      case 'golden':    this._golden(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm); break;
      case 'glamour':   this._glamour(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm); break;
      case 'freckles':  this._frecklesFilter(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm); break;
      default:          ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    }
  },

  // ── Core: targeted skin smoothing ───────────────────────────────────
  // Applies blurred pass clipped to face oval polygon — only skin is
  // smoothed. Background and hairline stay sharp.

  _skinSmooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, alpha, blurPx, brightFactor) {
    ctx.save();

    if (lm) {
      // Clip blur to face oval so background stays sharp
      ctx.beginPath();
      this.FACE_OVAL.forEach((idx, i) => {
        const p = this._pt(lm, idx, x, y, w, h);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.clip();
    }

    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = `blur(${blurPx}px) brightness(${brightFactor})`;
    ctx.globalAlpha = lm ? alpha : alpha * 0.55; // weaker fallback without face
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);

    ctx.restore();
  },

  // ── Core: eye restoration ────────────────────────────────────────────
  // After skin smoothing, redraw the eye regions sharp so eyes pop
  // instead of being blurred over.

  _restoreEyes(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, brightness) {
    if (!lm) return;
    [this.RIGHT_EYE, this.LEFT_EYE].forEach(eyeIdxs => {
      ctx.save();
      ctx.beginPath();
      eyeIdxs.forEach((idx, i) => {
        const p = this._pt(lm, idx, x, y, w, h);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = `brightness(${brightness}) contrast(1.12)`;
      ctx.globalAlpha = 0.88;
      ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
      ctx.restore();
    });
    this._reset(ctx);
  },

  // ── Filters ──────────────────────────────────────────────────────────

  // Smooth — light, clean skin smoothing. Natural look, no colour shift.
  _smooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm) {
    ctx.filter = 'brightness(1.05) contrast(0.94)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
    this._skinSmooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 0.36, 12, 1.04);
    this._reset(ctx);
    this._restoreEyes(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 1.04);
  },

  // Dewy — glass-skin effect. Heavy smooth + luminous glow on skin only.
  _dewy(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm) {
    ctx.filter = 'brightness(1.10) contrast(0.87) saturate(1.06)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
    this._skinSmooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 0.50, 15, 1.09);
    this._reset(ctx);

    // Dewy luminous glow: screen pass on face only
    if (lm) {
      ctx.save();
      ctx.beginPath();
      this.FACE_OVAL.forEach((idx, i) => {
        const p = this._pt(lm, idx, x, y, w, h);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'blur(22px) brightness(1.22)';
      ctx.globalAlpha = 0.18;
      ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
      ctx.restore();
    }
    this._reset(ctx);
    this._restoreEyes(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 1.06);
  },

  // Porcelain — maximum smoothing. Even, airbrushed complexion.
  _porcelain(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm) {
    ctx.filter = 'brightness(1.15) contrast(0.82) saturate(0.94)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
    this._skinSmooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 0.62, 18, 1.12);
    this._reset(ctx);
    this._restoreEyes(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 1.08);
  },

  // Golden Hour — warm skin smooth. Outdoor/sunset portrait grade.
  _golden(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm) {
    ctx.filter = 'brightness(1.10) saturate(1.38) sepia(0.18) hue-rotate(-8deg)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
    this._skinSmooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 0.30, 10, 1.05);
    this._reset(ctx);
    this._restoreEyes(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 1.04);
  },

  // Bold Glamour — smooth + full makeup at landmark positions.
  _glamour(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm) {
    ctx.filter = 'brightness(1.12) contrast(1.02) saturate(1.15)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
    this._skinSmooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 0.40, 12, 1.07);
    this._reset(ctx);
    this._restoreEyes(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 1.07);
    if (lm) this._makeup(ctx, lm, x, y, w, h);
  },

  // Freckles — light smooth + scattered freckles at nose/cheek landmarks.
  _frecklesFilter(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm) {
    ctx.filter = 'brightness(1.04) contrast(0.95) saturate(1.08)';
    ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    this._reset(ctx);
    this._skinSmooth(ctx, vid, sx, sy, sw, sh, x, y, w, h, lm, 0.22, 8, 1.02);
    this._reset(ctx);
    if (lm) this._freckleOverlay(ctx, lm, x, y, w, h);
  },

  // ── Bold Glamour makeup ──────────────────────────────────────────────

  _makeup(ctx, lm, x, y, w, h) {
    ctx.save();

    // Lips — multiply red/berry, then gloss highlight
    ctx.beginPath();
    this.UPPER_LIP.forEach((i, n) => {
      const p = this._pt(lm, i, x, y, w, h);
      n === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    this.LOWER_LIP.forEach(i => {
      const p = this._pt(lm, i, x, y, w, h);
      ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(182, 42, 68, 0.62)';
    ctx.fill();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 200, 210, 0.16)';
    ctx.fill();

    // Blush — soft radial on cheekbones
    const leftCheek  = this._pt(lm, 234, x, y, w, h);
    const rightCheek = this._pt(lm, 454, x, y, w, h);
    const br = w * 0.10;
    ctx.globalCompositeOperation = 'multiply';
    [leftCheek, rightCheek].forEach(c => {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, br);
      g.addColorStop(0, 'rgba(238, 95, 115, 0.40)');
      g.addColorStop(1, 'rgba(238, 95, 115, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, br, 0, Math.PI * 2);
      ctx.fill();
    });

    // Eyeshadow — purple gradient above upper eyelids
    [[159,160,161,158],[386,387,388,385]].forEach(idxs => {
      const pts = idxs.map(i => this._pt(lm, i, x, y, w, h));
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length - h * 0.013;
      const er = w * 0.046;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, er);
      g.addColorStop(0, 'rgba(108, 58, 158, 0.52)');
      g.addColorStop(1, 'rgba(108, 58, 158, 0)');
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, er, 0, Math.PI * 2);
      ctx.fill();
    });

    // Contour — shadow under cheekbones
    [this._pt(lm, 172, x, y, w, h), this._pt(lm, 397, x, y, w, h)].forEach(c => {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, w * 0.07);
      g.addColorStop(0, 'rgba(95, 58, 48, 0.30)');
      g.addColorStop(1, 'rgba(95, 58, 48, 0)');
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, w * 0.07, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  // ── Freckle overlay ──────────────────────────────────────────────────

  _freckleOverlay(ctx, lm, x, y, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    const nose    = this._pt(lm, 1,   x, y, w, h);
    const noseTip = this._pt(lm, 4,   x, y, w, h);
    const cheekL  = this._pt(lm, 117, x, y, w, h);
    const cheekR  = this._pt(lm, 346, x, y, w, h);

    const seed = (Math.floor(nose.x) * 1000 + Math.floor(nose.y)) | 0;
    const rnd = i => {
      let s = ((seed + i * 997) ^ 0x5A5A5A5A) >>> 0;
      s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
      s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
      return (s >>> 0) / 0xFFFFFFFF;
    };

    const zones = [
      { c: nose,                                                     r: w * 0.065, n: 14 },
      { c: { x: (nose.x + cheekL.x) / 2, y: nose.y - h * 0.005 },  r: w * 0.050, n: 10 },
      { c: { x: (nose.x + cheekR.x) / 2, y: nose.y - h * 0.005 },  r: w * 0.050, n: 10 },
      { c: noseTip,                                                   r: w * 0.034, n:  6 },
    ];

    let fi = 0;
    zones.forEach(({ c, r, n }) => {
      for (let i = 0; i < n; i++, fi += 7) {
        const ang  = rnd(fi)     * Math.PI * 2;
        const dist = Math.sqrt(rnd(fi + 1)) * r;
        const fr   = w * (0.003 + rnd(fi + 2) * 0.007);
        const alp  = 0.30 + rnd(fi + 3) * 0.45;
        const R = 118 + (rnd(fi + 4) * 45 | 0);
        const G =  70 + (rnd(fi + 5) * 30 | 0);
        const B =  42 + (rnd(fi + 6) * 20 | 0);
        ctx.fillStyle = `rgba(${R},${G},${B},${alp.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(ang) * dist, c.y + Math.sin(ang) * dist, fr, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  // ── Utilities ────────────────────────────────────────────────────────

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
