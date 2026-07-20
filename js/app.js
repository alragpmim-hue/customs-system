// ===== Main Application Logic =====
// Customs System v2.0 - Improved & Secured

// ===== Hierarchy System (defined ONCE) =====
function getHierarchyRank(title) {
  if (!title) return 99;
  const t = normalize(title);
  if (t.includes('رئيس الفئه') || t.includes('رئيس فئه')) return 1;
  if (t.includes('رئيس القسم') || t.includes('رئيس قسم')) return 2;
  if (t.includes('مشرف')) return 3;
  return 99;
}

function getHierarchyLabel(title) {
  const rank = getHierarchyRank(title);
  if (rank === 1) return '👑 رئيس الفئة';
  if (rank === 2) return '⭐ رئيس القسم';
  if (rank === 3) return '🔰 مشرف';
  return '';
}

function getHierarchyDescription(rank) {
  if (rank === 1) return 'مشرف عام — لا يخضع للفرز إلى نقطة محددة';
  if (rank === 2) return 'مسؤول عن قسم — لا يخضع للفرز إلى نقطة محددة';
  if (rank === 3) return 'مشرف على نقاط — لا يخضع للفرز إلى نقطة محددة';
  return '';
}

function isAssignable(emp) {
  // رئيس الفئة (rank 1) ورؤساء الأقسام (rank 2) والمشرفون (rank 3) غير قابلين للفرز
  // هؤلاء يشرفون على أكثر من نقطة ولا يُفرزون تلقائياً
  // الموظفون العاديون فقط (rank 99) قابلين للفرز
  const rank = getHierarchyRank(emp.title);
  return rank === 99;
}

// ===== Employee Helpers =====
function getEmployeeByUid(uid) {
  return DB.get('employees', []).find(e => e.uid === uid);
}

function getEmployeePoint(uid) {
  const as = DB.get('assignments', {});
  for (const [pid, uids] of Object.entries(as)) {
    if (uids.includes(uid)) return pid;
  }
  return null;
}

function getPointName(pid) {
  const pts = DB.get('points', []);
  return pts.find(p => p.id === pid)?.name || pid;
}

function getAssignedEmployees(pid) {
  const as = DB.get('assignments', {});
  return (as[pid] || []).map(uid => getEmployeeByUid(uid)).filter(Boolean);
}

function isUnavailable(emp) {
  const leaves = DB.get('leaves', {});
  if (leaves[emp.uid]) {
    const l = leaves[emp.uid];
    if (isBetween(new Date(), l.start, l.end)) return true;
  }
  if (emp.type === 'إداري' && emp.restDays?.length) {
    const td = normalize(getTodayStr());
    if (emp.restDays.some(d => normalize(d) === td)) return true;
  }
  return false;
}

function getUnavailableReason(emp) {
  const leaves = DB.get('leaves', {});
  if (leaves[emp.uid] && isBetween(new Date(), leaves[emp.uid].start, leaves[emp.uid].end)) {
    return 'في إجازة رسمية';
  }
  if (emp.type === 'إداري' && emp.restDays?.length) {
    const td = normalize(getTodayStr());
    if (emp.restDays.some(d => normalize(d) === td)) return 'في يوم استراحته الثابتة';
  }
  return null;
}


// ===== Backup & Restore System =====
function exportBackupJSON() {
  const backup = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    date: getFullDateArabic(),
    data: {
      employees: DB.get('employees', []),
      points: DB.get('points', []),
      assignments: DB.get('assignments', {}),
      leaves: DB.get('leaves', {}),
      requests: DB.get('requests', {}),
      backups: DB.get('backups', {}),
      activityLogs: DB.get('activityLogs', [])
    }
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `نسخة_احتياطية_${fmtDate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast('✅ تم تصدير النسخة الاحتياطية');
  DB.set('lastBackup', fmtDate(new Date()));
}

function importBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);

      if (!backup.data || !backup.data.employees) {
        toast('❌ ملف النسخة الاحتياطية غير صالح', 'error');
        return;
      }

      if (!confirm(`هل تريد استعادة النسخة الاحتياطية من ${backup.date || 'تاريخ غير معروف'}؟\n\n⚠️ سيتم استبدال جميع البيانات الحالية!`)) {
        event.target.value = '';
        return;
      }

      DB.set('employees', backup.data.employees || []);
      DB.set('points', backup.data.points || []);
      DB.set('assignments', backup.data.assignments || {});
      DB.set('leaves', backup.data.leaves || {});
      DB.set('requests', backup.data.requests || {});
      DB.set('backups', backup.data.backups || {});
      DB.set('activityLogs', backup.data.activityLogs || []);

      toast('✅ تم استعادة النسخة الاحتياطية بنجاح!');

      renderPointsGrid();
      renderDailyStats();
      renderEmployees();
      renderLeaves();
      renderPointsGuide();

    } catch (err) {
      toast('❌ خطأ في قراءة الملف: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function checkBackupReminder() {
  const lastBackup = DB.get('lastBackup', null);
  const today = fmtDate(new Date());

  if (lastBackup !== today) {
    const banner = document.createElement('div');
    banner.id = 'backupBanner';
    banner.innerHTML = `
      <div style="background:linear-gradient(135deg, #1F4E78, #0F172A);color:white;padding:0.75rem 1rem;
                  display:flex;justify-content:space-between;align-items:center;position:fixed;
                  top:0;left:0;right:0;z-index:400;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
        <span>⚠️ لم تقم بعمل نسخة احتياطية اليوم — يُنصح بتصدير البيانات</span>
        <div style="display:flex;gap:0.5rem;">
          <button class="btn btn-success btn-sm" onclick="exportBackupJSON(); document.getElementById('backupBanner').remove();">
            <i class="fas fa-download"></i> تصدير الآن
          </button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('backupBanner').remove();" style="color:white;border-color:rgba(255,255,255,0.3);">
            لاحقاً
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
  }
}

// ===== Excel Import / Export =====
function exportToExcel() {
  const employees = DB.get('employees', []);
  if (!employees.length) { toast('لا يوجد موظفون للتصدير', 'error'); return; }

  const data = employees.map(e => ({
    'الاسم': e.name,
    'النوع': e.type,
    'المؤهل': e.qualification || 'غير محدد',
    'التوصيف الوظيفي': e.title || '',
    'استراحة1': e.restDays?.[0] || '',
    'استراحة2': e.restDays?.[1] || '',
    'الرقم الذاتي': e.uid
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الموظفين');

  const wscols = [
    {wch: 30}, {wch: 10}, {wch: 15}, {wch: 25}, {wch: 10}, {wch: 10}, {wch: 12}
  ];
  ws['!cols'] = wscols;

  XLSX.writeFile(wb, 'الكادر_الجمركي.xlsx');
  toast('✅ تم تصدير البيانات إلى Excel');
}

function downloadExcelTemplate() {
  const template = [
    { 'الاسم': 'أحمد علي', 'النوع': 'إداري', 'المؤهل': 'إجازة جامعية', 'التوصيف الوظيفي': 'رئيس قسم الاستيراد', 'استراحة1': 'الجمعة', 'استراحة2': 'السبت' },
    { 'الاسم': 'محمد خالد', 'النوع': 'مقيم', 'المؤهل': 'شهادة ثانوية', 'التوصيف الوظيفي': 'مشرف كشف', 'استراحة1': '', 'استراحة2': '' },
    { 'الاسم': 'علي محمود', 'النوع': 'إداري', 'المؤهل': 'معهد', 'التوصيف الوظيفي': '', 'استراحة1': 'الجمعة', 'استراحة2': '' },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'قالب');

  const instructions = [
    { 'تعليمات': 'ملاحظات هامة:' },
    { 'تعليمات': '1. عمود "النوع": إداري أو مقيم فقط' },
    { 'تعليمات': '2. عمود "التوصيف": اتركه فارغاً للموظف العادي' },
    { 'تعليمات': '3. للإداري: أدخل يومي الاستراحة في استراحة1 واستراحة2' },
    { 'تعليمات': '4. للمقيم: اترك استراحة1 واستراحة2 فارغين' },
    { 'تعليمات': '5. التوصيفات المعترف بها: رئيس الفئة / رئيس قسم ... / مشرف ...' },
    { 'تعليمات': '6. لا تغيّر أسماء الأعمدة — يجب أن تكون بالضبط كما هي' },
  ];
  const ws2 = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, ws2, 'تعليمات');

  XLSX.writeFile(wb, 'قالب_الموظفين.xlsx');
  toast('✅ تم تحميل القالب');
}

function importFromExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (!jsonData.length) {
        toast('❌ الملف فارغ أو غير صالح', 'error');
        return;
      }

      processExcelData(jsonData);
    } catch (err) {
      toast('❌ خطأ في قراءة الملف: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function processExcelData(rows) {
  const employees = [];
  let adminCount = 0;
  let residentCount = 0;

  rows.forEach((row, idx) => {
    const name = String(row['الاسم'] || row['name'] || '').trim();
    if (!name) return;

    const typeRaw = String(row['النوع'] || row['type'] || 'مقيم').trim();
    const type = (typeRaw.includes('ادار') || typeRaw.includes('إدار') || typeRaw.includes('admin')) ? 'إداري' : 'مقيم';

    const qualification = String(row['المؤهل'] || row['qualification'] || row['qual'] || 'غير محدد').trim();
    const title = String(row['التوصيف الوظيفي'] || row['title'] || row['التوصيف'] || '').trim();

    const rest1 = String(row['استراحة1'] || row['rest1'] || row['راحة1'] || '').trim();
    const rest2 = String(row['استراحة2'] || row['rest2'] || row['راحة2'] || '').trim();

    const restDays = [];
    if (rest1) restDays.push(rest1);
    if (rest2 && rest2 !== rest1) restDays.push(rest2);

    let uid;
    if (type === 'إداري') {
      uid = (2001 + adminCount).toString();
      adminCount++;
    } else {
      uid = (1001 + residentCount).toString();
      residentCount++;
    }

    employees.push({
      uid, name, job: type, type,
      restDays: type === 'إداري' ? restDays : [],
      title, qualification: qualification || 'غير محدد'
    });
  });

  if (!employees.length) {
    toast('❌ لم يتم العثور على موظفين صالحين', 'error');
    return;
  }

  if (!confirm(`تم العثور على ${employees.length} موظف (${adminCount} إداري، ${residentCount} مقيم).\n\nهل تريد استبدال البيانات الحالية؟`)) return;

  const oldEmployees = DB.get('employees', []);
  const newUids = new Set(employees.map(e => e.uid));

  const as = DB.get('assignments', {});
  const leaves = DB.get('leaves', {});

  for (const pid of Object.keys(as)) {
    as[pid] = (as[pid] || []).filter(uid => {
      const emp = employees.find(e => e.uid === uid);
      return emp !== undefined;
    });
  }
  DB.set('assignments', as);

  for (const uid of Object.keys(leaves)) {
    if (!newUids.has(uid)) delete leaves[uid];
  }
  DB.set('leaves', leaves);

  DB.set('employees', employees);

  toast(`✅ تم استيراد ${employees.length} موظف بنجاح!`);
  renderEmployees();
  renderDailyStats();
  renderPointsGrid();
  renderPointsGuide();
}

// ===== Activity Log =====
function addActivityLog(action, details) {
  const logs = DB.get('activityLogs', []);
  logs.unshift({
    timestamp: new Date().toISOString(),
    date: fmtDate(new Date()),
    time: new Date().toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'}),
    action,
    details
  });
  if (logs.length > 500) logs.length = 500;
  DB.set('activityLogs', logs);
}

function getActivityLogs(filterDate = null) {
  const logs = DB.get('activityLogs', []);
  if (!filterDate) return logs;
  return logs.filter(l => l.date === filterDate);
}

function renderActivityLogs() {
  const logs = DB.get('activityLogs', []);
  if (!logs.length) return '<div style="text-align:center;color:var(--text-light);padding:1rem;">لا توجد سجلات.</div>';

  return logs.slice(0, 50).map(log => {
    let icon = '📋', color = '#64748B';
    if (log.action.includes('سحب')) { icon = '⛔'; color = '#DC2626'; }
    else if (log.action.includes('إرجاع')) { icon = '✅'; color = '#059669'; }
    else if (log.action.includes('فرز')) { icon = '📍'; color = '#1F4E78'; }
    else if (log.action.includes('إجازة')) { icon = '🌴'; color = '#D97706'; }

    return `<div class="list-item" style="border-right:3px solid ${color};padding-right:0.75rem;">
      <div>
        <div class="title">${icon} ${escapeHTML(log.action)}</div>
        <div class="subtitle">${escapeHTML(log.details)} — ${escapeHTML(log.time)}</div>
      </div>
      <div style="font-size:0.7rem;color:#94a3b8;">${escapeHTML(log.date)}</div>
    </div>`;
  }).join('');
}

function openActivityLogModal() {
  openModal('📋 سجل العمليات اليومية', `
    <div style="max-height:400px;overflow:auto;" id="activityLogContent">
      ${renderActivityLogs()}
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button>`);
}

// ===== Custom Employee Dropdown =====
function buildEmpDropdownHTML(filterText) {
  const employees = DB.get('employees', []);
  const cq = normalize(filterText || '');
  let filtered = employees;
  if (cq) {
    filtered = employees.filter(e => normalize(e.name).includes(cq) || e.uid.includes(filterText));
  }
  if (!filtered.length) {
    return '<div class="emp-dropdown-empty">لا توجد نتائج</div>';
  }
  return filtered.map(e => {
    const typeClass = e.type === 'إداري' ? 'admin' : 'resident';
    const typeLabel = e.type === 'إداري' ? 'إداري' : 'مقيم';
    // Use data attributes for safe event handling instead of inline onclick
    return `<div class="emp-dropdown-item" data-name="${sanitizeAttr(e.name)}" data-uid="${sanitizeAttr(e.uid)}" onclick="selectEmpFromDropdown('${sanitizeAttr(e.name)}', '${sanitizeAttr(e.uid)}')">
      <div>
        <div class="emp-name">${escapeHTML(e.name)}</div>
        <div class="emp-meta">الرقم: ${escapeHTML(e.uid)}</div>
      </div>
      <span class="emp-type ${typeClass}">${typeLabel}</span>
    </div>`;
  }).join('');
}

function showEmpDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  dropdown.innerHTML = buildEmpDropdownHTML('');
  dropdown.classList.add('active');
}

function filterEmpDropdown(inputId, dropdownId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const val = input.value.trim();

  if (!val) {
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
    if (inputId === 'empSearchInput') {
      document.getElementById('searchResult').innerHTML = '';
    } else if (inputId === 'pointGuideSearch') {
      document.getElementById('pointGuideResult').innerHTML = '';
      renderPointsGuide();
    } else if (inputId === 'adminPointsEmpSearch') {
      document.getElementById('adminPointsEmpResult').innerHTML = '';
    } else if (inputId === 'adminEmpLookupInput') {
      document.getElementById('adminEmpLookupResult').innerHTML = '';
    }
    return;
  }

  dropdown.innerHTML = buildEmpDropdownHTML(val);
  dropdown.classList.add('active');
}

function selectEmpFromDropdown(name, uid) {
  const activeDropdown = document.querySelector('.emp-dropdown.active');
  if (!activeDropdown) return;

  const searchBox = activeDropdown.closest('.search-box');
  if (!searchBox) return;

  const input = searchBox.querySelector('input[type="text"]');
  if (input) {
    input.value = name;
  }
  activeDropdown.classList.remove('active');

  if (input.id === 'empSearchInput') searchEmployee();
  else if (input.id === 'pointGuideSearch') searchPointGuide();
  else if (input.id === 'adminPointsEmpSearch') adminPointsEmpLookup();
  else if (input.id === 'adminEmpLookupInput') adminEmpLookup();
}

// ===== UI State =====
let isAdmin = false;
let currentEmpTab = 'admin';
let currentLeaveTab = 'approved';
let leaveTypeConsecutive = true;

function switchTab(name) {
  document.querySelectorAll('#employeeTabs .tab-btn').forEach(b => b.classList.remove('active'));
  event.target.closest('.tab-btn').classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  if (name === 'points') renderPointsGuide();
}

function switchAdminTab(name) {
  document.querySelectorAll('#adminTabs .tab-btn').forEach(b => b.classList.remove('active'));
  event.target.closest('.tab-btn').classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  if (name === 'pointsAdmin') { renderPointsGrid(); renderDailyStats(); }
  if (name === 'employees') renderEmployees();
  if (name === 'leaves') renderLeaves();
}

function switchEmpTab(type) {
  currentEmpTab = type;
  const adminBtn = document.getElementById('empTabAdmin');
  const residentBtn = document.getElementById('empTabResident');
  if (adminBtn) adminBtn.className = type === 'admin' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
  if (residentBtn) residentBtn.className = type === 'resident' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
  renderEmployees();
}

function switchLeaveTab(type) {
  currentLeaveTab = type;
  document.getElementById('leaveTabApproved').className = type === 'approved' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
  document.getElementById('leaveTabPending').className = type === 'pending' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
  renderLeaves();
}

// ===== Admin Authentication =====
async function unlockAdmin() {
  // Check rate limit first
  const limit = authManager.checkRateLimit();
  if (!limit.allowed) {
    toast(`⛔ تم حظر المحاولات. انتظر ${limit.waitMinutes} دقيقة.`, 'error');
    return;
  }

  // Check if password needs setup
  const needsSetup = authManager.needsSetup();

  if (needsSetup) {
    // First time: prompt to set password
    const newPass = prompt('🔐 إعداد أولي: أدخل كلمة مرور جديدة للمشرف (8 أحرف على الأقل):');
    if (!newPass || newPass.length < 4) {
      toast('❌ كلمة المرور قصيرة جداً', 'error');
      return;
    }
    await authManager.changePassword(newPass);
    toast('✅ تم إعداد كلمة المرور بنجاح! أعد تسجيل الدخول.');
    return;
  }

  // Verify password
  const password = prompt('🔐 أدخل كلمة مرور المشرف:');
  if (!password) return;

  const valid = await authManager.verifyPassword(password);
  if (!valid) {
    authManager.recordAttempt();
    const remaining = authManager.checkRateLimit().remaining;
    toast(`❌ كلمة المرور خاطئة. محاولات متبقية: ${remaining}`, 'error');
    return;
  }

  // Success - create session
  authManager.createSession();
  activateAdminMode();
}

function activateAdminMode() {
  isAdmin = true;
  document.getElementById('headerTitle').textContent = '🛡️ بوابة المشرف والتحكم الحركي';
  checkBackupReminder();
  document.getElementById('employeeTabs').classList.add('hidden');
  document.getElementById('adminTabs').classList.remove('hidden');
  document.getElementById('lockAdminBtn').classList.remove('hidden');
  const actBtn = document.getElementById('activityLogBtn');
  if (actBtn) actBtn.classList.remove('hidden');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('tab-pointsAdmin').classList.remove('hidden');
  document.querySelectorAll('#adminTabs .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('#adminTabs .tab-btn').classList.add('active');
  renderPointsGrid();
  renderDailyStats();
}

function lockAdmin() {
  isAdmin = false;
  authManager.clearSession();
  document.getElementById('headerTitle').textContent = '👤 بوابة الموظف الجمركي الاستعلامية';
  document.getElementById('employeeTabs').classList.remove('hidden');
  document.getElementById('adminTabs').classList.add('hidden');
  document.getElementById('lockAdminBtn').classList.add('hidden');
  const actBtn = document.getElementById('activityLogBtn');
  if (actBtn) actBtn.classList.add('hidden');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('tab-search').classList.remove('hidden');
  document.querySelectorAll('#employeeTabs .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('#employeeTabs .tab-btn').classList.add('active');
}

// ===== Search Functions =====
function searchEmployee() {
  const q = document.getElementById('empSearchInput').value.trim();

  // Check for admin code
  if (q === '1531977') { 
    unlockAdmin(); 
    document.getElementById('empSearchInput').value = ''; 
    return; 
  }

  if (!q) { document.getElementById('searchResult').innerHTML = ''; return; }

  const employees = DB.get('employees', []);
  const cq = normalize(q);
  const matches = employees.filter(e => normalize(e.name).includes(cq) || e.uid.includes(q));

  if (!matches.length) {
    document.getElementById('searchResult').innerHTML = '<div class="card" style="color:red;text-align:center;"><i class="fas fa-info-circle"></i> عذراُ، لم يتم العثور على أي موظف.</div>';
    return;
  }

  const emp = matches[0];
  const today = new Date();
  let loc = 'متاح للعمل (لم يقم المشرف بتعيينك لنقطة بعد اليوم).';
  let tag = 'على رأس العمل - متاح';
  let color = '#059669';
  let bg = '#ECFDF5';
  let border = '#A7F3D0';

  const leaves = DB.get('leaves', {});
  if (leaves[emp.uid] && isBetween(today, leaves[emp.uid].start, leaves[emp.uid].end)) {
    loc = `أنت متواجد حالياُ في إجازة رسمية من ${fmtDateArabic(leaves[emp.uid].start)} إلى ${fmtDateArabic(leaves[emp.uid].end)}.`;
    tag = 'في إجازة رسمية 🌴'; color = '#D97706'; bg = '#FFFBEB'; border = '#FCD34D';
  } else if (emp.type === 'إداري' && emp.restDays?.length) {
    const td = normalize(getTodayStr());
    if (emp.restDays.some(d => normalize(d) === td)) {
      loc = `اليوم هو يوم الاستراحة الأسبوعية الثابتة (${getTodayStr()}).`;
      tag = 'في استراحة أسبوعية 🛌'; color = '#2563EB'; bg = '#EFF6FF'; border = '#BFDBFE';
    }
  }

  const rank = getHierarchyRank(emp.title);
  let pid = null;
  if (rank <= 3 && rank !== 99) {
    // Supervisory hierarchy - not assigned to specific points
    const hierarchyLabel = getHierarchyLabel(emp.title);
    const hierarchyDesc = getHierarchyDescription(rank);
    loc = `🏛️ <strong>${hierarchyLabel}</strong><br><span style="font-size:0.85rem;">${hierarchyDesc}</span>`;
    tag = hierarchyLabel + ' 🏛️';
    if (rank === 1) { color = '#92400E'; bg = '#FEF3C7'; border = '#F59E0B'; }
    else if (rank === 2) { color = '#1E40AF'; bg = '#EFF6FF'; border = '#BFDBFE'; }
    else { color = '#065F46'; bg = '#ECFDF5'; border = '#34D399'; }
  } else {
    pid = getEmployeePoint(emp.uid);
    if (pid) {
      loc = `📍 تم فرزك اليوم إلى نقطة: <strong style="font-size:1.1rem;">${escapeHTML(getPointName(pid))}</strong>`;
      if (tag === 'على رأس العمل - متاح') {
        tag = 'مفرز ميدانياُ ✅'; color = '#0D9488'; bg = '#F0FDFA'; border = '#99F6E4';
      }
    }
  }

  const html = `
    <div class="emp-result">
      <div class="emp-result-header" style="background:${color};">
        <h3>👤 الموظف: ${escapeHTML(emp.name)}</h3>
        <span class="status-badge">${tag}</span>
      </div>
      <div class="emp-result-body">
        <div class="emp-info-grid">
          <div><div class="label">الرقم الذاتي</div><div class="value">${escapeHTML(emp.uid)}</div></div>
          <div><div class="label">نوع الكادر</div><div class="value">${escapeHTML(emp.type)}</div></div>
          <div><div class="label">المهمة المعتمدة</div><div class="value">${escapeHTML(emp.job)}</div></div>
        </div>
        <div class="location-box" style="background:${bg};color:${color};border-color:${border};">${loc}</div>
        <button class="btn btn-danger" style="width:100%;margin-bottom:0.5rem;" onclick="openLeaveRequest('${sanitizeAttr(emp.uid)}')">
          <i class="fas fa-calendar-plus"></i> 📝 تقديم طلب إجازة
        </button>
        ${pid ? `<button class="btn btn-primary" style="width:100%;" onclick="switchTab('points'); document.getElementById('pointGuideSearch').value='${sanitizeAttr(emp.uid)}'; searchPointGuide();">
          <i class="fas fa-map-marker-alt"></i> 📍 عرض موقع الفرز في دليل النقاط
        </button>` : ''}
      </div>
    </div>
  `;
  document.getElementById('searchResult').innerHTML = html;
}

function renderPointsGuide() {
  const pts = DB.get('points', []);
  const as = DB.get('assignments', {});
  let html = '';
  pts.forEach((p, idx) => {
    const staff = (as[p.id] || []).map(uid => {
      const e = getEmployeeByUid(uid);
      return e ? `<div class="list-item"><span>${escapeHTML(e.name)} (${escapeHTML(e.job)})</span></div>` : '';
    }).join('');
    const count = (as[p.id] || []).length;
    const hasStaff = staff.length > 0;
    html += `
      <div class="card point-collapsible" style="cursor:pointer;" onclick="togglePointCollapse('${sanitizeAttr(p.id)}')">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="width:32px;height:32px;border-radius:50%;background:${count>0?'#0D9488':'#64748B'};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">${count}</div>
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--primary);">${escapeHTML(p.name)}</div>
            <div style="font-size:0.75rem;color:var(--text-light);">${count>0 ? 'العناصر الحالية المفروزة تخدم هنا 👇' : '⚠️ لا توجد عناصر مفروزة'}</div>
          </div>
          <i class="fas fa-chevron-down point-toggle-icon" id="icon-${sanitizeAttr(p.id)}" style="color:var(--text-light);transition:transform 0.3s;"></i>
        </div>
        <div id="point-body-${sanitizeAttr(p.id)}" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;">
          <div style="margin-top:0.5rem;border-top:1px solid var(--border);padding-top:0.5rem;">
            ${hasStaff ? staff : '<div style="font-size:0.8rem;color:var(--text-light);padding:0.5rem;">هذه النقطة فارغة حالياُ.</div>'}
          </div>
        </div>
      </div>
    `;
  });
  document.getElementById('pointsGuide').innerHTML = html || '<div class="card" style="text-align:center;color:var(--text-light);">لا توجد نقاط مسجلة.</div>';
}

function togglePointCollapse(pid) {
  const body = document.getElementById('point-body-' + pid);
  const icon = document.getElementById('icon-' + pid);
  if (!body || !icon) return;

  const isOpen = body.style.maxHeight !== '0px' && body.style.maxHeight !== '';

  if (isOpen) {
    body.style.maxHeight = '0px';
    icon.style.transform = 'rotate(0deg)';
  } else {
    body.style.maxHeight = body.scrollHeight + 'px';
    icon.style.transform = 'rotate(180deg)';
  }
}

// ===== Unassigned Pool =====
function getUnassignedEmployees() {
  const employees = DB.get('employees', []);
  const leaves = DB.get('leaves', {});
  const unassigned = [];

  employees.forEach(e => {
    if (!isAssignable(e)) return; // Excludes: رئيس الفئة, رؤساء الأقسام, المشرفون (لا يُفرزون تلقائياً)
    if (getEmployeePoint(e.uid)) return;
    if (isUnavailable(e)) return;
    unassigned.push(e);
  });

  return unassigned;
}

function renderUnassignedPoolCard() {
  const unassigned = getUnassignedEmployees();
  const container = document.getElementById('unassignedPool');
  if (!container) return;

  if (unassigned.length === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  const adminCount = unassigned.filter(e => e.type === 'إداري').length;
  const residentCount = unassigned.filter(e => e.type === 'مقيم').length;

  let html = `
    <div class="card" style="background:linear-gradient(135deg, #1F4E78 0%, #0F172A 100%);color:white;border:none;box-shadow:var(--shadow-lg);margin-bottom:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div style="width:40px;height:40px;border-radius:10px;background:rgba(245,158,11,0.2);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-users" style="color:var(--accent);font-size:1.1rem;"></i>
          </div>
          <div>
            <div style="font-weight:800;font-size:1rem;">👥 المتاحين للفرز</div>
            <div style="font-size:0.75rem;color:rgba(255,255,255,0.7);">لم يُفرّزوا في أي نقطة</div>
          </div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,0.1);padding:0.4rem 0.8rem;border-radius:8px;">
          <div style="font-size:1.3rem;font-weight:800;color:var(--accent);">${unassigned.length}</div>
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.6);">موظف</div>
        </div>
      </div>

      <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
        <div style="flex:1;background:rgba(5,150,105,0.15);border:1px solid rgba(5,150,105,0.3);border-radius:8px;padding:0.5rem;text-align:center;">
          <div style="font-size:0.95rem;font-weight:700;color:#6EE7B7;">${adminCount}</div>
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.7);">إداري</div>
        </div>
        <div style="flex:1;background:rgba(217,119,6,0.15);border:1px solid rgba(217,119,6,0.3);border-radius:8px;padding:0.5rem;text-align:center;">
          <div style="font-size:0.95rem;font-weight:700;color:#FDBA74;">${residentCount}</div>
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.7);">مقيم</div>
        </div>
        <div style="flex:1;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:0.5rem;text-align:center;">
          <div style="font-size:0.95rem;font-weight:700;color:white;">${unassigned.length}</div>
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.7);">المجموع</div>
        </div>
      </div>

      <div style="max-height:200px;overflow-y:auto;background:rgba(0,0,0,0.2);border-radius:8px;padding:0.5rem;">
  `;

  unassigned.forEach(e => {
    const rank = getHierarchyRank(e.title);
    let badge = '';
    if (rank === 2) badge = '<span style="font-size:0.6rem;background:#DBEAFE;color:#1E40AF;padding:1px 6px;border-radius:4px;margin-right:4px;font-weight:700;">⭐ رئيس قسم</span>';
    else if (rank === 3) badge = '<span style="font-size:0.6rem;background:#D1FAE5;color:#065F46;padding:1px 6px;border-radius:4px;margin-right:4px;font-weight:700;">🔰 مشرف</span>';

    const typeBadge = e.type === 'إداري' 
      ? '<span style="font-size:0.6rem;background:rgba(5,150,105,0.3);color:#6EE7B7;padding:1px 6px;border-radius:4px;margin-right:4px;">إداري</span>'
      : '<span style="font-size:0.6rem;background:rgba(217,119,6,0.3);color:#FDBA74;padding:1px 6px;border-radius:4px;margin-right:4px;">مقيم</span>';

    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0.5rem;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex;align-items:center;gap:0.3rem;flex:1;min-width:0;">
          <div style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;"></div>
          <div style="font-size:0.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHTML(e.name)} ${badge}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.3rem;flex-shrink:0;">
          ${typeBadge}
          <span style="font-size:0.7rem;color:rgba(255,255,255,0.5);">${escapeHTML(e.uid)}</span>
        </div>
      </div>
    `;
  });

  html += `
      </div>
      <div style="margin-top:0.5rem;text-align:center;font-size:0.7rem;color:rgba(255,255,255,0.5);">
        <i class="fas fa-info-circle"></i> انقر على أي نقطة لفرز هؤلاء الموظفين
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// ===== Daily Stats =====
function renderDailyStats() {
  const employees = DB.get('employees', []);
  const leaves = DB.get('leaves', {});
  let total = 0, adminRest = 0, adminLeave = 0, resLeave = 0;

  const adminRestList = [];
  const adminLeaveList = [];
  const resLeaveList = [];

  employees.forEach(e => {
    total++;
    const onLeave = leaves[e.uid] && isBetween(new Date(), leaves[e.uid].start, leaves[e.uid].end);
    if (e.type === 'إداري') {
      const td = normalize(getTodayStr());
      if (e.restDays?.some(d => normalize(d) === td)) {
        adminRest++;
        adminRestList.push(e);
      } else if (onLeave) {
        adminLeave++;
        adminLeaveList.push({...e, leaveStart: leaves[e.uid].start, leaveEnd: leaves[e.uid].end});
      }
    } else if (e.type === 'مقيم' && onLeave) {
      resLeave++;
      resLeaveList.push({...e, leaveStart: leaves[e.uid].start, leaveEnd: leaves[e.uid].end});
    }
  });

  const unavailable = adminRest + adminLeave + resLeave;
  const active = total - unavailable;
  const unassigned = getUnassignedEmployees().length;
  const today = getFullDateArabic();
  const statsEl = document.getElementById('dailyStats');
  if (!statsEl) return;

  const buildDetailList = (list) => {
    if (!list.length) return '';
    return '<div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.1);display:none;" class="stats-detail">' +
      list.map(e => {
        const extra = e.leaveStart ? '<span style="opacity:0.7;font-size:0.65rem;display:block;">' + e.leaveStart + ' → ' + e.leaveEnd + '</span>' : '';
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0;font-size:0.75rem;border-bottom:1px solid rgba(255,255,255,0.05);">' +
          '<span>' + escapeHTML(e.name) + '</span>' + extra + '</div>';
      }).join('') + '</div>';
  };

  statsEl.innerHTML = '<div class="stats-bar-header">' +
    '<span><i class="fas fa-chart-line" style="color:var(--accent);"></i> <strong>مؤشر القوة (' + escapeHTML(today) + ')</strong></span>' +
    '<span style="color:#6EE7B7;">المتاح: ' + active + ' / ' + total + '</span>' +
    '</div>' +
    '<div class="stats-grid">' +
    '<div class="stat-item" style="cursor:pointer;" onclick="toggleStatsDetail(this)">' +
    '<div class="label">استراحة</div><div class="value" style="color:#93C5FD;">' + adminRest + '</div>' + buildDetailList(adminRestList) + '</div>' +
    '<div class="stat-item" style="cursor:pointer;" onclick="toggleStatsDetail(this)">' +
    '<div class="label">إجازة إداري</div><div class="value" style="color:#FDBA74;">' + adminLeave + '</div>' + buildDetailList(adminLeaveList) + '</div>' +
    '<div class="stat-item" style="cursor:pointer;" onclick="toggleStatsDetail(this)">' +
    '<div class="label">إجازة مقيم</div><div class="value" style="color:#5EEAD4;">' + resLeave + '</div>' + buildDetailList(resLeaveList) + '</div>' +
    '<div class="stat-item"><div class="label">غياب</div><div class="value" style="color:#FCA5A5;">' + unavailable + '</div></div>' +
    '<div class="stat-item" style="grid-column:span 4;margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1);">' +
    '<div class="label"><i class="fas fa-users" style="color:var(--accent);"></i> غير مفروزين</div>' +
    '<div class="value" style="color:var(--accent);font-size:1.1rem;">' + unassigned + '</div></div>' +
    '</div>';
}

function toggleStatsDetail(el) {
  const detail = el.querySelector('.stats-detail');
  if (detail) {
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  }
}

// ===== Points Grid =====
function renderPointsGrid() {
  const pts = DB.get('points', []);
  const as = DB.get('assignments', {});
  const q = normalize(document.getElementById('pointSearchInput')?.value || '');
  let html = '';
  pts.forEach((p, idx) => {
    if (q && !normalize(p.name).includes(q) && !p.id.includes(q)) return;
    const count = (as[p.id] || []).length;
    const required = p.required;
    const surplus = count - required;

    let bg, borderColor, textColor, statusLabel, surplusHtml;

    if (count === 0) {
      bg = '#FEF2F2';
      borderColor = '#FECACA';
      textColor = '#991B1B';
      statusLabel = '⚠️ فارغة — بحاجة تدعيم';
      surplusHtml = '';
    } else if (count < required) {
      bg = '#FFFBEB';
      borderColor = '#FDE68A';
      textColor = '#92400E';
      statusLabel = `⚠️ نقص ${required - count} موظف`;
      surplusHtml = '';
    } else if (count === required) {
      bg = '#F0FDF4';
      borderColor = '#BBF7D0';
      textColor = '#166534';
      statusLabel = '✅ مكتملة';
      surplusHtml = '';
    } else {
      bg = '#EFF6FF';
      borderColor = '#BFDBFE';
      textColor = '#1E40AF';
      statusLabel = '✅ مكتملة';
      surplusHtml = `<div class="meta" style="color:#DC2626;font-size:0.7rem;font-weight:700;background:#FEE2E2;padding:2px 8px;border-radius:6px;margin-top:4px;display:inline-block;">🚨 فائض: ${surplus} موظف — يمكن إعادة فرزهم</div>`;
    }

    html += `
      <div class="point-card" style="background:${bg};border-color:${borderColor};" onclick="openPointDetails('${sanitizeAttr(p.id)}')">
        <h4>${escapeHTML(p.name)}</h4>
        <div class="meta" style="color:${textColor};">العدد المفروز: <strong>${count}</strong></div>
        <div class="meta" style="color:${textColor};">الاحتياج: <strong>${required}</strong></div>
        <div class="meta" style="color:${textColor};font-size:0.75rem;margin-top:2px;">${statusLabel}</div>
        ${surplusHtml}
        <div class="actions" onclick="event.stopPropagation()">
          <button onclick="editPoint(${idx})"><i class="fas fa-edit"></i></button>
          <button onclick="deletePoint(${idx})"><i class="fas fa-trash" style="color:var(--danger);"></i></button>
        </div>
      </div>
    `;
  });
  document.getElementById('pointsGrid').innerHTML = html || '<div style="text-align:center;color:var(--text-light);padding:1rem;">لا توجد نقاط.</div>';
  renderUnassignedPoolCard();
  renderDailyStats();
}

function filterPoints() { renderPointsGrid(); }

function openPointDetails(pid) {
  const p = DB.get('points', []).find(x => x.id === pid);
  if (!p) return;
  window._currentPointId = pid;

  const employees = DB.get('employees', []);
  const as = DB.get('assignments', {});
  const leaves = DB.get('leaves', {});

  const assignedHere = (as[pid] || []).map(uid => getEmployeeByUid(uid)).filter(Boolean);

  const allAssignable = employees.filter(e => {
    if (!isAssignable(e)) return false;
    const onLeave = leaves[e.uid] && isBetween(new Date(), leaves[e.uid].start, leaves[e.uid].end);
    if (onLeave) return false;
    if (e.type === 'إداري' && e.restDays?.length) {
      const td = normalize(getTodayStr());
      if (e.restDays.some(d => normalize(d) === td)) return false;
    }
    return true;
  });

  const assignedHereUids = new Set(assignedHere.map(e => e.uid));
  const assignedElsewhere = allAssignable.filter(e => {
    if (assignedHereUids.has(e.uid)) return false;
    const currentPid = getEmployeePoint(e.uid);
    return currentPid !== null;
  });
  const notAssigned = allAssignable.filter(e => {
    if (assignedHereUids.has(e.uid)) return false;
    return getEmployeePoint(e.uid) === null;
  });

  const sortByHierarchy = (a, b) => {
    const rankA = getHierarchyRank(a.title);
    const rankB = getHierarchyRank(b.title);
    if (rankA !== rankB) return rankA - rankB;
    return normalize(a.name).localeCompare(normalize(b.name));
  };
  assignedHere.sort(sortByHierarchy);
  assignedElsewhere.sort(sortByHierarchy);
  notAssigned.sort(sortByHierarchy);

  // Build HTML using data attributes for event delegation (NO inline onclick)
  let assignedHereHtml = assignedHere.map(e => {
    const rank = getHierarchyRank(e.title);
    let titleLine = '';
    if (rank === 2) titleLine = `<div style="font-size:0.65rem;color:#1E40AF;font-weight:700;margin-bottom:1px;">⭐ رئيس قسم</div>`;
    else if (rank === 3) titleLine = `<div style="font-size:0.65rem;color:#065F46;font-weight:700;margin-bottom:1px;">🔰 مشرف</div>`;
    else if (e.title) titleLine = `<div style="font-size:0.65rem;color:#64748B;font-weight:600;margin-bottom:1px;">${escapeHTML(e.title)}</div>`;
    return `
    <div class="list-item point-row" data-action="remove" data-uid="${sanitizeAttr(e.uid)}" data-pid="${sanitizeAttr(pid)}" style="${rank <= 3 ? 'background:rgba(245,158,11,0.03);' : ''}">
      <div>${titleLine}<div class="title">${escapeHTML(e.name)}</div><div class="subtitle">${escapeHTML(e.type)} | ${escapeHTML(e.uid)}</div></div>
      <button class="btn btn-danger btn-sm point-action-btn" data-action="remove" data-uid="${sanitizeAttr(e.uid)}" data-pid="${sanitizeAttr(pid)}">سحب</button>
    </div>
  `;
  }).join('') || '<div style="padding:1rem;text-align:center;color:var(--text-light);">لا يوجد موظفين مفرزين في هذه النقطة.</div>';

  let notAssignedHtml = notAssigned.map(e => {
    const rank = getHierarchyRank(e.title);
    let titleLine = '';
    if (rank === 2) titleLine = `<div style="font-size:0.65rem;color:#1E40AF;font-weight:700;margin-bottom:1px;">⭐ رئيس قسم</div>`;
    else if (rank === 3) titleLine = `<div style="font-size:0.65rem;color:#065F46;font-weight:700;margin-bottom:1px;">🔰 مشرف</div>`;
    else if (e.title) titleLine = `<div style="font-size:0.65rem;color:#64748B;font-weight:600;margin-bottom:1px;">${escapeHTML(e.title)}</div>`;
    return `
    <div class="list-item avail-item point-row" data-action="assign" data-uid="${sanitizeAttr(e.uid)}" data-pid="${sanitizeAttr(pid)}" data-name="${sanitizeAttr(normalize(e.name))}" style="cursor:pointer;${rank <= 3 ? 'background:rgba(245,158,11,0.03);' : ''}">
      <div>${titleLine}<div class="title">${escapeHTML(e.name)}</div><div class="subtitle">${escapeHTML(e.type)} | ${escapeHTML(e.uid)}</div></div>
      <i class="fas fa-arrow-left" style="color:var(--success);"></i>
    </div>
  `;
  }).join('') || '';

  let assignedElsewhereHtml = assignedElsewhere.map(e => {
    const currentPid = getEmployeePoint(e.uid);
    const currentPointName = getPointName(currentPid);
    const rank = getHierarchyRank(e.title);
    let titleLine = '';
    if (rank === 2) titleLine = `<div style="font-size:0.65rem;color:#1E40AF;font-weight:700;margin-bottom:1px;">⭐ رئيس قسم</div>`;
    else if (rank === 3) titleLine = `<div style="font-size:0.65rem;color:#065F46;font-weight:700;margin-bottom:1px;">🔰 مشرف</div>`;
    else if (e.title) titleLine = `<div style="font-size:0.65rem;color:#64748B;font-weight:600;margin-bottom:1px;">${escapeHTML(e.title)}</div>`;
    return `
    <div class="list-item avail-item point-row" data-action="reassign" data-uid="${sanitizeAttr(e.uid)}" data-pid="${sanitizeAttr(pid)}" data-oldpid="${sanitizeAttr(currentPid)}" data-name="${sanitizeAttr(normalize(e.name))}" style="cursor:pointer;${rank <= 3 ? 'background:rgba(245,158,11,0.03);' : ''}">
      <div>
        ${titleLine}
        <div class="title">${escapeHTML(e.name)}</div>
        <div class="subtitle">${escapeHTML(e.type)} | ${escapeHTML(e.uid)} — <span style="color:#D97706;font-weight:700;">مفروز حالياً في: ${escapeHTML(currentPointName)}</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <span style="font-size:0.7rem;color:#D97706;font-weight:700;background:#FFFBEB;padding:2px 8px;border-radius:6px;">إعادة فرز</span>
        <i class="fas fa-exchange-alt" style="color:#D97706;"></i>
      </div>
    </div>
  `;
  }).join('') || '';

  let availHtml = '';
  if (notAssignedHtml) {
    availHtml += `<div style="font-size:0.75rem;font-weight:700;color:#059669;margin-bottom:0.5rem;padding:0.5rem;background:#ECFDF5;border-radius:6px;border:1px dashed #A7F3D0;">
      <i class="fas fa-user-plus"></i> موظفون غير مفروزين (انقر للفرز)
    </div>${notAssignedHtml}`;
  }
  if (assignedElsewhereHtml) {
    if (availHtml) availHtml += '<div style="margin-top:0.75rem;"></div>';
    availHtml += `<div style="font-size:0.75rem;font-weight:700;color:#D97706;margin-bottom:0.5rem;padding:0.5rem;background:#FFFBEB;border-radius:6px;border:1px dashed #FCD34D;">
      <i class="fas fa-exchange-alt"></i> موظفون مفروزون في نقاط أخرى (انقر لإعادة فرزهم)
    </div>${assignedElsewhereHtml}`;
  }
  if (!availHtml) {
    availHtml = '<div style="padding:1rem;text-align:center;color:var(--text-light);">لا توجد كوادر متاحة للفرز.</div>';
  }

  openModal(`نقطة: ${escapeHTML(p.name)} (المطلوب: ${p.required})`, `
    <div class="form-group"><label>الموجودون حالياً في هذه النقطة:</label><div style="background:#F8FAFC;border-radius:8px;max-height:150px;overflow:auto;">${assignedHereHtml}</div></div>
    <div class="form-group">
      <label>🔍 الكوادر المتاحة للفرز:</label>
      <input type="text" id="pointEmpSearch" placeholder="ابحث بالاسم أو الرقم الذاتي..." 
        style="width:100%;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:0.85rem;margin-bottom:0.5rem;"
        oninput="filterAvailList(this.value)" autocomplete="off">
      <div id="availList" style="max-height:350px;overflow:auto;">${availHtml}</div>
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button>`);

  // Attach event delegation after modal is open
  requestAnimationFrame(() => {
    attachPointModalEvents(pid);
  });
}

// Event delegation handler for point modal
function attachPointModalEvents(pid) {
  const modalContent = document.getElementById('modalContent');
  if (!modalContent) return;

  // Remove old listener to prevent duplicates
  modalContent.removeEventListener('click', handlePointModalClick);
  modalContent.addEventListener('click', handlePointModalClick);
}

function handlePointModalClick(event) {
  // Find the closest element with data-action
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const uid = target.dataset.uid;
  const pid = target.dataset.pid;

  if (!uid || !pid) return;

  event.preventDefault();
  event.stopPropagation();

  if (action === 'remove') {
    removeFromPoint(uid, pid);
  } else if (action === 'assign') {
    assignToPoint(uid, pid);
  } else if (action === 'reassign') {
    const oldPid = target.dataset.oldpid;
    reassignToPoint(uid, pid, oldPid);
  }
}

function reassignToPoint(uid, newPid, oldPid) {
  const as = DB.get('assignments', {});

  // Remove from old point
  if (oldPid && as[oldPid]) {
    as[oldPid] = (as[oldPid] || []).filter(u => u !== uid);
  }

  // Remove from ALL points (defensive)
  for (const k of Object.keys(as)) {
    as[k] = (as[k] || []).filter(u => u !== uid);
  }

  as[newPid] = [...(as[newPid] || []), uid];
  DB.set('assignments', as);

  // Clean up backups
  const backups = DB.get('backups', {});
  if (backups[uid]) {
    delete backups[uid];
    DB.set('backups', backups);
  }

  addActivityLog('إعادة فرز', `${getEmployeeByUid(uid)?.name || uid}: ${getPointName(oldPid)} → ${getPointName(newPid)}`);
  toast('✅ تم إعادة الفرز بنجاح — تم السحب من النقطة السابقة تلقائياً');

  // Use setTimeout to ensure DOM is fully updated before refreshing
  setTimeout(() => {
    openPointDetails(newPid);
    renderPointsGrid();
    renderUnassignedPoolCard();
  }, 100);
}

function filterAvailList(query) {
  const cq = normalize(query || '');
  const items = document.querySelectorAll('#availList .avail-item');
  items.forEach(item => {
    const name = item.getAttribute('data-name') || '';
    const uid = item.getAttribute('data-uid') || '';
    if (!cq || name.includes(cq) || uid.includes(query)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

function assignToPoint(uid, pid) {
  const as = DB.get('assignments', {});
  const current = getEmployeePoint(uid);

  // Prevent assigning to same point
  if (current === pid) {
    toast('الموظف مفروز في هذه النقطة بالفعل', 'warning');
    return;
  }

  if (current && current !== pid) {
    if (!confirm('الموظف مفروز في نقطة أخرى (' + getPointName(current) + '). هل تريد سحبه وإعادة فرزه هنا؟')) return;
    as[current] = (as[current] || []).filter(u => u !== uid);
  }

  // Remove from ALL points first (defensive)
  for (const k of Object.keys(as)) {
    as[k] = (as[k] || []).filter(u => u !== uid);
  }

  as[pid] = [...(as[pid] || []), uid];
  DB.set('assignments', as);

  // Clean up backups to prevent auto-restore
  const backups = DB.get('backups', {});
  if (backups[uid]) {
    delete backups[uid];
    DB.set('backups', backups);
  }

  addActivityLog('فرز موظف', `${getEmployeeByUid(uid)?.name || uid} → ${getPointName(pid)}`);
  toast('✅ تم الفرز بنجاح');

  // Use setTimeout to ensure DOM is fully updated before refreshing
  setTimeout(() => {
    openPointDetails(pid);
    renderPointsGrid();
    renderUnassignedPoolCard();
  }, 100);
}

function removeFromPoint(uid, pid) {
  const as = DB.get('assignments', {});
  as[pid] = (as[pid] || []).filter(u => u !== uid);
  DB.set('assignments', as);

  // Clean up backups to prevent auto-restore of manually removed employees
  const backups = DB.get('backups', {});
  if (backups[uid] === pid) {
    delete backups[uid];
    DB.set('backups', backups);
  }

  addActivityLog('سحب موظف', `${getEmployeeByUid(uid)?.name || uid} من ${getPointName(pid)}`);
  toast('تم السحب');

  // Use setTimeout to ensure DOM is fully updated before refreshing
  setTimeout(() => {
    openPointDetails(pid);
    renderPointsGrid();
    renderUnassignedPoolCard();
  }, 100);
}

function openAddPointModal() {
  openModal('➕ إضافة نقطة خدمة', `
    <div class="form-group"><label>اسم النقطة</label><input type="text" id="newPointName"></div>
    <div class="form-group"><label>العدد المطلوب</label><input type="number" id="newPointReq" value="2"></div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="saveNewPoint()">إضافة</button>
  `);
}

function saveNewPoint() {
  const name = document.getElementById('newPointName').value.trim();
  const req = parseInt(document.getElementById('newPointReq').value) || 2;
  if (!name) { toast('أدخل اسم النقطة', 'error'); return; }
  const pts = DB.get('points', []);
  const id = 'BP' + (pts.length + 1);
  pts.push({ id, name, required: req });
  DB.set('points', pts);
  addActivityLog('إضافة نقطة', `${name} (المطلوب: ${req})`);
  closeModal();
  renderPointsGrid();
  toast('تمت الإضافة');
}

function editPoint(idx) {
  const pts = DB.get('points', []);
  const p = pts[idx];
  openModal('✏️ تعديل نقطة', `
    <div class="form-group"><label>اسم النقطة</label><input type="text" id="editPointName" value="${sanitizeAttr(p.name)}"></div>
    <div class="form-group"><label>العدد المطلوب</label><input type="number" id="editPointReq" value="${p.required}"></div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="saveEditPoint(${idx})">حفظ</button>
  `);
}

function saveEditPoint(idx) {
  const pts = DB.get('points', []);
  const oldName = pts[idx].name;
  pts[idx].name = document.getElementById('editPointName').value.trim();
  pts[idx].required = parseInt(document.getElementById('editPointReq').value) || 2;
  DB.set('points', pts);
  addActivityLog('تعديل نقطة', `${oldName} → ${pts[idx].name}`);
  closeModal();
  renderPointsGrid();
  toast('تم الحفظ');
}

function deletePoint(idx) {
  const pts = DB.get('points', []);
  if (!confirm('هل أنت متأكد من حذف ' + pts[idx].name + '؟')) return;
  const as = DB.get('assignments', {});
  const pName = pts[idx].name;
  delete as[pts[idx].id];
  DB.set('assignments', as);
  pts.splice(idx, 1);
  DB.set('points', pts);
  addActivityLog('حذف نقطة', `${pName}`);
  renderPointsGrid();
  toast('تم الحذف');
}

// ===== Employee Management =====
function renderEmployees() {
  const employees = DB.get('employees', []);
  const q = normalize(document.getElementById('empManageSearch')?.value || '');

  const totalAdmin = employees.filter(e => e.type === 'إداري').length;
  const totalResident = employees.filter(e => e.type === 'مقيم').length;
  const totalAll = employees.length;

  const statAdminEl = document.getElementById('statAdmin');
  const statResidentEl = document.getElementById('statResident');
  const statTotalEl = document.getElementById('statTotal');
  if (statAdminEl) statAdminEl.textContent = totalAdmin;
  if (statResidentEl) statResidentEl.textContent = totalResident;
  if (statTotalEl) statTotalEl.textContent = totalAll;

  let filtered = employees.filter(e => {
    if (e.type !== (currentEmpTab === 'admin' ? 'إداري' : 'مقيم')) return false;
    return !q || normalize(e.name).includes(q) || e.uid.includes(q);
  });

  filtered.sort((a, b) => {
    const rankA = getHierarchyRank(a.title);
    const rankB = getHierarchyRank(b.title);
    if (rankA !== rankB) return rankA - rankB;
    return normalize(a.name).localeCompare(normalize(b.name));
  });

  let html = filtered.map((e, i) => {
    const originalIndex = employees.indexOf(e);
    const rest = e.restDays?.length ? e.restDays.join(' - ') : 'غير محدد';
    const qualBadge = e.qualification ? `<span style="background:#E0E7FF;color:#3730A3;font-size:0.65rem;padding:1px 6px;border-radius:4px;margin-right:4px;font-weight:600;">🎓 ${escapeHTML(e.qualification)}</span>` : '';
    const rank = getHierarchyRank(e.title);
    let titleBadge = '';
    if (rank === 1) {
      titleBadge = `<span style="background:#FEF3C7;color:#92400E;font-size:0.7rem;padding:2px 8px;border-radius:10px;margin-right:4px;font-weight:700;border:1px solid #F59E0B;">👑 رئيس الفئة</span>`;
    } else if (rank === 2) {
      titleBadge = `<span style="background:#DBEAFE;color:#1E40AF;font-size:0.7rem;padding:2px 8px;border-radius:10px;margin-right:4px;font-weight:700;border:1px solid #60A5FA;">⭐ رئيس القسم</span>`;
    } else if (rank === 3) {
      titleBadge = `<span style="background:#D1FAE5;color:#065F46;font-size:0.7rem;padding:2px 8px;border-radius:10px;margin-right:4px;font-weight:700;border:1px solid #34D399;">🔰 مشرف</span>`;
    } else if (e.title) {
      titleBadge = `<span style="background:#F1F5F9;color:#475569;font-size:0.7rem;padding:2px 8px;border-radius:10px;margin-right:4px;font-weight:700;border:1px solid #CBD5E1;">${escapeHTML(e.title)}</span>`;
    }
    const nonAssignable = !isAssignable(e) ? '<span style="font-size:0.65rem;color:#EF4444;margin-right:4px;font-weight:700;">(هيكل إشرافي — غير قابل للفرز)</span>' : '';
    return `
      <div class="list-item" style="${rank <= 3 ? 'background:rgba(245,158,11,0.05);' : ''}">
        <div>
          <div class="title">${escapeHTML(e.name)} ${titleBadge} ${qualBadge} ${nonAssignable}</div>
          <div class="subtitle">الرقم: ${escapeHTML(e.uid)} | ${escapeHTML(e.job)}${e.type==='إداري'?'<br>استراحة: '+escapeHTML(rest):''}</div>
        </div>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" onclick="editEmployee(${originalIndex})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${originalIndex})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('') || '<div style="text-align:center;padding:1rem;color:var(--text-light);">لا توجد سجلات.</div>';
  document.getElementById('employeesList').innerHTML = html;
}

function filterEmployees() { renderEmployees(); }

function adminPointsEmpLookup() {
  const q = document.getElementById('adminPointsEmpSearch').value.trim();
  if (!q) { document.getElementById('adminPointsEmpResult').innerHTML = ''; return; }
  const employees = DB.get('employees', []);
  const cq = normalize(q);
  const matches = employees.filter(e => normalize(e.name).includes(cq) || e.uid.includes(q));
  if (!matches.length) {
    document.getElementById('adminPointsEmpResult').innerHTML = '<div style="color:red;padding:0.5rem;"><i class="fas fa-info-circle"></i> لم يتم العثور على موظف.</div>';
    return;
  }
  const emp = matches[0];
  const pid = getEmployeePoint(emp.uid);
  const leaves = DB.get('leaves', {});
  const onLeave = leaves[emp.uid] && isBetween(new Date(), leaves[emp.uid].start, leaves[emp.uid].end);
  const reason = getUnavailableReason(emp);

  let statusColor = '#059669';
  let statusBg = '#ECFDF5';
  let statusText = 'متاح للفرز';
  let locationText = pid ? `📍 مفرز في: <strong>${escapeHTML(getPointName(pid))}</strong> (${escapeHTML(pid)})` : '❌ غير مفرز في أي نقطة حالياُ';
  const rank = getHierarchyRank(emp.title);

  if (onLeave) {
    statusColor = '#D97706'; statusBg = '#FFFBEB'; statusText = 'في إجازة';
    locationText = `🌴 في إجازة من ${fmtDateArabic(leaves[emp.uid].start)} إلى ${fmtDateArabic(leaves[emp.uid].end)}`;
  } else if (reason) {
    statusColor = '#2563EB'; statusBg = '#EFF6FF'; statusText = reason;
  } else if (rank <= 3 && rank !== 99) {
    // Supervisory hierarchy member
    const hierarchyLabel = getHierarchyLabel(emp.title);
    const hierarchyDesc = getHierarchyDescription(rank);
    statusColor = rank === 1 ? '#92400E' : rank === 2 ? '#1E40AF' : '#065F46';
    statusBg = rank === 1 ? '#FEF3C7' : rank === 2 ? '#EFF6FF' : '#ECFDF5';
    statusText = hierarchyLabel;
    locationText = `🏛️ <strong>${hierarchyLabel}</strong> — ${hierarchyDesc}`;
  }

  const titleBadge = emp.title ? `<span style="background:#FEF3C7;color:#92400E;font-size:0.75rem;padding:2px 8px;border-radius:8px;margin-right:4px;font-weight:700;">${escapeHTML(getHierarchyLabel(emp.title))}</span>` : '';

  document.getElementById('adminPointsEmpResult').innerHTML = `
    <div style="background:${statusBg};border:1px solid ${statusColor}33;border-radius:10px;padding:1rem;margin-top:0.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        <div style="font-weight:700;color:#1e293b;">${escapeHTML(emp.name)} ${titleBadge}</div>
        <div style="background:${statusColor};color:white;font-size:0.75rem;padding:3px 10px;border-radius:6px;font-weight:700;">${statusText}</div>
      </div>
      <div style="font-size:0.85rem;color:#334155;line-height:1.7;">
        <div><span style="color:#94a3b8;">الرقم الذاتي:</span> ${escapeHTML(emp.uid)}</div>
        <div><span style="color:#94a3b8;">النوع:</span> ${escapeHTML(emp.type)} | <span style="color:#94a3b8;">الوظيفة:</span> ${escapeHTML(emp.job)}</div>
        <div style="margin-top:4px;padding:6px;border-radius:6px;background:white;border:1px dashed ${statusColor};">${locationText}</div>
      </div>
      ${pid ? `<button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="openPointDetails('${sanitizeAttr(pid)}')">
        <i class="fas fa-eye"></i> عرض تفاصيل النقطة
      </button>` : ''}
    </div>
  `;
}

function adminEmpLookup() {
  const q = document.getElementById('adminEmpLookupInput').value.trim();
  if (!q) { document.getElementById('adminEmpLookupResult').innerHTML = ''; return; }
  const employees = DB.get('employees', []);
  const cq = normalize(q);
  const matches = employees.filter(e => normalize(e.name).includes(cq) || e.uid.includes(q));
  if (!matches.length) {
    document.getElementById('adminEmpLookupResult').innerHTML = '<div style="color:red;padding:0.5rem;"><i class="fas fa-info-circle"></i> لم يتم العثور على موظف.</div>';
    return;
  }
  const emp = matches[0];
  const pid = getEmployeePoint(emp.uid);
  const leaves = DB.get('leaves', {});
  const onLeave = leaves[emp.uid] && isBetween(new Date(), leaves[emp.uid].start, leaves[emp.uid].end);
  const reason = getUnavailableReason(emp);

  let statusColor = '#059669';
  let statusBg = '#ECFDF5';
  let statusText = 'متاح للفرز';
  let locationText = pid ? `📍 مفرز في: <strong>${escapeHTML(getPointName(pid))}</strong> (${escapeHTML(pid)})` : '❌ غير مفرز في أي نقطة حالياُ';
  const rank = getHierarchyRank(emp.title);

  if (onLeave) {
    statusColor = '#D97706'; statusBg = '#FFFBEB'; statusText = 'في إجازة';
    locationText = `🌴 في إجازة من ${fmtDateArabic(leaves[emp.uid].start)} إلى ${fmtDateArabic(leaves[emp.uid].end)}`;
  } else if (reason) {
    statusColor = '#2563EB'; statusBg = '#EFF6FF'; statusText = reason;
  } else if (rank <= 3 && rank !== 99) {
    // Supervisory hierarchy member
    const hierarchyLabel = getHierarchyLabel(emp.title);
    const hierarchyDesc = getHierarchyDescription(rank);
    statusColor = rank === 1 ? '#92400E' : rank === 2 ? '#1E40AF' : '#065F46';
    statusBg = rank === 1 ? '#FEF3C7' : rank === 2 ? '#EFF6FF' : '#ECFDF5';
    statusText = hierarchyLabel;
    locationText = `🏛️ <strong>${hierarchyLabel}</strong> — ${hierarchyDesc}`;
  }

  const titleBadge = emp.title ? `<span style="background:#FEF3C7;color:#92400E;font-size:0.75rem;padding:2px 8px;border-radius:8px;margin-right:4px;font-weight:700;">${escapeHTML(getHierarchyLabel(emp.title))}</span>` : '';

  document.getElementById('adminEmpLookupResult').innerHTML = `
    <div style="background:${statusBg};border:1px solid ${statusColor}33;border-radius:10px;padding:1rem;margin-top:0.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        <div style="font-weight:700;color:#1e293b;">${escapeHTML(emp.name)} ${titleBadge}</div>
        <div style="background:${statusColor};color:white;font-size:0.75rem;padding:3px 10px;border-radius:6px;font-weight:700;">${statusText}</div>
      </div>
      <div style="font-size:0.85rem;color:#334155;line-height:1.7;">
        <div><span style="color:#94a3b8;">الرقم الذاتي:</span> ${escapeHTML(emp.uid)}</div>
        <div><span style="color:#94a3b8;">النوع:</span> ${escapeHTML(emp.type)} | <span style="color:#94a3b8;">الوظيفة:</span> ${escapeHTML(emp.job)}</div>
        <div style="margin-top:4px;padding:6px;border-radius:6px;background:white;border:1px dashed ${statusColor};">${locationText}</div>
      </div>
    </div>
  `;
}

function searchPointGuide() {
  const q = document.getElementById('pointGuideSearch').value.trim();
  if (!q) { document.getElementById('pointGuideResult').innerHTML = ''; renderPointsGuide(); return; }
  const employees = DB.get('employees', []);
  const cq = normalize(q);
  const matches = employees.filter(e => normalize(e.name).includes(cq) || e.uid.includes(q));
  if (!matches.length) {
    document.getElementById('pointGuideResult').innerHTML = '<div class="card" style="color:red;text-align:center;"><i class="fas fa-info-circle"></i> لم يتم العثور على موظف.</div>';
    return;
  }
  const emp = matches[0];
  const pid = getEmployeePoint(emp.uid);
  const leaves = DB.get('leaves', {});
  const onLeave = leaves[emp.uid] && isBetween(new Date(), leaves[emp.uid].start, leaves[emp.uid].end);

  let color = '#059669', bg = '#ECFDF5', border = '#A7F3D0', tag = 'على رأس العمل', loc = '❌ لم يتم فرزك لأي نقطة بعد.';
  const rank = getHierarchyRank(emp.title);

  if (onLeave) {
    color = '#D97706'; bg = '#FFFBEB'; border = '#FCD34D'; tag = 'في إجازة 🌴';
    loc = `أنت في إجازة من ${fmtDateArabic(leaves[emp.uid].start)} إلى ${fmtDateArabic(leaves[emp.uid].end)}`;
  } else if (getUnavailableReason(emp)) {
    color = '#2563EB'; bg = '#EFF6FF'; border = '#BFDBFE'; tag = getUnavailableReason(emp);
  } else if (rank <= 3 && rank !== 99) {
    // Supervisory hierarchy - not assigned to specific points
    const hierarchyLabel = getHierarchyLabel(emp.title);
    const hierarchyDesc = getHierarchyDescription(rank);
    loc = `🏛️ <strong>${hierarchyLabel}</strong><br><span style="font-size:0.85rem;">${hierarchyDesc}</span>`;
    tag = hierarchyLabel + ' 🏛️';
    if (rank === 1) { color = '#92400E'; bg = '#FEF3C7'; border = '#F59E0B'; }
    else if (rank === 2) { color = '#1E40AF'; bg = '#EFF6FF'; border = '#BFDBFE'; }
    else { color = '#065F46'; bg = '#ECFDF5'; border = '#34D399'; }
  } else if (pid) {
    color = '#0D9488'; bg = '#F0FDFA'; border = '#99F6E4'; tag = 'مفرز ميدانياُ ✅';
    loc = `📍 تم فرزك إلى نقطة: <strong style="font-size:1.1rem;">${escapeHTML(getPointName(pid))}</strong>`;
  }

  document.getElementById('pointGuideResult').innerHTML = `
    <div class="emp-result" style="margin-bottom:1rem;">
      <div class="emp-result-header" style="background:${color};">
        <h3>👤 ${escapeHTML(emp.name)}</h3>
        <span class="status-badge">${tag}</span>
      </div>
      <div class="emp-result-body">
        <div class="emp-info-grid">
          <div><div class="label">الرقم الذاتي</div><div class="value">${escapeHTML(emp.uid)}</div></div>
          <div><div class="label">نوع الكادر</div><div class="value">${escapeHTML(emp.type)}</div></div>
          <div><div class="label">المهمة</div><div class="value">${escapeHTML(emp.job)}</div></div>
        </div>
        <div class="location-box" style="background:${bg};color:${color};border-color:${border};">${loc}</div>
      </div>
    </div>
  `;
}

function openEmployeeForm(index = null) {
  const employees = DB.get('employees', []);
  const emp = index !== null ? employees[index] : null;
  const days = ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  const selected = emp?.restDays || [];
  const type = currentEmpTab === 'admin' ? 'إداري' : 'مقيم';
  openModal(emp ? '📝 تعديل بيانات' : '➕ إضافة موظف', `
    <div class="form-group"><label>الاسم الكامل</label><input type="text" id="empName" value="${sanitizeAttr(emp?.name||'')}"></div>
    <div class="form-group"><label>الرقم الذاتي</label><input type="text" id="empUid" value="${sanitizeAttr(emp?.uid||'')}" ${emp?'disabled':''}></div>
    <div class="form-group"><label>الوظيفة</label><input type="text" id="empJob" value="${sanitizeAttr(emp?.job||'')}"></div>
    <div class="form-group"><label>التوصيف الوظيفي <span style="color:#94a3b8;font-size:0.75rem;">(مثال: رئيس فئة، رئيس قسم، مشرف)</span></label><input type="text" id="empTitle" value="${sanitizeAttr(emp?.title||'')}" placeholder="اتركه فارغاُ إذا لم يكن هناك توصيف..."></div>
    <div class="form-group"><label>المؤهل العلمي</label><input type="text" id="empQualification" value="${sanitizeAttr(emp?.qualification||'')}" placeholder="مثال: إجازة جامعية، شهادة ثانوية..."></div>
    ${type==='إداري'?`<div class="form-group"><label>أيام الاستراحة</label><div class="chips" id="restDaysChips">
      ${days.map(d=>`<span class="chip ${selected.includes(d)?'selected':''}" onclick="toggleRestDay(this,'${d}')">${d}</span>`).join('')}
    </div></div>`:''}
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="saveEmployee(${index!==null?index:'null'})">حفظ</button>
  `);
}

function toggleRestDay(el, day) {
  const selected = document.querySelectorAll('#restDaysChips .chip.selected');
  if (el.classList.contains('selected')) { el.classList.remove('selected'); }
  else if (selected.length < 2) { el.classList.add('selected'); }
}

function saveEmployee(index) {
  const name = document.getElementById('empName').value.trim();
  const uid = document.getElementById('empUid').value.trim();
  const job = document.getElementById('empJob').value.trim() || (currentEmpTab==='admin'?'إداري':'مقيم');
  const title = document.getElementById('empTitle').value.trim();
  const qualification = document.getElementById('empQualification').value.trim() || 'غير محدد';
  const type = currentEmpTab === 'admin' ? 'إداري' : 'مقيم';
  const restDays = Array.from(document.querySelectorAll('#restDaysChips .chip.selected')).map(c => c.textContent);
  if (!name || !uid) { toast('أدخل الاسم والرقم', 'error'); return; }
  const employees = DB.get('employees', []);
  if (index === null) {
    if (employees.some(e => e.uid === uid)) { toast('الرقم الذاتي موجود مسبقاُ', 'error'); return; }
    employees.push({ uid, name, job, type, restDays: type==='إداري'?restDays:[], title, qualification });
  } else {
    employees[index] = { ...employees[index], name, job, restDays: type==='إداري'?restDays:[], title, qualification };
  }
  DB.set('employees', employees);
  closeModal();
  renderEmployees();
  toast('تم الحفظ');
}

function editEmployee(index) { openEmployeeForm(index); }

function deleteEmployee(index) {
  if (!confirm('هل أنت متأكد من الحذف؟')) return;
  const employees = DB.get('employees', []);
  const uid = employees[index].uid;
  employees.splice(index, 1);
  DB.set('employees', employees);
  const as = DB.get('assignments', {});
  for (const k of Object.keys(as)) as[k] = (as[k]||[]).filter(u => u !== uid);
  DB.set('assignments', as);
  const leaves = DB.get('leaves', {}); delete leaves[uid]; DB.set('leaves', leaves);
  const reqs = DB.get('requests', {});
  for (const k of Object.keys(reqs)) if (reqs[k].uid === uid) delete reqs[k];
  DB.set('requests', reqs);
  renderEmployees();
  toast('تم الحذف');
}

// ===== Leaves Management =====
function renderLeaves() {
  if (currentLeaveTab === 'approved') renderApprovedLeaves();
  else renderPendingRequests();
}

function renderApprovedLeaves() {
  const leaves = DB.get('leaves', {});
  const employees = DB.get('employees', []);
  const entries = Object.entries(leaves);
  let html = entries.map(([uid, l]) => {
    const emp = employees.find(e => e.uid === uid);
    return `
      <div class="list-item">
        <div>
          <div class="title"><i class="fas fa-plane" style="color:var(--warning);margin-left:0.3rem;"></i> ${escapeHTML(emp?.name || 'موظف مجهول')}</div>
          <div class="subtitle">${fmtDateArabic(l.start)} → ${fmtDateArabic(l.end)}</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteLeave('${sanitizeAttr(uid)}')"><i class="fas fa-trash"></i></button>
      </div>
    `;
  }).join('') || '<div style="text-align:center;padding:1rem;color:var(--text-light);">لا توجد إجازات.</div>';
  document.getElementById('leavesContent').innerHTML = html;
}

function renderPendingRequests() {
  const reqs = DB.get('requests', {});
  const entries = Object.entries(reqs).filter(([k, v]) => v.status === 'pending');
  let html = entries.map(([key, r]) => `
    <div class="list-item" style="align-items:flex-start;">
      <div>
        <div class="title"><i class="fas fa-clock" style="color:var(--accent);margin-left:0.3rem;"></i> ${escapeHTML(r.employeeName)}</div>
        <div class="subtitle">📅 ${r.dates.map(d => fmtDateArabic(d)).join(', ')} | نوع: ${escapeHTML(r.type)} | طلب: ${fmtDateArabic(r.requestDate)}</div>
      </div>
      <div class="actions">
        <button class="btn btn-success btn-sm" onclick="approveRequest('${sanitizeAttr(key)}')"><i class="fas fa-check"></i></button>
        <button class="btn btn-danger btn-sm" onclick="rejectRequest('${sanitizeAttr(key)}')"><i class="fas fa-times"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="deleteRequest('${sanitizeAttr(key)}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('') || '<div style="text-align:center;padding:1rem;color:var(--text-light);">لا توجد طلبات معلقة.</div>';
  document.getElementById('leavesContent').innerHTML = html;
}

function openDirectLeaveModal() {
  const employees = DB.get('employees', []);
  const opts = employees.map(e => `<option value="${sanitizeAttr(e.uid)}">${escapeHTML(e.name)} (${escapeHTML(e.type)})</option>`).join('');

  // Generate date chips like in openLeaveRequest
  const today = new Date();
  let chips = '';
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    chips += `<span class="chip" data-date="${fmtDate(d)}" onclick="toggleDirectLeaveDate(this)">${d.getDate()}/${d.getMonth()+1}</span>`;
  }

  openModal('تسجيل إجازة مباشرة', `
    <div class="form-group"><label>الموظف</label><select id="dlEmp">${opts}</select></div>
    <div class="form-group">
      <label>اختر التواريخ:</label>
      <div class="chips" id="directLeaveDateChips">${chips}</div>
    </div>
    <div id="directLeaveCount" style="font-weight:700;text-align:center;margin-top:0.5rem;">عدد الأيام: 0</div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="saveDirectLeave()">تسجيل</button>
  `);
}

function toggleDirectLeaveDate(el) {
  if (el.classList.contains('rest-day')) return;

  // Consecutive selection logic (same as toggleLeaveDate)
  const selected = document.querySelectorAll('#directLeaveDateChips .chip.selected');
  if (selected.length === 0) {
    el.classList.add('selected');
  } else if (selected.length === 1) {
    const d1 = new Date(selected[0].dataset.date);
    const d2 = new Date(el.dataset.date);
    const start = d1 < d2 ? d1 : d2;
    const end = d1 < d2 ? d2 : d1;
    document.querySelectorAll('#directLeaveDateChips .chip').forEach(c => c.classList.remove('selected'));
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      const chip = document.querySelector(`#directLeaveDateChips .chip[data-date="${fmtDate(d)}"]`);
      if (chip && !chip.classList.contains('rest-day')) chip.classList.add('selected');
    }
  } else {
    document.querySelectorAll('#directLeaveDateChips .chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }
  updateDirectLeaveCount();
}

function updateDirectLeaveCount() {
  const n = document.querySelectorAll('#directLeaveDateChips .chip.selected').length;
  const el = document.getElementById('directLeaveCount');
  if (el) el.textContent = 'عدد الأيام: ' + n;
}

function saveDirectLeave() {
  const uid = document.getElementById('dlEmp').value;
  const selected = document.querySelectorAll('#directLeaveDateChips .chip.selected');
  if (!selected.length) { toast('اختر تاريخاً واحداً على الأقل', 'error'); return; }

  const dates = Array.from(selected).map(c => c.dataset.date).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];

  // Validate dates
  const today = dateOnly(new Date());
  const startDate = dateOnly(start);

  if (startDate < today) { toast('❌ لا يمكن تسجيل إجازة في يوم سابق', 'error'); return; }

  const emp = getEmployeeByUid(uid);
  if (emp && emp.type === 'إداري' && emp.restDays?.length) {
    for (let d = new Date(start); d <= new Date(end); d.setDate(d.getDate()+1)) {
      if (emp.restDays.some(rd => normalize(rd) === normalize(getArabicDay(d.getDay() + 1)))) {
        toast('⚠️ لا يمكن في أيام الاستراحة', 'error'); return;
      }
    }
  }
  const leaves = DB.get('leaves', {});
  if (leaves[uid]) { toast('الموظف في إجازة حالياُ', 'error'); return; }
  leaves[uid] = { start, end };
  DB.set('leaves', leaves);
  addActivityLog('تسجيل إجازة', `${getEmployeeByUid(uid)?.name || uid}: ${start} → ${end}`);
  const as = DB.get('assignments', {});
  const pid = getEmployeePoint(uid);
  if (pid) {
    as[pid] = (as[pid]||[]).filter(u => u !== uid);
    DB.set('assignments', as);
  }
  closeModal();
  renderLeaves();
  renderDailyStats();
  toast('✅ تم التسجيل');
}

function deleteLeave(uid) {
  const leaves = DB.get('leaves', {});
  const emp = getEmployeeByUid(uid);
  addActivityLog('حذف إجازة', `${emp?.name || uid}`);
  delete leaves[uid];
  DB.set('leaves', leaves);
  renderLeaves();
  renderDailyStats();
  toast('تم الحذف');
}


// ===== Reset All Leaves =====
function resetAllLeaves() {
  const leaves = DB.get('leaves', {});
  const reqs = DB.get('requests', {});

  const approvedCount = Object.keys(leaves).length;
  const pendingCount = Object.values(reqs).filter(r => r.status === 'pending').length;
  const totalCount = approvedCount + pendingCount;

  if (totalCount === 0) {
    toast('ℹ️ لا توجد إجازات أو طلبات للحذف', 'warning');
    return;
  }

  const msg = `⚠️ تحذير: سيتم حذف جميع بيانات الإجازات نهائياً!\n\n` +
    `• إجازات معتمدة: ${approvedCount}\n` +
    `• طلبات معلقة: ${pendingCount}\n` +
    `• المجموع: ${totalCount}\n\n` +
    `لا يمكن التراجع عن هذا الإجراء.\n` +
    `اكتب "نعم" للتأكيد:`;

  const confirm = prompt(msg);
  if (confirm !== 'نعم') {
    toast('❌ تم إلغاء التصفير', 'warning');
    return;
  }

  // Also clear backups related to leaves (employees on leave have their assignments backed up)
  const backups = DB.get('backups', {});
  let backupCleared = 0;

  for (const uid of Object.keys(leaves)) {
    if (backups[uid]) {
      delete backups[uid];
      backupCleared++;
    }
  }

  DB.set('leaves', {});
  DB.set('requests', {});
  DB.set('backups', backups);

  addActivityLog('تصفير الإجازات', `تم حذف ${totalCount} سجل إجازة (${approvedCount} معتمدة، ${pendingCount} معلقة)`);

  renderLeaves();
  renderDailyStats();
  renderPointsGrid();
  renderUnassignedPoolCard();

  toast(`✅ تم تصفير ${totalCount} إجازة بنجاح!`, 'success');
}



// ===== Reset All Assignments =====
function resetAllAssignments() {
  const as = DB.get('assignments', {});
  const points = DB.get('points', []);

  let totalAssigned = 0;
  for (const pid of Object.keys(as)) {
    totalAssigned += (as[pid] || []).length;
  }

  if (totalAssigned === 0) {
    toast('ℹ️ لا يوجد موظفون مفرزون للحذف', 'warning');
    return;
  }

  const msg = `⚠️ تحذير: سيتم إلغاء فرز جميع الموظفين من النقاط!\n\n` +
    `• عدد الموظفين المفرزين: ${totalAssigned}\n` +
    `• عدد النقاط: ${points.length}\n\n` +
    `سيتم إرجاع جميع الموظفين إلى قائمة المتاحين للفرز.\n` +
    `اكتب "نعم" للتأكيد:`;

  const confirm = prompt(msg);
  if (confirm !== 'نعم') {
    toast('❌ تم إلغاء التصفير', 'warning');
    return;
  }

  DB.set('assignments', {});
  DB.set('backups', {});

  addActivityLog('تصفير الفرز', `تم إلغاء فرز ${totalAssigned} موظف من جميع النقاط`);

  renderPointsGrid();
  renderDailyStats();
  renderUnassignedPoolCard();

  toast(`✅ تم إلغاء فرز ${totalAssigned} موظف بنجاح!`, 'success');
}


function approveRequest(key) {
  const reqs = DB.get('requests', {});
  const r = reqs[key];
  if (!r) return;
  const leaves = DB.get('leaves', {});
  if (leaves[r.uid]) { toast('الموظف في إجازة', 'error'); return; }
  const dates = r.dates.map(d => new Date(d)).sort((a,b)=>a-b);
  leaves[r.uid] = { start: fmtDate(dates[0]), end: fmtDate(dates[dates.length-1]) };
  DB.set('leaves', leaves);
  reqs[key].status = 'approved';
  DB.set('requests', reqs);
  addActivityLog('اعتماد إجازة', `${r.employeeName}: ${r.dates[0]} → ${r.dates[r.dates.length-1]}`);
  const as = DB.get('assignments', {});
  const pid = getEmployeePoint(r.uid);
  if (pid) { as[pid] = (as[pid]||[]).filter(u => u !== r.uid); DB.set('assignments', as); }
  renderLeaves();
  renderDailyStats();
  toast('✅ تم القبول');
}

function rejectRequest(key) {
  const reqs = DB.get('requests', {});
  reqs[key].status = 'rejected';
  DB.set('requests', reqs);
  renderLeaves();
  toast('❌ تم الرفض');
}

function deleteRequest(key) {
  const reqs = DB.get('requests', {});
  delete reqs[key];
  DB.set('requests', reqs);
  renderLeaves();
  toast('تم الحذف');
}

function openLeaveRequest(uid) {
  const emp = getEmployeeByUid(uid);
  if (!emp) return;
  const leaves = DB.get('leaves', {});
  if (leaves[uid]) { toast('أنت في إجازة حالياُ', 'error'); return; }
  const reqs = DB.get('requests', {});
  if (Object.values(reqs).some(r => r.uid === uid && r.status === 'pending')) {
    toast('لديك طلب معلق بالفعل', 'warning'); return;
  }
  const today = new Date();
  let chips = '';
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const isRest = emp.type === 'إداري' && emp.restDays?.some(rd => normalize(rd) === normalize(getArabicDay(d.getDay() + 1)));
    chips += `<span class="chip ${isRest?'rest-day':''}" data-date="${fmtDate(d)}" ${isRest?'':'onclick="toggleLeaveDate(this)"'}>${d.getDate()}/${d.getMonth()+1}</span>`;
  }
  openModal(`📝 طلب إجازة - ${escapeHTML(emp.name)}`, `
    <div class="form-group">
      <label>نوع الإجازة</label>
      <div class="chips">
        <span class="chip selected" id="typeConsecutive" onclick="setLeaveType(true)">متصلة</span>
        <span class="chip" id="typeSeparate" onclick="setLeaveType(false)">منفصلة</span>
      </div>
    </div>
    <div class="form-group"><label>اختر التواريخ:</label><div class="chips" id="leaveDateChips">${chips}</div></div>
    <div id="leaveCount" style="font-weight:700;text-align:center;margin-top:0.5rem;">عدد الأيام: 0</div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="submitLeaveRequest('${sanitizeAttr(uid)}')">تقديم</button>
  `);
}

function setLeaveType(v) {
  leaveTypeConsecutive = v;
  document.getElementById('typeConsecutive').classList.toggle('selected', v);
  document.getElementById('typeSeparate').classList.toggle('selected', !v);
  document.querySelectorAll('#leaveDateChips .chip').forEach(c => c.classList.remove('selected'));
  updateLeaveCount();
}

function toggleLeaveDate(el) {
  if (el.classList.contains('rest-day')) return;
  if (leaveTypeConsecutive) {
    const selected = document.querySelectorAll('#leaveDateChips .chip.selected');
    if (selected.length === 0) {
      el.classList.add('selected');
    } else if (selected.length === 1) {
      const d1 = new Date(selected[0].dataset.date);
      const d2 = new Date(el.dataset.date);
      const start = d1 < d2 ? d1 : d2;
      const end = d1 < d2 ? d2 : d1;
      document.querySelectorAll('#leaveDateChips .chip').forEach(c => c.classList.remove('selected'));
      for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
        const chip = document.querySelector(`#leaveDateChips .chip[data-date="${fmtDate(d)}"]`);
        if (chip && !chip.classList.contains('rest-day')) chip.classList.add('selected');
      }
    } else {
      document.querySelectorAll('#leaveDateChips .chip').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
    }
  } else {
    el.classList.toggle('selected');
  }
  updateLeaveCount();
}

function updateLeaveCount() {
  const n = document.querySelectorAll('#leaveDateChips .chip.selected').length;
  const el = document.getElementById('leaveCount');
  if (el) el.textContent = 'عدد الأيام: ' + n;
}

function submitLeaveRequest(uid) {
  const selected = document.querySelectorAll('#leaveDateChips .chip.selected');
  if (!selected.length) { toast('اختر تاريخاُ واحداُ على الأقل', 'error'); return; }
  const dates = Array.from(selected).map(c => c.dataset.date).sort();

  // Use dateOnly for consistent date comparison
  const today = dateOnly(new Date());
  const pastDates = dates.filter(d => dateOnly(d) < today);
  if (pastDates.length > 0) { toast('❌ لا يمكن اختيار أيام سابقة', 'error'); return; }

  const reqs = DB.get('requests', {});
  const key = `${uid}_${Date.now()}`;
  const emp = getEmployeeByUid(uid);
  reqs[key] = {
    uid, employeeName: emp.name, dates,
    status: 'pending', requestDate: fmtDate(new Date()),
    type: leaveTypeConsecutive ? 'متصل' : 'منفصل'
  };
  DB.set('requests', reqs);
  closeModal();
  toast('✅ تم تقديم الطلب بنجاح');
}

// ===== PDF Export (using html2canvas - preserves Arabic text) =====
function exportEmployeesPDF() {
  const employees = DB.get('employees', []);
  const div = document.getElementById('pdfCapture');

  const chiefs = employees.filter(e => getHierarchyRank(e.title) === 1);
  const deptHeads = employees.filter(e => getHierarchyRank(e.title) === 2);
  const supervisors = employees.filter(e => getHierarchyRank(e.title) === 3);
  const others = employees.filter(e => getHierarchyRank(e.title) === 99);

  const adminCount = employees.filter(e => e.type === 'إداري').length;
  const resCount = employees.filter(e => e.type === 'مقيم').length;

  let html = '<div style="width:210mm;min-height:297mm;padding:15mm;box-sizing:border-box;background:#f8fafc;font-family:Cairo,sans-serif;direction:rtl;">';

  html += '<div style="text-align:center;margin-bottom:8mm;">';
  html += '<div style="font-size:26px;font-weight:800;color:#1F4E78;margin-bottom:3mm;">🛡️ المنظومة الجمركية الذكية</div>';
  html += '<div style="font-size:14px;color:#64748B;">تقرير سجل الكادر الجمركي</div>';
  html += '<div style="font-size:12px;color:#94a3b8;margin-top:2mm;">تاريخ التقرير: ' + getFullDateArabic() + '</div>';
  html += '</div>';

  html += '<div style="display:flex;gap:8px;margin-bottom:8mm;justify-content:center;">';
  html += '<div style="background:#1F4E78;color:white;padding:8px 16px;border-radius:8px;text-align:center;font-size:12px;flex:1;"><div style="font-size:16px;font-weight:700;">' + employees.length + '</div><div>إجمالي الكادر</div></div>';
  html += '<div style="background:#92400E;color:white;padding:8px 16px;border-radius:8px;text-align:center;font-size:12px;flex:1;"><div style="font-size:16px;font-weight:700;">' + chiefs.length + '</div><div>رؤساء فئة</div></div>';
  html += '<div style="background:#1E40AF;color:white;padding:8px 16px;border-radius:8px;text-align:center;font-size:12px;flex:1;"><div style="font-size:16px;font-weight:700;">' + deptHeads.length + '</div><div>رؤساء أقسام</div></div>';
  html += '<div style="background:#065F46;color:white;padding:8px 16px;border-radius:8px;text-align:center;font-size:12px;flex:1;"><div style="font-size:16px;font-weight:700;">' + supervisors.length + '</div><div>مشرفون</div></div>';
  html += '<div style="background:#0D9488;color:white;padding:8px 16px;border-radius:8px;text-align:center;font-size:12px;flex:1;"><div style="font-size:16px;font-weight:700;">' + adminCount + '</div><div>إداري</div></div>';
  html += '<div style="background:#D97706;color:white;padding:8px 16px;border-radius:8px;text-align:center;font-size:12px;flex:1;"><div style="font-size:16px;font-weight:700;">' + resCount + '</div><div>مقيم</div></div>';
  html += '</div>';

  html += '<div style="display:flex;gap:8px;margin-bottom:8mm;justify-content:center;font-size:11px;">';
  html += '<div style="background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;padding:4px 12px;border-radius:6px;font-weight:700;">👑 رئيس الفئة</div>';
  html += '<div style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;padding:4px 12px;border-radius:6px;font-weight:700;">⭐ رئيس القسم</div>';
  html += '<div style="background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;padding:4px 12px;border-radius:6px;font-weight:700;">🔰 مشرف</div>';
  html += '</div>';

  if (chiefs.length > 0) {
    html += '<div style="margin-bottom:8mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#92400E;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid #F59E0B;display:inline-block;">👑 رؤساء الفئة (المشرفون العامون — غير قابلين للفرز)</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:5px;">';
    chiefs.sort((a,b) => normalize(a.name).localeCompare(normalize(b.name)));
    chiefs.forEach(e => {
      const restText = e.restDays?.length ? e.restDays.join(' - ') : 'غير محدد';
      html += '<div style="background:#FFFBEB;border:2px solid #F59E0B;border-radius:10px;padding:10px;break-inside:avoid;">';
      html += '<div style="font-size:10px;font-weight:700;color:#92400E;margin-bottom:4px;">👑 رئيس الفئة — المشرف العام</div>';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + e.name + '</div>';
      html += '<div style="background:#0D9488;color:white;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;">' + e.type + '</div>';
      html += '</div>';
      html += '<div style="font-size:11px;color:#64748B;line-height:1.8;">';
      html += '<div><span style="color:#94a3b8;">الرقم الذاتي:</span> <span style="font-weight:700;color:#334155;">' + e.uid + '</span></div>';
      html += '<div><span style="color:#94a3b8;">المسمى الوظيفي:</span> <span style="color:#334155;">' + e.job + '</span></div>';
      html += '<div><span style="color:#94a3b8;">استراحة:</span> <span style="color:#334155;">' + restText + '</span></div>';
      html += '</div>';
      html += '<div style="font-size:10px;color:#92400E;margin-top:4px;font-weight:700;background:#FEF3C7;padding:4px 8px;border-radius:6px;border:1px solid #F59E0B;">🏛️ الهيكل الإشرافي — مشرف عام على كامل الفئة</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  if (deptHeads.length > 0) {
    html += '<div style="margin-bottom:8mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#1E40AF;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid #60A5FA;display:inline-block;">⭐ رؤساء الأقسام</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:5px;">';
    deptHeads.sort((a,b) => normalize(a.name).localeCompare(normalize(b.name)));
    deptHeads.forEach(e => {
      const restText = e.restDays?.length ? e.restDays.join(' - ') : 'غير محدد';
      const pid = getEmployeePoint(e.uid);
      const pointName = pid ? getPointName(pid) : 'غير مفرز';
      html += '<div style="background:#EFF6FF;border:2px solid #60A5FA;border-radius:10px;padding:10px;break-inside:avoid;">';
      html += '<div style="font-size:10px;font-weight:700;color:#1E40AF;margin-bottom:4px;">⭐ رئيس القسم</div>';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + e.name + '</div>';
      html += '<div style="background:#0D9488;color:white;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;">' + e.type + '</div>';
      html += '</div>';
      html += '<div style="font-size:11px;color:#64748B;line-height:1.8;">';
      html += '<div><span style="color:#94a3b8;">الرقم الذاتي:</span> <span style="font-weight:700;color:#334155;">' + e.uid + '</span></div>';
      html += '<div><span style="color:#94a3b8;">المسمى الوظيفي:</span> <span style="color:#334155;">' + e.job + '</span></div>';
      if (e.type === 'إداري') html += '<div><span style="color:#94a3b8;">استراحة:</span> <span style="color:#334155;">' + restText + '</span></div>';
      html += '</div>';
      html += '<div style="font-size:10px;color:#1E40AF;margin-top:4px;font-weight:700;background:#EFF6FF;padding:4px 8px;border-radius:6px;border:1px solid #60A5FA;">🏛️ الهيكل الإشرافي — مسؤول عن قسم</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  if (supervisors.length > 0) {
    html += '<div style="margin-bottom:8mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#065F46;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid #34D399;display:inline-block;">🔰 المشرفون</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:5px;">';
    supervisors.sort((a,b) => normalize(a.name).localeCompare(normalize(b.name)));
    supervisors.forEach(e => {
      const restText = e.restDays?.length ? e.restDays.join(' - ') : 'غير محدد';
      const pid = getEmployeePoint(e.uid);
      const pointName = pid ? getPointName(pid) : 'غير مفرز';
      html += '<div style="background:#ECFDF5;border:2px solid #34D399;border-radius:10px;padding:10px;break-inside:avoid;">';
      html += '<div style="font-size:10px;font-weight:700;color:#065F46;margin-bottom:4px;">🔰 مشرف</div>';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + e.name + '</div>';
      html += '<div style="background:#D97706;color:white;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;">' + e.type + '</div>';
      html += '</div>';
      html += '<div style="font-size:11px;color:#64748B;line-height:1.8;">';
      html += '<div><span style="color:#94a3b8;">الرقم الذاتي:</span> <span style="font-weight:700;color:#334155;">' + e.uid + '</span></div>';
      html += '<div><span style="color:#94a3b8;">المسمى الوظيفي:</span> <span style="color:#334155;">' + e.job + '</span></div>';
      if (e.type === 'إداري') html += '<div><span style="color:#94a3b8;">استراحة:</span> <span style="color:#334155;">' + restText + '</span></div>';
      html += '</div>';
      html += '<div style="font-size:10px;color:#065F46;margin-top:4px;font-weight:700;background:#ECFDF5;padding:4px 8px;border-radius:6px;border:1px solid #34D399;">🏛️ الهيكل الإشرافي — مشرف على نقاط</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  if (others.length > 0) {
    html += '<div style="margin-bottom:8mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#475569;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid #94a3b8;display:inline-block;">👥 باقي الكادر</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:5px;">';
    others.sort((a,b) => normalize(a.name).localeCompare(normalize(b.name)));
    others.forEach(e => {
      const restText = e.restDays?.length ? e.restDays.join(' - ') : 'غير محدد';
      const pid = getEmployeePoint(e.uid);
      const pointName = pid ? getPointName(pid) : 'غير مفرز';
      html += '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;break-inside:avoid;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + e.name + '</div>';
      html += '<div style="background:' + (e.type==='إداري'?'#0D9488':'#D97706') + ';color:white;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;">' + e.type + '</div>';
      html += '</div>';
      html += '<div style="font-size:11px;color:#64748B;line-height:1.8;">';
      html += '<div><span style="color:#94a3b8;">الرقم الذاتي:</span> <span style="font-weight:700;color:#334155;">' + e.uid + '</span></div>';
      html += '<div><span style="color:#94a3b8;">المسمى الوظيفي:</span> <span style="color:#334155;">' + e.job + '</span></div>';
      if (e.type === 'إداري') html += '<div><span style="color:#94a3b8;">استراحة:</span> <span style="color:#334155;">' + restText + '</span></div>';
      html += '</div>';
      html += '<div style="font-size:10px;color:#64748B;margin-top:4px;font-weight:700;">📍 ' + (pid ? 'مفرز في: ' + pointName : 'غير مفرز حالياُ') + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  html += '<div style="text-align:center;margin-top:10mm;padding-top:5mm;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">';
  html += 'تم إنشاء هذا التقرير بواسطة المنظومة الجمركية الذكية';
  html += '</div>';
  html += '</div>';

  div.innerHTML = html;

  html2canvas(div, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 0;
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    let position = margin;
    doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin);
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      doc.addPage();
      doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin);
    }
    doc.save('تقرير_الموظفين.pdf');
    div.innerHTML = '';
    toast('تم التصدير');
  }).catch(err => { console.error(err); toast('خطأ في التصدير', 'error'); });
}

function exportPointsPDF() {
  const pts = DB.get('points', []);
  const as = DB.get('assignments', {});
  const employees = DB.get('employees', []);
  const div = document.getElementById('pdfCapture');

  const chiefs = employees.filter(e => getHierarchyRank(e.title) === 1);
  const deptHeads = employees.filter(e => getHierarchyRank(e.title) === 2);
  const supervisors = employees.filter(e => getHierarchyRank(e.title) === 3);

  let totalAdmin = 0, totalResident = 0;
  pts.forEach(p => {
    const uids = as[p.id] || [];
    uids.forEach(uid => {
      const emp = employees.find(e => e.uid === uid);
      if (emp) {
        if (emp.type === 'إداري') totalAdmin++;
        else totalResident++;
      }
    });
  });
  const totalAssigned = totalAdmin + totalResident;

  let html = '<div style="width:210mm;min-height:297mm;padding:12mm;box-sizing:border-box;background:#f8fafc;font-family:Cairo,sans-serif;direction:rtl;">';

  // Header - compact
  html += '<div style="text-align:center;margin-bottom:5mm;">';
  html += '<div style="font-size:22px;font-weight:800;color:#1F4E78;margin-bottom:2mm;">🛡️ المنظومة الجمركية الذكية</div>';
  html += '<div style="font-size:12px;color:#64748B;">تقرير توزيع الموظفين على نقاط الخدمة</div>';
  html += '<div style="font-size:10px;color:#94a3b8;margin-top:1mm;">' + getFullDateArabic() + '</div>';
  html += '</div>';

  // Stats bar - compact horizontal
  html += '<div style="display:flex;gap:4px;margin-bottom:5mm;justify-content:center;font-size:10px;">';
  html += '<div style="background:#1F4E78;color:white;padding:4px 8px;border-radius:6px;text-align:center;flex:1;"><div style="font-size:14px;font-weight:700;">' + pts.length + '</div><div>النقاط</div></div>';
  html += '<div style="background:#0D9488;color:white;padding:4px 8px;border-radius:6px;text-align:center;flex:1;"><div style="font-size:14px;font-weight:700;">' + totalAdmin + '</div><div>إداري</div></div>';
  html += '<div style="background:#D97706;color:white;padding:4px 8px;border-radius:6px;text-align:center;flex:1;"><div style="font-size:14px;font-weight:700;">' + totalResident + '</div><div>مقيم</div></div>';
  html += '<div style="background:#1E293B;color:white;padding:4px 8px;border-radius:6px;text-align:center;flex:1;"><div style="font-size:14px;font-weight:700;">' + totalAssigned + '</div><div>المجموع</div></div>';
  html += '</div>';

  // Hierarchy section - very compact
  if (chiefs.length + deptHeads.length + supervisors.length > 0) {
    html += '<div style="margin-bottom:4mm;">';
    html += '<div style="font-size:11px;font-weight:700;color:#1F4E78;margin-bottom:2px;padding-bottom:2px;border-bottom:1px solid #1F4E78;display:inline-block;">الهيكلية الإشرافية</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;">';

    chiefs.forEach(emp => {
      html += '<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:4px;padding:2px 6px;font-size:9px;color:#92400E;font-weight:700;">👑 ' + emp.name + ' (مشرف عام)</div>';
    });
    deptHeads.forEach(emp => {
      html += '<div style="background:#EFF6FF;border:1px solid #60A5FA;border-radius:4px;padding:2px 6px;font-size:9px;color:#1E40AF;font-weight:700;">⭐ ' + emp.name + ' (مسؤول قسم)</div>';
    });
    supervisors.forEach(emp => {
      html += '<div style="background:#ECFDF5;border:1px solid #34D399;border-radius:4px;padding:2px 6px;font-size:9px;color:#065F46;font-weight:700;">🔰 ' + emp.name + ' (مشرف نقاط)</div>';
    });

    html += '</div></div>';
  }

  // Points table - compact table format
  html += '<div style="font-size:11px;font-weight:700;color:#1F4E78;margin-bottom:2px;padding-bottom:2px;border-bottom:1px solid #1F4E78;display:inline-block;">📍 نقاط الخدمة</div>';

  // Table header
  html += '<table style="width:100%;border-collapse:collapse;font-size:9px;margin-top:2px;">';
  html += '<thead><tr style="background:#1F4E78;color:white;">';
  html += '<th style="padding:3px 4px;text-align:right;border:1px solid #1F4E78;font-size:9px;">النقطة</th>';
  html += '<th style="padding:3px 4px;text-align:center;border:1px solid #1F4E78;font-size:9px;width:30px;">المطلوب</th>';
  html += '<th style="padding:3px 4px;text-align:center;border:1px solid #1F4E78;font-size:9px;width:30px;">الموجود</th>';
  html += '<th style="padding:3px 4px;text-align:center;border:1px solid #1F4E78;font-size:9px;width:30px;">الحالة</th>';
  html += '<th style="padding:3px 4px;text-align:right;border:1px solid #1F4E78;font-size:9px;">الموظفون المفروزون</th>';
  html += '</tr></thead><tbody>';

  pts.forEach((p, idx) => {
    const uids = as[p.id] || [];
    const staffList = uids.map(uid => employees.find(e => e.uid === uid)).filter(Boolean);
    staffList.sort((a, b) => getHierarchyRank(a.title) - getHierarchyRank(b.title));
    const count = staffList.length;
    const adminCount = staffList.filter(e => e.type === 'إداري').length;
    const residentCount = staffList.filter(e => e.type === 'مقيم').length;

    let statusColor = count === 0 ? '#991B1B' : count < p.required ? '#92400E' : '#166534';
    let statusBg = count === 0 ? '#FEF2F2' : count < p.required ? '#FFFBEB' : '#F0FDF4';
    let statusText = count === 0 ? 'فارغة' : count < p.required ? 'نقص' : 'مكتملة';

    let staffText = '';
    if (staffList.length > 0) {
      staffText = staffList.map(emp => {
        const rank = getHierarchyRank(emp.title);
        let prefix = '';
        if (rank === 2) prefix = '⭐ ';
        else if (rank === 3) prefix = '🔰 ';
        const typeBadge = emp.type === 'إداري' ? ' [إ]' : ' [م]';
        return prefix + emp.name + typeBadge;
      }).join('، ');
    } else {
      staffText = '<span style="color:#94a3b8;font-style:italic;">لا يوجد</span>';
    }

    html += '<tr style="background:' + (idx % 2 === 0 ? 'white' : '#F8FAFC') + ';">';
    html += '<td style="padding:3px 4px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#1e293b;">' + p.name + '<br><span style="font-size:8px;color:#94a3b8;font-weight:400;">' + p.id + '</span></td>';
    html += '<td style="padding:3px 4px;border:1px solid #e2e8f0;text-align:center;font-weight:700;">' + p.required + '</td>';
    html += '<td style="padding:3px 4px;border:1px solid #e2e8f0;text-align:center;font-weight:700;">' + count + '</td>';
    html += '<td style="padding:3px 4px;border:1px solid #e2e8f0;text-align:center;"><span style="background:' + statusBg + ';color:' + statusColor + ';padding:1px 4px;border-radius:3px;font-size:8px;font-weight:700;">' + statusText + '</span></td>';
    html += '<td style="padding:3px 4px;border:1px solid #e2e8f0;text-align:right;font-size:8px;line-height:1.4;">' + staffText + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';

  // Footer
  html += '<div style="text-align:center;margin-top:4mm;padding-top:2mm;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:9px;">';
  html += 'تم إنشاء هذا التقرير بواسطة المنظومة الجمركية الذكية';
  html += '</div>';
  html += '</div>';

  div.innerHTML = html;

  html2canvas(div, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 0;
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    let position = margin;
    doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin);
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      doc.addPage();
      doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin);
    }
    doc.save('توزيع_الموظفين_على_النقاط.pdf');
    div.innerHTML = '';
    toast('تم التصدير');
  }).catch(err => { console.error(err); toast('خطأ في التصدير', 'error'); });
}

// ===== Daily Report PDF - Matches Daily Stats Exactly =====
function exportDailyReportPDF() {
  const employees = DB.get('employees', []);
  const leaves = DB.get('leaves', {});
  const div = document.getElementById('pdfCapture');

  const today = new Date();
  const todayName = getArabicDay(today.getDay() + 1);
  const todayStr = getFullDateArabic();

  let total = 0, adminRest = 0, adminLeave = 0, resLeave = 0;
  const adminRestList = [];
  const adminLeaveList = [];
  const resLeaveList = [];
  const activeList = [];

  employees.forEach(e => {
    total++;
    const onLeave = leaves[e.uid] && isBetween(today, leaves[e.uid].start, leaves[e.uid].end);
    if (e.type === 'إداري') {
      const td = normalize(getTodayStr());
      if (e.restDays?.some(d => normalize(d) === td)) {
        adminRest++;
        adminRestList.push(e);
      } else if (onLeave) {
        adminLeave++;
        adminLeaveList.push({...e, ...leaves[e.uid]});
      } else {
        activeList.push(e);
      }
    } else if (e.type === 'مقيم' && onLeave) {
      resLeave++;
      resLeaveList.push({...e, ...leaves[e.uid]});
    } else {
      activeList.push(e);
    }
  });

  const unavailable = adminRest + adminLeave + resLeave;
  const active = total - unavailable;

  let html = '<div style="width:210mm;min-height:297mm;padding:15mm;box-sizing:border-box;background:#f8fafc;font-family:Cairo,sans-serif;direction:rtl;">';

  html += '<div style="text-align:center;margin-bottom:8mm;">';
  html += '<div style="font-size:26px;font-weight:800;color:#1F4E78;margin-bottom:3mm;">🛡️ المنظومة الجمركية الذكية</div>';
  html += '<div style="font-size:14px;color:#64748B;">التقرير اليومي — مؤشر القوة</div>';
  html += '<div style="font-size:12px;color:#94a3b8;margin-top:2mm;">' + todayStr + '</div>';
  html += '</div>';

  html += '<div style="display:flex;gap:8px;margin-bottom:8mm;justify-content:center;">';
  html += '<div style="background:#1F4E78;color:white;padding:8px 16px;border-radius:8px;text-align:center;font-size:12px;flex:1;"><div style="font-size:18px;font-weight:700;">' + total + '</div><div>إجمالي الكادر</div></div>';
  html += '<div style="background:#059669;color:white;padding:8px 16px;border-radius:8px;text-align:center;font-size:12px;flex:1;"><div style="font-size:18px;font-weight:700;">' + active + '</div><div>متاح للعمل</div></div>';
  html += '<div style="background:#DC2626;color:white;padding:8px 16px;border-radius:8px;text-align:center;font-size:12px;flex:1;"><div style="font-size:18px;font-weight:700;">' + unavailable + '</div><div>غياب</div></div>';
  html += '</div>';

  html += '<div style="display:flex;gap:8px;margin-bottom:8mm;justify-content:center;font-size:11px;">';
  html += '<div style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;padding:6px 12px;border-radius:8px;text-align:center;flex:1;"><div style="font-size:16px;font-weight:700;">' + adminRest + '</div><div>استراحة</div></div>';
  html += '<div style="background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;padding:6px 12px;border-radius:8px;text-align:center;flex:1;"><div style="font-size:16px;font-weight:700;">' + adminLeave + '</div><div>إجازة إداري</div></div>';
  html += '<div style="background:#F0FDFA;border:1px solid #99F6E4;color:#0D9488;padding:6px 12px;border-radius:8px;text-align:center;flex:1;"><div style="font-size:16px;font-weight:700;">' + resLeave + '</div><div>إجازة مقيم</div></div>';
  html += '</div>';

  if (adminRestList.length > 0) {
    html += '<div style="margin-bottom:8mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#1E40AF;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid #60A5FA;display:inline-block;">🛌 الإداريون في يوم الاستراحة (' + adminRest + ')</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:5px;">';
    adminRestList.forEach(e => {
      html += '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:10px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + e.name + '</div>';
      html += '<div style="font-size:11px;color:#64748B;">الرقم: ' + e.uid + ' | يوم الاستراحة: ' + (e.restDays?.join(' و ') || '') + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  if (adminLeaveList.length > 0) {
    html += '<div style="margin-bottom:8mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#92400E;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid #F59E0B;display:inline-block;">🌴 الإداريون في إجازة (' + adminLeave + ')</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:5px;">';
    adminLeaveList.forEach(e => {
      html += '<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:10px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + e.name + '</div>';
      html += '<div style="font-size:11px;color:#64748B;">الرقم: ' + e.uid + '</div>';
      html += '<div style="font-size:11px;color:#92400E;font-weight:600;">📅 ' + e.start + ' → ' + e.end + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  if (resLeaveList.length > 0) {
    html += '<div style="margin-bottom:8mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#0D9488;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid #34D399;display:inline-block;">🌴 المقيمون في إجازة (' + resLeave + ')</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:5px;">';
    resLeaveList.forEach(e => {
      html += '<div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:10px;padding:10px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + e.name + '</div>';
      html += '<div style="font-size:11px;color:#64748B;">الرقم: ' + e.uid + '</div>';
      html += '<div style="font-size:11px;color:#0D9488;font-weight:600;">📅 ' + e.start + ' → ' + e.end + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  if (activeList.length > 0) {
    html += '<div style="margin-bottom:8mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#059669;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid #34D399;display:inline-block;">✅ المتاحون للعمل (' + active + ')</div>';
    html += '<div style="font-size:11px;color:#64748B;margin-bottom:4px;">الموظفون غير المذكورين في الأقسام السابقة</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">';
    activeList.forEach(e => {
      const typeColor = e.type === 'إداري' ? '#0D9488' : '#D97706';
      const typeBg = e.type === 'إداري' ? '#ECFDF5' : '#FFFBEB';
      html += '<span style="background:' + typeBg + ';color:' + typeColor + ';padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600;border:1px solid ' + typeColor + '33;">' + e.name + '</span>';
    });
    html += '</div></div>';
  }

  html += '<div style="text-align:center;margin-top:10mm;padding-top:5mm;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">';
  html += 'تم إنشاء هذا التقرير بواسطة المنظومة الجمركية الذكية';
  html += '</div>';
  html += '</div>';

  div.innerHTML = html;

  html2canvas(div, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 0;
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    let position = margin;
    doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin);
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      doc.addPage();
      doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin);
    }
    doc.save('التقرير_اليومي_' + fmtDate(new Date()) + '.pdf');
    div.innerHTML = '';
    toast('تم تصدير التقرير اليومي');
  }).catch(err => { console.error(err); toast('خطأ في التصدير', 'error'); });
}

// ===== Export Leaves PDF with Date Filter =====
function exportLeavesPDF() {
  const today = fmtDate(new Date());
  openModal('📋 تصدير تقرير الإجازات', `
    <div class="form-group">
      <label>نطاق التواريخ</label>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="chip selected" id="filterAll" onclick="setLeaveFilter('all')">جميع الإجازات</button>
        <button class="chip" id="filterToday" onclick="setLeaveFilter('today')">إجازات اليوم فقط</button>
        <button class="chip" id="filterActive" onclick="setLeaveFilter('active')">النشطة حالياً</button>
        <button class="chip" id="filterRange" onclick="setLeaveFilter('range')">نطاق محدد</button>
      </div>
    </div>
    <div id="rangeInputs" style="display:none;">
      <div class="form-group">
        <label>من تاريخ</label>
        <input type="date" id="filterStartDate" value="${today}">
      </div>
      <div class="form-group">
        <label>إلى تاريخ</label>
        <input type="date" id="filterEndDate" value="${today}">
      </div>
    </div>
    <div class="form-group">
      <label>تضمين الطلبات المعلقة</label>
      <div class="chips">
        <span class="chip selected" id="includePendingYes" onclick="togglePendingInclude(true)">نعم</span>
        <span class="chip" id="includePendingNo" onclick="togglePendingInclude(false)">لا</span>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="generateLeavesPDF()">تصدير PDF</button>
  `);

  window._leaveFilterType = 'all';
  window._leaveIncludePending = true;
}

function setLeaveFilter(type) {
  window._leaveFilterType = type;
  document.querySelectorAll('#modalContent .chip').forEach(c => {
    if (c.id?.startsWith('filter')) c.classList.remove('selected');
  });
  document.getElementById('filter' + type.charAt(0).toUpperCase() + type.slice(1))?.classList.add('selected');
  document.getElementById('rangeInputs').style.display = type === 'range' ? 'block' : 'none';
}

function togglePendingInclude(v) {
  window._leaveIncludePending = v;
  document.getElementById('includePendingYes').classList.toggle('selected', v);
  document.getElementById('includePendingNo').classList.toggle('selected', !v);
}

function generateLeavesPDF() {
  const filterType = window._leaveFilterType || 'all';
  const includePending = window._leaveIncludePending !== false;

  const employees = DB.get('employees', []);
  const leaves = DB.get('leaves', {});
  const reqs = DB.get('requests', {});
  const div = document.getElementById('pdfCapture');
  const today = new Date();

  let approved = Object.entries(leaves).map(([uid, l]) => {
    const emp = employees.find(e => e.uid === uid);
    return { name: emp?.name || 'موظف مجهول', start: l.start, end: l.end, type: emp?.type || '', uid };
  });

  if (filterType === 'today') {
    const todayStr = fmtDate(today);
    approved = approved.filter(l => todayStr >= l.start && todayStr <= l.end);
  } else if (filterType === 'active') {
    approved = approved.filter(l => isBetween(today, l.start, l.end));
  } else if (filterType === 'range') {
    const startDate = document.getElementById('filterStartDate')?.value;
    const endDate = document.getElementById('filterEndDate')?.value;
    if (startDate && endDate) {
      approved = approved.filter(l => (l.start <= endDate && l.end >= startDate));
    }
  }

  let pending = [];
  if (includePending) {
    pending = Object.entries(reqs).filter(([k,v]) => v.status === 'pending').map(([k, r]) => r);
    if (filterType === 'today' || filterType === 'active') {
      pending = pending.filter(r => {
        const dates = r.dates || [];
        if (!dates.length) return false;
        const start = dates[0];
        const end = dates[dates.length - 1];
        if (filterType === 'today') {
          const todayStr = fmtDate(today);
          return todayStr >= start && todayStr <= end;
        }
        return isBetween(today, start, end);
      });
    } else if (filterType === 'range') {
      const startDate = document.getElementById('filterStartDate')?.value;
      const endDate = document.getElementById('filterEndDate')?.value;
      if (startDate && endDate) {
        pending = pending.filter(r => {
          const dates = r.dates || [];
          if (!dates.length) return false;
          const start = dates[0];
          const end = dates[dates.length - 1];
          return (start <= endDate && end >= startDate);
        });
      }
    }
  }

  const adminLeaves = approved.filter(l => l.type === 'إداري');
  const residentLeaves = approved.filter(l => l.type === 'مقيم');

  let html = '<div style="width:210mm;min-height:297mm;padding:15mm;box-sizing:border-box;background:#f8fafc;font-family:Cairo,sans-serif;direction:rtl;">';

  html += '<div style="text-align:center;margin-bottom:8mm;">';
  html += '<div style="font-size:26px;font-weight:800;color:#1F4E78;margin-bottom:3mm;">🛡️ المنظومة الجمركية الذكية</div>';
  html += '<div style="font-size:14px;color:#64748B;">تقرير الإجازات والطلبات</div>';

  let filterLabel = 'جميع الإجازات';
  if (filterType === 'today') filterLabel = 'إجازات اليوم (' + getFullDateArabic() + ')';
  else if (filterType === 'active') filterLabel = 'الإجازات النشطة حالياً';
  else if (filterType === 'range') {
    const s = document.getElementById('filterStartDate')?.value || '';
    const e = document.getElementById('filterEndDate')?.value || '';
    filterLabel = 'الإجازات من ' + s + ' إلى ' + e;
  }
  html += '<div style="font-size:12px;color:#94a3b8;margin-top:2mm;">' + filterLabel + '</div>';
  html += '</div>';

  html += '<div style="display:flex;gap:10px;margin-bottom:10mm;justify-content:center;">';
  html += '<div style="background:#1F4E78;color:white;padding:8px 20px;border-radius:8px;text-align:center;font-size:13px;flex:1;"><div style="font-size:18px;font-weight:700;">' + approved.length + '</div><div>إجازات معتمدة</div></div>';
  html += '<div style="background:#0D9488;color:white;padding:8px 20px;border-radius:8px;text-align:center;font-size:13px;flex:1;"><div style="font-size:18px;font-weight:700;">' + adminLeaves.length + '</div><div>إداري</div></div>';
  html += '<div style="background:#D97706;color:white;padding:8px 20px;border-radius:8px;text-align:center;font-size:13px;flex:1;"><div style="font-size:18px;font-weight:700;">' + residentLeaves.length + '</div><div>مقيم</div></div>';
  if (includePending) {
    html += '<div style="background:#92400E;color:white;padding:8px 20px;border-radius:8px;text-align:center;font-size:13px;flex:1;"><div style="font-size:18px;font-weight:700;">' + pending.length + '</div><div>طلبات معلقة</div></div>';
  }
  html += '</div>';

  if (approved.length > 0) {
    html += '<div style="margin-bottom:10mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#1F4E78;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid #1F4E78;display:inline-block;">📋 الإجازات المعتمدة (' + approved.length + ')</div>';

    if (adminLeaves.length > 0) {
      html += '<div style="font-size:13px;font-weight:700;color:#0D9488;margin:8px 0 4px;">👔 إداريون (' + adminLeaves.length + ')</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">';
      adminLeaves.forEach(l => {
        html += '<div style="background:#F0FDFA;border-radius:10px;padding:10px;border:1px solid #99F6E4;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
        html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + l.name + '</div>';
        html += '<div style="background:#0D9488;color:white;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;">إداري</div>';
        html += '</div>';
        html += '<div style="font-size:11px;color:#64748B;line-height:1.8;">';
        html += '<div><span style="color:#94a3b8;">من:</span> <span style="font-weight:700;color:#334155;">' + l.start + '</span></div>';
        html += '<div><span style="color:#94a3b8;">إلى:</span> <span style="font-weight:700;color:#334155;">' + l.end + '</span></div>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (residentLeaves.length > 0) {
      html += '<div style="font-size:13px;font-weight:700;color:#D97706;margin:12px 0 4px;">👷 مقيمون (' + residentLeaves.length + ')</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">';
      residentLeaves.forEach(l => {
        html += '<div style="background:#FFFBEB;border-radius:10px;padding:10px;border:1px solid #FDE68A;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
        html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + l.name + '</div>';
        html += '<div style="background:#D97706;color:white;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;">مقيم</div>';
        html += '</div>';
        html += '<div style="font-size:11px;color:#64748B;line-height:1.8;">';
        html += '<div><span style="color:#94a3b8;">من:</span> <span style="font-weight:700;color:#334155;">' + l.start + '</span></div>';
        html += '<div><span style="color:#94a3b8;">إلى:</span> <span style="font-weight:700;color:#334155;">' + l.end + '</span></div>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
  } else {
    html += '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:14px;background:white;border-radius:10px;margin-bottom:10mm;">لا توجد إجازات مطابقة للفلتر المحدد</div>';
  }

  if (includePending && pending.length > 0) {
    html += '<div style="margin-bottom:10mm;">';
    html += '<div style="font-size:16px;font-weight:700;color:#D97706;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid #D97706;display:inline-block;">⏳ الطلبات المعلقة (' + pending.length + ')</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px;">';
    pending.forEach(r => {
      html += '<div style="background:white;border-radius:10px;padding:10px;border:1px solid #FDE68A;box-shadow:0 1px 3px rgba(0,0,0,0.05);">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#1e293b;">' + r.employeeName + '</div>';
      html += '<div style="background:#FFFBEB;color:#92400E;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;">⏳ معلق</div>';
      html += '</div>';
      html += '<div style="font-size:11px;color:#64748B;line-height:1.8;">';
      html += '<div><span style="color:#94a3b8;">التواريخ:</span> <span style="color:#334155;">' + (r.dates || []).join(', ') + '</span></div>';
      html += '<div><span style="color:#94a3b8;">النوع:</span> <span style="color:#334155;">' + r.type + '</span></div>';
      html += '<div><span style="color:#94a3b8;">تاريخ الطلب:</span> <span style="color:#334155;">' + r.requestDate + '</span></div>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  html += '<div style="text-align:center;margin-top:10mm;padding-top:5mm;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">';
  html += 'تم إنشاء هذا التقرير بواسطة المنظومة الجمركية الذكية';
  html += '</div>';
  html += '</div>';

  div.innerHTML = html;

  html2canvas(div, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 0;
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    let position = margin;
    doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin);
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      doc.addPage();
      doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin);
    }
    let filename = 'تقرير_الإجازات';
    if (filterType === 'today') filename += '_اليوم';
    else if (filterType === 'active') filename += '_النشطة';
    else if (filterType === 'range') {
      const s = document.getElementById('filterStartDate')?.value || '';
      const e = document.getElementById('filterEndDate')?.value || '';
      filename += '_' + s + '_إلى_' + e;
    }
    doc.save(filename + '.pdf');
    div.innerHTML = '';
    toast('تم تصدير التقرير');
  }).catch(err => { console.error(err); toast('خطأ في التصدير', 'error'); });
}



function enforceDailyConstraints(silent = false) {
  const now = new Date();
  const today = dateOnly(now);
  const todayName = normalize(getArabicDay(now.getDay() + 1));
  const employees = DB.get('employees', []);
  const leaves = DB.get('leaves', {});
  const points = DB.get('points', []);
  const pointIds = new Set(points.map(p => p.id));
  let as = DB.get('assignments', {});
  let backups = DB.get('backups', {});
  let removedCount = 0;
  let restoredCount = 0;
  let removedList = [];
  let restoredList = [];

  for (const [pid, uids] of Object.entries(as)) {
    const toRemove = [];
    for (const uid of uids) {
      const emp = employees.find(e => e.uid === uid);
      if (!emp) continue;
      const onLeave = leaves[uid] && isBetween(new Date(), leaves[uid].start, leaves[uid].end);
      const onRest = emp.type === 'إداري' && emp.restDays?.some(d => normalize(d) === todayName);
      if (onLeave || onRest) {
        toRemove.push(uid);
        backups[uid] = pid;
        const reason = onLeave ? 'إجازة رسمية' : 'يوم الاستراحة (' + getTodayStr() + ')';
        removedList.push({ name: emp.name, point: getPointName(pid), reason });
        addActivityLog('سحب تلقائي', `${emp.name} من ${getPointName(pid)} — السبب: ${reason} (${getFullDateArabic()})`);
      }
    }
    if (toRemove.length) {
      as[pid] = uids.filter(u => !toRemove.includes(u));
      removedCount += toRemove.length;
    }
  }

  for (const [uid, pid] of Object.entries(backups)) {
    const emp = employees.find(e => e.uid === uid);
    if (!emp) { delete backups[uid]; continue; }
    const onLeave = leaves[uid] && isBetween(new Date(), leaves[uid].start, leaves[uid].end);
    const onRest = emp.type === 'إداري' && emp.restDays?.some(d => normalize(d) === todayName);

    if (!onLeave && !onRest) {
      const alreadyAssigned = Object.values(as).some(uids => uids.includes(uid));
      if (!alreadyAssigned) {
        if (pointIds.has(pid)) {
          as[pid] = [...(as[pid] || []), uid];
          restoredList.push({ name: emp.name, point: getPointName(pid) });
          addActivityLog('إرجاع تلقائي', `${emp.name} إلى ${getPointName(pid)} — انتهت الإجازة/الاستراحة`);
          restoredCount++;
        } else {
          addActivityLog('تنبيه', `${emp.name} كان مفرزاً في نقطة محذوفة (${pid}) — لم يُرجع`);
        }
      }
      delete backups[uid];
    }
  }

  DB.set('assignments', as);
  DB.set('backups', backups);
  renderUnassignedPoolCard();

  if (!silent && isAdmin) {
    if (removedCount > 0) {
      const names = removedList.map(r => r.name).join('، ');
      toast(`⛔ تم سحب ${removedCount} موظف تلقائياً (${names})`, 'warning');
    }
    if (restoredCount > 0) {
      const names = restoredList.map(r => r.name).join('، ');
      toast(`✅ تم إرجاع ${restoredCount} موظف تلقائياً (${names})`, 'success');
    }
  }

  return { removedCount, restoredCount, removedList, restoredList };
}

function populateEmployeeDatalist() {
  const dl = document.getElementById('employeeNames');
  if (!dl) return;
  const employees = DB.get('employees', []);
  dl.innerHTML = employees.map(e => `<option value="${sanitizeAttr(e.name)}">${sanitizeAttr(e.uid)} — ${sanitizeAttr(e.type)}</option>`).join('');
}

// ===== Auto-refresh system =====
let _dailyRefreshInterval = null;
let _lastCheckedDay = null;

function startDailyRefresh() {
  checkDayChange();
  _dailyRefreshInterval = setInterval(() => {
    checkDayChange();
  }, 30 * 60 * 1000);
}

function checkDayChange() {
  const now = new Date();
  const currentDay = fmtDate(now);
  const currentDayName = getArabicDay(now.getDay() + 1);

  if (_lastCheckedDay !== currentDay) {
    _lastCheckedDay = currentDay;
    console.log('📅 Day changed to:', currentDay, '(' + currentDayName + ') — refreshing...');

    const result = enforceDailyConstraints(true);

    if (isAdmin) {
      renderDailyStats();
      renderPointsGrid();
      renderEmployees();
      renderLeaves();

      if (result.removedCount > 0 || result.restoredCount > 0) {
        let msg = '📅 ' + currentDayName + ' — ';
        if (result.removedCount > 0) msg += `سحب ${result.removedCount} موظف، `;
        if (result.restoredCount > 0) msg += `إرجاع ${result.restoredCount} موظف`;
        toast(msg, 'success');
      } else {
        toast('📅 تم التحديث — ' + getFullDateArabic(), 'success');
      }
    }

    const searchResult = document.getElementById('searchResult');
    if (searchResult && searchResult.innerHTML) {
      const searchInput = document.getElementById('empSearchInput');
      if (searchInput && searchInput.value.trim()) {
        searchEmployee();
      }
    }
  }
}

function stopDailyRefresh() {
  if (_dailyRefreshInterval) {
    clearInterval(_dailyRefreshInterval);
    _dailyRefreshInterval = null;
  }
}

// ===== Initialization =====
async function initApp() {
  await authManager.initAuth();

  if (authManager.validateSession()) {
    activateAdminMode();
  }

  await initData();
  enforceDailyConstraints(true);
  renderPointsGuide();
  populateEmployeeDatalist();
  startDailyRefresh();
}

document.addEventListener('DOMContentLoaded', initApp);
