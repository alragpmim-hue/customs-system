// ===== Data Initialization Module =====
// Loads employee data from external JSON file
// FALLBACK: Embedded employee data ensures app works even without server

const OFFICIAL_POINTS = [
  {id:"BP1",name:"قدوم",required:3},{id:"BP2",name:"صالة مغادرة",required:2},
  {id:"BP3",name:"تفتيش سيارت سياحي خروج",required:3},{id:"BP4",name:"سياحي خروج",required:2},
  {id:"BP5",name:"تفتيش حقائب",required:4},{id:"BP6",name:"شحن دخول سياحي هنكار",required:2},
  {id:"BP7",name:"ت مسافرين",required:2},{id:"BP8",name:"سياحي دخول (ارتباط)",required:2},
  {id:"BP9",name:"شحن خروج",required:3},{id:"BP10",name:"قبان تصدير",required:2},
  {id:"BP11",name:"تصدير",required:4},{id:"BP12",name:"تفتيش التصدير",required:3},
  {id:"BP13",name:"تفتيش شحن مغادرة خروج",required:3},{id:"BP14",name:"أرشيف",required:1},
  {id:"BP15",name:"مكتب أوربي",required:2},{id:"BP16",name:"قبان الاستيراد",required:2},
  {id:"BP17",name:"كشف ترانزيت",required:3},{id:"BP18",name:"كشف",required:3},
  {id:"BP19",name:"كشف معاكس",required:2},{id:"BP20",name:"طابعة",required:1},
  {id:"BP21",name:"قبول",required:2},{id:"BP22",name:"ديوان",required:2},
  {id:"BP23",name:"إغاثة",required:1},{id:"BP24",name:"طابون",required:2},
  {id:"BP25",name:"مستودعات",required:2},{id:"BP26",name:"قضايا",required:2}
];

// ===== EMBEDDED EMPLOYEE DATA (Fallback) =====
// This ensures the app works even when fetch() fails (e.g., file:// protocol)
const EMBEDDED_EMPLOYEES = {"version": "2.0", "lastUpdated": "2026-07-19", "admins": [{"name": "جميل ياسين حاج حسن", "qualification": "شهادة ابتدائية"}, {"name": "علي عبدو القد", "qualification": "شهادة ابتدائية"}, {"name": "عمر محمد العلي", "qualification": "معهد"}, {"name": "مصعب محمدعبدو لطوف", "qualification": "شهادة إعدادية"}, {"name": "محمد موسى لطفو حاج أحمد", "qualification": "معهد"}, {"name": "قتيبة أحمد معراتي", "qualification": "إجازة جامعية"}, {"name": "عامر أحمد رحيم", "qualification": "شهادة إعدادية"}, {"name": "زكريا مصطفى المصطفى", "qualification": "شهادة إعدادية"}, {"name": "عبدو شريف أسعد", "qualification": "شهادة ابتدائية"}, {"name": "مصطفى محمد نصف رطل", "qualification": "شهادة إعدادية"}, {"name": "أحمد علاء حنوص", "qualification": "شهادة إعدادية"}, {"name": "محمد شعيب حمود", "qualification": "شهادة ثانوية"}, {"name": "حسام علي قلعة جي", "qualification": "شهادة ابتدائية"}, {"name": "خالد محمد جمال عوض", "qualification": "شهادة ثانوية"}, {"name": "محمدخير جمال الدين كيال", "qualification": "شهادة ثانوية"}, {"name": "أحمد محمد الخليف", "qualification": "إجازة جامعية"}, {"name": "يوسف محمد مرشاق", "qualification": "شهادة إعدادية"}, {"name": "محمد سليمان بدوي", "qualification": "شهادة ابتدائية"}, {"name": "أحمد محمد أمين", "qualification": "شهادة ثانوية"}, {"name": "فاضل حسن حديد", "qualification": "إجازة جامعية"}, {"name": "ناجي محمد رضوان", "qualification": "إجازة جامعية"}, {"name": "أيهم محمد شيخ محمد", "qualification": "معهد"}, {"name": "محمد عمر محمد", "qualification": "شهادة إعدادية"}, {"name": "روجين ابراهيم الابراهيم", "qualification": "شهادة ثانوية"}, {"name": "عائشة إبراهيم الحاجي", "qualification": "شهادة ابتدائية"}, {"name": "عبدالغني مصطفى حاج إبراهيم", "qualification": "شهادة ثانوية"}, {"name": "الهام عبدالرحيم الطلفاح", "qualification": "شهادة ابتدائية"}, {"name": "مهند محمد قنبر", "qualification": "شهادة إعدادية"}, {"name": "منصور أحمد الأحمد", "qualification": "شهادة إعدادية"}, {"name": "عبدالحميد عمر حوا", "qualification": "إجازة جامعية"}, {"name": "أحمد محمد حاج قدور", "qualification": "إجازة جامعية"}], "residents": [{"name": "أحمد جلال حسن", "qualification": "شهادة ثانوية"}, {"name": "طه نوري العبسي", "qualification": "شهادة ثانوية"}, {"name": "نائل عبدالحميد ريحانية", "qualification": "شهادة إعدادية"}, {"name": "محمود أحمد حوري", "qualification": "شهادة إعدادية"}, {"name": "إسماعيل محمد حاج عتيق", "qualification": "شهادة ثانوية"}, {"name": "محمد جمال نعسان", "qualification": "معهد"}, {"name": "علاء عمر المحمد", "qualification": "معهد"}, {"name": "حسن منصور الدالي", "qualification": "شهادة ابتدائية"}, {"name": "عبدالله أسامة عبدالعزيز", "qualification": "شهادة ثانوية"}, {"name": "أحمد عبدالحميد سليمان", "qualification": "شهادة ثانوية"}, {"name": "شامان محمدعلي السليم", "qualification": "شهادة ابتدائية"}, {"name": "مجد عبدالعزيز الخليف", "qualification": "شهادة ثانوية"}, {"name": "يوسف جعفر جمعة", "qualification": "شهادة ثانوية"}, {"name": "حسين علي دامس", "qualification": "معهد"}, {"name": "عبدالجليل فتح الله فتح الله", "qualification": "معهد"}, {"name": "وائل فارس بسيس", "qualification": "شهادة ثانوية"}, {"name": "حسان محمد الياسين", "qualification": "إجازة جامعية"}, {"name": "أسعد إبراهيم الفرج", "qualification": "شهادة ثانوية"}, {"name": "محمد عبدالله عبدالحي", "qualification": "شهادة إعدادية"}, {"name": "عباس عبدالكريم سليمان", "qualification": "معهد"}, {"name": "شعبان أحمد بكرو", "qualification": "شهادة ثانوية"}, {"name": "مصطفى يوسف زنكلو", "qualification": "شهادة ثانوية"}, {"name": "هشام محمد زرقه", "qualification": "شهادة ثانوية"}, {"name": "ياسر أحمد حميدة", "qualification": "شهادة إعدادية"}, {"name": "مصطفى محمد بيازيد", "qualification": "شهادة ثانوية"}, {"name": "رامز نصر الغنوج", "qualification": "شهادة ثانوية"}, {"name": "شمس الدين مرعي المحمد", "qualification": "إجازة جامعية"}, {"name": "النشمي عقل العياش", "qualification": "شهادة ثانوية"}, {"name": "شادي عبدالمجيد البارودي", "qualification": "معهد"}, {"name": "محمد عبدالوهاب هنداوي", "qualification": "شهادة ثانوية"}, {"name": "محمد عمر زين", "qualification": "شهادة ثانوية"}, {"name": "حمدو أحمد غشيم", "qualification": "شهادة ابتدائية"}, {"name": "عبدالله وليد محمدعلي", "qualification": "معهد"}, {"name": "محمد مفيد عكل", "qualification": "شهادة ثانوية"}, {"name": "محمد فاتح علي كرج", "qualification": "إجازة جامعية"}, {"name": "يوسف طالب ملدعون", "qualification": "معهد"}, {"name": "محمد محمود الحمودي", "qualification": "شهادة إعدادية"}, {"name": "عبدالرحمن محمد أبوزيد", "qualification": "شهادة ثانوية"}, {"name": "أحمد رمضان الكرى", "qualification": "شهادة ابتدائية"}, {"name": "واصل عبدالله الدلمس", "qualification": "شهادة إعدادية"}, {"name": "عبدالقادر محمد رقية", "qualification": "شهادة ثانوية"}, {"name": "عبدالحميد مصطفى دوشية", "qualification": "شهادة إعدادية"}, {"name": "وضاح فواز الفجر", "qualification": "معهد"}, {"name": "علاء مصطفى مصطفى", "qualification": "شهادة ثانوية"}, {"name": "عامر محمد جانودي", "qualification": "شهادة إعدادية"}, {"name": "خالد أحمد الأسعد", "qualification": "شهادة ثانوية"}, {"name": "محمود فايز الحمد", "qualification": "إجازة جامعية"}, {"name": "مصطفى محمد يحيى كرج", "qualification": "معهد"}, {"name": "عبدالرحمن محمد درويش", "qualification": "إجازة جامعية"}, {"name": "نوري محمد خريس", "qualification": "معهد"}, {"name": "عبد الرحيم فواز الغريب", "qualification": "إجازة جامعية"}, {"name": "علاء خالد الحسيان", "qualification": "معهد"}, {"name": "علي طالب رحال", "qualification": "إجازة جامعية"}, {"name": "طارق فواز الفجر", "qualification": "إجازة جامعية"}, {"name": "إحسان عمر غزال", "qualification": "معهد"}, {"name": "محمد مصطفى شيخ حمدو", "qualification": "معهد"}, {"name": "محمد خالد دياب", "qualification": "معهد"}, {"name": "محمد ممدوح الحلوم", "qualification": "معهد"}, {"name": "وليد محمد الحسين", "qualification": "شهادة ثانوية"}, {"name": "مصطفى أحمد إسماعيل", "qualification": "شهادة ثانوية"}, {"name": "أنس عبد القادر شحادة", "qualification": "شهادة ثانوية"}, {"name": "قصي يحيى عبيد", "qualification": "معهد"}, {"name": "محمد رمضان بخصو", "qualification": "شهادة ثانوية"}, {"name": "أحمد علي جيلو", "qualification": "شهادة ثانوية"}, {"name": "صالح محمد المحمد", "qualification": "شهادة إعدادية"}, {"name": "أحمد محمد الوحيد", "qualification": "شهادة ابتدائية"}, {"name": "غزوان أحمد العليوي", "qualification": "معهد"}, {"name": "قصي عبدالله دياب", "qualification": "معهد"}, {"name": "مصطفى نهاد برهوم", "qualification": "إجازة جامعية"}, {"name": "مصعب طاهر السعيد", "qualification": "معهد"}, {"name": "إبراهيم عدنان الديوب", "qualification": "معهد"}, {"name": "عبدالقادر حسين دسوقي", "qualification": "معهد"}, {"name": "حمزة إبراهيم النجار", "qualification": "معهد"}, {"name": "أحمد حسين المسعود", "qualification": "إجازة جامعية"}, {"name": "مصطفى محمد خرزوم", "qualification": "شهادة ثانوية"}, {"name": "سليم مصطفى قرقناوي", "qualification": "إجازة جامعية"}, {"name": "مهند حكمت عبدالكريم", "qualification": "معهد"}, {"name": "يحيى احمد عبدالقادر", "qualification": "شهادة ثانوية"}, {"name": "محمد عبدالباسط الحمشو", "qualification": "معهد"}, {"name": "وليد خالد الخطاب", "qualification": "إجازة جامعية"}, {"name": "منهل عماد علي عائشة حسين", "qualification": "شهادة ثانوية"}, {"name": "محمد عبدو عبداللطيف", "qualification": "إجازة جامعية"}, {"name": "عدنان خالد محمد", "qualification": "إجازة جامعية"}, {"name": "مصطفى عبدالرحمن الشغري", "qualification": "شهادة ثانوية"}, {"name": "قتيبه أحمد رحمه", "qualification": "شهادة ثانوية"}, {"name": "عبد الرحمن عباس عبد القادر", "qualification": "معهد"}, {"name": "محمد عيسى الخطاب", "qualification": "إجازة جامعية"}, {"name": "حسن رافع حجي جمعه", "qualification": "إجازة جامعية"}, {"name": "يحيى مصطفى حباشو", "qualification": "إجازة جامعية"}, {"name": "عبد الرحمن جمال الدرويش", "qualification": "معهد"}, {"name": "حسن يونس الطلفاح", "qualification": "شهادة ثانوية"}, {"name": "نجيب محمد نجيب", "qualification": "معهد"}, {"name": "عبدالله عبدالرحمن الاسماعيل", "qualification": "معهد"}, {"name": "أحمد برهان البرجس", "qualification": "شهادة ثانوية"}, {"name": "مضر محمد الشعار", "qualification": "شهادة ثانوية"}, {"name": "عبد الرحمن فوزي حمادي", "qualification": "إجازة جامعية"}, {"name": "بشار محمد ديب بركات", "qualification": "شهادة ثانوية"}, {"name": "محمد وليد الغراء", "qualification": "شهادة ثانوية"}, {"name": "عبدالكريم يوسف المصطفى", "qualification": "شهادة ثانوية"}, {"name": "فهد فؤاد سباهي", "qualification": "شهادة ثانوية"}, {"name": "عمر خالد عطار", "qualification": "شهادة ثانوية"}, {"name": "أحمد علي الجودي", "qualification": "شهادة ثانوية"}, {"name": "جمعة أحمد عيسى", "qualification": "شهادة ثانوية"}, {"name": "أحمد وليد دعبول", "qualification": "شهادة ثانوية"}, {"name": "محمد عبدالباسط الخلف", "qualification": "معهد"}, {"name": "رجب محمد الرشيد", "qualification": "شهادة ابتدائية"}, {"name": "رافع مالك الشحود", "qualification": "شهادة ثانوية"}, {"name": "عامر أحمد لطوف", "qualification": "شهادة ثانوية"}, {"name": "علي الشايب السلطان", "qualification": "معهد"}, {"name": "علاء الدين محمد زين", "qualification": "معهد"}, {"name": "محمود مصطفى يسين", "qualification": "شهادة ثانوية"}, {"name": "عبد السلام فجر الجاسم", "qualification": "شهادة ثانوية"}, {"name": "محمد فايز الابراهيم", "qualification": "معهد"}, {"name": "وسام نور الدين الابراهيم", "qualification": "شهادة ثانوية"}, {"name": "مازن خالد العلي", "qualification": "شهادة ثانوية"}, {"name": "محمد إبراهيم العلي", "qualification": "شهادة ثانوية"}, {"name": "عمر عبد الرحمن حمداوي", "qualification": "شهادة ثانوية"}, {"name": "طه محمد الضاهر", "qualification": "معهد"}, {"name": "محمد إمام خطيب", "qualification": "معهد"}, {"name": "محمد خالد دليمي", "qualification": "إجازة جامعية"}, {"name": "خالد مصطفى رستم", "qualification": "شهادة ثانوية"}, {"name": "عبد الرحمن محمود قرمو", "qualification": "معهد"}, {"name": "أحمد عبد الرزاق بنطو", "qualification": "شهادة ثانوية"}, {"name": "محمد وليد الصالح", "qualification": "معهد"}, {"name": "عبد القادر جهاد الابراهيم", "qualification": "إجازة جامعية"}, {"name": "عبد القادر شعبان عبد القادر", "qualification": "شهادة ثانوية"}, {"name": "محمد قيصل رشواني", "qualification": "إجازة جامعية"}, {"name": "سعود تامر السلوم", "qualification": "شهادة ثانوية"}, {"name": "عبد العزيز مضر الديوب", "qualification": "شهادة ثانوية"}, {"name": "عبد الكريم خالد شقيفي", "qualification": "معهد"}, {"name": "أحمد رضوان ضبعان", "qualification": "شهادة ثانوية"}, {"name": "عمر خطاب محو", "qualification": "شهادة ثانوية"}, {"name": "عبد الرزاق حسن الحجي", "qualification": "شهادة ثانوية"}, {"name": "سعيد نوح السماعيل", "qualification": "إجازة جامعية"}, {"name": "عبد القادر سهيل هلال", "qualification": "شهادة ثانوية"}, {"name": "أحمد محمد الشيخ", "qualification": "معهد"}, {"name": "عبد الله مهدي الخليف", "qualification": "شهادة ثانوية"}], "titles": {"شمس الدين مرعي المحمد": "رئيس الفئة", "أيهم محمد شيخ محمد": "رئيس قسم الاستيراد", "قتيبة أحمد معراتي": "رئيس قسم المستودعات", "ناجي محمد رضوان": "رئيس قسم التصدير", "طارق فواز الفجر": "رئيس قسم المسافرين", "مصطفى محمد بيازيد": "رئيس قسم المعاكس", "محمد جمال نعسان": "مشرف تصدير", "أحمد محمد أمين": "مشرف مكتب أوربي", "محمد خير جمال الدين كيال": "مشرف k9", "محمد شعيب حمود": "مشرف شحن خروج", "خالد محمد جمال عوض": "مشرف قلعوم", "عبدالغني مصطفى حاج إبراهيم": "مشرف طابون", "محمد عبد الله عبدالحي": "مشرف كشف"}};

const DATA_VERSION_KEY = 'customs_data_version';
const CURRENT_DATA_VERSION = '2.0-clean';

let _employeeData = null;

async function loadEmployeeData() {
  if (_employeeData) return _employeeData;

  try {
    const response = await fetch('data/employees.json');
    if (response.ok) {
      _employeeData = await response.json();
      console.log('✅ Loaded employees from data/employees.json');
      return _employeeData;
    }
  } catch (e) {
    console.warn('⚠️ Could not fetch employees.json, using embedded fallback:', e);
  }

  // FALLBACK: Use embedded data
  _employeeData = EMBEDDED_EMPLOYEES;
  console.log('✅ Using embedded employee data');
  return _employeeData;
}

// ===== Data Corruption Detection =====
function detectDataCorruption() {
  const employees = DB.get('employees', []);

  // If no employees exist at all, this is a fresh install - not corruption
  if (!employees || !Array.isArray(employees) || employees.length === 0) {
    return { corrupted: false, reason: 'no_data', hasEmployees: false };
  }

  // We HAVE employees - now check if they are corrupted
  const adminUids = new Set();
  const residentUids = new Set();
  let overlapFound = false;

  for (const emp of employees) {
    if (!emp.uid || !emp.type) continue;
    if (emp.type === 'إداري') {
      if (residentUids.has(emp.uid)) {
        overlapFound = true;
        break;
      }
      adminUids.add(emp.uid);
    } else if (emp.type === 'مقيم') {
      if (adminUids.has(emp.uid)) {
        overlapFound = true;
        break;
      }
      residentUids.add(emp.uid);
    }
  }

  if (overlapFound) {
    return { corrupted: true, reason: 'uid_overlap', hasEmployees: true };
  }

  // Check for old UID ranges (admins should be 2000+, residents 1000+)
  const hasOldAdminUids = employees.some(e => e.type === 'إداري' && parseInt(e.uid) < 2000);
  const hasOldResidentUids = employees.some(e => e.type === 'مقيم' && parseInt(e.uid) < 1000);

  if (hasOldAdminUids || hasOldResidentUids) {
    return { corrupted: true, reason: 'old_uid_range', hasEmployees: true };
  }

  // Version mismatch with existing employees = just update version silently
  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
  if (storedVersion !== CURRENT_DATA_VERSION) {
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
  }

  return { corrupted: false, reason: 'clean', hasEmployees: true };
}

function showCorruptionBanner(reason) {
  const existing = document.getElementById('corruptionBanner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'corruptionBanner';
  banner.innerHTML = `
    <div style="background:linear-gradient(135deg, #DC2626, #991B1B);color:white;padding:1rem 1.5rem;
                display:flex;justify-content:space-between;align-items:center;position:fixed;
                top:0;left:0;right:0;z-index:500;box-shadow:0 4px 20px rgba(0,0,0,0.4);flex-wrap:wrap;gap:0.5rem;">
      <div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0;">
        <div style="font-size:1.5rem;">⚠️</div>
        <div>
          <div style="font-weight:800;font-size:0.95rem;">خطأ في بيانات التطبيق</div>
          <div style="font-size:0.8rem;opacity:0.9;">
            ${reason === 'uid_overlap' ? 'تم اكتشاف تداخل في الأرقام الذاتية (إداري ومقيم يتشاركان نفس الرقم).' :
              reason === 'old_uid_range' ? 'البيانات القديمة تحتوي على أرقام ذاتية غير متوافقة مع النظام الجديد.' :
              'البيانات بحاجة إلى تحديث للإصدار الجديد.'}
            يجب إعادة تعيين البيانات لإصلاح المشكلة.
          </div>
        </div>
      </div>
      <button onclick="forceResetAllData()" 
              style="background:#F59E0B;color:#1F2937;border:none;padding:0.6rem 1.2rem;border-radius:8px;
                     font-weight:800;cursor:pointer;white-space:nowrap;font-size:0.85rem;flex-shrink:0;">
        🔴 إعادة تعيين البيانات الآن
      </button>
    </div>
  `;
  document.body.appendChild(banner);
  document.body.style.paddingTop = '80px';
}

async function initData() {
  const corruptionCheck = detectDataCorruption();

  // ONLY block initialization if we HAVE employees AND they are corrupted
  if (corruptionCheck.corrupted && corruptionCheck.hasEmployees) {
    console.warn('🚨 Data corruption detected:', corruptionCheck.reason);
    showCorruptionBanner(corruptionCheck.reason);
    return;
  }

  const data = await loadEmployeeData();

  let employees = DB.get('employees', null);

  // Sync qualifications from JSON for existing employees
  if (employees && Array.isArray(employees) && employees.length > 0 && data) {
    let updated = false;
    employees.forEach(emp => {
      const jsonEmp = data.admins?.find(a => a.name === emp.name) || 
                      data.residents?.find(r => r.name === emp.name);
      if (jsonEmp && jsonEmp.qualification) {
        if (!emp.qualification || emp.qualification === 'غير محدد') {
          emp.qualification = jsonEmp.qualification;
          updated = true;
        }
      }
    });
    if (updated) {
      DB.set('employees', employees);
      console.log('✅ Qualifications synced from JSON');
    }
  }

  // If no employees exist, create fresh ones from JSON (or embedded data)
  if (!employees || !Array.isArray(employees) || employees.length === 0) {
    const freshEmployees = [];

    // Build from data with SEPARATE UID ranges
    // Admins: 2001-2999, Residents: 1001-1999
    if (data.admins) {
      data.admins.forEach((admin, i) => {
        freshEmployees.push({
          uid: (2001 + i).toString(),
          name: admin.name,
          job: 'إداري',
          type: 'إداري',
          restDays: ['الجمعة', 'السبت'],
          title: data.titles?.[admin.name] || '',
          qualification: admin.qualification || 'غير محدد'
        });
      });
    }

    if (data.residents) {
      data.residents.forEach((resident, i) => {
        freshEmployees.push({
          uid: (1001 + i).toString(),
          name: resident.name,
          job: 'مقيم',
          type: 'مقيم',
          restDays: [],
          title: data.titles?.[resident.name] || '',
          qualification: resident.qualification || 'غير محدد'
        });
      });
    }

    DB.set('employees', freshEmployees);
    console.log(`✅ Created ${freshEmployees.length} employees with non-overlapping UIDs`);
  }

  // Initialize points if not exist
  let points = DB.get('points', null);
  if (!points || !Array.isArray(points) || points.length === 0) {
    DB.set('points', JSON.parse(JSON.stringify(OFFICIAL_POINTS)));
  }

  // Initialize other data stores if not exist
  if (DB.get('assignments', null) === null) DB.set('assignments', {});
  if (DB.get('leaves', null) === null) DB.set('leaves', {});
  if (DB.get('requests', null) === null) DB.set('requests', {});
  if (DB.get('backups', null) === null) DB.set('backups', {});

  // Mark data as clean
  localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
}
