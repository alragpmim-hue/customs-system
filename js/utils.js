// ===== Safe DOM Builder & XSS Sanitization =====

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create a DOM element safely (no innerHTML with user data)
 */
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'textContent') {
      el.textContent = val;
    } else if (key === 'innerHTML' && typeof val === 'string') {
      // Only allow innerHTML for trusted static content
      el.innerHTML = val;
    } else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
    } else {
      el.setAttribute(key, val);
    }
  }
  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });
  return el;
}

/**
 * Sanitize a string for use in HTML attributes
 */
function sanitizeAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ===== String Utilities =====
function normalize(t) {
  if (!t) return '';
  return t.trim().toLowerCase()
    .replace(/[أإآأ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

function getArabicDay(wd) {
  const days = ['','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  return days[wd] || '';
}

function getArabicMonthName(monthIndex) {
  const months = [
    'يناير', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
  ];
  return months[monthIndex] || '';
}

function fmtDateArabic(date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = getArabicMonthName(d.getMonth());
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function getFullDateArabic() {
  const now = new Date();
  const dayName = getArabicDay(now.getDay() + 1);
  const day = now.getDate();
  const month = getArabicMonthName(now.getMonth());
  const year = now.getFullYear();
  return `${dayName} ${day} ${month} ${year}`;
}

function getTodayStr() {
  const now = new Date();
  return getArabicDay(now.getDay() + 1);
}

function dateOnly(d) {
  // Ensure d is a Date object
  const date = (d instanceof Date) ? d : new Date(d);
  // Create date at midnight UTC to avoid timezone issues
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setHours(0, 0, 0, 0);
  return result;
}
function fmtDate(d) {
  // Handle both Date objects and strings
  const date = (d instanceof Date) ? d : new Date(d);
  // Use local date components to avoid UTC offset issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isBetween(d, s, e) {
  const t = dateOnly(d);
  const st = dateOnly(s);
  const et = dateOnly(e);
  return (t >= st && t <= et);
}

// ===== Toast Notification =====
function toast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ===== Modal System =====
function openModal(title, content, footer='') {
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  const modalFooter = document.getElementById('modalFooter');

  if (modalTitle) modalTitle.textContent = title;
  // Use a safe approach: create a temp container and set innerHTML
  // Content here is generated internally, not from user input directly
  if (modalContent) modalContent.innerHTML = content;
  if (modalFooter) modalFooter.innerHTML = footer;

  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}
