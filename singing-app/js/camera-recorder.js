/* ==========================================
   CameraRecorder
   Camera overlay + beauty filter + canvas recording
   ========================================== */

const CameraRecorder = {

  // 'off' | 'bubble-sm' | 'bubble' | 'bubble-lg' | 'box'
  size: 'bubble',
  mirrored: true,

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
      // Request video + audio together in one getUserMedia call.
      // Splitting into two calls (video then audio later) causes iOS to switch
      // audio sessions mid-song and mute playback.
      this._camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        },
      }).catch(() =>
        // Some devices reject advanced audio constraints — retry with plain audio
        navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true,
        })
      );
      if (!this._videoEl) {
        this._videoEl = document.createElement('video');
        this._videoEl.muted = true;
        this._videoEl.playsInline = true;
        this._videoEl.setAttribute('playsinline', '');
        // Must be in the DOM for iOS Safari to allow srcObject autoplay
        this._videoEl.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none;';
        document.body.appendChild(this._videoEl);
      }
      this._videoEl.srcObject = this._camStream;
      if (typeof BeautyFilters !== 'undefined') BeautyFilters.initAsync();
      await this._videoEl.play().catch(() => {
        // Fallback: try again without awaiting — some browsers resolve later
        this._videoEl.play().catch(() => {});
      });

      // Feed the setup preview — this DOM element is also used for canvas drawing
      const setupVid = document.getElementById('cam-setup-video');
      if (setupVid) {
        setupVid.srcObject = this._camStream;
        // Keep display:block so iOS doesn't suspend it when the screen hides
        setupVid.style.display = 'block';
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
    if (this._videoEl) {
      this._videoEl.srcObject = null;
      this._videoEl.pause();
    }
    const setupVid = document.getElementById('cam-setup-video');
    if (setupVid) { setupVid.srcObject = null; }
  },

  // ── Recording lifecycle ──────────────────────────────────────────

  async startRecording(canvas) {
    this._chunks = [];
    this._recordedBlob = null;
    this._recordedMime = 'video/webm';
    if (!canvas || !canvas.captureStream) return;

    const canvasStream = canvas.captureStream(30);

    // Reuse audio tracks captured at camera-start time.
    // Calling getUserMedia again mid-song causes iOS to switch audio sessions and mute playback.
    const audioTracks = this._camStream ? this._camStream.getAudioTracks() : [];

    const tracks = [
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ];

    // Safari records MP4 natively; Chrome/Firefox use WebM
    const mimeType = [
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    this._recordedMime = mimeType;

    try {
      this._recorder = new MediaRecorder(new MediaStream(tracks), {
        mimeType,
        videoBitsPerSecond: 4_000_000,
        audioBitsPerSecond: 192_000,
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
        this._recordedBlob = new Blob(this._chunks, { type: this._recordedMime || 'video/webm' });
        this.isRecording = false;
        resolve(this._recordedBlob);
      };
      this._recorder.stop();
    });
  },

  // Show preview modal — user watches clip, then taps Download (converted to MP4)
  showPreview(songTitle) {
    if (!this._recordedBlob) return;
    this._previewSlug = (songTitle || 'vocalstar').replace(/[^a-z0-9]/gi, '-').toLowerCase();

    const modal = document.getElementById('clip-preview-modal');
    const vid   = document.getElementById('clip-preview-video');
    if (!modal || !vid) return;

    const url = URL.createObjectURL(this._recordedBlob);
    vid.src = url;
    vid.load();
    modal.classList.add('active');

    // Clean up object URL when modal hides
    this._previewUrl = url;
  },

  closePreview() {
    const modal = document.getElementById('clip-preview-modal');
    if (modal) modal.classList.remove('active');
    const vid = document.getElementById('clip-preview-video');
    if (vid) { vid.pause(); vid.src = ''; }
    if (this._previewUrl) { URL.revokeObjectURL(this._previewUrl); this._previewUrl = null; }
  },

  async downloadClip(songTitle) {
    if (!this._recordedBlob) return;
    const slug = this._previewSlug || (songTitle || 'vocalstar').replace(/[^a-z0-9]/gi, '-').toLowerCase();

    // If recorded natively as MP4 (Safari), just save directly
    if (this._recordedMime && this._recordedMime.startsWith('video/mp4')) {
      this._triggerDownload(this._recordedBlob, slug + '-vocalstar.mp4');
      return;
    }

    // Otherwise convert WebM → MP4 via ffmpeg.wasm
    const btn = document.getElementById('clip-download-btn');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Converting…'; btn.disabled = true; }

    try {
      const mp4Blob = await this._toMp4(this._recordedBlob);
      this._triggerDownload(mp4Blob, slug + '-vocalstar.mp4');
    } catch (e) {
      console.warn('MP4 conversion failed, downloading WebM', e);
      this._triggerDownload(this._recordedBlob, slug + '-vocalstar.webm');
    } finally {
      if (btn) { btn.textContent = origText; btn.disabled = false; }
    }
  },

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  },

  async _toMp4(webmBlob) {
    // Lazy-load ffmpeg.wasm (legacy v0.11 — no COOP/COEP headers needed)
    if (!window.FFmpeg) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const { createFFmpeg, fetchFile } = window.FFmpeg;
    if (!this._ff) {
      this._ff = createFFmpeg({ log: false,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js' });
      await this._ff.load();
    }
    this._ff.FS('writeFile', 'in.webm', await fetchFile(webmBlob));
    await this._ff.run('-i', 'in.webm', '-c:v', 'libx264', '-preset', 'fast',
                       '-crf', '23', '-c:a', 'aac', '-b:a', '128k', 'out.mp4');
    const data = this._ff.FS('readFile', 'out.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
  },

  setSize(size) {
    const wasOff = this.size === 'off';
    this.size = size;
    if (size === 'off') {
      this.stopCamera();
    } else if (wasOff) {
      this.startCamera(); // restart stream when switching back from Off
    }
    document.querySelectorAll('.cam-picker-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
    this._updatePreviewHint(size);
  },

  _updatePreviewHint(size) {
    const bubble = document.getElementById('cam-bubble-preview');
    if (!bubble) return;
    if (size === 'off') { bubble.style.opacity = '0'; return; }

    // Use exact same math as _bubbleGeometry + _bubbleRadius during the song
    const radiusMap = { 'bubble-sm': 0.10, 'bubble': 0.18, 'bubble-lg': 0.30 };
    const ratio = radiusMap[size] || 0.18;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const r = Math.round(ratio * Math.min(W, H));
    const cx = Math.round(W * 0.12);
    const cy = H - r - Math.round(H * 0.05);

    bubble.style.width  = r * 2 + 'px';
    bubble.style.height = r * 2 + 'px';
    bubble.style.left   = (cx - r) + 'px';
    bubble.style.top    = (cy - r) + 'px';
    bubble.style.opacity = '1';
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
    const radiusMap = { 'bubble-sm': 0.10, 'bubble': 0.18, 'bubble-lg': 0.30, 'box': 0 };
    return Math.round(minDim * (radiusMap[this.size] || 0.18));
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
    if (this.size === 'off' || !this._camStream) return;
    // Prefer the DOM video element (always in DOM, reliable on iOS) over detached _videoEl
    const vid = document.getElementById('cam-setup-video') || this._videoEl;
    if (!vid || !vid.videoWidth) return;

    if (this.size === 'box') {
      const bw = Math.round(W * 0.24);
      const bh = Math.round(bw * 0.75);
      const bx = Math.round(W * 0.03);
      const by = H - bh - Math.round(H * 0.04);
      this._drawFrame(ctx, vid, bx, by, bw, bh, 'rect', 14);
    } else {
      // Bubble sizes: sm / default / lg
      const { cx, cy, r } = this._bubbleGeometry(W, H);
      this._drawFrame(ctx, vid, cx - r, cy - r, r * 2, r * 2, 'circle', r);

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

  _drawFrame(ctx, vid, x, y, w, h, shape, cornerR) {
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

    // Selfie mirror: flip horizontally so user sees themselves as expected
    if (this.mirrored) {
      ctx.translate(2 * x + w, 0);
      ctx.scale(-1, 1);
    }

    if (typeof BeautyFilters !== 'undefined') {
      BeautyFilters.apply(ctx, vid, sx, sy, sw, sh, x, y, w, h);
    } else {
      ctx.drawImage(vid, sx, sy, sw, sh, x, y, w, h);
    }

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
