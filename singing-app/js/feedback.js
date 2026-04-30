/* ==========================================
   Feedback & Bug Report — in-game modal
   ==========================================
   Floating bug button (always visible on game/results screens).
   On submit, auto-attaches game context so reports are actionable:
     song, timestamp, score, streak, karaoke mode, browser, platform.
   Writes to public.feedback in Supabase (anon INSERT, RLS protected).
   ========================================== */

const FEEDBACK_URL  = 'https://qyfsxekfxhnjgbukypun.supabase.co';
const FEEDBACK_KEY  = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5ZnN4ZWtmeGhuamdidWt5cHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDUyNjQsImV4cCI6MjA5MTUyMTI2NH0',
  'trMEo5g6nb6zLM1wyo4bgEpPFZoQ7UBVZfuRiSfL56E',
].join('.');

let _fbClient = null;
function _getFbClient() {
  if (!_fbClient) {
    _fbClient = window.supabase.createClient(FEEDBACK_URL, FEEDBACK_KEY);
  }
  return _fbClient;
}

const Feedback = {
  _open: false,

  // ---- Public API ----

  init() {
    const btn = document.getElementById('feedback-btn');
    const modal = document.getElementById('feedback-modal');
    const form  = document.getElementById('feedback-form');
    const close = document.getElementById('feedback-close');
    const overlay = document.getElementById('feedback-overlay');
    if (!btn || !modal || !form) return;

    btn.addEventListener('click', () => this.openModal());
    close.addEventListener('click', () => this.closeModal());
    overlay.addEventListener('click', () => this.closeModal());
    form.addEventListener('submit', (e) => { e.preventDefault(); this._submit(); });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._open) this.closeModal();
    });
  },

  openModal() {
    this._open = true;
    const modal = document.getElementById('feedback-modal-wrap');
    modal.hidden = false;
    // Pre-fill context label so user knows what will be attached
    this._updateContextLabel();
    // Focus textarea
    setTimeout(() => {
      const ta = document.getElementById('feedback-message');
      if (ta) ta.focus();
    }, 80);
  },

  closeModal() {
    this._open = false;
    const modal = document.getElementById('feedback-modal-wrap');
    modal.hidden = true;
    // Reset form
    const form = document.getElementById('feedback-form');
    if (form) form.reset();
    this._setStatus('');
  },

  // ---- Internal ----

  _updateContextLabel() {
    const ctx = this._collectContext();
    const el = document.getElementById('feedback-context-preview');
    if (!el) return;
    const parts = [];
    if (ctx.song_id)   parts.push(`song: ${ctx.song_id}`);
    if (ctx.song_time != null) parts.push(`at ${Math.round(ctx.song_time)}s`);
    if (ctx.score != null)     parts.push(`score ${Math.round(ctx.score)}`);
    el.textContent = parts.length ? `📎 ${parts.join(' · ')}` : '📎 context attached automatically';
  },

  _collectContext() {
    const ctx = {
      browser:  navigator.userAgent.slice(0, 200),
      platform: navigator.platform || '',
      url:      window.location.href,
    };

    // Pull live game state if a song is active
    if (typeof Game !== 'undefined' && Game.song) {
      ctx.song_id   = Game.song.id || null;
      ctx.song_time = typeof Game.currentTime === 'number' ? +Game.currentTime.toFixed(1) : null;
      ctx.score     = typeof Game.liveScore === 'number'   ? +Game.liveScore.toFixed(1)   : null;
      ctx.streak    = typeof Game.currentStreak === 'number' ? Game.currentStreak : null;
      ctx.karaoke_on = !(Game._isKaraokeOff);
    }

    return ctx;
  },

  async _submit() {
    const typeEls = document.querySelectorAll('input[name="feedback-type"]');
    let type = 'bug';
    for (const el of typeEls) { if (el.checked) { type = el.value; break; } }
    const message = (document.getElementById('feedback-message')?.value || '').trim();

    if (!message) {
      this._setStatus('Please describe the issue.', 'error');
      return;
    }

    this._setStatus('Sending…');
    const btn = document.getElementById('feedback-submit');
    if (btn) btn.disabled = true;

    const ctx = this._collectContext();
    const payload = { type, message, ...ctx };

    try {
      const sb = _getFbClient();
      const { error } = await sb.from('feedback').insert(payload);
      if (error) throw error;

      this._setStatus('✓ Sent! Thank you.', 'ok');
      const form = document.getElementById('feedback-form');
      if (form) form.reset();
      setTimeout(() => this.closeModal(), 1400);
    } catch (err) {
      console.error('[Feedback]', err);
      this._setStatus('Failed to send — please try again.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  _setStatus(msg, type = '') {
    const el = document.getElementById('feedback-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'feedback-status' + (type ? ` feedback-status--${type}` : '');
  },
};
