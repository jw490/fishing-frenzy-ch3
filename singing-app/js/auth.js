/* ==========================================
   Auth - Supabase email/password auth
   ==========================================
   Real cloud auth via Supabase. Users sign up with email + password,
   get a profile row auto-created (via DB trigger), and their stats
   persist server-side.

   The interface that app.js consumes is deliberately the same shape as
   the old local-only system:
     Auth.init()         -> async, must await before app starts
     Auth.isSignedIn()   -> sync, reads cached state
     Auth.getCurrent()   -> sync, returns cached profile
     Auth.getStats()     -> sync, returns cached stats
     Auth.saveStats(s)   -> async, writes to Supabase + cache
     Auth.signOut()      -> async

   New (Supabase-specific):
     Auth.signUp(email, password, displayName) -> async
     Auth.signIn(email, password)              -> async
     Auth.onAuthChange(cb)                     -> subscribe to auth events

   Storage: Supabase handles sessions (localStorage JWT managed by
   supabase-js). Profile data lives in public.profiles with RLS.

   Usage limits: sessions_today / last_session_date columns on profiles.
   ========================================== */

const SUPABASE_URL = 'https://qyfsxekfxhnjgbukypun.supabase.co';
// Anon key is public by design — RLS policies enforce data access.
const SUPABASE_ANON_KEY = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5ZnN4ZWtmeGhuamdidWt5cHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDUyNjQsImV4cCI6MjA5MTUyMTI2NH0',
  'trMEo5g6nb6zLM1wyo4bgEpPFZoQ7UBVZfuRiSfL56E',
].join('.');

let _supabase = null;

function _getSupabase() {
  if (!_supabase) {
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      throw new Error('Supabase JS library not loaded');
    }
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

const Auth = {
  // Palette for profile avatars
  COLORS: [
    '#00d4ff', '#7b2fff', '#ff2fa8', '#00ff88',
    '#ffd700', '#ff8844', '#3af0ff', '#b950ff',
  ],

  DAILY_SESSION_LIMIT: 2,
  ADMIN_EMAILS: ['ngeowjiawen@gmail.com', 'ngeowjiaqi@gmail.com'],

  // Cached state — always read through getters for consistency
  _user: null,       // Supabase auth user
  _profile: null,    // profiles row
  _listeners: [],

  async init() {
    const sb = _getSupabase();

    // Check for existing session
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      this._user = session.user;
      await this._fetchProfile();
    }

    // Listen for auth state changes (login, logout, token refresh)
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const sameUser = this._user && this._user.id === session.user.id;
        this._user = session.user;
        // Skip redundant profile fetch if we already loaded it for this user
        // (Supabase fires SIGNED_IN on page load even when getSession() above
        // already fetched the profile — a failed re-fetch would null _profile)
        if (!sameUser || !this._profile) {
          await this._fetchProfile();
        }
        this._emit();
      } else if (event === 'SIGNED_OUT') {
        this._user = null;
        this._profile = null;
        this._emit();
      }
    });
  },

  // ---- Queries (sync, from cache) ----

  isSignedIn() {
    return !!(this._user && this._profile);
  },

  getCurrent() {
    if (!this.isSignedIn()) return null;
    return {
      id: this._profile.id,
      name: this._profile.display_name,
      color: this._profile.color,
      initial: this._initialOf(this._profile.display_name),
      email: this._user.email,
      avatarUrl: this._profile.avatar_url || null,
      stats: this._profile.stats || this._blankStats(),
    };
  },

  getStats() {
    if (!this._profile) return this._blankStats();
    return this._profile.stats || this._blankStats();
  },

  // ---- Auth mutations (async) ----

  async signUp(email, password, displayName) {
    const sb = _getSupabase();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || 'Singer' },
      },
    });
    if (error) throw error;

    // If email confirmation is required, user won't have a session yet
    if (data.session) {
      this._user = data.user;
      await this._fetchProfile();
      this._emit();
    }
    return data;
  },

  async signIn(email, password) {
    const sb = _getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    this._user = data.user;
    await this._fetchProfile();
    this._emit();
    return data;
  },

  async signOut() {
    const sb = _getSupabase();
    await sb.auth.signOut();
    this._user = null;
    this._profile = null;
    this._emit();
  },

  // ---- Stats persistence ----

  async saveStats(stats) {
    if (!this._profile) return;
    this._profile.stats = stats;
    const sb = _getSupabase();
    await sb.from('profiles').update({ stats }).eq('id', this._profile.id);
  },

  // ---- Usage limits ----

  async checkSessionLimit() {
    if (!this._profile) return { allowed: false, reason: 'Not signed in' };

    // Admin accounts bypass daily limit
    const email = this._user && this._user.email;
    if (email && this.ADMIN_EMAILS.includes(email.toLowerCase())) {
      return { allowed: true, remaining: Infinity };
    }

    const today = new Date().toISOString().slice(0, 10);
    let sessionsToday = this._profile.sessions_today || 0;

    // Reset counter if it's a new day
    if (this._profile.last_session_date !== today) {
      sessionsToday = 0;
    }

    if (sessionsToday >= this.DAILY_SESSION_LIMIT) {
      return {
        allowed: false,
        reason: `You've reached the daily limit of ${this.DAILY_SESSION_LIMIT} sessions. Come back tomorrow!`,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: this.DAILY_SESSION_LIMIT - sessionsToday,
    };
  },

  async recordSession() {
    if (!this._profile) return;
    const today = new Date().toISOString().slice(0, 10);
    let sessionsToday = this._profile.sessions_today || 0;

    if (this._profile.last_session_date !== today) {
      sessionsToday = 0;
    }
    sessionsToday++;

    this._profile.sessions_today = sessionsToday;
    this._profile.last_session_date = today;

    const sb = _getSupabase();
    await sb.from('profiles').update({
      sessions_today: sessionsToday,
      last_session_date: today,
    }).eq('id', this._profile.id);
  },

  // ---- Profile update ----

  async updateDisplayName(newName) {
    if (!this._profile) return;
    const clean = String(newName || '').trim().slice(0, 20);
    if (!clean) return;
    this._profile.display_name = clean;
    const sb = _getSupabase();
    await sb.from('profiles').update({ display_name: clean }).eq('id', this._profile.id);
    this._emit();
  },

  async uploadAvatar(file) {
    if (!this._profile) throw new Error('Not signed in');
    if (!file || !file.type.startsWith('image/')) throw new Error('Not an image');
    if (file.size > 2 * 1024 * 1024) throw new Error('Image must be under 2 MB');

    // Resize client-side to 256x256 before uploading
    const resized = await this._resizeImage(file, 256);

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${this._user.id}/avatar.${ext}`;
    const sb = _getSupabase();

    const { error: uploadErr } = await sb.storage
      .from('avatars')
      .upload(path, resized, { upsert: true, contentType: resized.type });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

    this._profile.avatar_url = avatarUrl;
    await sb.from('profiles').update({ avatar_url: avatarUrl }).eq('id', this._profile.id);
    this._emit();
    return avatarUrl;
  },

  async _resizeImage(file, maxSize) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Resize failed')), 'image/jpeg', 0.85);
      };
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = URL.createObjectURL(file);
    });
  },

  getAvatarUrl() {
    return this._profile?.avatar_url || null;
  },

  async updateColor(color) {
    if (!this._profile) return;
    const valid = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : null;
    if (!valid) return;
    this._profile.color = valid;
    const sb = _getSupabase();
    await sb.from('profiles').update({ color: valid }).eq('id', this._profile.id);
    this._emit();
  },

  // ---- Subscriptions ----

  onChange(cb) {
    this._listeners.push(cb);
    return () => {
      this._listeners = this._listeners.filter(l => l !== cb);
    };
  },

  _emit() {
    for (const cb of this._listeners) {
      try { cb(); } catch (e) { console.warn('Auth listener threw:', e); }
    }
  },

  // ---- Internal ----

  async _fetchProfile() {
    if (!this._user) return;
    const sb = _getSupabase();
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', this._user.id)
      .single();

    if (error || !data) {
      // Profile might not exist yet if trigger hasn't fired or there's a race.
      // Wait a moment and retry once.
      await new Promise(r => setTimeout(r, 500));
      const retry = await sb.from('profiles').select('*').eq('id', this._user.id).single();
      if (retry.data) {
        this._profile = retry.data;
      } else {
        console.warn('Auth: could not fetch profile', error || retry.error);
        // Preserve a previously-loaded profile rather than wiping the session
        if (!this._profile) this._profile = null;
      }
    } else {
      this._profile = data;
    }
  },

  _blankStats() {
    return {
      sessions: 0,
      bestScore: 0,
      streak: 0,
      lastDate: null,
      songBests: {},
      karaoke: {},
    };
  },

  _initialOf(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return '?';
    const iter = trimmed[Symbol.iterator]();
    const first = iter.next().value || '?';
    return first.toUpperCase();
  },
};
