// ===== Secure Authentication Module =====

const AUTH_KEY = 'customs_auth';
const SESSION_KEY = 'customs_session_v2';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

const authManager = {
  // Generate a random salt
  generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  },

  // Hash password using PBKDF2-like approach (simplified for client-side)
  async hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);

    // Use SubtleCrypto if available
    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash (not for production, but better than plain text)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16) + salt;
  },

  // Initialize auth (first time setup)
  async initAuth() {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) {
      // First time: create default hash for "1531977"
      const salt = this.generateSalt();
      const hash = await this.hashPassword('1531977', salt);
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        salt: salt,
        hash: hash,
        createdAt: new Date().toISOString()
      }));
      return true; // First time setup
    }
    return false;
  },

  // Verify password
  async verifyPassword(password) {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return false;

    const auth = JSON.parse(stored);
    const hash = await this.hashPassword(password, auth.salt);
    return hash === auth.hash;
  },

  // Change password
  async changePassword(newPassword) {
    if (newPassword.length < 4) return false;
    const salt = this.generateSalt();
    const hash = await this.hashPassword(newPassword, salt);
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      salt: salt,
      hash: hash,
      updatedAt: new Date().toISOString()
    }));
    return true;
  },

  // Check rate limiting
  checkRateLimit() {
    const attempts = JSON.parse(localStorage.getItem('auth_attempts') || '[]');
    const now = Date.now();
    const recent = attempts.filter(t => now - t < LOCKOUT_DURATION);

    if (recent.length >= MAX_ATTEMPTS) {
      const oldest = Math.min(...recent);
      const wait = Math.ceil((LOCKOUT_DURATION - (now - oldest)) / 60000);
      return { allowed: false, waitMinutes: wait };
    }

    return { allowed: true, remaining: MAX_ATTEMPTS - recent.length };
  },

  // Record failed attempt
  recordAttempt() {
    const attempts = JSON.parse(localStorage.getItem('auth_attempts') || '[]');
    attempts.push(Date.now());
    localStorage.setItem('auth_attempts', JSON.stringify(attempts));
  },

  // Create session
  createSession() {
    const session = {
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION,
      token: this.generateSalt()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  // Validate session
  validateSession() {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return false;
    const session = JSON.parse(stored);
    return Date.now() < session.expiresAt;
  },

  // Clear session
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },

  // Check if password needs setup (first time)
  needsSetup() {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return true;
    const auth = JSON.parse(stored);
    return !auth.hash; // No hash means needs setup
  }
};
