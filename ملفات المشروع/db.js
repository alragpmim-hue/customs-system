// ===== Database Layer =====
// Wrapper around localStorage with validation and safety checks

const DB = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      console.error(`DB.get error for key "${key}":`, e);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`DB.set error for key "${key}":`, e);
      if (e.name === 'QuotaExceededError') {
        toast('⚠️ مساحة التخزين ممتلئة. يرجى تصدير البيانات ومسح بعضها.', 'error');
      }
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`DB.remove error for key "${key}":`, e);
      return false;
    }
  },

  // Get storage usage info
  getStorageInfo() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
      }
    }
    return {
      used: (total / 1024 / 1024).toFixed(2) + ' MB',
      items: Object.keys(localStorage).length
    };
  },

  // Export all data as JSON
  exportAll() {
    const data = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        try {
          data[key] = JSON.parse(localStorage[key]);
        } catch {
          data[key] = localStorage[key];
        }
      }
    }
    return JSON.stringify(data, null, 2);
  },

  // Import data from JSON
  importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
      return true;
    } catch (e) {
      console.error('DB.importAll error:', e);
      return false;
    }
  }
};
