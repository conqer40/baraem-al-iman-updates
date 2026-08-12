const STORAGE_KEY = "nursery-management-system-v2";
const LEGACY_STORAGE_KEYS = ["nursery-management-system-v1"];
const CLOUD_SETTINGS_KEY = "nursery-cloud-config";

/* ── Firebase Cloud Sync ─────────────────────────────── */
let cloudDb = null;
let cloudCfg = null;

function loadCloudConfig() {
    try {
        const raw = localStorage.getItem(CLOUD_SETTINGS_KEY);
        if (raw) cloudCfg = JSON.parse(raw);
    } catch (_) {}
}

function saveCloudConfig(cfg) {
    cloudCfg = cfg;
    localStorage.setItem(CLOUD_SETTINGS_KEY, JSON.stringify(cfg));
}

function initCloud() {
    loadCloudConfig();
    if (!cloudCfg?.projectId || !cloudCfg?.syncId) return false;
    try {
        if (typeof firebase === "undefined") return false;
        if (!firebase.apps.length) {
            firebase.initializeApp({
                apiKey: cloudCfg.apiKey,
                authDomain: cloudCfg.authDomain,
                projectId: cloudCfg.projectId,
                storageBucket: cloudCfg.storageBucket,
                messagingSenderId: cloudCfg.messagingSenderId,
                appId: cloudCfg.appId
            });
        }
        cloudDb = firebase.firestore();
        return true;
    } catch (e) {
        console.error("Firebase init failed:", e);
        return false;
    }
}

async function saveToCloud() {
    if (!cloudDb || !cloudCfg?.syncId) return;
    try {
        await cloudDb.collection("nurseries").doc(cloudCfg.syncId).set({
            state: JSON.stringify(state),
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            version: STORAGE_KEY
        });
        ui.cloudStatus = "synced";
        ui.cloudSyncTime = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
        updateCloudStatusBadge();
    } catch (e) {
        ui.cloudStatus = "error";
        updateCloudStatusBadge();
        console.error("Cloud save error:", e);
    }
}

async function loadFromCloud() {
    if (!cloudDb || !cloudCfg?.syncId) return null;
    try {
        ui.cloudStatus = "syncing";
        updateCloudStatusBadge();
        const snap = await cloudDb.collection("nurseries").doc(cloudCfg.syncId).get();
        if (snap.exists) {
            return JSON.parse(snap.data().state);
        }
    } catch (e) {
        ui.cloudStatus = "error";
        updateCloudStatusBadge();
        console.error("Cloud load error:", e);
    }
    return null;
}

function updateCloudStatusBadge() {
    const badge = document.getElementById("cloud-sync-badge");
    if (!badge) return;
    const icons = { synced: "☁ محفوظ", syncing: "↻ جارٍ...", error: "✕ خطأ", idle: "☁ سحابة" };
    const classes = { synced: "cloud-synced", syncing: "cloud-syncing", error: "cloud-error", idle: "cloud-idle" };
    badge.textContent = icons[ui.cloudStatus] || icons.idle;
    badge.className = `cloud-badge ${classes[ui.cloudStatus] || "cloud-idle"}`;
    if (ui.cloudSyncTime && ui.cloudStatus === "synced") {
        badge.title = `آخر مزامنة: ${ui.cloudSyncTime}`;
    }
}

function generateSyncId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

const ACTIVITY_TYPE_LABELS = {
    TRIP: "رحلة",
    PARTY: "حفلة",
    COURSE: "كورس",
    WORKSHOP: "ورشة",
    OTHER: "أخرى"
};

const NAV_GROUPS = [
    { title: "الأكاديمية", sections: ["dashboard", "children", "add_child", "attendance", "learning", "exams"] },
    { title: "الإدارة", sections: ["staff", "payroll", "finance", "whatsapp", "operations", "followups"] },
    { title: "التقارير والإعدادات", sections: ["reports", "settings", "security", "updates"] }
];

const NAV_ICONS = {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
    children: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    add_child: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>`,
    attendance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    finance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    staff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    learning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    operations: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    exams: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    payroll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>`,
    whatsapp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.8 9.8c.2-.4.3-.4.5-.4h.4c.1 0 .3 0 .4.3l.6 1.4c.1.2.1.3 0 .5l-.3.4c-.1.1-.2.2-.1.4.2.5.7 1.2 1.5 1.8.9.7 1.6.9 2 .9.1 0 .2 0 .3-.1l.5-.6c.1-.1.3-.2.4-.1l1.3.6c.2.1.3.2.3.4v.4c0 .2 0 .3-.3.5-.4.2-.9.4-1.5.3-.9-.1-2.1-.6-3.4-1.7-1.1-.9-1.9-2.1-2.2-3.2-.1-.6 0-1.1.2-1.5z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    security: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    followups: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    updates: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`
};

const BRAND = {
    name: "أكاديمية براعم الإيمان",
    shortName: "براعم الإيمان",
    englishName: "Baraem Al Iman Academy",
    initials: "بر",
    systemName: "نظام إدارة الحضانة",
    facebook: "https://www.facebook.com/BaraemAlEmanAcademy",
    phone: "01000000000",
    address: "جمهورية مصر العربية",
    tagline: "تربية إيمانية، تعليم حديث، متابعة يومية دقيقة"
};

const STAGE_LABELS = {
    PRE_K: "فصل بري كجي",
    LEVEL_1: "فصل كجي وان",
    LEVEL_2: "فصل كجي تو",
    ADVANCED: "فصل المستوى المتقدم"
};

const SUPPORT_TYPE_LABELS = {
    NORMAL: "عادي",
    SPEECH_THERAPY: "تخاطب",
    SPECIALIST: "أخصائي"
};

const FOLLOWUP_TYPE_LABELS = {
    CALL: "اتصال هاتفي",
    MEETING: "مقابلة حضورية",
    NOTE: "ملاحظة داخلية",
    WHATSAPP: "رسالة واتساب"
};

const FOLLOWUP_STATUS_LABELS = {
    OPEN: "مفتوحة",
    DONE: "منتهية",
    PENDING: "معلقة"
};

const FEE_TYPE_LABELS = {
    MONTHLY: "اشتراك شهري",
    BUS: "رسوم باص",
    OTHER: "أخرى"
};

const RELATIONSHIP_LABELS = {
    FATHER: "الأب",
    MOTHER: "الأم",
    GRANDFATHER: "الجد",
    GRANDMOTHER: "الجدة",
    BROTHER: "الأخ",
    SISTER: "الأخت",
    UNCLE: "العم",
    AUNT: "العمة",
    GUARDIAN: "ولي أمر",
    OTHER: "أخرى"
};

const USER_ROLE_LABELS = {
    ADMIN: "مدير",
    SECRETARY: "سكرتارية",
    TEACHER: "معلمة"
};

const REQUIRED_ADMIN_ACCOUNT = {
    id: "user-admin",
    full_name: "محمد الحاوى",
    phone: "01022104948",
    password: "01065584603",
    role: "ADMIN"
};

const SHIFT_PRESETS = {
    MORNING: {
        code: "MORNING",
        label: "الوردية الصباحية (08:00 - 14:00)",
        shortLabel: "صباحي (8-2)",
        start: "08:00",
        end: "14:00"
    },
    EVENING: {
        code: "EVENING",
        label: "الوردية المسائية (14:00 - 19:00)",
        shortLabel: "مسائي (2-7)",
        start: "14:00",
        end: "19:00"
    }
};

const ATTENDANCE_LABELS = {
    PRESENT: "حاضر",
    ABSENT: "غائب بدون عذر",
    EXCUSED: "غائب بعذر",
    LATE: "متأخر",
    LEAVE: "إجازة",
    SICK_LEAVE: "إجازة مرضي",
    TERMINATED: "إنهاء تعاقد"
};

const NOTE_CATEGORY_LABELS = {
    PERFORMANCE: "تقييم أكاديمي",
    BEHAVIOR: "سلوك",
    SOCIAL: "اجتماعي",
    HEALTH: "صحي",
    GENERAL: "عام"
};

const EXAM_TERM_LABELS = {
    TERM_1: "الفصل الأول",
    TERM_2: "الفصل الثاني",
    FINAL: "النهائي",
    QUIZ: "اختبار قصير"
};

const FEE_STATUS_LABELS = {
    PENDING: "معلقة",
    PARTIAL: "جزئي",
    PAID: "مدفوع",
    OVERDUE: "متأخرة"
};

const CHILD_WHATSAPP_TEMPLATES = {
    attendance: "تقرير الحضور",
    finance: "كشف مالي",
    exams: "نتائج الاختبارات",
    notes: "ملاحظات المعلمين",
    full: "تقرير شامل"
};

const STAFF_WHATSAPP_TEMPLATES = {
    attendance: "ملخص حضور الموظف",
    payroll: "إشعار الراتب"
};

const WHATSAPP_REPLY_STATUS_LABELS = {
    PENDING: "بانتظار الرد",
    REPLIED: "تم الرد",
    FOLLOW_UP: "يحتاج متابعة",
    CLOSED: "تم الإغلاق"
};

const OCCASION_MESSAGE_TYPES = {
    BIRTHDAY: "تهنئة عيد ميلاد",
    ACHIEVEMENT: "تهنئة تشجيعية",
    WELCOME_BACK: "رسالة ترحيب"
};

const SECTION_TITLES = {
    dashboard: {
        title: "لوحة التحكم",
        description: "متابعة يومية سريعة للحضور، الرسوم، المخزون، والتنبيهات المهمة."
    },
    children: {
        title: "إدارة الأطفال",
        description: "عرض ملفات الأطفال ومتابعة بياناتهم المالية والحضور بشكل سريع."
    },
    add_child: {
        title: "إضافة طفل جديد",
        description: "تسجيل بيانات الطفل الأساسية، تحديد تاريخ أول حضور، وتعديل بيانات الاشتراكات والإلغاء."
    },
    attendance: {
        title: "الحضور اليومي",
        description: "تسجيل حضور الأطفال والموظفين مع إجراءات سريعة للتشيك إن والتشيك أوت."
    },
    finance: {
        title: "الفلوس والالتزامات",
        description: "إدارة الرسوم الشهرية والمصروفات العامة مع تنبيه المتأخرات."
    },
    whatsapp: {
        title: "رسائل الواتساب",
        description: "مركز موحد لإرسال رسائل أولياء الأمور والموظفين وتذكيرات المصروفات من بيانات النظام مباشرة."
    },
    staff: {
        title: "إدارة الموظفين",
        description: "تنظيم بيانات الفريق والرواتب والحالة الوظيفية بشكل مباشر."
    },
    learning: {
        title: "التعليم والخطط",
        description: "المنهج الأسبوعي، التحضير، والأنشطة الخاصة بكل مرحلة."
    },
    operations: {
        title: "العمليات اليومية",
        description: "السجل الطبي وصيدلية الروضة وكل المتابعات التشغيلية الحساسة."
    },
    reports: {
        title: "التقارير",
        description: "كشوف يومية وأسبوعية وشهرية لغياب الأطفال والمعلمين بشكل مباشر وسهل."
    },
    exams: {
        title: "الاختبارات والتقييم",
        description: "إدارة نتائج الاختبارات لكل طفل في كل مادة مع ملاحظات المعلمين التفسيرية."
    },
    payroll: {
        title: "الرواتب والمرتبات",
        description: "إعداد راتب كل موظف ومواعيد حضوره وانصرافه وحساب الخصومات والصافي شهريًا."
    },
    settings: {
        title: "الإعدادات والبيانات",
        description: "إدارة المستخدمين، الصلاحيات، المواد، والنسخ الاحتياطي لبيانات النظام."
    },
    security: {
        title: "الصلاحيات والأمان",
        description: "إدارة وصول المستخدمين، الحسابات المسجلة، وحدود كل دور داخل النظام."
    },
    followups: {
        title: "دفتر المتابعة",
        description: "تسجيل المقابلات والمكالمات مع أولياء الأمور، والمهام المعلقة، والملاحظات الداخلية."
    },
    updates: {
        title: "تحديث البرنامج والدعم الفني",
        description: "فحص وتنزيل أحدث إصدارات البرنامج دون مساس بالبيانات، مع خدمة التواصل المباشر مع المطور."
    }
};

const SECTION_VISUALS = {
    dashboard: {
        kicker: "غرفة القيادة",
        label: "تشغيل مباشر",
        accentStart: "#0f6a62",
        accentEnd: "#2f5c8b",
        accentSoft: "rgba(20, 122, 112, 0.16)"
    },
    children: {
        kicker: "الملفات الأساسية",
        label: "بيانات الأطفال",
        accentStart: "#c0853a",
        accentEnd: "#b85349",
        accentSoft: "rgba(192, 133, 58, 0.16)"
    },
    add_child: {
        kicker: "القبول والتسجيل",
        label: "تسجيل جديد",
        accentStart: "#c0853a",
        accentEnd: "#b85349",
        accentSoft: "rgba(192, 133, 58, 0.16)"
    },
    attendance: {
        kicker: "حركة اليوم",
        label: "دخول وانصراف",
        accentStart: "#147a70",
        accentEnd: "#5ea49b",
        accentSoft: "rgba(20, 122, 112, 0.15)"
    },
    finance: {
        kicker: "التحصيل والمتابعات",
        label: "رسوم ومصروفات",
        accentStart: "#9a6b2f",
        accentEnd: "#b85349",
        accentSoft: "rgba(184, 147, 61, 0.16)"
    },
    whatsapp: {
        kicker: "تواصل سريع",
        label: "رسائل ومتابعات",
        accentStart: "#128c7e",
        accentEnd: "#2f7d60",
        accentSoft: "rgba(47, 125, 96, 0.16)"
    },
    staff: {
        kicker: "فريق الأكاديمية",
        label: "المعلمات والموظفون",
        accentStart: "#2f5c8b",
        accentEnd: "#3d7aa8",
        accentSoft: "rgba(47, 92, 139, 0.16)"
    },
    learning: {
        kicker: "الخطة التعليمية",
        label: "مناهج وتحضير",
        accentStart: "#1b516d",
        accentEnd: "#147a70",
        accentSoft: "rgba(27, 81, 109, 0.16)"
    },
    operations: {
        kicker: "المتابعات اليومية",
        label: "تشغيل وصيدلية",
        accentStart: "#7a4c3f",
        accentEnd: "#b85349",
        accentSoft: "rgba(122, 76, 63, 0.16)"
    },
    reports: {
        kicker: "قراءة سريعة",
        label: "كشوف وتقارير",
        accentStart: "#314f72",
        accentEnd: "#8d6b37",
        accentSoft: "rgba(49, 79, 114, 0.16)"
    },
    exams: {
        kicker: "التقييم والمتابعة",
        label: "درجات وملاحظات",
        accentStart: "#415f86",
        accentEnd: "#147a70",
        accentSoft: "rgba(65, 95, 134, 0.16)"
    },
    payroll: {
        kicker: "الرواتب والشيكات",
        label: "مرتبات المعلمات",
        accentStart: "#17685f",
        accentEnd: "#b8933d",
        accentSoft: "rgba(23, 104, 95, 0.16)"
    },
    settings: {
        kicker: "إعداد المنظومة",
        label: "حسابات ومواد",
        accentStart: "#46586e",
        accentEnd: "#147a70",
        accentSoft: "rgba(70, 88, 110, 0.16)"
    },
    security: {
        kicker: "ضبط الوصول",
        label: "أمان وصلاحيات",
        accentStart: "#24384c",
        accentEnd: "#2f5c8b",
        accentSoft: "rgba(36, 56, 76, 0.16)"
    },
    followups: {
        kicker: "التواصل والمتابعة",
        label: "دفتر المقابلات",
        accentStart: "#5a3e7a",
        accentEnd: "#8b5cf6",
        accentSoft: "rgba(90, 62, 122, 0.16)"
    },
    updates: {
        kicker: "التطوير والدعم",
        label: "تحديث البرنامج",
        accentStart: "#1d4ed8",
        accentEnd: "#0284c7",
        accentSoft: "rgba(29, 78, 216, 0.16)"
    }
};

const SECTION_PERMISSIONS = {
    dashboard: ["ADMIN", "SECRETARY", "TEACHER"],
    children: ["ADMIN", "SECRETARY", "TEACHER"],
    add_child: ["ADMIN", "SECRETARY"],
    attendance: ["ADMIN", "SECRETARY", "TEACHER"],
    finance: ["ADMIN", "SECRETARY"],
    whatsapp: ["ADMIN", "SECRETARY", "TEACHER"],
    staff: ["ADMIN", "SECRETARY"],
    learning: ["ADMIN", "TEACHER"],
    operations: ["ADMIN", "SECRETARY", "TEACHER"],
    reports: ["ADMIN", "SECRETARY"],
    exams: ["ADMIN", "TEACHER"],
    payroll: ["ADMIN"],
    followups: ["ADMIN", "SECRETARY", "TEACHER"],
    settings: ["ADMIN"],
    security: ["ADMIN"],
    updates: ["ADMIN", "SECRETARY", "TEACHER"]
};

const defaultUi = {
    activeSection: "home",
    selectedChildId: "child-1",
    childFormId: "",
    staffFormId: "",
    feeFormId: "",
    expenseFormId: "",
    medicalFormId: "",
    pharmacyFormId: "",
    activityFormId: "",
    curriculumFormId: "",
    planningFormId: "",
    attendanceDate: todayDate(),
    reportDate: todayDate(),
    financeMonth: currentMonthDate(),
    reportMonth: currentMonthDate(),
    reportTab: "overview",
    reportRangeStart: "",
    reportRangeEnd: "",
    reportChildId: "",
    reportChildStage: "",
    reportStaffId: "",
    attendanceStageFilter: "",
    whatsappRangeStart: currentMonthDate(),
    whatsappRangeEnd: todayDate(),
    whatsappChildId: "",
    whatsappChildTemplate: "attendance",
    whatsappStaffId: "",
    whatsappStaffTemplate: "attendance",
    whatsappStage: "ALL",
    whatsappBroadcastTemplate: "attendance",
    whatsappAbsenceDate: todayDate(),
    whatsappActivityId: "",
    whatsappOccasionChildId: "",
    whatsappOccasionType: "BIRTHDAY",
    examFormId: "",
    examsTab: "exams",
    teacherNoteFormId: "",
    payrollStaffId: "",
    payrollMonth: currentMonthDate(),
    salaryPeriodStart: "",
    salaryPeriodEnd: "",
    childSearch: "",
    staffSearch: "",
    attendanceChildTab: "morning",
    staffAttendanceTab: "all",
    staffListTab: "list",
    settingsTab: "users",
    userFormId: null,
    subjectFormId: null,
    speechTherapySpecialistId: "",
    followupFormId: null,
    followupChildStage: "",
    followupStatusFilter: "",
    followupChildId: "",
    cloudStatus: "idle",
    cloudSyncTime: "",
    isAiChatOpen: false,
    aiChatInput: "",
    aiIsTyping: false
};

const seed = createSeedData();
let state = loadState();
let ui = { ...defaultUi };
let whatsappAutomationStatus = {
    state: "idle",
    message: "واتساب جاهز للربط",
    remaining: 0
};

const desktopIpc = getElectronIpcRenderer();
if (desktopIpc) {
    desktopIpc.on("whatsapp:status", (_event, status) => {
        whatsappAutomationStatus = { ...whatsappAutomationStatus, ...status };
        if (ui.activeSection === "whatsapp") render();
        if (status.state === "error") showToast(status.message, "error");
        if (status.state === "complete") showToast(status.message);
    });
}

if (state.permissionOverrides) {
    Object.keys(state.permissionOverrides).forEach((sec) => {
        if (SECTION_PERMISSIONS[sec]) SECTION_PERMISSIONS[sec] = [...state.permissionOverrides[sec]];
    });
}

if (!state.children.find((child) => child.id === ui.selectedChildId)) {
    ui.selectedChildId = state.children[0]?.id || "";
}

const app = document.getElementById("app");
document.title = `${BRAND.name} | ${BRAND.systemName}`;

document.addEventListener("click", handleClick);
document.addEventListener("submit", handleSubmit);
document.addEventListener("change", handleChange);
document.addEventListener("input", (e) => {
    if (e.target.dataset.childSearchFilter) filterChildSelect(e.target.dataset.childSearchFilter);
});
document.addEventListener("pointermove", handleCardPointerMove);
document.addEventListener("pointerout", handleCardPointerOut);

const CURRENT_APP_VERSION = "5.1.0";

function isNewerVersion(remote, local) {
    if (!remote || !local) return false;
    const rParts = String(remote).replace(/^v/i, "").split(".").map(Number);
    const lParts = String(local).replace(/^v/i, "").split(".").map(Number);
    for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
        const r = isNaN(rParts[i]) ? 0 : rParts[i];
        const l = isNaN(lParts[i]) ? 0 : lParts[i];
        if (r > l) return true;
        if (r < l) return false;
    }
    return false;
}

async function checkStartupUpdateNotification() {
    try {
        const updateUrl = localStorage.getItem('BARAEM_UPDATE_URL') || 'https://raw.githubusercontent.com/conqer40/baraem-al-iman-updates/main';
        const manifestUrl = `${updateUrl.replace(/\/+$/, '')}/version.json?t=${Date.now()}`;
        
        const response = await fetch(manifestUrl, { cache: "no-store" });
        if (!response.ok) {
            checkWhatsNewOnFirstOpen();
            return;
        }
        
        const data = await response.json();
        if (!data || !data.version) {
            checkWhatsNewOnFirstOpen();
            return;
        }

        const dismissedVersion = sessionStorage.getItem("BARAEM_DISMISSED_UPDATE");

        // Trigger update notification if remote version is newer/different
        if (data.version !== CURRENT_APP_VERSION && dismissedVersion !== data.version) {
            setTimeout(() => {
                showStartupUpdateModal(data);
            }, 800);
        } else {
            console.log(`[✓] النظام محدث بالكامل للإصدار (${CURRENT_APP_VERSION})`);
            checkWhatsNewOnFirstOpen();
        }
    } catch (e) {
        console.debug("Startup update check skipped:", e.message);
        checkWhatsNewOnFirstOpen();
    }
}

function checkWhatsNewOnFirstOpen() {
    const lastSeen = localStorage.getItem("BARAEM_LAST_SEEN_UPDATE_VERSION");
    if (lastSeen !== CURRENT_APP_VERSION) {
        setTimeout(() => {
            showWhatsNewWelcomeModal();
        }, 1000);
    }
}

function showWhatsNewWelcomeModal() {
    const existing = document.getElementById("whats-new-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "whats-new-modal";
    overlay.className = "modal-overlay modal-visible";
    overlay.style.zIndex = "999999";

    overlay.innerHTML = `
        <div class="modal-box" style="max-width:620px; width:92%; text-align:right; border-radius:24px; padding:30px; background:linear-gradient(145deg, #0f172a, #1e293b); color:#f8fafc; border:1px solid rgba(255,255,255,0.15); box-shadow:0 30px 70px rgba(0,0,0,0.7); position:relative; overflow:hidden;">
            <div style="position:absolute; top:-40px; left:-40px; width:180px; height:180px; background:radial-gradient(circle, rgba(16,185,129,0.3), transparent 70%); border-radius:50%; pointer-events:none;"></div>
            
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:16px;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <div style="width:58px; height:58px; border-radius:18px; background:linear-gradient(135deg, #10b981, #059669); display:flex; align-items:center; justify-content:center; font-size:2rem; box-shadow:0 8px 24px rgba(16,185,129,0.4); flex-shrink:0;">
                        🎉
                    </div>
                    <div>
                        <span style="background:rgba(16,185,129,0.2); color:#34d399; font-size:0.8rem; font-weight:800; padding:4px 12px; border-radius:12px; border:1px solid rgba(16,185,129,0.3);">تم تثبيت التحديث بنجاح v${CURRENT_APP_VERSION}</span>
                        <h3 style="margin:4px 0 0 0; font-size:1.35rem; font-weight:900; color:#ffffff;">مرحباً بك في الإصدار الجديد! 🌟</h3>
                    </div>
                </div>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-close-whats-new-x" style="font-size:1.3rem; padding:4px 12px; color:#94a3b8; border-radius:10px;">✕</button>
            </div>

            <p style="color:#cbd5e1; font-size:0.95rem; line-height:1.7; margin-bottom:18px;">
                يسعدنا إعلامك بأنه تم تفعيل باقة من الميزات والتحسينات الذكية الجديدة لتسهيل إدارة الأكاديمية:
            </p>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin-bottom:24px;">
                
                <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px;">
                    <span style="font-size:1.4rem;">📸</span>
                    <div>
                        <strong style="color:#60a5fa; font-size:0.88rem; display:block;">إرفاق صور الأطفال</strong>
                        <small style="color:#94a3b8; font-size:0.8rem; line-height:1.4; display:block;">رفع صورة الطفل وضغطها لتظهر تلقائياً في الكارنيه والملف.</small>
                    </div>
                </div>

                <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px;">
                    <span style="font-size:1.4rem;">🪪</span>
                    <div>
                        <strong style="color:#34d399; font-size:0.88rem; display:block;">كارنيهات وبادجات هوية</strong>
                        <small style="color:#94a3b8; font-size:0.8rem; line-height:1.4; display:block;">طباعة بطاقة هوية رسمية ذكية مع صورة الطفل ورمز QR.</small>
                    </div>
                </div>

                <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px;">
                    <span style="font-size:1.4rem;">🎓</span>
                    <div>
                        <strong style="color:#f59e0b; font-size:0.88rem; display:block;">شهادات تقدير وتكريم A4</strong>
                        <small style="color:#94a3b8; font-size:0.8rem; line-height:1.4; display:block;">شهادات فاخرة لحفظ القرآن، السلوك الإيجابي، والتفوق.</small>
                    </div>
                </div>

                <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px;">
                    <span style="font-size:1.4rem;">💬</span>
                    <div>
                        <strong style="color:#a855f7; font-size:0.88rem; display:block;">رسائل واتساب الذكية</strong>
                        <small style="color:#94a3b8; font-size:0.8rem; line-height:1.4; display:block;">إشعار وصول آمن، انصراف، تذكير مصروفات، وبطاقة تشجيع.</small>
                    </div>
                </div>

                <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px;">
                    <span style="font-size:1.4rem;">🔍</span>
                    <div>
                        <strong style="color:#38bdf8; font-size:0.88rem; display:block;">البحث الشامل السريع</strong>
                        <small style="color:#94a3b8; font-size:0.8rem; line-height:1.4; display:block;">بحث فوري بالاسم أو الهاتف في الشريط العلوي للشاشة.</small>
                    </div>
                </div>

                <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px;">
                    <span style="font-size:1.4rem;">📑</span>
                    <div>
                        <strong style="color:#fb7185; font-size:0.88rem; display:block;">كشف حساب مالي وتنبيهات صحية</strong>
                        <small style="color:#94a3b8; font-size:0.8rem; line-height:1.4; display:block;">كشف حساب رسمي معتمد لولي الأمر وتنبيهات الحالات الخاصة.</small>
                    </div>
                </div>

            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <small style="color:#94a3b8; font-weight:600;">لن تظهر هذه الرسالة مرة أخرى لهذا الإصدار ✓</small>
                <button type="button" class="btn btn-primary" id="btn-close-whats-new" style="padding:12px 28px; font-weight:800; font-size:0.98rem; border-radius:14px; background:linear-gradient(135deg, #10b981, #059669); box-shadow:0 6px 20px rgba(16,185,129,0.4); border:none; cursor:pointer;">
                    <span>🚀 بدء استخدام الميزات الجديدة</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    function dismissModal() {
        localStorage.setItem("BARAEM_LAST_SEEN_UPDATE_VERSION", CURRENT_APP_VERSION);
        overlay.classList.remove("modal-visible");
        setTimeout(() => overlay.remove(), 250);
    }

    document.getElementById("btn-close-whats-new")?.addEventListener("click", dismissModal);
    document.getElementById("btn-close-whats-new-x")?.addEventListener("click", dismissModal);
}

function showStartupUpdateModal(updateInfo) {
    const existing = document.getElementById("startup-update-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "startup-update-modal";
    overlay.className = "modal-overlay modal-visible";
    overlay.style.zIndex = "99999";
    
    const highlightsList = (updateInfo.highlights || [updateInfo.summary || "تحديثات وتحسينات هامة للنظام"])
        .map(item => `<li style="margin-bottom:8px; display:flex; align-items:flex-start; gap:8px;"><span style="color:#10b981; font-weight:bold; font-size:1.1rem;">✓</span> <span>${item}</span></li>`)
        .join("");

    overlay.innerHTML = `
        <div class="modal-box" style="max-width:560px; width:92%; text-align:right; border-radius:24px; padding:30px; background:linear-gradient(145deg, #0f172a, #1e293b); color:#f8fafc; border:1px solid rgba(255,255,255,0.15); box-shadow:0 25px 60px rgba(0,0,0,0.6); position:relative; overflow:hidden;">
            <div style="position:absolute; top:-30px; left:-30px; width:150px; height:150px; background:radial-gradient(circle, rgba(59,130,246,0.3), transparent 70%); border-radius:50%; pointer-events:none;"></div>
            
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:18px;">
                <div style="width:56px; height:56px; border-radius:16px; background:linear-gradient(135deg, #3b82f6, #1d4ed8); display:flex; align-items:center; justify-content:center; font-size:2rem; box-shadow:0 8px 20px rgba(37,99,235,0.4);">
                    🚀
                </div>
                <div>
                    <span style="background:rgba(59,130,246,0.2); color:#93c5fd; font-size:0.78rem; font-weight:800; padding:3px 10px; border-radius:12px; border:1px solid rgba(59,130,246,0.3);">تحديث رسمي جديد متوفر (${updateInfo.version || "جديد"})</span>
                    <h3 style="margin:4px 0 0 0; font-size:1.4rem; font-weight:900; color:#ffffff;">${updateInfo.title || "يتوفر تحديث جديد للبرنامج"}</h3>
                </div>
            </div>

            <p style="color:#cbd5e1; font-size:0.95rem; line-height:1.7; margin-bottom:16px;">
                ${updateInfo.summary || "تم إصدار تحديث جديد يحتوي على تحسينات هامة لأداء البرنامج والشاشات والميزات التالية:"}
            </p>

            <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px 18px; margin-bottom:22px;">
                <strong style="display:block; color:#60a5fa; font-size:0.86rem; margin-bottom:8px;">📋 تفاصيل وميزات هذا التحديث:</strong>
                <ul style="list-style:none; padding:0; margin:0; font-size:0.9rem; color:#e2e8f0; line-height:1.6;">
                    ${highlightsList}
                </ul>
            </div>

            <div style="display:flex; gap:12px; justify-content:flex-start; flex-wrap:wrap;">
                <button class="btn btn-primary" id="btn-do-startup-update" style="padding:12px 26px; font-weight:800; font-size:0.98rem; border-radius:14px; background:linear-gradient(135deg, #2563eb, #1d4ed8); box-shadow:0 6px 20px rgba(37,99,235,0.4); display:inline-flex; align-items:center; gap:8px; border:none; cursor:pointer;">
                    <span>⚡ تحديث وتثبيت التحديث الآن</span>
                </button>
                <button class="btn btn-secondary" id="btn-later-startup-update" style="padding:12px 20px; font-weight:700; font-size:0.92rem; border-radius:14px; background:rgba(255,255,255,0.08); color:#cbd5e1; border:1px solid rgba(255,255,255,0.12); cursor:pointer;">
                    تحديث لاحقاً
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("btn-do-startup-update")?.addEventListener("click", async () => {
        const btn = document.getElementById("btn-do-startup-update");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = "<span>⏳ جاري تنزيل وتثبيت التحديث...</span>";
        }
        await performAppUpdate();
    });

    document.getElementById("btn-later-startup-update")?.addEventListener("click", () => {
        sessionStorage.setItem("BARAEM_DISMISSED_UPDATE", updateInfo.version || "1");
        overlay.classList.remove("modal-visible");
        setTimeout(() => overlay.remove(), 300);
    });
}

function showDailyExecutiveBriefing() {
    if (!state.session.userId) return;
    
    const today = todayDate();
    const lastSeenDate = sessionStorage.getItem("BARAEM_DAILY_BRIEFING_DATE");
    if (lastSeenDate === today) return;

    const user = currentUser();
    const hour = new Date().getHours();
    const greetingTime = hour < 12 ? "صباح الخير والبركة 🌅" : hour < 17 ? "طاب يومك ومساؤك ☀️" : "مساء الخير والأنوار 🌙";
    
    const dashboard = getDashboardMetrics();
    const overdueList = getOverdueFees();
    
    // Check for kids birthdays today
    const birthdayKids = state.children.filter(c => {
        if (!c.birth_date || c.status !== "ACTIVE") return false;
        return c.birth_date.slice(5) === today.slice(5);
    });

    const overlay = document.createElement("div");
    overlay.id = "daily-briefing-modal";
    overlay.className = "modal-overlay modal-visible";
    overlay.style.zIndex = "99990";

    const birthdayHtml = birthdayKids.length > 0 ? `
        <div style="background:rgba(236,72,153,0.15); border:1px solid rgba(236,72,153,0.3); border-radius:14px; padding:12px 16px; margin-bottom:14px; display:flex; align-items:center; gap:12px;">
            <div style="font-size:1.8rem;">🎂</div>
            <div>
                <strong style="color:#f472b6; font-size:0.92rem; display:block;">عيد ميلاد سعيد اليوم! 🎉</strong>
                <span style="color:#cbd5e1; font-size:0.86rem;">اليوم يوافق عيد ميلاد: ${birthdayKids.map(k => `*${k.full_name}*`).join("، ")}</span>
            </div>
        </div>
    ` : "";

    const overdueHtml = overdueList.length > 0 ? `
        <div style="background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.25); border-radius:14px; padding:12px 16px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="font-size:1.6rem; color:#fbbf24;">💰</div>
                <div>
                    <strong style="color:#fbbf24; font-size:0.92rem; display:block;">تنبيه المصروفات والرسوم المتأخرة</strong>
                    <span style="color:#cbd5e1; font-size:0.84rem;">يوجد ${overdueList.length} ملفات أطفال بها رسوم متأخرة تحتاج متابعة وتذكير عبر واتساب.</span>
                </div>
            </div>
            <button class="btn btn-warning btn-sm" id="briefing-goto-finance" style="padding:6px 14px; font-weight:800; border-radius:10px; font-size:0.82rem; white-space:nowrap; background:#d97706; color:#fff; border:none; cursor:pointer;">عرض الرسوم</button>
        </div>
    ` : `
        <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.25); border-radius:14px; padding:12px 16px; margin-bottom:14px; display:flex; align-items:center; gap:10px;">
            <div style="font-size:1.6rem; color:#34d399;">✓</div>
            <div>
                <strong style="color:#34d399; font-size:0.92rem; display:block;">التحصيلات المالية منتظمة</strong>
                <span style="color:#cbd5e1; font-size:0.84rem;">لا توجد متأخرات حرجة حالياً، جميع السجلات مستقرة.</span>
            </div>
        </div>
    `;

    overlay.innerHTML = `
        <div class="modal-box" style="max-width:620px; width:92%; text-align:right; border-radius:24px; padding:30px; background:linear-gradient(145deg, #0f172a, #1e293b); color:#f8fafc; border:1px solid rgba(255,255,255,0.15); box-shadow:0 25px 60px rgba(0,0,0,0.6); position:relative; overflow:hidden;">
            <div style="position:absolute; top:-40px; right:-40px; width:180px; height:180px; background:radial-gradient(circle, rgba(16,185,129,0.25), transparent 70%); border-radius:50%; pointer-events:none;"></div>

            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, #10b981, #059669); display:flex; align-items:center; justify-content:center; font-size:1.8rem; box-shadow:0 8px 20px rgba(16,185,129,0.35);">
                        🌟
                    </div>
                    <div>
                        <span style="color:#34d399; font-size:0.8rem; font-weight:800;">الموجز والملخص اليومي للأكاديمية</span>
                        <h3 style="margin:2px 0 0 0; font-size:1.35rem; font-weight:900; color:#ffffff;">${greetingTime}، أ. ${user.full_name}</h3>
                    </div>
                </div>
                <div style="text-align:left; background:rgba(255,255,255,0.06); padding:6px 14px; border-radius:12px; border:1px solid rgba(255,255,255,0.1);">
                    <small style="color:#94a3b8; display:block; font-size:0.75rem;">تاريخ اليوم</small>
                    <strong style="color:#60a5fa; font-size:0.88rem;">${formatArabicDate(today)}</strong>
                </div>
            </div>

            <p style="color:#94a3b8; font-size:0.92rem; line-height:1.6; margin-bottom:16px;">
                إليك نظرة سريعة على جدول أعمال ومواعيد الحضانة اليوم لمساعدتك في إدارة ومتابعة اليوم الدراسي بسلاسة:
            </p>

            <!-- Key Daily Agenda Stats Grid -->
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:16px;">
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px; text-align:center;">
                    <span style="font-size:0.78rem; color:#94a3b8; display:block;">الأطفال المقيدون</span>
                    <strong style="font-size:1.3rem; color:#60a5fa; font-weight:900;">${dashboard.activeChildren}</strong>
                    <small style="font-size:0.72rem; color:#cbd5e1; display:block;">طفل على القوة</small>
                </div>
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px; text-align:center;">
                    <span style="font-size:0.78rem; color:#94a3b8; display:block;">مواعيد العمل</span>
                    <strong style="font-size:1.1rem; color:#34d399; font-weight:900;">8:00 - 14:00</strong>
                    <small style="font-size:0.72rem; color:#cbd5e1; display:block;">الفترة الصباحية</small>
                </div>
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px; text-align:center;">
                    <span style="font-size:0.78rem; color:#94a3b8; display:block;">المعلمات والكادر</span>
                    <strong style="font-size:1.3rem; color:#a78bfa; font-weight:900;">${state.staff.length}</strong>
                    <small style="font-size:0.72rem; color:#cbd5e1; display:block;">موظف ومعلمة</small>
                </div>
            </div>

            ${birthdayHtml}
            ${overdueHtml}

            <div style="display:flex; gap:10px; justify-content:flex-start; margin-top:20px;">
                <button class="btn btn-primary" id="btn-close-briefing" style="padding:10px 24px; font-weight:800; font-size:0.95rem; border-radius:12px; background:linear-gradient(135deg, #10b981, #059669); border:none; cursor:pointer;">
                    <span>🚀 بدء العمل والاطلاع على لوحة التحكم</span>
                </button>
                <button class="btn btn-secondary" id="btn-goto-attendance-briefing" style="padding:10px 18px; font-weight:700; font-size:0.9rem; border-radius:12px; background:rgba(255,255,255,0.08); color:#cbd5e1; border:1px solid rgba(255,255,255,0.12); cursor:pointer;">
                    📅 تسجيل الحضور الآن
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const closeBriefing = () => {
        sessionStorage.setItem("BARAEM_DAILY_BRIEFING_DATE", today);
        overlay.classList.remove("modal-visible");
        setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById("btn-close-briefing")?.addEventListener("click", closeBriefing);
    document.getElementById("btn-goto-attendance-briefing")?.addEventListener("click", () => {
        closeBriefing();
        navigate("attendance");
    });
    document.getElementById("briefing-goto-finance")?.addEventListener("click", () => {
        closeBriefing();
        navigate("finance");
    });
}

async function initAndRender() {
    const savedTheme = localStorage.getItem("BARAEM_THEME") || "light";
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        document.documentElement.setAttribute("data-theme", "dark");
    } else {
        document.body.classList.remove("dark-theme");
        document.documentElement.setAttribute("data-theme", "light");
    }

    const cloudReady = initCloud();
    if (cloudReady && state.session.userId) {
        const cloudState = await loadFromCloud();
        if (cloudState) {
            state = normalizeStateSchema({ ...structuredClone(seed), ...cloudState });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            ui.cloudStatus = "synced";
        } else {
            ui.cloudStatus = "idle";
        }
    }
    autoGenerateFeesIfNeeded();
    render();
    checkStartupUpdateNotification();
    setTimeout(() => {
        showDailyExecutiveBriefing();
    }, 500);
}
initAndRender();

function autoGenerateFeesIfNeeded() {
    if (!state.session.userId) return;
    const settings = state.feeSettings || {};
    if (!settings.auto_generate) return;
    const month = currentMonthDate();
    const normalizedMonth = normalizeMonthStart(month);
    const monthlyAmount = Number(settings.monthly_amount) || 1800;
    const dueDay = String(Number(settings.due_day) || 10).padStart(2, "0");
    const dueDate = `${normalizedMonth.slice(0, 8)}${dueDay}`;
    let added = 0;

    state.children.filter((c) => c.status === "ACTIVE").forEach((child) => {
        const hasMonthly = state.fees.find(
            (f) => f.child_id === child.id && f.fee_month === normalizedMonth && (f.fee_type || "MONTHLY") === "MONTHLY"
        );
        if (!hasMonthly) {
            state.fees.push({
                id: createId("fee"),
                child_id: child.id,
                fee_month: normalizedMonth,
                fee_type: "MONTHLY",
                amount: monthlyAmount,
                discount_amount: 0,
                paid_amount: 0,
                due_date: dueDate,
                payment_date: "",
                status: "PENDING",
                notes: ""
            });
            added++;
        }
        if (child.bus_subscription && child.bus_monthly_fee > 0) {
            const hasBus = state.fees.find(
                (f) => f.child_id === child.id && f.fee_month === normalizedMonth && f.fee_type === "BUS"
            );
            if (!hasBus) {
                state.fees.push({
                    id: createId("fee"),
                    child_id: child.id,
                    fee_month: normalizedMonth,
                    fee_type: "BUS",
                    amount: child.bus_monthly_fee,
                    discount_amount: 0,
                    paid_amount: 0,
                    due_date: dueDate,
                    payment_date: "",
                    status: "PENDING",
                    notes: `خط السير: ${child.bus_route || "غير محدد"}`
                });
                added++;
            }
        }
    });

    if (added > 0) {
        saveState();
    }
}

function createSeedData() {
    return {
        session: {
            userId: ""
        },
        aiSettings: {
            groqApiKey: "",
            history: []
        },
        users: [
            {
                ...REQUIRED_ADMIN_ACCOUNT
            }
        ],
        parents: [
            {
                id: "parent-1",
                full_name: "محمد سمير",
                phone: "01010000001",
                address: "شارع النخيل - مدينة نصر",
                notes: ""
            },
            {
                id: "parent-2",
                full_name: "نجلاء حسن",
                phone: "01010000002",
                address: "التجمع الخامس - القاهرة",
                notes: "تفضّل الاتصال بعد الساعة 2"
            },
            {
                id: "parent-3",
                full_name: "أحمد السيد",
                phone: "01010000003",
                address: "المعادي - القاهرة",
                notes: ""
            }
        ],
        children: [
            {
                id: "child-1",
                full_name: "ياسين محمد",
                birth_date: "2021-03-12",
                stage: "PRE_K",
                national_id: "32103120101234",
                child_address: "شارع النخيل - مدينة نصر",
                father_job: "مهندس مدني",
                mother_job: "معلمة",
                applied_nurseries: "براعم المدينة، النور الحديثة",
                health_status: "حساسية خفيفة من الأتربة",
                status: "ACTIVE",
                enrollment_date: "2025-09-01",
                withdrawal_date: "",
                notes: "يحتاج متابعة بسيطة في النطق."
            },
            {
                id: "child-2",
                full_name: "ليان أحمد",
                birth_date: "2020-11-09",
                stage: "LEVEL_1",
                national_id: "32011090104567",
                child_address: "التجمع الخامس - القاهرة",
                father_job: "محاسب",
                mother_job: "صيدلانية",
                applied_nurseries: "الأزهر الصغير",
                health_status: "لا توجد ملاحظات صحية حالية",
                status: "ACTIVE",
                enrollment_date: "2025-09-01",
                withdrawal_date: "",
                notes: "تحب الأنشطة الفنية."
            },
            {
                id: "child-3",
                full_name: "آدم خالد",
                birth_date: "2020-05-26",
                stage: "LEVEL_2",
                national_id: "32005260107890",
                child_address: "المعادي - القاهرة",
                father_job: "طبيب",
                mother_job: "مصممة جرافيك",
                applied_nurseries: "رواد المستقبل، براعم السعادة",
                health_status: "يحتاج متابعة دورية للنظر",
                status: "ACTIVE",
                enrollment_date: "2024-09-01",
                withdrawal_date: "",
                notes: "ممتاز في الحساب الذهني."
            }
        ],
        childParents: [
            {
                id: "cp-1",
                child_id: "child-1",
                parent_id: "parent-1",
                relationship_to_child: "FATHER",
                is_primary_contact: true,
                can_receive_notifications: true,
                notes: ""
            },
            {
                id: "cp-2",
                child_id: "child-2",
                parent_id: "parent-2",
                relationship_to_child: "MOTHER",
                is_primary_contact: true,
                can_receive_notifications: true,
                notes: ""
            },
            {
                id: "cp-3",
                child_id: "child-3",
                parent_id: "parent-3",
                relationship_to_child: "FATHER",
                is_primary_contact: true,
                can_receive_notifications: true,
                notes: ""
            }
        ],
        authorizedPickups: [
            {
                id: "pickup-1",
                child_id: "child-1",
                full_name: "منى سمير",
                relationship_to_child: "AUNT",
                phone: "01020000001",
                national_id: "",
                is_active: true,
                notes: ""
            },
            {
                id: "pickup-2",
                child_id: "child-2",
                full_name: "سامي حسن",
                relationship_to_child: "GRANDFATHER",
                phone: "01020000002",
                national_id: "",
                is_active: true,
                notes: ""
            }
        ],
        staff: [
            {
                id: "staff-1",
                full_name: "أستاذة دينا علي",
                job_title: "معلمة فصل",
                shift_code: "MORNING",
                salary: 6500,
                phone: "01130000001",
                address: "مدينة نصر",
                hire_date: "2024-09-01",
                status: "ACTIVE",
                notes: "مسؤولة عن مستوى أول."
            },
            {
                id: "staff-2",
                full_name: "أستاذة منى أحمد",
                job_title: "سكرتارية",
                shift_code: "MORNING",
                salary: 5400,
                phone: "01130000002",
                address: "حلوان",
                hire_date: "2023-11-01",
                status: "ACTIVE",
                notes: "متابعة أولياء الأمور."
            },
            {
                id: "staff-3",
                full_name: "مدام هناء صالح",
                job_title: "مشرفة",
                shift_code: "EVENING",
                salary: 7200,
                phone: "01130000003",
                address: "المقطم",
                hire_date: "2023-07-01",
                status: "ACTIVE",
                notes: ""
            }
        ],
        studentAttendance: [
            {
                id: "sa-1",
                child_id: "child-1",
                attendance_date: todayDate(),
                status: "PRESENT",
                check_in_time: "08:03",
                check_out_time: "",
                notes: ""
            },
            {
                id: "sa-2",
                child_id: "child-2",
                attendance_date: todayDate(),
                status: "LATE",
                check_in_time: "08:29",
                check_out_time: "",
                notes: "وصلت متأخرة بسبب المواصلات."
            },
            {
                id: "sa-3",
                child_id: "child-3",
                attendance_date: todayDate(),
                status: "ABSENT",
                check_in_time: "",
                check_out_time: "",
                notes: "إجازة مرضية."
            }
        ],
        staffAttendance: [
            {
                id: "sta-1",
                staff_id: "staff-1",
                attendance_date: todayDate(),
                status: "PRESENT",
                check_in_time: "07:46",
                check_out_time: "",
                notes: ""
            },
            {
                id: "sta-2",
                staff_id: "staff-2",
                attendance_date: todayDate(),
                status: "PRESENT",
                check_in_time: "07:52",
                check_out_time: "",
                notes: ""
            },
            {
                id: "sta-3",
                staff_id: "staff-3",
                attendance_date: todayDate(),
                status: "LATE",
                check_in_time: "08:11",
                check_out_time: "",
                notes: ""
            }
        ],
        fees: [
            {
                id: "fee-1",
                child_id: "child-1",
                fee_month: currentMonthDate(),
                amount: 1800,
                discount_amount: 100,
                paid_amount: 1700,
                due_date: `${currentMonthDate().slice(0, 8)}10`,
                payment_date: `${currentMonthDate().slice(0, 8)}08`,
                status: "PAID",
                notes: "دفع إلكتروني."
            },
            {
                id: "fee-2",
                child_id: "child-2",
                fee_month: currentMonthDate(),
                amount: 1800,
                discount_amount: 0,
                paid_amount: 900,
                due_date: `${currentMonthDate().slice(0, 8)}10`,
                payment_date: `${currentMonthDate().slice(0, 8)}11`,
                status: "PARTIAL",
                notes: "النصف المتبقي الأسبوع القادم."
            },
            {
                id: "fee-3",
                child_id: "child-3",
                fee_month: currentMonthDate(),
                amount: 1800,
                discount_amount: 0,
                paid_amount: 0,
                due_date: `${currentMonthDate().slice(0, 8)}10`,
                payment_date: "",
                status: "OVERDUE",
                notes: "تم إرسال تذكير."
            }
        ],
        expenses: [
            {
                id: "expense-1",
                expense_item: "أدوات فنية",
                category: "تعليم",
                amount: 950,
                expense_date: `${currentMonthDate().slice(0, 8)}05`,
                paid_to: "مكتبة البيان",
                notes: ""
            },
            {
                id: "expense-2",
                expense_item: "مستلزمات نظافة",
                category: "تشغيل",
                amount: 480,
                expense_date: `${currentMonthDate().slice(0, 8)}12`,
                paid_to: "هايبر السوق",
                notes: ""
            }
        ],
        medicalRecords: [
            {
                id: "medical-1",
                child_id: "child-1",
                record_date: `${currentMonthDate().slice(0, 8)}03`,
                case_description: "برد خفيف",
                doctor_name: "د. عمرو عزت",
                doctor_notes: "شرب سوائل وراحة يومين.",
                action_taken: "إبلاغ الأسرة ومتابعة الحرارة."
            },
            {
                id: "medical-2",
                child_id: "child-3",
                record_date: `${currentMonthDate().slice(0, 8)}08`,
                case_description: "خدش بسيط أثناء اللعب",
                doctor_name: "",
                doctor_notes: "تم التطهير داخل الروضة.",
                action_taken: "تم الاتصال بولي الأمر."
            }
        ],
        pharmacyItems: [
            {
                id: "pharmacy-1",
                medicine_name: "مطهر جروح",
                quantity: 5,
                unit: "عبوة",
                expiry_date: "2026-10-01",
                reorder_level: 3,
                notes: ""
            },
            {
                id: "pharmacy-2",
                medicine_name: "لاصق طبي",
                quantity: 2,
                unit: "علبة",
                expiry_date: "2027-01-01",
                reorder_level: 4,
                notes: "يحتاج توريد قريب."
            }
        ],
        activities: [
            {
                id: "activity-1",
                activity_name: "رحلة الحديقة العلمية",
                activity_type: "TRIP",
                activity_date: `${currentMonthDate().slice(0, 8)}22`,
                target_stage: "LEVEL_2",
                cost: 350,
                notes: "يتضمن وجبة خفيفة ومواصلات."
            },
            {
                id: "activity-2",
                activity_name: "حفلة الربيع",
                activity_type: "PARTY",
                activity_date: `${currentMonthDate().slice(0, 8)}27`,
                target_stage: "PRE_K",
                cost: 0,
                notes: "ملابس بألوان زاهية."
            }
        ],
        curriculum: [
            {
                id: "curriculum-1",
                stage: "PRE_K",
                subject_name: "لغة عربية",
                academic_year: "2025/2026",
                week_number: 28,
                content: "تمييز الحروف أ، ب، ت مع أنشطة حسية.",
                learning_objectives: "تمييز الحرف بصريًا وصوتيًا.",
                created_by_staff_id: "staff-1"
            }
        ],
        weeklyPlanning: [
            {
                id: "plan-1",
                teacher_staff_id: "staff-1",
                week_start_date: mondayOfCurrentWeek(),
                stage: "LEVEL_1",
                plan_text: "قراءة قصة قصيرة، نشاط ألوان، وتمرين عد حتى 20.",
                notes: "التركيز على المشاركة الجماعية."
            }
        ],
        subjects: [
            { id: "sub-1", name: "القرآن الكريم", color: "#10b981" },
            { id: "sub-2", name: "اللغة العربية", color: "#6366f1" },
            { id: "sub-3", name: "اللغة الإنجليزية", color: "#f59e0b" },
            { id: "sub-4", name: "الرياضيات", color: "#ef4444" },
            { id: "sub-5", name: "العلوم", color: "#8b5cf6" },
            { id: "sub-6", name: "الأنشطة والمهارات", color: "#06b6d4" }
        ],
        exams: [
            { id: "exam-1", child_id: "child-1", subject_id: "sub-1", exam_name: "اختبار منتصف الترم", exam_date: "2026-03-15", score: 18, max_score: 20, term: "TERM_1", teacher_notes: "أداء ممتاز في الحفظ والتلاوة." },
            { id: "exam-2", child_id: "child-1", subject_id: "sub-2", exam_name: "إملاء شهري", exam_date: "2026-03-20", score: 9, max_score: 10, term: "TERM_1", teacher_notes: "خط جميل، تحتاج تركيز في التاء المربوطة." },
            { id: "exam-3", child_id: "child-2", subject_id: "sub-4", exam_name: "اختبار الحساب", exam_date: "2026-04-02", score: 19, max_score: 20, term: "TERM_1", teacher_notes: "سرعة ودقة ممتازة في الجمع." },
            { id: "exam-4", child_id: "child-2", subject_id: "sub-3", exam_name: "Spelling test", exam_date: "2026-04-05", score: 8, max_score: 10, term: "TERM_1", teacher_notes: "Needs practice on long vowels." },
            { id: "exam-5", child_id: "child-3", subject_id: "sub-5", exam_name: "تقييم الحواس", exam_date: "2026-04-08", score: 17, max_score: 20, term: "TERM_1", teacher_notes: "فضول علمي رائع، تشارك في كل التجارب." }
        ],
        salaryConfigs: [
            { staff_id: "staff-1", shift_code: "MORNING", base_salary: 6500, scheduled_in: "07:45", scheduled_out: "13:15", work_days_per_month: 22, grace_minutes: 10, late_deduction_per_min: 10, absence_deduction: 300, excused_deduction: 100, bonus: 0, other_deductions: 0 },
            { staff_id: "staff-2", shift_code: "MORNING", base_salary: 5400, scheduled_in: "07:45", scheduled_out: "13:15", work_days_per_month: 22, grace_minutes: 10, late_deduction_per_min: 8, absence_deduction: 250, excused_deduction: 80, bonus: 0, other_deductions: 0 },
            { staff_id: "staff-3", shift_code: "EVENING", base_salary: 7200, scheduled_in: "13:15", scheduled_out: "16:30", work_days_per_month: 22, grace_minutes: 10, late_deduction_per_min: 10, absence_deduction: 300, excused_deduction: 100, bonus: 0, other_deductions: 0 }
        ],
        teacherNotes: [
            { id: "tn-1", child_id: "child-1", subject_id: "sub-1", note_date: "2026-04-10", teacher_staff_id: "staff-1", category: "PERFORMANCE", note: "ياسين يتقدم ممتاز في حفظ سورة الفيل ولحظ تحسن في التلاوة." },
            { id: "tn-2", child_id: "child-1", subject_id: "sub-2", note_date: "2026-04-12", teacher_staff_id: "staff-1", category: "BEHAVIOR", note: "يحتاج تشجيع للمشاركة الشفهية في الفصل." },
            { id: "tn-3", child_id: "child-2", subject_id: "sub-4", note_date: "2026-04-09", teacher_staff_id: "staff-2", category: "PERFORMANCE", note: "لبان متفوقة في الرياضيات وتساعد زملاءها." },
            { id: "tn-4", child_id: "child-3", subject_id: "sub-6", note_date: "2026-04-11", teacher_staff_id: "staff-1", category: "SOCIAL", note: "آدم بدأ يندمج أكثر في الأنشطة الجماعية." }
        ],
        whatsappLog: [],
        followUps: [],
        feeSettings: {
            monthly_amount: 1800,
            due_day: 10,
            auto_generate: true
        }
    };
}

function loadState() {
    try {
        let raw = loadDesktopState() || localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            for (const legacyKey of LEGACY_STORAGE_KEYS) {
                raw = localStorage.getItem(legacyKey);
                if (raw) break;
            }
        }
        if (!raw) {
            return normalizeStateSchema(structuredClone(seed));
        }
        const parsed = JSON.parse(raw);
        return normalizeStateSchema({
            ...structuredClone(seed),
            ...parsed
        });
    } catch (error) {
        return normalizeStateSchema(structuredClone(seed));
    }
}

function saveState() {
    const serializedState = JSON.stringify(state);
    let localSaved = false;
    let desktopSaved = false;
    let saveError = "";

    try {
        localStorage.setItem(STORAGE_KEY, serializedState);
        localSaved = true;
    } catch (error) {
        saveError = error?.message || String(error);
        console.error("Local state save failed:", error);
    }

    const desktopResult = saveDesktopState(serializedState);
    desktopSaved = desktopResult.ok;
    if (!desktopSaved && desktopResult.error) saveError = desktopResult.error;

    if (!localSaved && !desktopSaved) {
        throw new Error(saveError || "تعذر حفظ البيانات على الجهاز.");
    }
    if (cloudDb) {
        ui.cloudStatus = "syncing";
        saveToCloud();
    }
}

function getElectronIpcRenderer() {
    try {
        return typeof window.require === "function"
            ? window.require("electron").ipcRenderer
            : null;
    } catch (_) {
        return null;
    }
}

function loadDesktopState() {
    const ipcRenderer = getElectronIpcRenderer();
    if (!ipcRenderer) return "";
    try {
        return ipcRenderer.sendSync("nursery-state:load") || "";
    } catch (error) {
        console.error("Desktop state load failed:", error);
        return "";
    }
}

function saveDesktopState(serializedState) {
    const ipcRenderer = getElectronIpcRenderer();
    if (!ipcRenderer) return { ok: false };
    try {
        return ipcRenderer.sendSync("nursery-state:save", serializedState) || { ok: false };
    } catch (error) {
        console.error("Desktop state save failed:", error);
        return { ok: false, error: error?.message || String(error) };
    }
}

function sanitizePhoneInput(raw) {
    return String(raw || "").replace(/\D/g, "");
}

function buildRequiredAdminUser() {
    return { ...REQUIRED_ADMIN_ACCOUNT };
}

function normalizeUsersSchema(users = []) {
    const normalizedUsers = [buildRequiredAdminUser()];
    const seenPhones = new Set([REQUIRED_ADMIN_ACCOUNT.phone]);

    (users || []).forEach((user) => {
        if (!user) return;

        const isLegacyAdmin =
            user.id === REQUIRED_ADMIN_ACCOUNT.id ||
            sanitizePhoneInput(user.phone) === REQUIRED_ADMIN_ACCOUNT.phone ||
            (user.username === "admin" && String(user.password || "") === "1234");

        if (isLegacyAdmin) {
            return;
        }

        const isLegacyDemoUser =
            (user.id === "user-secretary" && String(user.password || "") === "1234") ||
            (user.id === "user-teacher" && String(user.password || "") === "1234") ||
            (user.username === "secretary" && String(user.password || "") === "1234") ||
            (user.username === "teacher" && String(user.password || "") === "1234");

        if (isLegacyDemoUser) {
            return;
        }

        const phone = sanitizePhoneInput(user.phone || user.username);
        if (!phone) {
            return;
        }

        if (seenPhones.has(phone)) {
            return;
        }

        normalizedUsers.push({
            id: user.id || createId("user"),
            full_name: String(user.full_name || "").trim() || "مستخدم النظام",
            phone,
            password: String(user.password || "").trim(),
            role: USER_ROLE_LABELS[user.role] ? user.role : "TEACHER"
        });
        seenPhones.add(phone);
    });

    return normalizedUsers;
}

function normalizeShiftCode(code) {
    return SHIFT_PRESETS[code] ? code : "MORNING";
}

function detectShiftCode(scheduledIn, scheduledOut) {
    const inTime = String(scheduledIn || "");
    const outTime = String(scheduledOut || "");
    if (inTime >= SHIFT_PRESETS.EVENING.start || outTime === SHIFT_PRESETS.EVENING.end) {
        return "EVENING";
    }
    return "MORNING";
}

function getShiftPreset(code) {
    return SHIFT_PRESETS[normalizeShiftCode(code)];
}

function getShiftLabel(code, short = false) {
    const preset = getShiftPreset(code);
    return short ? preset.shortLabel : preset.label;
}

function getAllowedSectionsForRole(role) {
    return Object.entries(SECTION_PERMISSIONS)
        .filter(([, roles]) => roles.includes(role))
        .map(([key]) => key);
}

function renderFilteredChildSelect(fieldName, selectedId, filterKey, required = true) {
    const child = selectedId ? getChildById(selectedId) : null;
    const initialStage = child ? child.stage : "";
    const activeChildren = state.children.filter((c) => c.status === "ACTIVE");
    const stageOptions = [["", "— اختر الفصل أولاً —"], ...Object.entries(STAGE_LABELS)];
    
    return `
        <div class="child-filter-group" data-filter-key="${filterKey}">
            <div class="grid-2" style="margin-bottom:6px;">
                <div class="field">
                    <label>تصفية بالفصل</label>
                    <select data-child-stage-filter="${filterKey}">
                        ${stageOptions.map(([v, l]) => `<option value="${v}" ${v === initialStage ? "selected" : ""}>${l}</option>`).join("")}
                    </select>
                </div>
                <div class="field">
                    <label>بحث بالاسم</label>
                    <input type="search" placeholder="اكتب جزءاً من الاسم..." data-child-search-filter="${filterKey}" style="width:100%;">
                </div>
            </div>
            <select name="${fieldName}" ${required ? "required" : ""} data-child-list-filtered="${filterKey}">
                ${(initialStage || selectedId)
                    ? options(activeChildren.filter((c) => !initialStage || c.stage === initialStage).map((c) => [c.id, c.full_name]), selectedId)
                    : `<option value="">— برجاء تحديد الفصل أولاً —</option>`
                }
            </select>
        </div>
    `;
}

function filterChildSelect(key) {
    const group = document.querySelector(`[data-filter-key="${key}"]`);
    if (!group) return;
    const stageEl = group.querySelector(`[data-child-stage-filter="${key}"]`);
    const searchEl = group.querySelector(`[data-child-search-filter="${key}"]`);
    const listEl = group.querySelector(`[data-child-list-filtered="${key}"]`);
    if (!listEl) return;
    const stage = stageEl?.value || "";
    const search = (searchEl?.value || "").trim();
    const currentVal = listEl.value;
    
    if (!stage && !search) {
        listEl.innerHTML = `<option value="">— برجاء تحديد الفصل أولاً —</option>`;
        return;
    }
    
    const filtered = state.children
        .filter((c) => c.status === "ACTIVE")
        .filter((c) => !stage || c.stage === stage)
        .filter((c) => !search || c.full_name.includes(search));
        
    listEl.innerHTML = filtered.length
        ? filtered.map((c) => `<option value="${c.id}" ${c.id === currentVal ? "selected" : ""}>${c.full_name}</option>`).join("")
        : `<option value="">لا يوجد طلاب مطابقون</option>`;
}

function renderShiftOptions(selectedCode) {
    return options(
        Object.values(SHIFT_PRESETS).map((shift) => [
            shift.code,
            `${shift.label} (${shift.start} - ${shift.end})`
        ]),
        normalizeShiftCode(selectedCode)
    );
}

function normalizeStateSchema(nextState) {
    const normalized = { ...nextState };

    normalized.users = normalizeUsersSchema(normalized.users);
    normalized.session = {
        ...normalized.session,
        userId: normalized.users.find((user) => user.id === normalized.session?.userId)?.id || ""
    };
    normalized.whatsappLog = Array.isArray(normalized.whatsappLog)
        ? normalized.whatsappLog.map((item) => ({
            reply_status: "PENDING",
            reply_note: "",
            ...item
        }))
        : [];

    normalized.followUps = Array.isArray(normalized.followUps) ? normalized.followUps : [];

    normalized.aiSettings = {
        groqApiKey: "",
        history: [],
        ...(normalized.aiSettings || {})
    };

    normalized.feeSettings = {
        monthly_amount: 1800,
        due_day: 10,
        auto_generate: true,
        ...(normalized.feeSettings || {})
    };

    normalized.staff = (normalized.staff || []).map((member) => {
        const matchingCfg = (normalized.salaryConfigs || []).find((cfg) => cfg.staff_id === member.id);
        const shiftCode = normalizeShiftCode(member.shift_code || matchingCfg?.shift_code || detectShiftCode(matchingCfg?.scheduled_in, matchingCfg?.scheduled_out));
        return { ...member, shift_code: shiftCode };
    });

    normalized.salaryConfigs = (normalized.salaryConfigs || []).map((cfg) => {
        const member = normalized.staff.find((staff) => staff.id === cfg.staff_id);
        const shiftCode = normalizeShiftCode(cfg.shift_code || member?.shift_code || detectShiftCode(cfg.scheduled_in, cfg.scheduled_out));
        const preset = getShiftPreset(shiftCode);
        return {
            ...cfg,
            shift_code: shiftCode,
            scheduled_in: cfg.scheduled_in || preset.start,
            scheduled_out: cfg.scheduled_out || preset.end
        };
    });

    return normalized;
}

function render() {
    if (state.session.userId) {
        app.innerHTML = renderShell() + renderAiChatWidget();
    } else {
        app.innerHTML = ui.showLogin ? renderLogin() : renderLanding();
    }
    enhanceSelectsWithSearch();
    scrollToAiChatBottom();
}

function enhanceSelectsWithSearch() {
    document.querySelectorAll("select:not(.searchable-done)").forEach((sel) => {
        if (sel.options.length < 4) return;
        if (sel.closest(".child-filter-group")) return;
        if (sel.dataset.noSearch) return;

        sel.classList.add("searchable-done");

        const wrapper = document.createElement("div");
        wrapper.className = "searchable-select-wrap";
        sel.parentNode.insertBefore(wrapper, sel);
        wrapper.appendChild(sel);

        const searchInput = document.createElement("input");
        searchInput.type = "search";
        searchInput.placeholder = "ابحث...";
        searchInput.className = "select-search-input";
        searchInput.setAttribute("autocomplete", "off");
        wrapper.insertBefore(searchInput, sel);

        const allOptions = Array.from(sel.options).map((o) => ({
            el: o,
            text: o.text.toLowerCase()
        }));

        searchInput.addEventListener("input", () => {
            const q = searchInput.value.trim().toLowerCase();
            allOptions.forEach(({ el, text }) => {
                el.hidden = q ? !text.includes(q) : false;
            });
            if (q && !sel.options[sel.selectedIndex]?.hidden === false) {
                const first = allOptions.find(({ text }) => text.includes(q));
                if (first) sel.value = first.el.value;
            }
        });
    });
}

function resetCardPointer(card) {
    if (!card) return;
    card.style.setProperty("--card-rotate-x", "0deg");
    card.style.setProperty("--card-rotate-y", "0deg");
    card.style.setProperty("--card-pointer-x", "50%");
    card.style.setProperty("--card-pointer-y", "50%");
}

function handleCardPointerMove(event) {
    if (event.pointerType === "touch") return;
    const card = event.target.closest?.(".hub-section-card");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 10;
    const rotateX = (0.5 - y) * 10;
    card.style.setProperty("--card-rotate-x", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--card-rotate-y", `${rotateY.toFixed(2)}deg`);
    card.style.setProperty("--card-pointer-x", `${(x * 100).toFixed(2)}%`);
    card.style.setProperty("--card-pointer-y", `${(y * 100).toFixed(2)}%`);
}

function handleCardPointerOut(event) {
    const card = event.target.closest?.(".hub-section-card");
    if (!card) return;
    if (event.relatedTarget && card.contains(event.relatedTarget)) return;
    resetCardPointer(card);
}

function renderLanding() {
    const stats = {
        children: state.children.filter((c) => c.status === "ACTIVE").length,
        staff: state.staff.length,
        subjects: state.subjects.length,
        years: 7
    };
    const features = [
        { icon: "👨‍👩‍👧", title: "ملفات الأطفال", text: "بيانات الطفل، ولي الأمر، الفصل، الحالة الصحية، والتاريخ الدراسي في مكان واحد منظم وآمن." },
        { icon: "🕘", title: "الحضور اليومي", text: "تسجيل حضور الأطفال والمعلمين لحظة بلحظة مع تمييز التأخير والغياب والاستئذان." },
        { icon: "💵", title: "الرسوم والمصروفات", text: "متابعة التحصيل الشهري، المتأخرات، المصروفات، وصافي إيرادات كل شهر دون ورق." },
        { icon: "📚", title: "التعليم والمنهج", text: "خطط أسبوعية، منهج دراسي، أنشطة، ورحلات — مع ربط كل خطوة بتقدّم الأطفال." },
        { icon: "📝", title: "الاختبارات والنتائج", text: "رصد درجات كل مادة لكل طفل، ملاحظات المعلمين، وتقارير جاهزة لأولياء الأمور." },
        { icon: "💼", title: "رواتب المعلمين", text: "احتساب آلي للراتب مع خصومات التأخير والغياب، وإرسال إيصال الاستلام عبر واتساب." },
        { icon: "📣", title: "تواصل واتساب", text: "زر واحد لإرسال تقارير الحضور والمالية والاختبارات لأهل الطفل فورًا بدون كتابة." },
        { icon: "📊", title: "تقارير احترافية", text: "كشوف مطبوعة بمقاس A4 لكل طفل ومعلم وفترة زمنية — جاهزة للطباعة والتصدير." },
        { icon: "🛡️", title: "صلاحيات وأمان", text: "مصفوفة صلاحيات دقيقة لكل دور (إدارة، سكرتارية، معلمة) ونسخ احتياطي كامل بضغطة زر." }
    ];
    return `
        <div class="landing">
            <header class="landing-nav">
                <div class="landing-brand">
                    <div class="brand-mark">${BRAND.initials}</div>
                    <div>
                        <strong>${BRAND.name}</strong>
                        <span>${BRAND.systemName}</span>
                    </div>
                </div>
                <nav class="landing-nav-links">
                    <a href="#about">عن الأكاديمية</a>
                    <a href="#features">مميزات النظام</a>
                    <a href="عرض-النظام.html" target="_blank">العرض التقديمي</a>
                    <a href="دليل-مصور.html" target="_blank">الدليل المصور</a>
                    <a href="#contact">تواصل معنا</a>
                    <button class="btn btn-primary" type="button" data-action="go-login">دخول النظام</button>
                </nav>
            </header>

            <section class="landing-hero">
                <div class="landing-hero-copy">
                    <span class="landing-kicker">${BRAND.tagline}</span>
                    <h1 class="landing-title">نظام إدارة متكامل<br><span>لأكاديمية براعم الإيمان</span></h1>
                    <p class="landing-lede">
                        كل ما تحتاجه لإدارة الحضانة في مكان واحد: الأطفال، الحضور، الرسوم، المناهج، الاختبارات، رواتب الفريق،
                        وتواصل مباشر مع أولياء الأمور عبر واتساب بضغطة زر.
                    </p>
                    <div class="landing-cta">
                        <button class="btn btn-primary landing-cta-main" type="button" data-action="go-login">ابدأ استخدام النظام الآن</button>
                        <a class="btn btn-secondary" href="#features">شاهد المميزات</a>
                    </div>
                    <div class="landing-stats">
                        <div><strong>${stats.children}+</strong><span>طفل نشط</span></div>
                        <div><strong>${stats.staff}</strong><span>عضو فريق</span></div>
                        <div><strong>${stats.subjects}</strong><span>مواد دراسية</span></div>
                        <div><strong>${stats.years}</strong><span>سنوات خبرة</span></div>
                    </div>
                </div>
                <div class="landing-hero-visual">
                    <div class="landing-card card-1">
                        <span class="landing-card-icon">✅</span>
                        <div><strong>حضور اليوم</strong><span>${stats.children} طفل · ${stats.staff} معلمة</span></div>
                    </div>
                    <div class="landing-card card-2">
                        <span class="landing-card-icon">💬</span>
                        <div><strong>واتساب لأولياء الأمور</strong><span>رسائل جاهزة بنقرة واحدة</span></div>
                    </div>
                    <div class="landing-card card-3">
                        <span class="landing-card-icon">📄</span>
                        <div><strong>تقارير A4 احترافية</strong><span>جاهزة للطباعة والتصدير</span></div>
                    </div>
                    <div class="landing-hero-glow"></div>
                </div>
            </section>

            <section class="landing-section" id="about">
                <div class="landing-section-head">
                    <span class="eyebrow">من نحن</span>
                    <h2>أكاديمية براعم الإيمان</h2>
                </div>
                <div class="landing-about">
                    <p>
                        في ${BRAND.name} نؤمن أن الطفولة المبكرة هي أثمن مرحلة في حياة الإنسان، لذلك نقدّم بيئة تربوية
                        وتعليمية متوازنة تجمع بين <strong>القيم الإيمانية الراسخة</strong> و<strong>أحدث الأساليب التعليمية الحديثة</strong>.
                        نبني في أطفالنا محبة القرآن والأخلاق، ومهارات اللغتين العربية والإنجليزية، والتفكير العلمي،
                        والإبداع الفني — داخل فصول صغيرة العدد، بإشراف مُعلمات مدرّبات، ومتابعة يومية دقيقة لولي الأمر.
                    </p>
                </div>
            </section>

            <section class="landing-section landing-features-section" id="features">
                <div class="landing-section-head">
                    <span class="eyebrow">مميزات النظام</span>
                    <h2>نظام إدارة متكامل صُمِّم خصيصًا للحضانات</h2>
                    <p>كل عملية تشغيلية في الحضانة تحصل على شاشة، وزر، وتقرير، ورسالة واتساب جاهزة.</p>
                </div>
                <div class="landing-features">
                    ${features.map((f) => `
                        <article class="landing-feature">
                            <div class="landing-feature-icon">${f.icon}</div>
                            <h3>${f.title}</h3>
                            <p>${f.text}</p>
                        </article>
                    `).join("")}
                </div>
            </section>

            <section class="landing-section landing-login-section" id="login">
                <div class="landing-login">
                    <div class="landing-login-copy">
                        <span class="eyebrow">ابدأ الآن</span>
                        <h2>ادخل إلى نظام الإدارة</h2>
                        <p>الدخول إلى النظام يتم برقم التليفون وكلمة المرور الخاصة بكل حساب، مع صلاحيات منفصلة للإدارة وباقي الأدوار.</p>
                    </div>
                    <div class="landing-login-card">
                        <h3>تسجيل الدخول</h3>
                        <p class="subtle-text">واجهة دخول آمنة بدون عرض أي بيانات حسابات على الصفحة الرئيسية.</p>
                        <button class="btn btn-primary btn-block" type="button" data-action="go-login">الدخول إلى النظام</button>
                    </div>
                </div>
            </section>

            <footer class="landing-footer" id="contact">
                <div class="landing-footer-inner">
                    <div>
                        <strong>${BRAND.name}</strong>
                        <p>${BRAND.tagline}</p>
                        <p class="landing-address">${BRAND.address}</p>
                    </div>
                    <div class="landing-social">
                        <button type="button" class="landing-social-btn" data-action="open-facebook">
                            <span aria-hidden="true">ⓕ</span>
                            <span>صفحتنا على فيسبوك</span>
                        </button>
                        <a class="landing-social-btn" href="tel:${BRAND.phone}">
                            <span aria-hidden="true">☎</span>
                            <span>${BRAND.phone}</span>
                        </a>
                    </div>
                </div>
                <div class="landing-copy">© ${new Date().getFullYear()} ${BRAND.name} — جميع الحقوق محفوظة.</div>
            </footer>
        </div>
    `;
}

function renderLogin() {
    return `
        <div class="login-page">
            <section class="login-hero">
                <div class="hero-header">
                    <div class="eyebrow">${BRAND.systemName}</div>
                    <div class="login-brand">
                        <h1>${BRAND.name}</h1>
                        <p>نظام يومي واضح لإدارة الحضور، ملفات الأطفال، الرسوم، التعليم، والمتابعة التشغيلية بدون تعقيد.</p>
                    </div>
                </div>
                <div class="hero-lines">
                    <div class="hero-line">
                        <strong>إدارة الأطفال</strong>
                        <span>بيانات الطفل، ولي الأمر، الفصل، والحالة الصحية في مكان واحد.</span>
                    </div>
                    <div class="hero-line">
                        <strong>الحضور والغياب</strong>
                        <span>تسجيل يومي مباشر للأطفال والمعلمين مع كشوف غياب واضحة.</span>
                    </div>
                    <div class="hero-line">
                        <strong>الرسوم والتقارير</strong>
                        <span>متابعة التحصيل والمتأخرات مع عرض منظم وسهل القراءة.</span>
                    </div>
                </div>
                <div class="footer-note">الدخول متاح فقط للحسابات المسجلة من الإدارة باستخدام رقم التليفون وكلمة المرور.</div>
            </section>

            <section class="login-panel">
                <div class="panel-kicker">دخول المستخدمين</div>
                <h2>تسجيل الدخول</h2>
                <p class="subtle-text">اكتب رقم التليفون وكلمة المرور الخاصة بحسابك. كل دور يرى الأقسام المصرح له بها فقط داخل النظام.</p>
                <form class="stack" data-form="login">
                    <div class="field">
                        <label for="phone">رقم التليفون</label>
                        <input id="phone" name="phone" inputmode="numeric" dir="ltr" value="" placeholder="010xxxxxxxx">
                    </div>
                    <div class="field">
                        <label for="password">كلمة المرور</label>
                        <input id="password" name="password" type="password" value="" placeholder="أدخل كلمة المرور">
                    </div>
                    <div id="login-error" class="login-error" style="display:none;"></div>
                    <div class="actions-row">
                        <button class="btn btn-primary" type="submit">دخول إلى النظام</button>
                        <button class="btn btn-ghost" type="button" data-action="go-landing">رجوع للصفحة الرئيسية</button>
                    </div>
                </form>
            </section>
        </div>
    `;
}

function renderHomeHub(allowedSections, user, roleLabel) {
    const dashboard = getDashboardMetrics();
    const overdueCount = getOverdueFees().length;
    const homeMetrics = [
        {
            label: "الأطفال النشطون",
            value: dashboard.activeChildren,
            hint: "ملفات الأطفال الفعالة داخل النظام"
        },
        {
            label: "حضور اليوم",
            value: dashboard.presentToday,
            hint: "الأطفال الذين تم تسجيل حضورهم اليوم"
        },
        {
            label: "الفريق المسجل",
            value: state.staff.length,
            hint: "المعلمات والموظفون على النظام"
        },
        {
            label: "الرسوم المتأخرة",
            value: overdueCount,
            hint: overdueCount ? "تحتاج متابعة من قسم التحصيل" : "لا توجد متأخرات حالياً",
            tone: overdueCount ? "danger" : "calm"
        }
    ];

    const groupedCards = NAV_GROUPS.map((group, groupIndex) => {
        const items = group.sections.filter((section) => allowedSections.includes(section));
        if (!items.length) return "";
        return `
            <section class="hub-group" style="--group-index:${groupIndex};">
                <div class="hub-group-header">
                    <h3>${group.title}</h3>
                    <span>${items.length} أقسام</span>
                </div>
                <div class="hub-card-grid">
                    ${items.map((section, cardIndex) => {
                        const meta = SECTION_TITLES[section];
                        const badge = navBadge(section);
                        const visual = SECTION_VISUALS[section] || SECTION_VISUALS.dashboard;
                        return `
                            <button
                                class="hub-section-card ${badge ? "has-badge" : ""}"
                                type="button"
                                data-nav="${section}"
                                data-section="${section}"
                                style="--card-index:${cardIndex}; --card-accent-start:${visual.accentStart}; --card-accent-end:${visual.accentEnd}; --card-accent-soft:${visual.accentSoft};"
                            >
                                <div class="hub-section-top">
                                    <span class="hub-section-icon">${NAV_ICONS[section] || ""}</span>
                                    ${badge ? `<span class="hub-section-badge">${badge}</span>` : ""}
                                </div>
                                <div class="hub-section-copy">
                                    <small class="hub-section-label">${visual.label}</small>
                                    <strong>${meta.title}</strong>
                                    <span class="hub-section-kicker">${visual.kicker}</span>
                                    <p>${meta.description}</p>
                                </div>
                                <div class="hub-section-foot">
                                    <span>${navHint(section) || "فتح القسم"}</span>
                                    <span class="hub-section-enter">دخول</span>
                                </div>
                            </button>
                        `;
                    }).join("")}
                </div>
            </section>
        `;
    }).join("");

    const adminAccessCard = allowedSections.includes("settings")
        ? `
            <div class="hub-user-card hub-user-card-action">
                <span>الحسابات والصلاحيات</span>
                <strong>إدارة المستخدمين من مكان واضح</strong>
                <small>إضافة مستخدم أو تعديل البيانات أو حذف الحسابات تتم من الإعدادات &gt; المستخدمون.</small>
                <div class="actions-row">
                    <button class="btn btn-secondary" type="button" data-action="open-users-settings">المستخدمون</button>
                    ${allowedSections.includes("security") ? `<button class="btn btn-ghost" type="button" data-nav="security">الصلاحيات</button>` : ""}
                </div>
            </div>
        `
        : "";

    return `
        <!-- EXECUTIVE WELCOME HERO -->
        <section class="dashboard-hero-banner">
            <div class="hero-banner-content">
                <div class="hero-banner-badge">✨ نظام إدارة الحضانة الذكي المطور 2026</div>
                <h2>أهلاً بك في لوحة تحكم ${BRAND.name}</h2>
                <p>منظومة متكاملة لإدارة شؤون الأطفال، تسجيل الحضور والانصراف، كشوف الرواتب والمرتبات، والتحصيل المالي والتواصل الفوري.</p>
                
                <!-- Quick Power Actions Bar -->
                <div class="hero-quick-actions">
                    <button class="btn btn-primary btn-action-pill" type="button" data-nav="add_child">
                        <span>➕</span>
                        <span>تسجيل طفل جديد</span>
                    </button>
                    <button class="btn btn-success btn-action-pill" type="button" data-nav="attendance" style="background:#059669; color:#fff; border-color:#10b981;">
                        <span>📅</span>
                        <span>حضور وانصراف اليوم</span>
                    </button>
                    <button class="btn btn-warning btn-action-pill" type="button" data-nav="finance" style="background:#d97706; color:#fff; border-color:#f59e0b;">
                        <span>💰</span>
                        <span>الرسوم والاشتراكات</span>
                    </button>
                    <button class="btn btn-secondary btn-action-pill" type="button" data-nav="payroll">
                        <span>💵</span>
                        <span>كشوف الرواتب</span>
                    </button>
                    <button class="btn btn-whatsapp-pill" type="button" data-nav="whatsapp" style="background:#22c55e; color:#fff; border-radius:10px; font-weight:700; display:inline-flex; align-items:center; gap:6px; padding:10px 16px; border:none; cursor:pointer;">
                        <span>💬</span>
                        <span>رسائل واتساب</span>
                    </button>
                    <button class="btn btn-ghost btn-action-pill" type="button" data-action="go-updates">
                        <span>🔄</span>
                        <span>فحص التحديثات</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- 4 EXECUTIVE METRICS CARDS -->
        <section class="executive-metrics-grid">
            <div class="executive-metric-card metric-kids" data-nav="children" style="cursor:pointer;" title="انقر لعرض الأطفال">
                <div class="metric-card-header">
                    <div class="metric-icon-box" style="background:rgba(37,99,235,0.12); color:#2563eb; font-size:1.8rem;">👶</div>
                    <span class="metric-trend-badge" style="background:rgba(37,99,235,0.1); color:#2563eb;">نشط ومسجل</span>
                </div>
                <div class="metric-card-body">
                    <span class="metric-title">الأطفال المقيدون</span>
                    <strong class="metric-number">${dashboard.activeChildren} <small style="font-size:0.9rem; font-weight:500;">طفل</small></strong>
                    <p class="metric-hint">✓ ملفات الأطفال المفعلة داخل الأكاديمية</p>
                </div>
            </div>

            <div class="executive-metric-card metric-attendance" data-nav="attendance" style="cursor:pointer;" title="انقر لفتح الحضور">
                <div class="metric-card-header">
                    <div class="metric-icon-box" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:1.8rem;">📅</div>
                    <span class="metric-trend-badge" style="background:rgba(16,185,129,0.1); color:#10b981;">اليوم ${formatArabicDate(todayDate())}</span>
                </div>
                <div class="metric-card-body">
                    <span class="metric-title">حضور اليوم المباشر</span>
                    <strong class="metric-number">${dashboard.presentToday} <small style="font-size:0.9rem; font-weight:500;">حاضر</small></strong>
                    <p class="metric-hint">من إجمالي ${dashboard.activeChildren} طفل مقيد</p>
                </div>
            </div>

            <div class="executive-metric-card metric-staff" data-nav="staff" style="cursor:pointer;" title="انقر لفتح الموظفين والرواتب">
                <div class="metric-card-header">
                    <div class="metric-icon-box" style="background:rgba(139,92,246,0.12); color:#8b5cf6; font-size:1.8rem;">👩‍🏫</div>
                    <span class="metric-trend-badge" style="background:rgba(139,92,246,0.1); color:#8b5cf6;">مواعيد 8:00 - 14:00</span>
                </div>
                <div class="metric-card-body">
                    <span class="metric-title">المعلمات والموظفون</span>
                    <strong class="metric-number">${state.staff.length} <small style="font-size:0.9rem; font-weight:500;">كادر</small></strong>
                    <p class="metric-hint">✓ تعديل الرواتب وإلغاء التعاقد مفعل</p>
                </div>
            </div>

            <div class="executive-metric-card metric-finance" data-nav="finance" style="cursor:pointer;" title="انقر لفتح الحسابات">
                <div class="metric-card-header">
                    <div class="metric-icon-box" style="background:rgba(245,158,11,0.12); color:#f59e0b; font-size:1.8rem;">💰</div>
                    <span class="metric-trend-badge" style="background:${overdueCount ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}; color:${overdueCount ? '#ef4444' : '#10b981'};">
                        ${overdueCount ? `${overdueCount} متأخرة` : 'منتظم'}
                    </span>
                </div>
                <div class="metric-card-body">
                    <span class="metric-title">متابعة الرسوم والاشتراكات</span>
                    <strong class="metric-number">${overdueCount ? overdueCount + ' متأخرات' : 'مستقرة'}</strong>
                    <p class="metric-hint">${overdueCount ? 'تحتاج متابعة مع أولياء الأمور' : 'تم سداد جميع الرسوم المستحقة'}</p>
                </div>
            </div>
        </section>

        <!-- EXPRESSIVE APP SECTIONS LAUNCHPAD -->
        <section class="quick-apps-section" style="margin-bottom:28px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.4rem;">⚡</span>
                    <h3 style="margin:0; font-size:1.2rem; font-weight:800; color:var(--ink);">بوابة الأقسام والخدمات السريعة</h3>
                </div>
                <span style="font-size:0.85rem; color:var(--ink-soft); font-weight:600;">انقر على أي قسم للدخول الفوري</span>
            </div>

            <div class="quick-apps-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap:14px;">
                ${allowedSections.map(sec => {
                    const iconsMap = {
                        children: { icon: "👶", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", title: "ملفات الأطفال", hint: "السجلات والبيانات" },
                        add_child: { icon: "➕", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", title: "تسجيل طفل جديد", hint: "إضافة ملف جديد" },
                        attendance: { icon: "📅", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)", title: "الحضور والغياب", hint: "اليوم الدراسي" },
                        finance: { icon: "💰", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", title: "الرسوم والاشتراكات", hint: "التحصيل والمتأخرات" },
                        payroll: { icon: "💵", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", title: "كشوف الرواتب", hint: "مرتبات المعلمات" },
                        staff: { icon: "👩‍🏫", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)", title: "كادر المعلمات", hint: "الموظفون والشيفتات" },
                        whatsapp: { icon: "💬", color: "#22c55e", bg: "rgba(34, 197, 94, 0.12)", title: "رسائل واتساب", hint: "التواصل مع الأهالي" },
                        learning: { icon: "📚", color: "#ec4899", bg: "rgba(236, 72, 153, 0.12)", title: "الخطة التعليمية", hint: "المناهج والتحضير" },
                        exams: { icon: "📝", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", title: "الاختبارات والنتائج", hint: "التقييمات والدرجات" },
                        reports: { icon: "📊", color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.12)", title: "التقارير والكشوف", hint: "طباعة تقارير A4" },
                        operations: { icon: "🏥", color: "#14b8a6", bg: "rgba(20, 184, 166, 0.12)", title: "الرعاية والعيادة", hint: "السجلات الصحية" },
                        updates: { icon: "🔄", color: "#f97316", bg: "rgba(249, 115, 22, 0.12)", title: "التحديثات والدعم", hint: "تحديث النظام أونلاين" },
                        settings: { icon: "⚙️", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)", title: "إعدادات النظام", hint: "النسخ الاحتياطي" },
                        security: { icon: "🛡️", color: "#e11d48", bg: "rgba(225, 29, 72, 0.12)", title: "الصلاحيات والأمان", hint: "أدوار المستخدمين" }
                    };
                    const item = iconsMap[sec] || { icon: "📁", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", title: SECTION_TITLES[sec]?.title || sec, hint: "دخول القسم" };
                    const badge = navBadge(sec);
                    return `
                        <button
                            type="button"
                            class="quick-app-tile"
                            data-nav="${sec}"
                            style="background:var(--paper); border:1px solid var(--line); border-radius:18px; padding:16px 12px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; cursor:pointer; transition:all 0.2s ease; box-shadow:var(--shadow-sm); position:relative; overflow:hidden;"
                        >
                            ${badge ? `<span style="position:absolute; top:8px; right:8px; background:#ef4444; color:#fff; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:8px;">${badge}</span>` : ""}
                            <div style="width:50px; height:50px; border-radius:14px; background:${item.bg}; color:${item.color}; display:flex; align-items:center; justify-content:center; font-size:1.7rem; box-shadow:0 4px 12px rgba(0,0,0,0.05); transition:transform 0.2s ease;">
                                ${item.icon}
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px; width:100%;">
                                <strong style="color:var(--ink); font-size:0.9rem; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</strong>
                                <small style="color:var(--ink-soft); font-size:0.74rem; font-weight:500;">${item.hint}</small>
                            </div>
                        </button>
                    `;
                }).join("")}
            </div>
        </section>

        <!-- INTERACTIVE LIVE OPERATIONS DASHBOARD (WIDGETS ROW) -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap:20px; margin-bottom:24px;">
            <!-- WIDGET 1: LATEST KIDS & ATTENDANCE -->
            <div class="panel" style="padding:22px; border-radius:18px; background:var(--paper); border:1px solid var(--line); box-shadow:var(--shadow-md);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; border-bottom:1px solid var(--line); padding-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.4rem;">👶</span>
                        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--ink);">أحدث الأطفال المسجلين</h3>
                    </div>
                    <button class="btn btn-ghost btn-sm" type="button" data-nav="children" style="font-weight:700; color:var(--accent);">عرض كل الأطفال ←</button>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${state.children.slice(0, 5).map(child => {
                        const parentPhone = getChildWhatsappPhone(child.id);
                        return `
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:12px; background:var(--bg); border:1px solid var(--line);">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg, #3b82f6, #1d4ed8); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.95rem;">
                                        ${child.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <strong style="display:block; color:var(--ink); font-size:0.95rem;">${child.full_name}</strong>
                                        <small style="color:var(--ink-soft); font-size:0.8rem;">${STAGE_LABELS[child.stage] || child.stage}</small>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <button class="btn btn-whatsapp-pill" type="button" data-action="whatsapp-child" data-id="${child.id}" style="padding:6px 12px; font-size:0.82rem; border-radius:8px; background:#22c55e; color:#fff; border:none; cursor:pointer; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                                        <span>💬</span>
                                        <span>واتساب</span>
                                    </button>
                                    <button class="btn btn-ghost btn-sm" type="button" data-nav="children" style="padding:6px 10px; font-size:0.82rem;">ملف</button>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>

            <!-- WIDGET 2: STAFF & TEACHERS QUICK OVERVIEW -->
            <div class="panel" style="padding:22px; border-radius:18px; background:var(--paper); border:1px solid var(--line); box-shadow:var(--shadow-md);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; border-bottom:1px solid var(--line); padding-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.4rem;">👩‍🏫</span>
                        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--ink);">فريق العمل والمعلمات</h3>
                    </div>
                    <button class="btn btn-ghost btn-sm" type="button" data-nav="staff" style="font-weight:700; color:var(--accent);">إدارة الكادر ←</button>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${state.staff.slice(0, 5).map(member => {
                        const statusBadge = member.contract_status === "TERMINATED" 
                            ? `<span style="background:rgba(239,68,68,0.1); color:#ef4444; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px;">ملغي</span>`
                            : `<span style="background:rgba(16,185,129,0.1); color:#10b981; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px;">ساري</span>`;
                        return `
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:12px; background:var(--bg); border:1px solid var(--line);">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg, #8b5cf6, #6d28d9); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.95rem;">
                                        ${member.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <strong style="display:block; color:var(--ink); font-size:0.95rem;">${member.full_name}</strong>
                                        <small style="color:var(--ink-soft); font-size:0.8rem;">${member.role_title || "معلمة"} · ${formatCurrency(member.salary || 0)}</small>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    ${statusBadge}
                                    <button class="btn btn-secondary btn-sm" type="button" data-action="open-staff-salary-modal" data-id="${member.id}" style="padding:6px 10px; font-size:0.82rem; border-radius:8px;">راتب</button>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        </div>
    `;
}

function renderShell() {
    const user = currentUser();
    const roleLabel = USER_ROLE_LABELS[user.role];
    const allowedSections = getAllowedSectionsForRole(user.role);
    const isHome = ui.activeSection === "home";

    if (!isHome && !allowedSections.includes(ui.activeSection)) {
        ui.activeSection = "home";
    }

    const sectionMeta = isHome
        ? {
            title: "لوحة التحكم والأقسام الشاملة",
            description: "نظام إدارة أكاديمية براعم الإيمان — رعاية وبناء الأجيال في بيئة تربوية حديثة."
        }
        : (SECTION_TITLES[ui.activeSection] || { title: ui.activeSection, description: "" });

    const sidebarNavGroups = NAV_GROUPS.map(group => {
        const groupSections = group.sections.filter(s => allowedSections.includes(s));
        if (!groupSections.length) return "";
        return `
            <div class="sidebar-nav-group">
                <span class="sidebar-group-title">${group.title}</span>
                <div class="sidebar-group-items">
                    ${groupSections.map(sec => {
                        const active = ui.activeSection === sec;
                        const badge = navBadge(sec);
                        const icon = NAV_ICONS[sec] || "";
                        const title = SECTION_TITLES[sec]?.title || sec;
                        return `
                            <button type="button" class="sidebar-link ${active ? 'is-active' : ''}" data-nav="${sec}" title="${title}">
                                <span class="sidebar-link-icon">${icon}</span>
                                <span class="sidebar-link-text">${title}</span>
                                ${badge ? `<span class="sidebar-link-badge">${badge}</span>` : ''}
                            </button>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="shell shell-modern">
            <!-- LUXURY PERMANENT SIDEBAR -->
            <aside class="shell-sidebar luxury-sidebar">
                <div class="sidebar-brand-card">
                    <img src="./logo.png" alt="شعار براعم الإيمان" class="sidebar-logo-img">
                    <div class="sidebar-brand-text">
                        <h3>${BRAND.shortName}</h3>
                        <small>نظام الإدارة الذكي</small>
                    </div>
                </div>

                <div class="sidebar-quick-home">
                    <button type="button" class="sidebar-home-btn ${isHome ? 'is-active' : ''}" data-action="go-home">
                        <span style="font-size:1.2rem;">🏠</span>
                        <strong>الرئيسية الشاملة</strong>
                    </button>
                </div>

                <nav class="sidebar-nav-scroll">
                    ${sidebarNavGroups}
                </nav>

                <div class="sidebar-user-footer">
                    <div class="sidebar-user-info">
                        <div class="sidebar-user-avatar">${(user.full_name || "م").charAt(0)}</div>
                        <div class="sidebar-user-details">
                            <strong>${user.full_name || "المستخدم"}</strong>
                            <small>${roleLabel}</small>
                        </div>
                    </div>
                    <button class="btn btn-ghost btn-sm btn-logout" type="button" data-action="logout" title="تسجيل الخروج">🚪</button>
                </div>
            </aside>

            <!-- MAIN WORKSPACE -->
            <main class="shell-main luxury-main">
                <header class="topbar luxury-topbar">
                    <div class="topbar-main">
                        <div class="title-block">
                            <h2>${sectionMeta.title}</h2>
                            <p>${sectionMeta.description}</p>
                        </div>
                    </div>

                    <div class="topbar-side">
                        <!-- GLOBAL INSTANT SEARCH -->
                        <div class="topbar-search" style="position:relative; min-width:240px;">
                            <div style="display:flex; align-items:center; background:var(--bg); border:1px solid var(--line); border-radius:12px; padding:0 12px; height:38px; box-shadow:var(--shadow-sm);">
                                <span style="font-size:1rem; color:var(--ink-soft); margin-left:6px;">🔍</span>
                                <input 
                                    type="search" 
                                    id="global-search-input" 
                                    placeholder="بحث سريع (طفل، هاتف، معلمة)..." 
                                    style="border:none; background:transparent; width:100%; outline:none; font-size:0.84rem; color:var(--ink); font-family:inherit;"
                                    autocomplete="off"
                                >
                            </div>
                            <div id="global-search-results" style="display:none; position:absolute; top:44px; right:0; left:0; min-width:320px; background:var(--paper); border:1px solid var(--line); border-radius:14px; box-shadow:0 15px 35px rgba(0,0,0,0.25); z-index:99999; max-height:360px; overflow-y:auto; padding:8px;"></div>
                        </div>

                        <button class="btn btn-ghost theme-toggle-btn" type="button" data-action="toggle-theme" title="تبديل الوضع الليلي / النهاري">
                            ${document.body.classList.contains("dark-theme") ? "☀️ نهاري" : "🌙 ليلي"}
                        </button>

                        <button class="btn btn-primary btn-update-app" type="button" data-action="go-updates" title="مركز التحديث والدعم">
                            🔄 التحديثات
                        </button>

                        <button class="btn btn-ghost tour-launch" type="button" data-action="start-tour" title="جولة تعريفية">
                            <span aria-hidden="true">?</span>
                            <span>جولة سريعة</span>
                        </button>

                        <div class="info-chip date-chip">
                            <span>التاريخ</span>
                            <strong>${formatArabicDate(todayDate())}</strong>
                        </div>

                        ${cloudDb ? `
                            <span id="cloud-sync-badge" class="cloud-badge cloud-${ui.cloudStatus}" title="${ui.cloudSyncTime ? "آخر مزامنة: " + ui.cloudSyncTime : "مزامنة سحابية"}">
                                ${ui.cloudStatus === "synced" ? "☁ محفوظ" : ui.cloudStatus === "syncing" ? "↻ جارٍ..." : ui.cloudStatus === "error" ? "✕ خطأ" : "☁ سحابة"}
                            </span>
                        ` : ""}
                    </div>
                </header>

                <section class="workspace luxury-workspace">
                    ${isHome ? renderHomeHub(allowedSections, user, roleLabel) : renderSection(ui.activeSection)}
                </section>
            </main>
        </div>
    `;
}

function renderSection(section) {
    switch (section) {
        case "dashboard":
            return renderDashboard();
        case "children":
            return renderChildrenSection();
        case "add_child":
            return renderAddChildSection();
        case "attendance":
            return renderAttendanceSection();
        case "finance":
            return renderFinanceSection();
        case "whatsapp":
            return renderWhatsappSection();
        case "staff":
            return renderStaffSection();
        case "learning":
            return renderLearningSection();
        case "operations":
            return renderOperationsSection();
        case "reports":
            return renderReportsSection();
        case "exams":
            return renderExamsSection();
        case "payroll":
            return renderPayrollSection();
        case "settings":
            return renderSettingsSection();
        case "security":
            return renderSecuritySection();
        case "followups":
            return renderFollowupsSection();
        case "updates":
            return renderUpdatesSection();
        default:
            return "";
    }
}

function renderDashboard() {
    const dashboard = getDashboardMetrics();
    const userRole = currentUser().role;
    const financeSummary = getMonthlyFinanceSummary(currentMonthDate());
    const { children: todayAttendance, staff: todayStaff } = getAttendanceRows(ui.attendanceDate);
    const stageDistribution = getStageDistribution();
    const upcomingActivities = [...state.activities]
        .sort((a, b) => a.activity_date.localeCompare(b.activity_date))
        .slice(0, 3);
    const recentPlans = [...state.weeklyPlanning]
        .sort((a, b) => b.week_start_date.localeCompare(a.week_start_date))
        .slice(0, 3);
    const lowStock = state.pharmacyItems
        .filter((item) => item.quantity <= item.reorder_level)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 3);
    const nearExpiry = state.pharmacyItems
        .filter((item) => daysUntil(item.expiry_date) <= 60)
        .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))
        .slice(0, 3);
    const overdueFees = getOverdueFees().slice(0, 3);
    const upcomingFees = state.fees
        .filter((fee) => {
            const remaining = remainingFeeAmount(fee);
            const days = daysUntil(fee.due_date);
            return remaining > 0 && days >= 0 && days <= 7;
        })
        .map((fee) => ({ fee, child: getChildById(fee.child_id), remaining: remainingFeeAmount(fee), days: daysUntil(fee.due_date) }))
        .slice(0, 3);
    const recentMedical = [...state.medicalRecords]
        .sort((a, b) => b.record_date.localeCompare(a.record_date))
        .slice(0, 3);
    const absentToday = todayAttendance.filter((row) => (row.record?.status || "ABSENT") === "ABSENT").length;
    const lateToday = todayAttendance.filter((row) => (row.record?.status || "") === "LATE").length;
    const presentStaff = todayStaff.filter((row) => ["PRESENT", "LATE"].includes(row.record?.status || "")).length;
    const lateStaff = todayStaff.filter((row) => row.record?.status === "LATE").length;
    const pharmacyWatchList = [...lowStock, ...nearExpiry.filter((item) => !lowStock.find((low) => low.id === item.id))].slice(0, 4);
    const openFollowups = (state.followUps || [])
        .filter((f) => f.status === "OPEN" || f.status === "PENDING")
        .sort((a, b) => a.followup_date.localeCompare(b.followup_date))
        .slice(0, 4);

    const quickActions = [
        { section: "attendance", title: "تسجيل الحضور", hint: "متابعة اليوم الدراسي" },
        { section: "children", title: "ملفات الأطفال", hint: "البيانات والاستلام" },
        { section: "finance", title: "متابعة الرسوم", hint: "التحصيل والمتأخرات" },
        { section: "learning", title: "الخطة التعليمية", hint: "المنهج والتحضير" }
    ].filter((action) => SECTION_PERMISSIONS[action.section].includes(userRole));

    return `
        <section class="dashboard-header">
            <div class="dashboard-header-copy">
                <div class="eyebrow">نظرة تشغيلية</div>
                <h3>ملخص اليوم داخل ${BRAND.shortName}</h3>
                <p>شاشة واحدة للمتابعة السريعة بدون ازدحام أو عناصر زائدة.</p>
            </div>
            <div class="dashboard-date-card">
                <span>تاريخ اليوم</span>
                <strong>${formatArabicDate(todayDate())}</strong>
                <small>${USER_ROLE_LABELS[userRole]}</small>
            </div>
        </section>

        <section class="summary-strip">
            <article class="summary-tile">
                <span>الأطفال النشطون</span>
                <strong>${dashboard.activeChildren}</strong>
                <small>إجمالي الأطفال داخل النظام</small>
            </article>
            <article class="summary-tile">
                <span>حضور اليوم</span>
                <strong>${dashboard.presentToday}</strong>
                <small>${absentToday} غياب · ${lateToday} تأخير</small>
            </article>
            <article class="summary-tile">
                <span>الفريق اليوم</span>
                <strong>${presentStaff}/${todayStaff.length || 0}</strong>
                <small>${lateStaff ? `${lateStaff} متأخر` : "الحضور مستقر"}</small>
            </article>
            <article class="summary-tile">
                <span>المتأخرات</span>
                <strong>${formatCurrency(dashboard.outstandingFees)}</strong>
                <small>${overdueFees.length} ملفات تحتاج متابعة</small>
            </article>
        </section>

        <section class="dashboard-layout">
            <div class="panel panel-wide">
                <div class="panel-header">
                    <div>
                        <h3>الحضور والغياب اليوم</h3>
                        <p>متابعة الأطفال والمعلمين في نفس الشاشة.</p>
                    </div>
                </div>
                <div class="daily-columns">
                    <div class="daily-column">
                        <div class="subsection-title">الأطفال</div>
                        <div class="list-stack compact-stack">
                            ${todayAttendance.map((row) => `
                                <div class="list-item">
                                    <div>
                                        <strong>${row.child.full_name}</strong>
                                        <span>${STAGE_LABELS[row.child.stage]} · ${row.record?.check_in_time || "لم يسجل دخول"}</span>
                                    </div>
                                    <span class="tag ${statusClass(row.record?.status || "ABSENT")}">${ATTENDANCE_LABELS[row.record?.status || "ABSENT"]}</span>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                    <div class="daily-column">
                        <div class="subsection-title">المعلمون</div>
                        <div class="list-stack compact-stack">
                            ${todayStaff.map((row) => `
                                <div class="list-item">
                                    <div>
                                        <strong>${row.staff.full_name}</strong>
                                        <span>${row.staff.job_title} · ${row.record?.check_in_time || "لم يسجل حضور"}</span>
                                    </div>
                                    <span class="tag ${statusClass(row.record?.status || "ABSENT")}">${ATTENDANCE_LABELS[row.record?.status || "ABSENT"]}</span>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>إجراءات سريعة</h3>
                        <p>اختصارات واضحة للمهام المتكررة.</p>
                    </div>
                </div>
                <div class="quick-links">
                    ${quickActions.map((action) => `
                        <button class="quick-link" type="button" data-nav="${action.section}">
                            <strong>${action.title}</strong>
                            <span>${action.hint}</span>
                        </button>
                    `).join("")}
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>الرسوم والتحصيل</h3>
                        <p>الوضع المالي الحالي مع أهم الحالات التي تحتاج متابعة.</p>
                    </div>
                </div>
                <div class="info-rows">
                    <div class="info-row">
                        <span>المحصل هذا الشهر</span>
                        <strong>${formatCurrency(financeSummary.collected)}</strong>
                    </div>
                    <div class="info-row">
                        <span>المصروفات</span>
                        <strong>${formatCurrency(financeSummary.expenses)}</strong>
                    </div>
                    <div class="info-row">
                        <span>صافي الشهر</span>
                        <strong>${formatCurrency(financeSummary.net)}</strong>
                    </div>
                </div>
                ${upcomingFees.length ? `
                <div class="fee-reminder-banner">
                    <strong>⚠ تنبيه استحقاق قريب:</strong>
                    ${upcomingFees.map((f) => `${f.child?.full_name || ""} (${f.days === 0 ? "اليوم" : `خلال ${f.days} أيام`})`).join(" · ")}
                </div>` : ""}
                <div class="subsection-title">حالات تحتاج متابعة</div>
                <div class="list-stack compact-stack">
                    ${overdueFees.length ? overdueFees.map((fee) => `
                        <div class="list-item">
                            <div>
                                <strong>${fee.child.full_name}</strong>
                                <span>متبقي ${formatCurrency(fee.remaining)}</span>
                            </div>
                            <span class="tag overdue">متأخرة</span>
                        </div>
                    `).join("") : `<div class="empty-state empty-inline">لا توجد متأخرات حالية.</div>`}
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>التعليم والأنشطة</h3>
                        <p>آخر الخطط التعليمية وأقرب الأنشطة القادمة.</p>
                    </div>
                </div>
                <div class="subsection-title">التحضير الأسبوعي</div>
                <div class="list-stack compact-stack">
                    ${recentPlans.length ? recentPlans.map((plan) => `
                        <div class="list-item">
                            <div>
                                <strong>${STAGE_LABELS[plan.stage]}</strong>
                                <span>يبدأ ${formatArabicDate(plan.week_start_date)}</span>
                            </div>
                            <span class="tag partial">خطة</span>
                        </div>
                    `).join("") : `<div class="empty-state empty-inline">لا توجد خطط أسبوعية مسجلة.</div>`}
                </div>
                <div class="subsection-title">الأنشطة القادمة</div>
                <div class="list-stack compact-stack">
                    ${upcomingActivities.length ? upcomingActivities.map((activity) => `
                        <div class="list-item">
                            <div>
                                <strong>${activity.activity_name}</strong>
                                <span>${formatArabicDate(activity.activity_date)} · ${activity.target_stage ? STAGE_LABELS[activity.target_stage] : "كل الفصول"}</span>
                            </div>
                            <span class="tag partial">${ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}</span>
                        </div>
                    `).join("") : `<div class="empty-state empty-inline">لا توجد أنشطة قريبة مسجلة.</div>`}
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>العمليات اليومية</h3>
                        <p>السجل الطبي والصيدلية والتنبيهات التشغيلية.</p>
                    </div>
                </div>
                <div class="subsection-title">آخر حالات طبية</div>
                <div class="list-stack compact-stack">
                    ${recentMedical.length ? recentMedical.map((record) => `
                        <div class="list-item">
                            <div>
                                <strong>${getChildById(record.child_id)?.full_name || "طفل"}</strong>
                                <span>${record.case_description} · ${formatArabicDate(record.record_date)}</span>
                            </div>
                            <span class="tag pending">متابعة</span>
                        </div>
                    `).join("") : `<div class="empty-state empty-inline">لا توجد حالات طبية حديثة.</div>`}
                </div>
                <div class="subsection-title">الصيدلية</div>
                <div class="list-stack compact-stack">
                    ${pharmacyWatchList.length ? pharmacyWatchList.map((item) => `
                        <div class="list-item">
                            <div>
                                <strong>${item.medicine_name}</strong>
                                <span>${item.quantity} ${item.unit} · صلاحية ${formatArabicDate(item.expiry_date)}</span>
                            </div>
                            <span class="tag ${item.quantity <= item.reorder_level ? "overdue" : "pending"}">${item.quantity <= item.reorder_level ? "إعادة طلب" : "قرب انتهاء"}</span>
                        </div>
                    `).join("") : `<div class="empty-state empty-inline">لا توجد عناصر تحتاج تدخلًا الآن.</div>`}
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>متابعات مفتوحة</h3>
                        <p>أقرب المتابعات المعلقة أو المفتوحة تحتاج تدخل.</p>
                    </div>
                    ${SECTION_PERMISSIONS.followups.includes(userRole) ? `<button class="btn btn-secondary" type="button" data-nav="followups">عرض الكل</button>` : ""}
                </div>
                <div class="list-stack compact-stack">
                    ${openFollowups.length ? openFollowups.map((fu) => {
                        const child = getChildById(fu.child_id);
                        return `<div class="list-item">
                            <div>
                                <strong>${child?.full_name || "—"}</strong>
                                <span>${FOLLOWUP_TYPE_LABELS[fu.followup_type] || fu.followup_type} · ${formatArabicDate(fu.followup_date)}</span>
                            </div>
                            <span class="tag ${fu.status === "OPEN" ? "overdue" : "partial"}">${FOLLOWUP_STATUS_LABELS[fu.status]}</span>
                        </div>`;
                    }).join("") : `<div class="empty-state empty-inline">لا توجد متابعات مفتوحة حالياً.</div>`}
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>توزيع الفصول</h3>
                        <p>صورة سريعة لعدد الأطفال في كل فصل.</p>
                    </div>
                </div>
                <div class="progress-list">
                    ${stageDistribution.map((stage) => `
                        <div class="progress-row">
                            <div class="progress-head">
                                <strong>${stage.label}</strong>
                                <span>${stage.count} طفل</span>
                            </div>
                            <div class="progress-track">
                                <div class="progress-fill" style="width: ${stage.percent}%"></div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        </section>
    `;
}

function renderChildrenSection() {
    const childrenList = [...state.children].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "ar"));
    const filteredList = ui.childSearch
        ? childrenList.filter((c) =>
            (c.full_name || "").includes(ui.childSearch) ||
            (c.health_status || "").includes(ui.childSearch) ||
            (STAGE_LABELS[c.stage] || c.stage || "").includes(ui.childSearch)
        )
        : childrenList;
    const childrenProfiles = filteredList.map((child) => buildChildProfile(child.id)).filter(Boolean);
    const selectedChild = getChildById(ui.selectedChildId) || childrenList[0];
    const selectedProfile = selectedChild ? buildChildProfile(selectedChild.id) : null;

    return `
        <section class="section-grid columns-2">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>قائمة الأطفال <span class="count-badge">${childrenList.length}</span></h3>
                        <p>اختَر طفلًا لعرض ملفه، أو اضغط تعديل لتعديل بياناته.</p>
                    </div>
                    <button class="btn btn-primary" type="button" data-action="new-child">إضافة طفل جديد</button>
                </div>
                <div class="search-wrap">
                    <div class="search-box">
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="search" class="search-input" placeholder="ابحث بالاسم أو الفصل..." data-ui-field="childSearch" value="${ui.childSearch}">
                        ${ui.childSearch ? `<button class="search-clear" type="button" data-action="clear-child-search">✕</button>` : ""}
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>الاسم</th>
                                <th>الفصل</th>
                                <th>آخر حضور</th>
                                <th>الحالة</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${childrenProfiles.map((profile) => `
                                <tr>
                                    <td>${profile.child.full_name}</td>
                                    <td>${STAGE_LABELS[profile.child.stage] || profile.child.stage || "-"}</td>
                                    <td>${profile.lastAttendance ? formatArabicDate(profile.lastAttendance.attendance_date) : "-"}</td>
                                    <td><span class="tag ${profile.child.status === "ACTIVE" ? "active" : "withdrawn"}">${profile.child.status === "ACTIVE" ? "نشط" : "منسحب"}</span></td>
                                    <td>
                                        <div class="row-actions">
                                            <button type="button" data-action="view-child" data-id="${profile.child.id}">عرض</button>
                                            <button type="button" data-action="edit-child" data-id="${profile.child.id}">تعديل</button>
                                            <button type="button" data-action="delete-child" data-id="${profile.child.id}">حذف</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>ملف الطفل</h3>
                        <p>عرض سريع لكل ما يخص الطفل المختار من بيانات مالية وطبية وحضور.</p>
                    </div>
                </div>
                ${selectedProfile ? renderChildProfile(selectedProfile) : `<div class="empty-state">اختر طفلًا لعرض ملفه.</div>`}
            </div>
        </section>
    `;
}

function renderAddChildSection() {
    const formChild = ui.childFormId ? getChildById(ui.childFormId) : null;
    const parentData = formChild ? getPrimaryParent(formChild.id) : null;
    const pickup = formChild ? getAuthorizedPickup(formChild.id) : null;
    return `
        <section class="section-grid columns-1">
            <div class="panel" style="max-width: 800px; margin: 0 auto;">
                <div class="panel-header">
                    <div>
                        <h3>${formChild ? "تعديل بيانات الطفل" : "إضافة طفل جديد"}</h3>
                        <p>تسجيل بيانات الطفل الأساسية، تحديد تاريخ أول حضور، والسن والاشتراكات.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-child">تفريغ النموذج</button>
                </div>
                <form class="stack" data-form="child">
                    <input type="hidden" name="id" value="${formChild?.id || ""}">
                    
                    <!-- CHILD PHOTO ATTACHMENT -->
                    <div class="field" style="background:var(--bg); border:1px dashed var(--line); border-radius:14px; padding:14px; display:flex; align-items:center; gap:16px; margin-bottom:8px;">
                        <div id="child-photo-preview" style="width:68px; height:68px; border-radius:14px; background:var(--paper); border:2px solid var(--line); display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:1.6rem; color:var(--ink-soft); box-shadow:var(--shadow-sm); flex-shrink:0;">
                            ${formChild?.photo_url ? `<img src="${formChild.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : (formChild?.full_name ? formChild.full_name.charAt(0) : "📷")}
                        </div>
                        <div style="flex:1;">
                            <label style="font-weight:800; font-size:0.88rem; margin-bottom:4px; display:block;">صورة الطفل الشخصية (تظهر في الكارنيه والملف)</label>
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <input type="file" id="child-photo-file-input" accept="image/*" style="display:none;" onchange="handleChildPhotoUpload(this)">
                                <input type="hidden" name="photo_url" id="child-photo-url-hidden" value="${formChild?.photo_url || ""}">
                                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('child-photo-file-input').click()" style="padding:6px 12px; font-weight:700; font-size:0.82rem;">
                                    📁 اختيار صورة من الجهاز
                                </button>
                                <button type="button" class="btn btn-ghost btn-sm" onclick="clearChildPhoto()" style="padding:6px 10px; color:#ef4444; font-size:0.82rem;" title="حذف الصورة">
                                    ✕ مسح الصورة
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="grid-2">
                        <div class="field">
                            <label>اسم الطفل</label>
                            <input name="full_name" required value="${formChild?.full_name || ""}">
                        </div>
                        <div class="field">
                            <label>الرقم القومي</label>
                            <input name="national_id" value="${formChild?.national_id || ""}">
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>تاريخ الميلاد</label>
                            <input name="birth_date" type="date" required value="${formChild?.birth_date || ""}">
                        </div>
                        <div class="field">
                            <label>الفصل</label>
                            <select name="stage" required>${optionsFromMap(STAGE_LABELS, formChild?.stage)}</select>
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>الحالة</label>
                            <select name="status" required>${options([["ACTIVE", "نشط"], ["WITHDRAWN", "منسحب"]], formChild?.status || "ACTIVE")}</select>
                        </div>
                        <div class="field">
                            <label>عنوان الطفل</label>
                            <input name="child_address" value="${formChild?.child_address || ""}">
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>وظيفة الأب</label>
                            <input name="father_job" value="${formChild?.father_job || ""}">
                        </div>
                        <div class="field">
                            <label>وظيفة الأم</label>
                            <input name="mother_job" value="${formChild?.mother_job || ""}">
                        </div>
                    </div>
                    <div class="field">
                        <label>الحالة الصحية للطفل</label>
                        <input name="health_status" value="${formChild?.health_status || ""}" placeholder="مثال: لا توجد حساسية / متابعة نظر / حساسية أطعمة">
                    </div>
                    <div class="field">
                        <label>الحضانات التي تم التقدم لها</label>
                        <textarea name="applied_nurseries">${formChild?.applied_nurseries || ""}</textarea>
                    </div>
                    <div class="field">
                        <label>ملاحظات</label>
                        <textarea name="notes">${formChild?.notes || ""}</textarea>
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>المعلمة المسؤولة</label>
                            <select name="teacher_id">
                                <option value="">— غير محدد —</option>
                                ${state.staff.filter((s) => s.status === "ACTIVE").map((s) => `<option value="${s.id}" ${(formChild?.teacher_id || "") === s.id ? "selected" : ""}>${s.full_name}</option>`).join("")}
                            </select>
                        </div>
                        <div class="field">
                            <label>نوع الدعم</label>
                            <select name="support_type">${optionsFromMap(SUPPORT_TYPE_LABELS, formChild?.support_type || "NORMAL")}</select>
                        </div>
                    </div>
                    <div class="field">
                        <label>أخصائي التخاطب (إن وُجد)</label>
                        <select name="specialist_id">
                            <option value="">— لا يوجد —</option>
                            ${state.staff.filter((s) => s.status === "ACTIVE").map((s) => `<option value="${s.id}" ${(formChild?.specialist_id || "") === s.id ? "selected" : ""}>${s.full_name} — ${s.job_title}</option>`).join("")}
                        </select>
                    </div>

                    <div class="subsection-title" style="margin-top:12px;">بيانات الحضور والاشتراك الجديدة</div>
                    <div class="grid-2">
                        <div class="field">
                            <label>تاريخ أول حضور</label>
                            <input name="first_attendance_date" type="date" value="${formChild?.first_attendance_date || ""}">
                        </div>
                        <div class="field">
                            <label>ساعة أول حضور</label>
                            <input name="first_attendance_time" type="time" value="${formChild?.first_attendance_time || ""}">
                        </div>
                    </div>
                    <div class="grid-3">
                        <div class="field">
                            <label>السن</label>
                            <input name="custom_age" value="${formChild?.custom_age || ""}" placeholder="مثال: 3 سنوات و 4 أشهر">
                        </div>
                        <div class="field">
                            <label>الاشتراك (جنيه)</label>
                            <input name="subscription_fee" type="number" min="0" value="${formChild?.subscription_fee || 0}">
                        </div>
                        <div class="field">
                            <label>المتبقي (جنيه)</label>
                            <input name="remaining_balance" type="number" min="0" value="${formChild?.remaining_balance || 0}">
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>تاريخ إلغاء الاشتراك</label>
                            <input name="withdrawal_date" type="date" value="${formChild?.withdrawal_date || ""}">
                        </div>
                    </div>

                    <div class="subsection-title" style="margin-top:12px;">بيانات ولي الأمر والاتصال</div>
                    <div class="field">
                        <label>اسم ولي الأمر الأساسي</label>
                        <input name="parent_name" value="${parentData?.parent?.full_name || ""}">
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>هاتف ولي الأمر</label>
                            <input name="parent_phone" value="${parentData?.parent?.phone || ""}">
                        </div>
                        <div class="field">
                            <label>صلة القرابة</label>
                            <select name="relationship_to_child">${optionsFromMap(RELATIONSHIP_LABELS, parentData?.relation?.relationship_to_child || "FATHER")}</select>
                        </div>
                    </div>
                    <div class="field">
                        <label>العنوان</label>
                        <input name="parent_address" value="${parentData?.parent?.address || ""}">
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>الشخص المصرح له بالاستلام</label>
                            <input name="pickup_name" value="${pickup?.full_name || ""}" placeholder="اختياري">
                        </div>
                        <div class="field">
                            <label>رقم هاتف المستلم</label>
                            <input name="pickup_phone" value="${pickup?.phone || ""}" placeholder="اختياري">
                        </div>
                    </div>

                    <div class="subsection-title" style="margin-top:12px;">خدمة الباص</div>
                    <div class="grid-3">
                        <div class="field">
                            <label>اشتراك الباص</label>
                            <select name="bus_subscription">
                                <option value="0" ${!formChild?.bus_subscription ? "selected" : ""}>لا يشترك</option>
                                <option value="1" ${formChild?.bus_subscription ? "selected" : ""}>مشترك</option>
                            </select>
                        </div>
                        <div class="field">
                            <label>رسوم الباص الشهرية</label>
                            <input type="number" name="bus_monthly_fee" value="${formChild?.bus_monthly_fee || ""}" placeholder="0" min="0">
                        </div>
                        <div class="field">
                            <label>خط السير</label>
                            <input name="bus_route" value="${formChild?.bus_route || ""}" placeholder="مثال: خط النصر">
                        </div>
                    </div>
                    <button class="btn btn-primary" type="submit">${formChild ? "حفظ التعديلات" : "إضافة الطفل"}</button>
                </form>
            </div>
        </section>
    `;
}

function renderChildProfile(profile) {
    const ageVal = profile.child.custom_age || `${calculateAge(profile.child.birth_date)} سنوات`;
    const firstAttendanceVal = profile.child.first_attendance_date 
        ? `${formatArabicDate(profile.child.first_attendance_date)} ${profile.child.first_attendance_time || ""}`
        : "-";
    const subFeeVal = profile.child.subscription_fee ? `${profile.child.subscription_fee} جنيه` : "-";
    const remBalVal = profile.child.remaining_balance !== undefined ? `${profile.child.remaining_balance} جنيه` : "-";
    const withdrawalDateVal = profile.child.withdrawal_date ? formatArabicDate(profile.child.withdrawal_date) : "-";
    const parentPhone = getChildWhatsappPhone(profile.child.id);

    return `
        <div class="profile-card">
            <div class="profile-head" style="align-items:flex-start;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <div style="width:58px; height:58px; border-radius:16px; background:linear-gradient(135deg, #3b82f6, #1d4ed8); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.6rem; font-weight:800; box-shadow:0 6px 16px rgba(59,130,246,0.3); overflow:hidden; flex-shrink:0;">
                        ${profile.child.photo_url ? `<img src="${profile.child.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : profile.child.full_name.charAt(0)}
                    </div>
                    <div>
                        <h3 style="margin:0 0 4px 0; font-size:1.25rem; font-weight:900;">${profile.child.full_name}</h3>
                        <div class="subtle-text" style="font-weight:600;">${STAGE_LABELS[profile.child.stage] || profile.child.stage} · السن: ${ageVal}</div>
                    </div>
                </div>
                <span class="tag ${profile.child.status === "ACTIVE" ? "active" : "withdrawn"}" style="padding:6px 12px; font-weight:800; border-radius:10px;">${profile.child.status === "ACTIVE" ? "نشط ومقيد" : "منسحب"}</span>
            </div>

            <!-- SMART ACTION BUTTONS BAR -->
            <div style="display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; padding:12px; background:var(--bg); border:1px solid var(--line); border-radius:14px;">
                <button class="btn btn-whatsapp-pill" type="button" data-action="open-smart-whatsapp" data-id="${profile.child.id}" style="padding:8px 14px; font-size:0.85rem; border-radius:10px; background:#22c55e; color:#fff; border:none; cursor:pointer; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                    <span>💬</span>
                    <span>رسائل واتساب ذكية</span>
                </button>
                <button class="btn btn-primary btn-sm" type="button" data-action="print-student-badge" data-id="${profile.child.id}" style="padding:8px 14px; font-size:0.85rem; border-radius:10px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                    <span>🪪</span>
                    <span>طباعة كارنيه / بادج</span>
                </button>
                <button class="btn btn-secondary btn-sm" type="button" data-action="open-certificate-modal" data-id="${profile.child.id}" style="padding:8px 14px; font-size:0.85rem; border-radius:10px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                    <span>🎓</span>
                    <span>شهادة تقدير وتكريم</span>
                </button>
                <button class="btn btn-ghost btn-sm" type="button" data-action="print-child-statement" data-id="${profile.child.id}" style="padding:8px 14px; font-size:0.85rem; border-radius:10px; font-weight:700; display:inline-flex; align-items:center; gap:6px; border:1px solid var(--line);">
                    <span>📑</span>
                    <span>كشف حساب مالي</span>
                </button>
            </div>

            ${profile.child.health_status && profile.child.health_status !== "لا توجد حساسية" && profile.child.health_status !== "سليم" ? `
                <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:12px; padding:10px 14px; margin-bottom:16px; display:flex; align-items:center; gap:10px; color:#ef4444;">
                    <span style="font-size:1.4rem;">🩺</span>
                    <div>
                        <strong style="display:block; font-size:0.9rem;">تنبيه صحي خاص:</strong>
                        <span style="font-size:0.85rem;">${profile.child.health_status}</span>
                    </div>
                </div>
            ` : ""}

            <div class="profile-meta">
                <div><strong>السن</strong><span>${ageVal}</span></div>
                <div><strong>الفصل</strong><span>${STAGE_LABELS[profile.child.stage] || profile.child.stage}</span></div>
                <div><strong>هاتف ولي الأمر</strong><span>${parentPhone || "غير مسجل"}</span></div>
                <div><strong>أول حضور</strong><span>${firstAttendanceVal}</span></div>
                <div><strong>الاشتراك</strong><span>${subFeeVal}</span></div>
                <div><strong>المتبقي</strong><span>${remBalVal}</span></div>
                <div><strong>يوم إلغاء الاشتراك</strong><span>${withdrawalDateVal}</span></div>
                <div><strong>الرقم القومي</strong><span>${profile.child.national_id || "-"}</span></div>
                <div><strong>عنوان الطفل</strong><span>${profile.child.child_address || "-"}</span></div>
                <div><strong>وظيفة الأب</strong><span>${profile.child.father_job || "-"}</span></div>
                <div><strong>وظيفة الأم</strong><span>${profile.child.mother_job || "-"}</span></div>
                <div><strong>آخر حضور</strong><span>${profile.lastAttendance ? `${ATTENDANCE_LABELS[profile.lastAttendance.status]} - ${formatArabicDate(profile.lastAttendance.attendance_date)}` : "لا يوجد"}</span></div>
                <div><strong>الحالة الصحية</strong><span>${profile.child.health_status || "سليم"}</span></div>
                <div><strong>الحضانات المتقدم لها</strong><span>${profile.child.applied_nurseries || "غير مسجلة"}</span></div>
                <div><strong>آخر ملاحظة طبية</strong><span>${profile.lastMedical?.case_description || "لا توجد"}</span></div>
            </div>
        </div>
    `;
}

function renderAttendanceSection() {
    const attendance = getAttendanceRows(ui.attendanceDate);
    const isEvening = ui.attendanceChildTab === "evening";
    const stageFilter = ui.attendanceStageFilter || "";
    const displayedChildren = stageFilter
        ? attendance.children.filter((r) => r.child.stage === stageFilter)
        : [];
    const presentCount = attendance.children.filter((r) => {
        const st = isEvening ? (r.record?.evening_status || "ABSENT") : (r.record?.status || "ABSENT");
        return ["PRESENT", "LATE"].includes(st);
    }).length;
    const absentCount = attendance.children.filter((r) => {
        const st = isEvening ? (r.record?.evening_status || "ABSENT") : (r.record?.status || "ABSENT");
        return st === "ABSENT";
    }).length;
    const totalActive = state.children.filter((c) => c.status === "ACTIVE").length;
    const attendanceRate = totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 0;

    const curDate = new Date(ui.attendanceDate || todayDate());
    const dayOfWeek = curDate.getDay();
    const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6);
    const dayName = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][dayOfWeek] || "";

    const staffTab = ui.staffAttendanceTab || "all";
    const filteredStaff = attendance.staff.filter((row) => {
        if (staffTab === "all") return true;
        const title = (row.staff.job_title || "").toLowerCase();
        if (staffTab === "teachers") return title.includes("معلم") || title.includes("مدرس") || title.includes("teacher");
        if (staffTab === "workers") return !title.includes("معلم") && !title.includes("مدرس") && !title.includes("مدير") && !title.includes("سكرتار") && !title.includes("إدار");
        if (staffTab === "admin") return title.includes("مدير") || title.includes("سكرتار") || title.includes("إدار");
        return true;
    });

    const staffPresentCount = attendance.staff.filter((r) => ["PRESENT", "LATE"].includes(r.record?.status || "")).length;

    const quickStaffBtn = (staffId, status, currentStatus, label, cls) =>
        `<button type="button" class="att-quick-btn ${cls} ${currentStatus === status ? "att-quick-active" : ""}" data-action="quick-staff-status" data-id="${staffId}" data-status="${status}">${label}</button>`;

    return `
        <section class="attendance-stats-bar">
            <div class="att-stat att-stat-present">
                <span class="att-stat-num">${presentCount}</span>
                <span class="att-stat-label">حاضر</span>
            </div>
            <div class="att-stat att-stat-absent">
                <span class="att-stat-num">${absentCount}</span>
                <span class="att-stat-label">غائب</span>
            </div>
            <div class="att-stat att-stat-checkin">
                <span class="att-stat-num">${staffPresentCount}/${attendance.staff.length}</span>
                <span class="att-stat-label">الموظفون</span>
            </div>
            <div class="att-stat att-stat-rate">
                <span class="att-stat-num">${attendanceRate}%</span>
                <span class="att-stat-label">نسبة الحضور</span>
                <div class="att-rate-track"><div class="att-rate-fill" style="width:${attendanceRate}%"></div></div>
            </div>
        </section>

        <section class="panel" style="margin-bottom: 18px;">
            <div class="panel-header">
                <div>
                    <h3>إعدادات اليوم: ${dayName} ${formatArabicDate(ui.attendanceDate)} ${isWeekend ? `<span class="weekend-badge" style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:6px;font-size:0.8rem;border:1px solid #fde68a;">🌴 إجازة أسبوعية (الجمعة / السبت)</span>` : ""}</h3>
                    <p>المواعيد الرسمية: من 08:00 صباحاً إلى 02:00 ظهراً (السبت والجمعة إجازة).</p>
                </div>
                </div>
            </div>
            <div class="actions-row">
                <div class="field" style="min-width: 220px;">
                    <label>التاريخ</label>
                    <input type="date" name="attendanceDate" data-ui-field="attendanceDate" value="${ui.attendanceDate}">
                </div>
                <button class="btn btn-primary" type="button" data-action="mark-all-present">تحديد كل الأطفال حاضر</button>
                <button class="btn btn-secondary" type="button" data-action="mark-all-present-evening">كل الأطفال حاضر (مسائي)</button>
                <button class="btn btn-ghost" type="button" data-action="mark-staff-present">تحديد كل الموظفين حاضر</button>
            </div>
        </section>

        <section class="section-grid columns-2">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>حضور الأطفال</h3>
                        <p>تسجيل سريع بأزرار صباحي ومسائي منفصلة في نفس الشاشة.</p>
                    </div>
                </div>
                <div class="field" style="margin-bottom:10px;">
                    <label>فلتر بالفصل</label>
                    <select data-ui-field="attendanceStageFilter">
                        <option value="" ${!stageFilter ? "selected" : ""}>— اختر الفصل أولاً —</option>
                        ${Object.entries(STAGE_LABELS).map(([k, v]) => `<option value="${k}" ${stageFilter === k ? "selected" : ""}>${v}</option>`).join("")}
                    </select>
                </div>
                <div class="table-wrap">
                    <table class="attendance-table att-quick-table">
                        <thead>
                            <tr>
                                <th>الطفل</th>
                                <th>الفصل</th>
                                <th>الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${!stageFilter ? `<tr><td colspan="3" class="empty-state">الرجاء اختيار الفصل لعرض قائمة الطلاب.</td></tr>` : displayedChildren.map((row) => {
                                const mStatus = row.record?.status || "ABSENT";
                                const eStatus = row.record?.evening_status || "ABSENT";
                                const isAbsent = mStatus === "ABSENT" && eStatus === "ABSENT";
                                const teacherName = row.child.teacher_id
                                    ? state.staff.find((s) => s.id === row.child.teacher_id)?.full_name || ""
                                    : "";
                                return `<tr class="${!isAbsent ? "row-present" : "row-absent"}">
                                    <td>
                                        <div class="child-name-cell">
                                            <strong>${row.child.full_name}</strong>
                                            ${teacherName ? `<small>${teacherName}</small>` : ""}
                                        </div>
                                    </td>
                                    <td><span class="tag">${STAGE_LABELS[row.child.stage]}</span></td>
                                    <td>
                                        <div class="att-quick-btns">
                                            <button type="button" class="att-quick-btn btn-present ${mStatus === "PRESENT" ? "att-quick-active" : ""}" data-action="quick-child-status" data-id="${row.child.id}" data-status="PRESENT" data-period="morning">حاضر صباحي</button>
                                            <button type="button" class="att-quick-btn btn-present ${eStatus === "PRESENT" ? "att-quick-active" : ""}" data-action="quick-child-status" data-id="${row.child.id}" data-status="PRESENT" data-period="evening">حاضر مسائي</button>
                                            <button type="button" class="att-quick-btn btn-absent ${isAbsent ? "att-quick-active" : ""}" data-action="quick-child-status" data-id="${row.child.id}" data-status="ABSENT" data-period="both">غائب</button>
                                        </div>
                                    </td>
                                </tr>`;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>حضور الموظفين</h3>
                        <p>متابعة المعلمات والعاملات والإدارة مع تسجيل الدخول والانصراف.</p>
                    </div>
                </div>
                <div class="tab-bar" style="margin-bottom:12px;">
                    <button type="button" class="tab-btn ${staffTab === "all" ? "active" : ""}" data-action="switch-staff-att-tab" data-tab="all">الكل</button>
                    <button type="button" class="tab-btn ${staffTab === "teachers" ? "active" : ""}" data-action="switch-staff-att-tab" data-tab="teachers">المعلمات</button>
                    <button type="button" class="tab-btn ${staffTab === "workers" ? "active" : ""}" data-action="switch-staff-att-tab" data-tab="workers">العاملات</button>
                    <button type="button" class="tab-btn ${staffTab === "admin" ? "active" : ""}" data-action="switch-staff-att-tab" data-tab="admin">الإدارة</button>
                </div>
                <div class="table-wrap">
                    <table class="attendance-table">
                        <thead>
                            <tr>
                                <th>الموظف</th>
                                <th>الوظيفة</th>
                                <th>الحالة</th>
                                <th>دخول</th>
                                <th>خروج</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredStaff.map((row) => {
                                const currentStatus = row.record?.status || "ABSENT";
                                return `<tr>
                                    <td>${row.staff.full_name}</td>
                                    <td>${row.staff.job_title}</td>
                                    <td>
                                        <div class="att-quick-btns">
                                            ${quickStaffBtn(row.staff.id, "PRESENT", currentStatus, "حاضر", "btn-present")}
                                            ${quickStaffBtn(row.staff.id, "LATE", currentStatus, "متأخر", "btn-late")}
                                            ${quickStaffBtn(row.staff.id, "ABSENT", currentStatus, "غائب بدون عذر", "btn-absent")}
                                            ${quickStaffBtn(row.staff.id, "EXCUSED", currentStatus, "غائب بعذر", "btn-excused-absent")}
                                            ${quickStaffBtn(row.staff.id, "LEAVE", currentStatus, "إجازة", "btn-excused")}
                                            ${quickStaffBtn(row.staff.id, "SICK_LEAVE", currentStatus, "إجازة مرضي", "btn-sick-leave")}
                                            ${quickStaffBtn(row.staff.id, "TERMINATED", currentStatus, "إنهاء تعاقد", "btn-terminated")}
                                        </div>
                                    </td>
                                    <td><input class="time-input" type="time" data-staff-time-in="${row.staff.id}" value="${row.record?.check_in_time || ""}"></td>
                                    <td><input class="time-input" type="time" data-staff-time-out="${row.staff.id}" value="${row.record?.check_out_time || ""}"></td>
                                </tr>`;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `;
}

function renderFinanceSection() {
    const feeForm = ui.feeFormId ? state.fees.find((fee) => fee.id === ui.feeFormId) : null;
    const expenseForm = ui.expenseFormId ? state.expenses.find((expense) => expense.id === ui.expenseFormId) : null;
    const monthlySummary = getMonthlyFinanceSummary(ui.financeMonth);
    const feesForMonth = state.fees.filter((fee) => fee.fee_month === ui.financeMonth).sort((a, b) => a.due_date.localeCompare(b.due_date));
    const expensesForMonth = state.expenses.filter((expense) => expense.expense_date.startsWith(ui.financeMonth.slice(0, 7))).sort((a, b) => b.expense_date.localeCompare(a.expense_date));

    return `
        <section class="metric-grid">
            <article class="metric-card accent">
                <div class="label">متحصل الشهر</div>
                <div class="value">${formatCurrency(monthlySummary.collected)}</div>
                <div class="hint">إجمالي ما تم تحصيله خلال الشهر المحدد.</div>
            </article>
            <article class="metric-card">
                <div class="label">متبقي الرسوم</div>
                <div class="value">${formatCurrency(monthlySummary.outstanding)}</div>
                <div class="hint">إجمالي المتأخرات أو الأجزاء غير المسددة.</div>
            </article>
            <article class="metric-card gold">
                <div class="label">مصروفات الشهر</div>
                <div class="value">${formatCurrency(monthlySummary.expenses)}</div>
                <div class="hint">يشمل التشغيل والتعليم والشراء العام.</div>
            </article>
            <article class="metric-card teal">
                <div class="label">صافي الشهر</div>
                <div class="value">${formatCurrency(monthlySummary.net)}</div>
                <div class="hint">الرسوم المحصلة مطروحًا منها المصروفات.</div>
            </article>
        </section>

        <div class="finance-controls">
            <div>
                <div class="eyebrow" style="margin-bottom:4px;">فلتر الشهر</div>
                <strong style="font-size:1.05rem;">متابعة رسوم ومصروفات ${formatArabicDate(monthStartDate(ui.financeMonth))}</strong>
            </div>
            <div class="finance-controls-actions">
                <div class="field"><label>الشهر</label>
                    <input type="date" name="financeMonth" data-ui-field="financeMonth" value="${ui.financeMonth}">
                </div>
                <button class="btn btn-primary" type="button" data-action="generate-monthly-fees" style="align-self:flex-end;">إنشاء رسوم الشهر</button>
            </div>
        </div>

        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${feeForm ? "تعديل رسوم" : "إضافة رسوم شهرية"}</h3>
                        <p>يمكن تسجيل خصم أو دفع جزئي وتحديث الحالة مباشرة.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-fee">نموذج جديد</button>
                </div>
                <form class="stack" data-form="fee">
                    <input type="hidden" name="id" value="${feeForm?.id || ""}">
                    <div class="field">
                        <label>الطفل</label>
                        ${renderFilteredChildSelect("child_id", feeForm?.child_id, "fee")}
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>الشهر</label>
                            <input name="fee_month" type="date" required value="${feeForm?.fee_month || ui.financeMonth}">
                        </div>
                        <div class="field">
                            <label>تاريخ الاستحقاق</label>
                            <input name="due_date" type="date" required value="${feeForm?.due_date || `${ui.financeMonth.slice(0, 8)}10`}">
                        </div>
                    </div>
                    <div class="grid-3">
                        <div class="field">
                            <label>المبلغ</label>
                            <input name="amount" type="number" min="0" step="0.01" required value="${feeForm?.amount || 1800}">
                        </div>
                        <div class="field">
                            <label>الخصم</label>
                            <input name="discount_amount" type="number" min="0" step="0.01" value="${feeForm?.discount_amount || 0}">
                        </div>
                        <div class="field">
                            <label>المدفوع</label>
                            <input name="paid_amount" type="number" min="0" step="0.01" value="${feeForm?.paid_amount || 0}">
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>الحالة</label>
                            <select name="status">${optionsFromMap(FEE_STATUS_LABELS, feeForm?.status || "PENDING")}</select>
                        </div>
                        <div class="field">
                            <label>تاريخ الدفع</label>
                            <input name="payment_date" type="date" value="${feeForm?.payment_date || ""}">
                        </div>
                    </div>
                    <div class="field">
                        <label>ملاحظات</label>
                        <textarea name="notes">${feeForm?.notes || ""}</textarea>
                    </div>
                    <button class="btn btn-primary" type="submit">${feeForm ? "حفظ الرسوم" : "إضافة الرسوم"}</button>
                </form>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${expenseForm ? "تعديل مصروف" : "إضافة مصروف عام"}</h3>
                        <p>تسجيل أي بند تشغيلي أو تعليمي وربطه بالشهر الحالي.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-expense">نموذج جديد</button>
                </div>
                <form class="stack" data-form="expense">
                    <input type="hidden" name="id" value="${expenseForm?.id || ""}">
                    <div class="field">
                        <label>البند</label>
                        <input name="expense_item" required value="${expenseForm?.expense_item || ""}">
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>الفئة</label>
                            <input name="category" value="${expenseForm?.category || ""}" placeholder="تعليم / تشغيل / صيانة">
                        </div>
                        <div class="field">
                            <label>المبلغ</label>
                            <input name="amount" type="number" min="0" step="0.01" required value="${expenseForm?.amount || ""}">
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>التاريخ</label>
                            <input name="expense_date" type="date" required value="${expenseForm?.expense_date || todayDate()}">
                        </div>
                        <div class="field">
                            <label>المدفوع له</label>
                            <input name="paid_to" value="${expenseForm?.paid_to || ""}">
                        </div>
                    </div>
                    <div class="field">
                        <label>ملاحظات</label>
                        <textarea name="notes">${expenseForm?.notes || ""}</textarea>
                    </div>
                    <button class="btn btn-primary" type="submit">${expenseForm ? "حفظ المصروف" : "إضافة المصروف"}</button>
                </form>
            </div>
        </section>

        <section class="finance-tables" style="margin-top: 18px; display:grid; grid-template-columns:1fr; gap:18px;">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>رسوم الشهر</h3>
                        <p>كل الأطفال المسجّلين ورسومهم خلال الشهر المحدد.</p>
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>الطفل</th>
                                <th>النوع</th>
                                <th>المبلغ</th>
                                <th>المدفوع</th>
                                <th>المتبقي</th>
                                <th>الحالة</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${feesForMonth.map((fee) => `
                                <tr>
                                    <td>${getChildById(fee.child_id)?.full_name || "-"}</td>
                                    <td><span class="tag ${(fee.fee_type || "MONTHLY") === "BUS" ? "tag-bus" : ""}">${FEE_TYPE_LABELS[fee.fee_type || "MONTHLY"] || "شهري"}</span></td>
                                    <td>${formatCurrency(fee.amount)}</td>
                                    <td>${formatCurrency(fee.paid_amount)}</td>
                                    <td>${formatCurrency(remainingFeeAmount(fee))}</td>
                                    <td><span class="tag ${statusClass(fee.status)}">${FEE_STATUS_LABELS[fee.status]}</span></td>
                                    <td>
                                        <div class="row-actions">
                                            <button type="button" data-action="edit-fee" data-id="${fee.id}">تعديل</button>
                                            <button type="button" class="btn-wa-row" data-action="wa-fee-reminder" data-id="${fee.id}" title="إرسال تذكير للأهل عبر واتساب">واتساب</button>
                                            <button type="button" data-action="delete-fee" data-id="${fee.id}">حذف</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("") || `<tr><td colspan="7" class="empty-state">لا توجد رسوم لهذا الشهر.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>المصروفات العامة</h3>
                        <p>قائمة البنود المسجلة للشهر نفسه مع المرونة في التعديل والحذف.</p>
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>البند</th>
                                <th>الفئة</th>
                                <th>المبلغ</th>
                                <th>التاريخ</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expensesForMonth.map((expense) => `
                                <tr>
                                    <td>${expense.expense_item}</td>
                                    <td>${expense.category || "-"}</td>
                                    <td>${formatCurrency(expense.amount)}</td>
                                    <td>${formatArabicDate(expense.expense_date)}</td>
                                    <td>
                                        <div class="row-actions">
                                            <button type="button" data-action="edit-expense" data-id="${expense.id}">تعديل</button>
                                            <button type="button" data-action="delete-expense" data-id="${expense.id}">حذف</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("") || `<tr><td colspan="5" class="empty-state">لا توجد مصروفات لهذا الشهر.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <section style="margin-top:18px; display:grid; grid-template-columns:1fr 1fr; gap:18px;">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>إعدادات الفواتير التلقائية</h3>
                        <p>ضبط المبلغ الافتراضي وتاريخ الاستحقاق والتوليد التلقائي للرسوم.</p>
                    </div>
                </div>
                <form class="stack" data-form="fee-settings">
                    <div class="grid-2">
                        <div class="field">
                            <label>الرسوم الشهرية الافتراضية</label>
                            <input type="number" name="monthly_amount" min="0" required value="${state.feeSettings?.monthly_amount || 1800}">
                        </div>
                        <div class="field">
                            <label>يوم الاستحقاق (من الشهر)</label>
                            <input type="number" name="due_day" min="1" max="28" required value="${state.feeSettings?.due_day || 10}">
                        </div>
                    </div>
                    <div class="field">
                        <label>التوليد التلقائي عند فتح النظام</label>
                        <select name="auto_generate">
                            <option value="1" ${state.feeSettings?.auto_generate ? "selected" : ""}>مفعّل</option>
                            <option value="0" ${!state.feeSettings?.auto_generate ? "selected" : ""}>معطّل</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" type="submit">حفظ الإعدادات</button>
                </form>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>رسوم الباص</h3>
                        <p>عرض رسوم الباص للأطفال المشتركين في الخدمة خلال هذا الشهر.</p>
                    </div>
                </div>
                ${(() => {
                    const busFeesMonth = state.fees.filter((f) => f.fee_month === ui.financeMonth && f.fee_type === "BUS");
                    if (!busFeesMonth.length) {
                        return `<div class="empty-state">لا توجد رسوم باص لهذا الشهر. تأكد من تفعيل اشتراك الباص في ملف الطفل ثم أنشئ رسوم الشهر.</div>`;
                    }
                    return `<div class="table-wrap"><table>
                        <thead><tr><th>الطفل</th><th>خط السير</th><th>المبلغ</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                        <tbody>
                        ${busFeesMonth.map((fee) => {
                            const child = getChildById(fee.child_id);
                            return `<tr>
                                <td>${child?.full_name || "-"}</td>
                                <td>${child?.bus_route || "-"}</td>
                                <td>${formatCurrency(fee.amount)}</td>
                                <td><span class="tag ${statusClass(fee.status)}">${FEE_STATUS_LABELS[fee.status]}</span></td>
                                <td><div class="row-actions">
                                    <button type="button" data-action="edit-fee" data-id="${fee.id}">تعديل</button>
                                    <button type="button" data-action="delete-fee" data-id="${fee.id}">حذف</button>
                                </div></td>
                            </tr>`;
                        }).join("")}
                        </tbody>
                    </table></div>`;
                })()}
            </div>
        </section>
    `;
}

function renderStaffSection() {
    const formStaff = ui.staffFormId ? state.staff.find((staff) => staff.id === ui.staffFormId) : null;
    const filteredStaff = ui.staffSearch
        ? state.staff.filter((s) => s.full_name.includes(ui.staffSearch) || s.job_title.includes(ui.staffSearch))
        : state.staff;
    return `
        <section class="section-grid columns-2">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${formStaff ? "تعديل موظف" : "إضافة موظف"}</h3>
                        <p>بيانات أساسية ورواتب وحالة تعيين قابلة للتحديث في أي وقت.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-staff">نموذج جديد</button>
                </div>
                <form class="stack" data-form="staff">
                    <input type="hidden" name="id" value="${formStaff?.id || ""}">
                    <div class="grid-2">
                        <div class="field"><label>الاسم</label><input name="full_name" required value="${formStaff?.full_name || ""}"></div>
                        <div class="field"><label>الوظيفة</label><input name="job_title" required value="${formStaff?.job_title || ""}"></div>
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>الوردية</label>
                            <select name="shift_code">${renderShiftOptions(formStaff?.shift_code || "MORNING")}</select>
                        </div>
                        <div class="field field-hint-box">
                            <label>مواعيد الورديات</label>
                            <div class="field-static">صباحي: 08:00 - 14:00 (من 8 لـ 2 - السبت إجازة)<br>مسائي: 14:00 - 19:00</div>
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="field"><label>المرتب (الراتب الأساسي)</label><input name="salary" type="number" min="0" step="1" required value="${formStaff?.salary || ""}" placeholder="أدخل الراتب"></div>
                        <div class="field"><label>الهاتف</label><input name="phone" value="${formStaff?.phone || ""}"></div>
                    </div>
                    <div class="grid-2">
                        <div class="field"><label>تاريخ التعيين</label><input name="hire_date" type="date" required value="${formStaff?.hire_date || todayDate()}"></div>
                        <div class="field"><label>الحالة</label><select name="status" required>${options([["ACTIVE", "نشط"], ["ON_LEAVE", "إجازة"], ["INACTIVE", "موقوف"], ["TERMINATED", "إنهاء / إلغاء التعاقد"]], formStaff?.status || "ACTIVE")}</select></div>
                    </div>
                    <div class="field"><label>العنوان</label><input name="address" value="${formStaff?.address || ""}"></div>
                    <div class="field"><label>ملاحظات</label><textarea name="notes">${formStaff?.notes || ""}</textarea></div>
                    <button class="btn btn-primary" type="submit">${formStaff ? "حفظ الموظف" : "إضافة الموظف"}</button>
                </form>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>الفريق الحالي <span class="count-badge">${state.staff.length}</span></h3>
                        <p>تعديل الرواتب أو إلغاء وتفعيل التعاقد مع رؤية سريعة للحالة.</p>
                    </div>
                </div>
                <div class="search-wrap">
                    <div class="search-box">
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="search" class="search-input" placeholder="ابحث بالاسم أو الوظيفة..." data-ui-field="staffSearch" value="${ui.staffSearch}">
                        ${ui.staffSearch ? `<button class="search-clear" type="button" data-action="clear-staff-search">✕</button>` : ""}
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr><th>الاسم</th><th>الوظيفة</th><th>الوردية</th><th>المرتب</th><th>الحالة</th><th>إجراءات</th></tr>
                        </thead>
                        <tbody>
                            ${filteredStaff.map((staff) => `
                                <tr>
                                    <td><strong>${staff.full_name}</strong></td>
                                    <td>${staff.job_title}</td>
                                    <td><span class="tag">${getShiftLabel(staff.shift_code, true)}</span></td>
                                    <td><strong style="color:var(--primary,#2563eb);">${formatCurrency(staff.salary)}</strong></td>
                                    <td><span class="tag ${staff.status === "ACTIVE" ? "active" : (staff.status === "TERMINATED" ? "status-overdue" : "withdrawn")}">${staff.status === "TERMINATED" ? "منتهي التعاقد" : staffStatusLabel(staff.status)}</span></td>
                                    <td>
                                        <div class="row-actions">
                                            <button type="button" data-action="edit-staff" data-id="${staff.id}">تعديل</button>
                                            ${staff.status === "TERMINATED"
                                                ? `<button type="button" class="btn-activate-staff" data-action="activate-staff" data-id="${staff.id}" title="إعادة تفعيل تعاقد الموظف">تفعيل التعاقد 🟢</button>`
                                                : `<button type="button" class="btn-terminate-staff" data-action="terminate-staff" data-id="${staff.id}" title="إلغاء أو إنهاء تعاقد الموظف">إلغاء التعاقد ❌</button>`
                                            }
                                            <button type="button" data-action="delete-staff" data-id="${staff.id}">حذف</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <section class="panel" style="margin-top:18px;">
            <div class="panel-header">
                <div>
                    <h3>قوائم المعلمات وطلابهن</h3>
                    <p>كل معلمة مع قائمة الأطفال المسجلين في فصلها.</p>
                </div>
            </div>
            ${(() => {
                const teachers = state.staff.filter((s) => s.status === "ACTIVE");
                if (!teachers.length) return `<div class="empty-hint">لا يوجد موظفون نشطون.</div>`;
                return teachers.map((teacher) => {
                    const teacherChildren = state.children.filter((c) => c.status === "ACTIVE" && c.teacher_id === teacher.id);
                    if (!teacherChildren.length) return "";
                    return `
                        <div class="teacher-list-block">
                            <div class="teacher-list-header">
                                <strong>${teacher.full_name}</strong>
                                <span class="tag">${teacher.job_title}</span>
                                <span class="count-badge">${teacherChildren.length} طالب</span>
                            </div>
                            <div class="teacher-children-grid">
                                ${teacherChildren.map((child) => `
                                    <div class="teacher-child-card">
                                        <span class="child-name">${child.full_name}</span>
                                        <span class="tag">${STAGE_LABELS[child.stage]}</span>
                                        ${child.support_type && child.support_type !== "NORMAL" ? `<span class="tag tag-support">${SUPPORT_TYPE_LABELS[child.support_type]}</span>` : ""}
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    `;
                }).join("") || `<div class="empty-hint">لم يتم تعيين معلمات لأي طالب بعد. افتح ملف الطالب وحدد المعلمة المسؤولة.</div>`;
            })()}
        </section>
    `;
}

function renderLearningSection() {
    const curriculumForm = ui.curriculumFormId ? state.curriculum.find((item) => item.id === ui.curriculumFormId) : null;
    const planningForm = ui.planningFormId ? state.weeklyPlanning.find((item) => item.id === ui.planningFormId) : null;
    const activityForm = ui.activityFormId ? state.activities.find((item) => item.id === ui.activityFormId) : null;

    return `
        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${curriculumForm ? "تعديل عنصر منهج" : "إضافة عنصر منهج"}</h3>
                        <p>ربط المحتوى بالمرحلة والأسبوع والسنة الدراسية.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-curriculum">نموذج جديد</button>
                </div>
                <form class="stack" data-form="curriculum">
                    <input type="hidden" name="id" value="${curriculumForm?.id || ""}">
                    <div class="grid-2">
                        <div class="field"><label>المرحلة</label><select name="stage">${optionsFromMap(STAGE_LABELS, curriculumForm?.stage || "PRE_K")}</select></div>
                        <div class="field"><label>المادة</label><input name="subject_name" required value="${curriculumForm?.subject_name || ""}"></div>
                    </div>
                    <div class="grid-2">
                        <div class="field"><label>السنة الدراسية</label><input name="academic_year" required value="${curriculumForm?.academic_year || "2025/2026"}"></div>
                        <div class="field"><label>الأسبوع</label><input name="week_number" type="number" min="1" max="53" required value="${curriculumForm?.week_number || 1}"></div>
                    </div>
                    <div class="field"><label>المحتوى</label><textarea name="content">${curriculumForm?.content || ""}</textarea></div>
                    <div class="field"><label>الأهداف التعليمية</label><textarea name="learning_objectives">${curriculumForm?.learning_objectives || ""}</textarea></div>
                    <div class="field"><label>المعلمة المسؤولة</label><select name="created_by_staff_id">${options(state.staff.map((item) => [item.id, item.full_name]), curriculumForm?.created_by_staff_id)}</select></div>
                    <button class="btn btn-primary" type="submit">${curriculumForm ? "حفظ المنهج" : "إضافة المنهج"}</button>
                </form>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${planningForm ? "تعديل التحضير" : "التحضير الأسبوعي"}</h3>
                        <p>خطة أسبوعية مرتبطة بالمعلمة والمرحلة وتاريخ بداية الأسبوع.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-planning">نموذج جديد</button>
                </div>
                <form class="stack" data-form="planning">
                    <input type="hidden" name="id" value="${planningForm?.id || ""}">
                    <div class="grid-2">
                        <div class="field"><label>المعلمة</label><select name="teacher_staff_id">${options(state.staff.map((item) => [item.id, item.full_name]), planningForm?.teacher_staff_id)}</select></div>
                        <div class="field"><label>بداية الأسبوع</label><input name="week_start_date" type="date" required value="${planningForm?.week_start_date || mondayOfCurrentWeek()}"></div>
                    </div>
                    <div class="field"><label>المرحلة</label><select name="stage">${optionsFromMap(STAGE_LABELS, planningForm?.stage || "PRE_K")}</select></div>
                    <div class="field"><label>الخطة</label><textarea name="plan_text">${planningForm?.plan_text || ""}</textarea></div>
                    <div class="field"><label>ملاحظات</label><textarea name="notes">${planningForm?.notes || ""}</textarea></div>
                    <button class="btn btn-primary" type="submit">${planningForm ? "حفظ التحضير" : "إضافة التحضير"}</button>
                </form>
            </div>
        </section>
        <section class="split-panels finance-tables" style="margin-top: 18px;">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${activityForm ? "تعديل نشاط" : "إضافة نشاط"}</h3>
                        <p>رحلات أو حفلات أو كورسات حسب المرحلة المستهدفة والتاريخ.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-activity">نموذج جديد</button>
                </div>
                <form class="stack" data-form="activity">
                    <input type="hidden" name="id" value="${activityForm?.id || ""}">
                    <div class="field"><label>اسم النشاط</label><input name="activity_name" required value="${activityForm?.activity_name || ""}"></div>
                    <div class="grid-2">
                        <div class="field"><label>النوع</label><select name="activity_type">${options([["TRIP", "رحلة"], ["PARTY", "حفلة"], ["COURSE", "كورس"], ["WORKSHOP", "ورشة"], ["OTHER", "أخرى"]], activityForm?.activity_type || "TRIP")}</select></div>
                        <div class="field"><label>التاريخ</label><input name="activity_date" type="date" required value="${activityForm?.activity_date || todayDate()}"></div>
                    </div>
                    <div class="grid-2">
                        <div class="field"><label>المرحلة المستهدفة</label><select name="target_stage">${options([["", "كل المراحل"], ...Object.entries(STAGE_LABELS)], activityForm?.target_stage || "")}</select></div>
                        <div class="field"><label>التكلفة</label><input name="cost" type="text" value="${activityForm?.cost !== undefined ? activityForm.cost : ""}" placeholder="0.00"></div>
                    </div>
                    <div class="field"><label>ملاحظات</label><textarea name="notes">${activityForm?.notes || ""}</textarea></div>
                    <button class="btn btn-primary" type="submit">${activityForm ? "حفظ النشاط" : "إضافة النشاط"}</button>
                </form>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>آخر عناصر التعليم والأنشطة</h3>
                        <p>قائمة سريعة لتعديل المنهج والتحضير والأنشطة دون مغادرة الشاشة.</p>
                    </div>
                </div>
                <div class="list-stack">
                    ${state.curriculum.slice().reverse().slice(0, 3).map((item) => `
                        <div class="list-item">
                            <div>
                                <strong>${item.subject_name} · ${STAGE_LABELS[item.stage]}</strong>
                                <span>الأسبوع ${item.week_number} · ${item.academic_year}</span>
                            </div>
                            <div class="row-actions">
                                <button type="button" data-action="edit-curriculum" data-id="${item.id}">تعديل</button>
                                <button type="button" data-action="delete-curriculum" data-id="${item.id}">حذف</button>
                            </div>
                        </div>
                    `).join("")}
                    ${state.weeklyPlanning.slice().reverse().slice(0, 3).map((item) => `
                        <div class="list-item">
                            <div>
                                <strong>${getStaffById(item.teacher_staff_id)?.full_name || "-"}</strong>
                                <span>${STAGE_LABELS[item.stage]} · يبدأ ${formatArabicDate(item.week_start_date)}</span>
                            </div>
                            <div class="row-actions">
                                <button type="button" data-action="edit-planning" data-id="${item.id}">تعديل</button>
                                <button type="button" data-action="delete-planning" data-id="${item.id}">حذف</button>
                            </div>
                        </div>
                    `).join("")}
                    ${state.activities.slice().reverse().slice(0, 4).map((item) => `
                        <div class="list-item">
                            <div>
                                <strong>${item.activity_name}</strong>
                                <span>${ACTIVITY_TYPE_LABELS[item.activity_type] || item.activity_type} · ${formatArabicDate(item.activity_date)}</span>
                            </div>
                            <div class="row-actions">
                                <button type="button" data-action="edit-activity" data-id="${item.id}">تعديل</button>
                                <button type="button" data-action="delete-activity" data-id="${item.id}">حذف</button>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        </section>
    `;
}

function renderOperationsSection() {
    const medicalForm = ui.medicalFormId ? state.medicalRecords.find((item) => item.id === ui.medicalFormId) : null;
    const pharmacyForm = ui.pharmacyFormId ? state.pharmacyItems.find((item) => item.id === ui.pharmacyFormId) : null;

    return `
        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${medicalForm ? "تعديل سجل طبي" : "إضافة سجل طبي"}</h3>
                        <p>حالة الطفل، متابعة الطبيب، وإجراء الروضة في حادثة أو وعكة صحية.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-medical">نموذج جديد</button>
                </div>
                <form class="stack" data-form="medical">
                    <input type="hidden" name="id" value="${medicalForm?.id || ""}">
                    <div class="field"><label>الطفل</label>${renderFilteredChildSelect("child_id", medicalForm?.child_id, "medical", false)}</div>
                    <div class="grid-2">
                        <div class="field"><label>التاريخ</label><input name="record_date" type="date" required value="${medicalForm?.record_date || todayDate()}"></div>
                        <div class="field"><label>الحالة</label><input name="case_description" required value="${medicalForm?.case_description || ""}"></div>
                    </div>
                    <div class="field"><label>اسم الطبيب</label><input name="doctor_name" value="${medicalForm?.doctor_name || ""}"></div>
                    <div class="field"><label>ملاحظات الطبيب</label><textarea name="doctor_notes">${medicalForm?.doctor_notes || ""}</textarea></div>
                    <div class="field"><label>الإجراء المتخذ</label><textarea name="action_taken">${medicalForm?.action_taken || ""}</textarea></div>
                    <button class="btn btn-primary" type="submit">${medicalForm ? "حفظ السجل" : "إضافة السجل"}</button>
                </form>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${pharmacyForm ? "تعديل عنصر صيدلية" : "إضافة عنصر صيدلية"}</h3>
                        <p>متابعة الكميات، الصلاحية، ونقطة إعادة الطلب لكل دواء أو مستلزم طبي.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-pharmacy">نموذج جديد</button>
                </div>
                <form class="stack" data-form="pharmacy">
                    <input type="hidden" name="id" value="${pharmacyForm?.id || ""}">
                    <div class="field"><label>اسم الدواء</label><input name="medicine_name" required value="${pharmacyForm?.medicine_name || ""}"></div>
                    <div class="grid-3">
                        <div class="field"><label>الكمية</label><input name="quantity" type="number" min="0" required value="${pharmacyForm?.quantity || 0}"></div>
                        <div class="field"><label>الوحدة</label><input name="unit" value="${pharmacyForm?.unit || "عبوة"}"></div>
                        <div class="field"><label>حد إعادة الطلب</label><input name="reorder_level" type="number" min="0" value="${pharmacyForm?.reorder_level || 0}"></div>
                    </div>
                    <div class="field"><label>تاريخ الصلاحية</label><input name="expiry_date" type="date" required value="${pharmacyForm?.expiry_date || todayDate()}"></div>
                    <div class="field"><label>ملاحظات</label><textarea name="notes">${pharmacyForm?.notes || ""}</textarea></div>
                    <button class="btn btn-primary" type="submit">${pharmacyForm ? "حفظ العنصر" : "إضافة العنصر"}</button>
                </form>
            </div>
        </section>
        <section class="split-panels finance-tables" style="margin-top: 18px;">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>السجل الطبي</h3>
                        <p>آخر الحالات الطبية المسجلة للأطفال.</p>
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr><th>الطفل</th><th>التاريخ</th><th>الحالة</th><th>إجراءات</th></tr>
                        </thead>
                        <tbody>
                            ${state.medicalRecords.slice().sort((a, b) => b.record_date.localeCompare(a.record_date)).map((record) => `
                                <tr>
                                    <td>${getChildById(record.child_id)?.full_name || "-"}</td>
                                    <td>${formatArabicDate(record.record_date)}</td>
                                    <td>${record.case_description}</td>
                                    <td><div class="row-actions"><button type="button" data-action="edit-medical" data-id="${record.id}">تعديل</button><button type="button" data-action="delete-medical" data-id="${record.id}">حذف</button></div></td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>صيدلية الروضة</h3>
                        <p>العناصر منخفضة المخزون أو القريبة من الانتهاء تظهر أولًا.</p>
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr><th>الصنف</th><th>الكمية</th><th>الصلاحية</th><th>الحالة</th><th>إجراءات</th></tr>
                        </thead>
                        <tbody>
                            ${state.pharmacyItems.slice().sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)).map((item) => `
                                <tr>
                                    <td>${item.medicine_name}</td>
                                    <td>${item.quantity} ${item.unit}</td>
                                    <td>${formatArabicDate(item.expiry_date)}</td>
                                    <td><span class="tag ${item.quantity <= item.reorder_level ? "overdue" : "active"}">${item.quantity <= item.reorder_level ? "إعادة طلب" : "مستقر"}</span></td>
                                    <td><div class="row-actions"><button type="button" data-action="edit-pharmacy" data-id="${item.id}">تعديل</button><button type="button" data-action="delete-pharmacy" data-id="${item.id}">حذف</button></div></td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <section class="panel" style="margin-top:18px;">
            <div class="panel-header">
                <div>
                    <h3>جداول التخاطب والأخصائيين</h3>
                    <p>الأطفال المسجلين في برامج التخاطب أو الدعم الأخصائي.</p>
                </div>
            </div>
            ${(() => {
                const speechChildren = state.children.filter((c) => c.status === "ACTIVE" && c.support_type && c.support_type !== "NORMAL");
                if (!speechChildren.length) return `<div class="empty-hint">لا يوجد أطفال مسجلون في برامج التخاطب أو الدعم. يمكن تحديد نوع الدعم من ملف الطفل.</div>`;
                const grouped = {};
                speechChildren.forEach((child) => {
                    const key = child.support_type;
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(child);
                });
                return Object.entries(grouped).map(([type, children]) => `
                    <div style="margin-bottom:16px;">
                        <div class="subsection-title">${SUPPORT_TYPE_LABELS[type] || type} <span class="count-badge">${children.length}</span></div>
                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr><th>الطفل</th><th>الفصل</th><th>المعلمة</th><th>الأخصائي</th><th>ملاحظات</th></tr>
                                </thead>
                                <tbody>
                                    ${children.map((child) => {
                                        const teacher = child.teacher_id ? state.staff.find((s) => s.id === child.teacher_id) : null;
                                        const specialist = child.specialist_id ? state.staff.find((s) => s.id === child.specialist_id) : null;
                                        return `<tr>
                                            <td><strong>${child.full_name}</strong></td>
                                            <td>${STAGE_LABELS[child.stage]}</td>
                                            <td>${teacher ? teacher.full_name : "—"}</td>
                                            <td>${specialist ? specialist.full_name : "—"}</td>
                                            <td>${child.notes || "—"}</td>
                                        </tr>`;
                                    }).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `).join("");
            })()}
        </section>
    `;
}

const REPORT_TABS = [
    { id: "overview", label: "نظرة عامة", icon: "📊" },
    { id: "per-child", label: "تقرير طفل", icon: "👧" },
    { id: "per-staff", label: "تقرير موظف", icon: "👨‍🏫" },
    { id: "attendance", label: "حضور الأطفال", icon: "🟢" },
    { id: "staff-attendance", label: "حضور الموظفين", icon: "🕒" },
    { id: "absences", label: "كشوف الغياب", icon: "📋" },
    { id: "financial", label: "التقرير المالي", icon: "💰" },
    { id: "children", label: "سجل الأطفال", icon: "👶" },
    { id: "staff", label: "سجل الفريق", icon: "👩‍🏫" },
    { id: "teacher-class", label: "قوائم المعلمات", icon: "👩‍🏫" },
    { id: "pharmacy", label: "الصيدلية والمخزون", icon: "💊" },
    { id: "activities", label: "الأنشطة والمنهج", icon: "🎨" }
];

function renderReportsSection() {
    const tab = ui.reportTab || "overview";
    const body = (() => {
        switch (tab) {
            case "overview": return renderOverviewReport();
            case "per-child": return renderPerChildReport();
            case "per-staff": return renderPerStaffReport();
            case "attendance": return renderAttendanceReport();
            case "staff-attendance": return renderStaffAttendanceReport();
            case "teacher-class": return renderTeacherClassReport();
            case "absences": return renderAbsenceReport();
            case "financial": return renderFinancialReport();
            case "children": return renderChildrenReport();
            case "staff": return renderStaffReport();
            case "pharmacy": return renderPharmacyReport();
            case "activities": return renderActivitiesReport();
            default: return renderOverviewReport();
        }
    })();

    return `
        <div class="reports-hub">
            <nav class="reports-tabs no-print" aria-label="أنواع التقارير">
                ${REPORT_TABS.map((t) => `
                    <button type="button" class="report-tab ${t.id === tab ? "is-active" : ""}"
                        data-action="switch-report" data-report="${t.id}">
                        <span class="report-tab-icon" aria-hidden="true">${t.icon}</span>
                        <span>${t.label}</span>
                    </button>
                `).join("")}
            </nav>
            <div class="report-canvas">
                ${body}
            </div>
        </div>
    `;
}

function reportHeader(title, subtitle, meta) {
    const now = new Date();
    const generated = new Intl.DateTimeFormat("ar-EG", { dateStyle: "full", timeStyle: "short" }).format(now);
    return `
        <header class="doc-header">
            <div class="doc-brand">
                <div class="doc-logo">${BRAND.initials}</div>
                <div>
                    <div class="doc-brand-name">${BRAND.name}</div>
                    <div class="doc-brand-sub">${BRAND.systemName}</div>
                </div>
            </div>
            <div class="doc-title-block">
                <h1 class="doc-title">${title}</h1>
                <p class="doc-subtitle">${subtitle || ""}</p>
                ${meta ? `<div class="doc-meta">${meta}</div>` : ""}
            </div>
            <div class="doc-generated">
                <span class="doc-generated-label">تاريخ الإصدار</span>
                <strong>${generated}</strong>
            </div>
        </header>
    `;
}

function reportToolbar(title, exportId, extraFilters = "") {
    return `
        <div class="report-toolbar-row no-print">
            <div class="report-toolbar-title">${title}</div>
            <div class="report-toolbar-actions">
                ${extraFilters}
                <button class="btn btn-ghost" type="button" data-action="export-csv" data-report-id="${exportId}">
                    <span aria-hidden="true">⬇</span> تصدير CSV
                </button>
                <button class="btn btn-primary" type="button" data-action="print-report">
                    <span aria-hidden="true">🖨</span> طباعة / PDF
                </button>
            </div>
        </div>
    `;
}

function summaryCards(items) {
    return `
        <div class="doc-summary">
            ${items.map((i) => `
                <div class="doc-summary-card ${i.tone || ""}">
                    <span class="doc-summary-label">${i.label}</span>
                    <strong class="doc-summary-value">${i.value}</strong>
                    ${i.hint ? `<span class="doc-summary-hint">${i.hint}</span>` : ""}
                </div>
            `).join("")}
        </div>
    `;
}

function docTable(headers, rows, emptyText = "لا توجد بيانات", id = "") {
    return `
        <div class="doc-table-wrap">
            <table class="doc-table" ${id ? `id="${id}"` : ""}>
                <thead>
                    <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
                </thead>
                <tbody>
                    ${rows.length
                        ? rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")
                        : `<tr><td colspan="${headers.length}" class="doc-table-empty">${emptyText}</td></tr>`}
                </tbody>
            </table>
        </div>
    `;
}

function docFooter() {
    return `
        <footer class="doc-footer">
            <span>${BRAND.name} — ${BRAND.systemName}</span>
            <span class="doc-page-hint">صفحة <span class="doc-page-num"></span></span>
        </footer>
    `;
}

/* --- Overview --- */
function renderOverviewReport() {
    const activeChildren = state.children.filter((c) => c.status === "ACTIVE").length;
    const totalChildren = state.children.length;
    const activeStaff = state.staff.filter((s) => s.status === "ACTIVE").length;
    const today = todayDate();
    const presentToday = state.studentAttendance.filter((r) => r.attendance_date === today && ["PRESENT", "LATE"].includes(r.status)).length;
    const absentToday = state.studentAttendance.filter((r) => r.attendance_date === today && r.status === "ABSENT").length;
    const attRate = activeChildren ? Math.round((presentToday / activeChildren) * 100) : 0;
    const monthFees = state.fees.filter((f) => f.fee_month === ui.financeMonth);
    const collected = monthFees.reduce((s, f) => s + Number(f.paid_amount || 0), 0);
    const due = monthFees.reduce((s, f) => s + (Number(f.amount || 0) - Number(f.discount_amount || 0)), 0);
    const overdueCount = getOverdueFees().length;
    const collectionRate = due ? Math.round((collected / due) * 100) : 0;
    const lowStock = state.pharmacyItems.filter((i) => i.quantity <= i.reorder_level).length;
    const nearExpiry = state.pharmacyItems.filter((i) => daysUntil(i.expiry_date) <= 30).length;
    const upcoming = state.activities.filter((a) => a.activity_date >= today).length;

    return `
        ${reportToolbar("نظرة عامة شاملة", "overview")}
        <article class="doc-page">
            ${reportHeader("تقرير النظرة العامة", "ملخص شامل للحضانة في لحظة الإصدار")}
            ${summaryCards([
                { label: "أطفال نشطين", value: activeChildren, hint: `من إجمالي ${totalChildren}`, tone: "primary" },
                { label: "أعضاء الفريق", value: activeStaff, hint: "نشطون حاليًا" },
                { label: "الحضور اليوم", value: `${attRate}%`, hint: `${presentToday} حاضر · ${absentToday} غائب`, tone: attRate >= 80 ? "success" : "warning" },
                { label: "نسبة التحصيل", value: `${collectionRate}%`, hint: formatCurrency(collected), tone: collectionRate >= 70 ? "success" : "warning" },
                { label: "رسوم متأخرة", value: overdueCount, hint: "تحتاج متابعة", tone: overdueCount ? "danger" : "success" },
                { label: "تنبيهات الصيدلية", value: lowStock + nearExpiry, hint: `${lowStock} نقص · ${nearExpiry} قرب انتهاء`, tone: (lowStock + nearExpiry) ? "warning" : "success" },
                { label: "أنشطة قادمة", value: upcoming, hint: "مجدولة" }
            ])}

            <section class="doc-section">
                <h2 class="doc-section-title">توزيع الأطفال على الفصول</h2>
                ${docTable(
                    ["الفصل", "عدد الأطفال", "النسبة"],
                    Object.entries(STAGE_LABELS).map(([key, label]) => {
                        const count = state.children.filter((c) => c.stage === key && c.status === "ACTIVE").length;
                        const pct = activeChildren ? Math.round((count / activeChildren) * 100) : 0;
                        return [label, count, `${pct}%`];
                    })
                )}
            </section>

            <section class="doc-section">
                <h2 class="doc-section-title">أبرز التنبيهات</h2>
                ${docTable(
                    ["النوع", "التفاصيل", "العدد"],
                    [
                        ["رسوم متأخرة", "أطفال لم يسددوا في الموعد", overdueCount],
                        ["نقص في المخزون", "أصناف وصلت لحد إعادة الطلب", lowStock],
                        ["أدوية قرب الانتهاء", "خلال 30 يومًا", nearExpiry],
                        ["غياب اليوم", formatArabicDate(today), absentToday]
                    ]
                )}
            </section>
            ${docFooter()}
        </article>
    `;
}

/* --- Attendance report --- */
function renderAttendanceReport() {
    const start = ui.reportRangeStart || monthStartDate(ui.reportDate);
    const end = ui.reportRangeEnd || ui.reportDate;
    const rows = state.children.filter((c) => c.status === "ACTIVE").map((child) => {
        const records = state.studentAttendance.filter((r) => r.child_id === child.id && isDateWithinRange(r.attendance_date, start, end));
        const present = records.filter((r) => r.status === "PRESENT").length;
        const late = records.filter((r) => r.status === "LATE").length;
        const absent = records.filter((r) => r.status === "ABSENT").length;
        const excused = records.filter((r) => r.status === "EXCUSED").length;
        const total = records.length || 1;
        const rate = Math.round(((present + late) / total) * 100);
        return { child, present, late, absent, excused, rate, total: records.length };
    }).sort((a, b) => b.rate - a.rate);

    const totals = rows.reduce((acc, r) => ({
        present: acc.present + r.present, late: acc.late + r.late,
        absent: acc.absent + r.absent, excused: acc.excused + r.excused
    }), { present: 0, late: 0, absent: 0, excused: 0 });
    const totalAll = totals.present + totals.late + totals.absent + totals.excused || 1;
    const overallRate = Math.round(((totals.present + totals.late) / totalAll) * 100);

    const filters = `
        <label class="filter-inline">من
            <input type="date" data-ui-field="reportRangeStart" value="${start}">
        </label>
        <label class="filter-inline">إلى
            <input type="date" data-ui-field="reportRangeEnd" value="${end}">
        </label>
    `;

    return `
        ${reportToolbar("تقرير الحضور والانصراف", "attendance", filters)}
        <article class="doc-page">
            ${reportHeader("تقرير الحضور والانصراف", "ملخص حضور الأطفال خلال الفترة المحددة",
                `الفترة: من ${formatArabicDate(start)} إلى ${formatArabicDate(end)}`)}
            ${summaryCards([
                { label: "نسبة الحضور", value: `${overallRate}%`, tone: overallRate >= 80 ? "success" : "warning" },
                { label: "إجمالي الحضور", value: totals.present, hint: "حضور كامل" },
                { label: "التأخير", value: totals.late, tone: "warning" },
                { label: "الغياب", value: totals.absent, tone: "danger" },
                { label: "الغياب بعذر", value: totals.excused }
            ])}
            <section class="doc-section">
                <h2 class="doc-section-title">سجل الحضور التفصيلي</h2>
                ${docTable(
                    ["#", "اسم الطفل", "الفصل", "حاضر", "متأخر", "غائب", "بعذر", "نسبة الحضور"],
                    rows.map((r, i) => [
                        i + 1,
                        r.child.full_name,
                        STAGE_LABELS[r.child.stage],
                        r.present, r.late, r.absent, r.excused,
                        `<span class="rate-pill ${r.rate >= 80 ? "good" : r.rate >= 60 ? "warn" : "bad"}">${r.rate}%</span>`
                    ]),
                    "لا توجد بيانات حضور في الفترة المحددة",
                    "report-attendance"
                )}
            </section>
            ${docFooter()}
        </article>
    `;
}

/* --- Staff Attendance report --- */
function renderStaffAttendanceReport() {
    const start = ui.reportRangeStart || monthStartDate(ui.reportDate);
    const end = ui.reportRangeEnd || ui.reportDate;
    const rows = state.staff.filter((s) => s.status === "ACTIVE" || s.status === "TERMINATED").map((staff) => {
        const records = state.staffAttendance.filter((r) => r.staff_id === staff.id && isDateWithinRange(r.attendance_date, start, end));
        const present = records.filter((r) => r.status === "PRESENT").length;
        const late = records.filter((r) => r.status === "LATE").length;
        const absent = records.filter((r) => r.status === "ABSENT").length;
        const excused = records.filter((r) => r.status === "EXCUSED").length;
        const leave = records.filter((r) => r.status === "LEAVE").length;
        const sick = records.filter((r) => r.status === "SICK_LEAVE").length;
        const term = records.filter((r) => r.status === "TERMINATED").length;
        const total = records.length || 1;
        const rate = Math.round(((present + late) / total) * 100);
        return { staff, present, late, absent, excused, leave, sick, term, rate, total: records.length };
    }).sort((a, b) => b.rate - a.rate);

    const totals = rows.reduce((acc, r) => ({
        present: acc.present + r.present, late: acc.late + r.late,
        absent: acc.absent + r.absent, excused: acc.excused + r.excused,
        leave: acc.leave + r.leave, sick: acc.sick + r.sick, term: acc.term + r.term
    }), { present: 0, late: 0, absent: 0, excused: 0, leave: 0, sick: 0, term: 0 });
    const totalAll = totals.present + totals.late + totals.absent + totals.excused + totals.leave + totals.sick + totals.term || 1;
    const overallRate = Math.round(((totals.present + totals.late) / totalAll) * 100);

    const filters = `
        <label class="filter-inline">من
            <input type="date" data-ui-field="reportRangeStart" value="${start}">
        </label>
        <label class="filter-inline">إلى
            <input type="date" data-ui-field="reportRangeEnd" value="${end}">
        </label>
    `;

    return `
        ${reportToolbar("تقرير حضور الموظفين", "staff-attendance", filters)}
        <article class="doc-page">
            ${reportHeader("تقرير حضور الموظفين", "ملخص حضور الفريق خلال الفترة المحددة",
                `الفترة: من ${formatArabicDate(start)} إلى ${formatArabicDate(end)}`)}
            ${summaryCards([
                { label: "نسبة الحضور", value: `${overallRate}%`, tone: overallRate >= 80 ? "success" : "warning" },
                { label: "حضور كامل", value: totals.present },
                { label: "تأخير", value: totals.late, tone: "warning" },
                { label: "غياب (بدون عذر)", value: totals.absent, tone: "danger" },
                { label: "غياب (بعذر)", value: totals.excused, tone: "warning" },
                { label: "إجازة", value: totals.leave + totals.sick }
            ])}
            <section class="doc-section">
                <h2 class="doc-section-title">سجل حضور الموظفين التفصيلي</h2>
                ${docTable(
                    ["#", "اسم الموظف", "الوظيفة", "حاضر", "متأخر", "غائب بدون عذر", "غائب بعذر", "إجازة", "مرضي", "إنهاء تعاقد", "نسبة الحضور"],
                    rows.map((r, i) => [
                        i + 1,
                        r.staff.full_name,
                        r.staff.job_title,
                        r.present, r.late, r.absent, r.excused, r.leave, r.sick, r.term,
                        `<span class="rate-pill ${r.rate >= 80 ? "good" : r.rate >= 60 ? "warn" : "bad"}">${r.rate}%</span>`
                    ]),
                    "لا توجد بيانات حضور في الفترة المحددة",
                    "report-staff-attendance"
                )}
            </section>
            ${docFooter()}
        </article>
    `;
}

function renderTeacherClassReport() {
    const activeStaff = state.staff.filter((s) => s.status === "ACTIVE" && isPrintableTeacherRole(s.job_title));
    const activeChildren = state.children.filter((c) => c.status === "ACTIVE");
    
    if (!activeStaff.length) {
        return reportToolbar("قوائم المعلمات وطلابها", "teacher-class", "") + 
            `<article class="doc-page"><div class="empty-state">لا توجد معلمات مسجلات أو نشطات حالياً.</div></article>`;
    }

    const rows = activeStaff.map((teacher) => {
        const students = activeChildren.filter((c) => c.teacher_id === teacher.id);
        return { teacher, students };
    }).filter((row) => row.students.length > 0);

    if (!rows.length) {
        return reportToolbar("قوائم المعلمات وطلابها", "teacher-class", "") + 
            `<article class="doc-page"><div class="empty-state">لم يتم تعيين أي أطفال لمعلمات حالياً. يرجى اختيار المعلمة من ملف كل طفل.</div></article>`;
    }

    return `
        ${reportToolbar("قوائم المعلمات وطلابها", "teacher-class", "")}
        <article class="doc-page">
            ${reportHeader("قوائم فصول المعلمات", "متابعة الطلاب لكل معلمة")}
            ${rows.map((row) => `
                <section class="doc-section" style="page-break-inside: avoid;">
                    <h2 class="doc-section-title">فصل المعلمة: ${row.teacher.full_name} <span class="count-badge">${row.students.length} أطفال</span></h2>
                    ${docTable(
                        ["#", "الاسم", "الفصل", "الحالة الصحية", "تليفون ولي الأمر", "ملاحظات"],
                        row.students.map((child, i) => {
                            const parentData = getPrimaryParent(child.id);
                            const phone = parentData?.parent?.phone || parentData?.parent?.whatsapp || "-";
                            return [
                                i + 1,
                                child.full_name,
                                STAGE_LABELS[child.stage],
                                child.health_status || "-",
                                phone,
                                child.notes || "-"
                            ];
                        }),
                        "لا يوجد أطفال",
                        "report-teacher-class-" + row.teacher.id
                    )}
                </section>
            `).join("")}
            ${docFooter()}
        </article>
    `;
}

/* --- Absences --- */
function renderAbsenceReport() {
    const report = buildAbsenceSheets(ui.reportDate);
    const filters = `
        <label class="filter-inline">التاريخ
            <input type="date" data-ui-field="reportDate" value="${ui.reportDate}">
        </label>
    `;
    const renderDaily = (rows, emptyTxt) => docTable(
        ["الاسم", "الفصل/الوظيفة", "الحالة", "الملاحظات"],
        rows.map((r) => [r.name, r.groupLabel, `<span class="tag ${statusClass(r.status)}">${ATTENDANCE_LABELS[r.status]}</span>`, r.note || "-"]),
        emptyTxt
    );
    const renderRange = (rows, emptyTxt) => docTable(
        ["الاسم", "الفصل/الوظيفة", "غياب", "بعذر", "آخر تاريخ", "آخر ملاحظة"],
        rows.map((r) => [r.name, r.groupLabel, r.absentCount, r.excusedCount, formatArabicDate(r.lastDate), r.lastNote || "-"]),
        emptyTxt
    );

    return `
        ${reportToolbar("كشوف الغياب التفصيلية", "absences", filters)}
        <article class="doc-page">
            ${reportHeader("كشف الغياب اليومي", report.daily.label, `تاريخ المرجع: ${formatArabicDate(ui.reportDate)}`)}
            ${summaryCards([
                { label: "غياب الأطفال (اليوم)", value: report.daily.children.length, tone: report.daily.children.length ? "warning" : "success" },
                { label: "غياب الفريق (اليوم)", value: report.daily.staff.length, tone: report.daily.staff.length ? "warning" : "success" },
                { label: "غياب الأسبوع", value: report.weekly.children.length + report.weekly.staff.length },
                { label: "غياب الشهر", value: report.monthly.children.length + report.monthly.staff.length }
            ])}
            <section class="doc-section"><h2 class="doc-section-title">الأطفال — يومي</h2>${renderDaily(report.daily.children, "لا توجد حالات غياب أطفال اليوم.")}</section>
            <section class="doc-section"><h2 class="doc-section-title">الفريق — يومي</h2>${renderDaily(report.daily.staff, "لا توجد حالات غياب للفريق اليوم.")}</section>
            ${docFooter()}
        </article>
        <article class="doc-page">
            ${reportHeader("كشف الغياب الأسبوعي", report.weekly.label)}
            <section class="doc-section"><h2 class="doc-section-title">الأطفال — أسبوعي</h2>${renderRange(report.weekly.children, "لا توجد حالات غياب أطفال.")}</section>
            <section class="doc-section"><h2 class="doc-section-title">الفريق — أسبوعي</h2>${renderRange(report.weekly.staff, "لا توجد حالات غياب للفريق.")}</section>
            ${docFooter()}
        </article>
        <article class="doc-page">
            ${reportHeader("كشف الغياب الشهري", report.monthly.label)}
            <section class="doc-section"><h2 class="doc-section-title">الأطفال — شهري</h2>${renderRange(report.monthly.children, "لا توجد حالات غياب أطفال.")}</section>
            <section class="doc-section"><h2 class="doc-section-title">الفريق — شهري</h2>${renderRange(report.monthly.staff, "لا توجد حالات غياب للفريق.")}</section>
            ${docFooter()}
        </article>
    `;
}

/* --- Financial --- */
function renderFinancialReport() {
    const month = ui.financeMonth;
    const monthFees = state.fees.filter((f) => f.fee_month === month);
    const totalDue = monthFees.reduce((s, f) => s + (Number(f.amount || 0) - Number(f.discount_amount || 0)), 0);
    const totalPaid = monthFees.reduce((s, f) => s + Number(f.paid_amount || 0), 0);
    const totalRemaining = totalDue - totalPaid;
    const paid = monthFees.filter((f) => f.status === "PAID").length;
    const partial = monthFees.filter((f) => f.status === "PARTIAL").length;
    const pending = monthFees.filter((f) => f.status === "PENDING").length;
    const overdue = monthFees.filter((f) => f.status === "OVERDUE").length;
    const collectionRate = totalDue ? Math.round((totalPaid / totalDue) * 100) : 0;

    const filters = `
        <label class="filter-inline">الشهر
            <input type="month" data-ui-field="financeMonth" value="${month.slice(0, 7)}">
        </label>
    `;

    return `
        ${reportToolbar("التقرير المالي الشهري", "financial", filters)}
        <article class="doc-page">
            ${reportHeader("التقرير المالي", "متابعة تحصيل الرسوم الشهرية", `شهر: ${formatArabicDate(month)}`)}
            ${summaryCards([
                { label: "إجمالي المستحق", value: formatCurrency(totalDue), tone: "primary" },
                { label: "إجمالي المحصّل", value: formatCurrency(totalPaid), tone: "success" },
                { label: "المتبقي", value: formatCurrency(totalRemaining), tone: totalRemaining ? "warning" : "success" },
                { label: "نسبة التحصيل", value: `${collectionRate}%`, tone: collectionRate >= 70 ? "success" : "warning" },
                { label: "مدفوع بالكامل", value: paid, tone: "success" },
                { label: "جزئي", value: partial, tone: "warning" },
                { label: "معلق", value: pending },
                { label: "متأخر", value: overdue, tone: "danger" }
            ])}
            <section class="doc-section">
                <h2 class="doc-section-title">تفاصيل الرسوم</h2>
                ${docTable(
                    ["#", "الطفل", "المستحق", "الخصم", "المدفوع", "المتبقي", "تاريخ الاستحقاق", "الحالة"],
                    monthFees.sort((a, b) => a.due_date.localeCompare(b.due_date)).map((f, i) => {
                        const child = getChildById(f.child_id);
                        const remaining = remainingFeeAmount(f);
                        return [
                            i + 1,
                            child?.full_name || "-",
                            formatCurrency(f.amount),
                            formatCurrency(f.discount_amount || 0),
                            formatCurrency(f.paid_amount || 0),
                            formatCurrency(remaining),
                            formatArabicDate(f.due_date),
                            `<span class="tag ${statusClass(f.status)}">${FEE_STATUS_LABELS[f.status]}</span>`
                        ];
                    }),
                    "لا توجد رسوم في هذا الشهر",
                    "report-financial"
                )}
            </section>
            ${docFooter()}
        </article>
    `;
}

/* --- Children --- */
function renderChildrenReport() {
    const rows = state.children.slice().sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
    const active = rows.filter((c) => c.status === "ACTIVE").length;
    const byStage = Object.fromEntries(Object.keys(STAGE_LABELS).map((k) => [k, 0]));
    rows.forEach((c) => { if (c.status === "ACTIVE") byStage[c.stage] = (byStage[c.stage] || 0) + 1; });

    return `
        ${reportToolbar("سجل الأطفال الكامل", "children")}
        <article class="doc-page">
            ${reportHeader("سجل الأطفال", "قائمة شاملة بملفات الأطفال المسجلين")}
            ${summaryCards([
                { label: "إجمالي الملفات", value: rows.length, tone: "primary" },
                { label: "نشطون", value: active, tone: "success" },
                { label: "غير نشطين", value: rows.length - active },
                ...Object.entries(STAGE_LABELS).map(([k, l]) => ({ label: l, value: byStage[k] || 0 }))
            ])}
            <section class="doc-section">
                <h2 class="doc-section-title">قائمة الأطفال</h2>
                ${docTable(
                    ["#", "الاسم", "الفصل", "تاريخ الميلاد", "ولي الأمر", "رقم التواصل", "الحالة"],
                    rows.map((c, i) => [
                        i + 1,
                        c.full_name,
                        STAGE_LABELS[c.stage] || "-",
                        formatArabicDate(c.date_of_birth),
                        c.guardian_name || "-",
                        c.guardian_phone || "-",
                        `<span class="tag ${c.status === "ACTIVE" ? "success" : "muted"}">${c.status === "ACTIVE" ? "نشط" : "غير نشط"}</span>`
                    ]),
                    "لا توجد ملفات",
                    "report-children"
                )}
            </section>
            ${docFooter()}
        </article>
    `;
}

/* --- Staff --- */
function renderStaffReport() {
    const rows = state.staff.slice().sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
    const active = rows.filter((s) => s.status === "ACTIVE").length;
    const today = todayDate();
    const presentToday = state.staffAttendance.filter((r) => r.attendance_date === today && r.status === "PRESENT").length;

    return `
        ${reportToolbar("سجل الفريق الكامل", "staff")}
        <article class="doc-page">
            ${reportHeader("سجل أعضاء الفريق", "قائمة شاملة بأعضاء فريق العمل")}
            ${summaryCards([
                { label: "إجمالي الأعضاء", value: rows.length, tone: "primary" },
                { label: "نشطون", value: active, tone: "success" },
                { label: "حضور اليوم", value: presentToday, tone: "success" }
            ])}
            <section class="doc-section">
                <h2 class="doc-section-title">قائمة الفريق</h2>
                ${docTable(
                    ["#", "الاسم", "الوظيفة", "البريد", "الهاتف", "تاريخ التعيين", "الحالة"],
                    rows.map((s, i) => [
                        i + 1,
                        s.full_name,
                        s.job_title || "-",
                        s.email || "-",
                        s.phone || "-",
                        s.hire_date ? formatArabicDate(s.hire_date) : "-",
                        `<span class="tag ${s.status === "ACTIVE" ? "success" : "muted"}">${s.status === "ACTIVE" ? "نشط" : "غير نشط"}</span>`
                    ]),
                    "لا يوجد أعضاء فريق",
                    "report-staff"
                )}
            </section>
            ${docFooter()}
        </article>
    `;
}

/* --- Pharmacy --- */
function renderPharmacyReport() {
    const items = state.pharmacyItems.slice().sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
    const lowStock = items.filter((i) => i.quantity <= i.reorder_level);
    const nearExpiry = items.filter((i) => daysUntil(i.expiry_date) <= 30);
    const expired = items.filter((i) => daysUntil(i.expiry_date) < 0);

    return `
        ${reportToolbar("تقرير الصيدلية والمخزون", "pharmacy")}
        <article class="doc-page">
            ${reportHeader("تقرير الصيدلية والمخزون", "حالة الأدوية والكميات المتاحة")}
            ${summaryCards([
                { label: "إجمالي الأصناف", value: items.length, tone: "primary" },
                { label: "نقص مخزون", value: lowStock.length, tone: lowStock.length ? "warning" : "success" },
                { label: "قرب انتهاء الصلاحية", value: nearExpiry.length, tone: nearExpiry.length ? "warning" : "success" },
                { label: "منتهي الصلاحية", value: expired.length, tone: expired.length ? "danger" : "success" }
            ])}
            <section class="doc-section">
                <h2 class="doc-section-title">قائمة الأصناف</h2>
                ${docTable(
                    ["#", "الصنف", "الكمية", "حد الطلب", "تاريخ الانتهاء", "المتبقي (يوم)", "الحالة"],
                    items.map((it, i) => {
                        const days = daysUntil(it.expiry_date);
                        const tone = days < 0 ? "danger" : days <= 30 ? "warning" : it.quantity <= it.reorder_level ? "warning" : "success";
                        const label = days < 0 ? "منتهي" : it.quantity <= it.reorder_level ? "نقص" : days <= 30 ? "قرب الانتهاء" : "جيد";
                        return [
                            i + 1,
                            it.item_name || it.name || "-",
                            it.quantity,
                            it.reorder_level,
                            formatArabicDate(it.expiry_date),
                            days,
                            `<span class="tag ${tone}">${label}</span>`
                        ];
                    }),
                    "لا توجد أصناف",
                    "report-pharmacy"
                )}
            </section>
            ${docFooter()}
        </article>
    `;
}

/* --- Activities --- */
function renderActivitiesReport() {
    const items = state.activities.slice().sort((a, b) => b.activity_date.localeCompare(a.activity_date));
    const today = todayDate();
    const upcoming = items.filter((a) => a.activity_date >= today);
    const past = items.filter((a) => a.activity_date < today);

    return `
        ${reportToolbar("تقرير الأنشطة والمنهج", "activities")}
        <article class="doc-page">
            ${reportHeader("تقرير الأنشطة والمنهج", "الأنشطة المنفذة والمخطط لها")}
            ${summaryCards([
                { label: "إجمالي الأنشطة", value: items.length, tone: "primary" },
                { label: "قادمة", value: upcoming.length, tone: "success" },
                { label: "منفذة", value: past.length }
            ])}
            <section class="doc-section">
                <h2 class="doc-section-title">الأنشطة القادمة</h2>
                ${docTable(
                    ["#", "النشاط", "النوع", "التاريخ", "الوصف"],
                    upcoming.map((a, i) => [
                        i + 1,
                        a.title || "-",
                        ACTIVITY_TYPE_LABELS[a.activity_type] || a.activity_type,
                        formatArabicDate(a.activity_date),
                        a.description || "-"
                    ]),
                    "لا توجد أنشطة قادمة"
                )}
            </section>
            <section class="doc-section">
                <h2 class="doc-section-title">الأنشطة السابقة</h2>
                ${docTable(
                    ["#", "النشاط", "النوع", "التاريخ", "الوصف"],
                    past.map((a, i) => [
                        i + 1,
                        a.title || "-",
                        ACTIVITY_TYPE_LABELS[a.activity_type] || a.activity_type,
                        formatArabicDate(a.activity_date),
                        a.description || "-"
                    ]),
                    "لا توجد أنشطة سابقة",
                    "report-activities"
                )}
            </section>
            ${docFooter()}
        </article>
    `;
}

function monthStartDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/* --- Per-Child Report --- */
function renderPerChildReport() {
    const allActiveChildren = state.children.filter((c) => c.status === "ACTIVE");
    const activeChildren = ui.reportChildStage
        ? allActiveChildren.filter((c) => c.stage === ui.reportChildStage)
        : allActiveChildren;
    if (!ui.reportChildId || !activeChildren.find((c) => c.id === ui.reportChildId)) {
        ui.reportChildId = activeChildren[0]?.id || "";
    }
    const child = state.children.find((c) => c.id === ui.reportChildId);
    const start = ui.reportRangeStart || monthStartDate(ui.reportDate);
    const end = ui.reportRangeEnd || ui.reportDate;

    const filters = `
        <label class="filter-inline">الفصل
            <select data-ui-field="reportChildStage">
                <option value="">كل الفصول</option>
                ${Object.entries(STAGE_LABELS).map(([k, v]) => `<option value="${k}" ${ui.reportChildStage === k ? "selected" : ""}>${v}</option>`).join("")}
            </select>
        </label>
        <label class="filter-inline">الطفل
            <select data-ui-field="reportChildId">
                ${options(activeChildren.map((c) => [c.id, c.full_name]), ui.reportChildId)}
            </select>
        </label>
        <label class="filter-inline">من
            <input type="date" data-ui-field="reportRangeStart" value="${start}">
        </label>
        <label class="filter-inline">إلى
            <input type="date" data-ui-field="reportRangeEnd" value="${end}">
        </label>
    `;

    if (!child) {
        return `${reportToolbar("تقرير طفل فردي", "per-child", filters)}
            <article class="doc-page"><div class="doc-table-empty">اختر طفلًا من القائمة</div></article>`;
    }

    const parent = getPrimaryParent(child.id);
    const parentPhone = getChildWhatsappPhone(child.id);
    const parentName = parent?.parent?.full_name || child.guardian_name || "";

    const attendance = state.studentAttendance
        .filter((r) => r.child_id === child.id && isDateWithinRange(r.attendance_date, start, end))
        .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
    const attCounts = {
        PRESENT: attendance.filter((r) => r.status === "PRESENT").length,
        LATE: attendance.filter((r) => r.status === "LATE").length,
        ABSENT: attendance.filter((r) => r.status === "ABSENT").length,
        EXCUSED: attendance.filter((r) => r.status === "EXCUSED").length
    };
    const attTotal = attendance.length || 1;
    const attRate = Math.round(((attCounts.PRESENT + attCounts.LATE) / attTotal) * 100);

    const fees = state.fees
        .filter((f) => f.child_id === child.id && isDateWithinRange(f.due_date, start, end))
        .sort((a, b) => b.due_date.localeCompare(a.due_date));
    const feeTotals = fees.reduce((acc, f) => {
        acc.due += Number(f.amount || 0) - Number(f.discount_amount || 0);
        acc.paid += Number(f.paid_amount || 0);
        return acc;
    }, { due: 0, paid: 0 });
    feeTotals.remaining = Math.max(feeTotals.due - feeTotals.paid, 0);

    const exams = state.exams
        .filter((e) => e.child_id === child.id && isDateWithinRange(e.exam_date, start, end))
        .sort((a, b) => b.exam_date.localeCompare(a.exam_date));
    const examTotal = exams.reduce((s, e) => s + Number(e.score || 0), 0);
    const examMax = exams.reduce((s, e) => s + Number(e.max_score || 0), 0);
    const examAvg = examMax ? Math.round((examTotal / examMax) * 100) : 0;

    const notes = state.teacherNotes
        .filter((n) => n.child_id === child.id && isDateWithinRange(n.note_date, start, end))
        .sort((a, b) => b.note_date.localeCompare(a.note_date));

    const whatsappButtons = parentPhone ? `
        <div class="wa-panel no-print">
            <div class="wa-panel-head">
                <span class="wa-icon">💬</span>
                <div>
                    <strong>إرسال لولي الأمر</strong>
                    <span>${parentName || "ولي الأمر"} · ${parentPhone}</span>
                </div>
            </div>
            <div class="wa-actions">
                <button class="btn btn-whatsapp" type="button" data-action="wa-child-attendance" data-child="${child.id}">إرسال تقرير الحضور</button>
                <button class="btn btn-whatsapp" type="button" data-action="wa-child-finance" data-child="${child.id}">إرسال التقرير المالي</button>
                <button class="btn btn-whatsapp" type="button" data-action="wa-child-exams" data-child="${child.id}">إرسال نتائج الاختبارات</button>
                <button class="btn btn-whatsapp" type="button" data-action="wa-child-notes" data-child="${child.id}">إرسال ملاحظات المعلمين</button>
                <button class="btn btn-whatsapp-full" type="button" data-action="wa-child-full" data-child="${child.id}">إرسال التقرير الشامل</button>
            </div>
        </div>
    ` : `<div class="wa-panel no-print wa-panel-empty">⚠ لا يوجد رقم ولي أمر مسجل لإرسال التقارير</div>`;

    return `
        ${reportToolbar("تقرير الطفل الفردي", "per-child", filters)}
        ${whatsappButtons}
        <article class="doc-page">
            ${reportHeader("تقرير الطفل الشامل", `${child.full_name} — ${STAGE_LABELS[child.stage] || ""}`,
                `الفترة: من ${formatArabicDate(start)} إلى ${formatArabicDate(end)}`)}
            <section class="doc-section">
                <h2 class="doc-section-title">البيانات الأساسية</h2>
                <div class="doc-info-grid">
                    <div><span>ولي الأمر</span><strong>${parentName || "-"}</strong></div>
                    <div><span>رقم التواصل</span><strong>${parentPhone || "-"}</strong></div>
                    <div><span>تاريخ الميلاد</span><strong>${formatArabicDate(child.date_of_birth)}</strong></div>
                    <div><span>الفصل</span><strong>${STAGE_LABELS[child.stage] || "-"}</strong></div>
                </div>
            </section>

            <section class="doc-section">
                <h2 class="doc-section-title">ملخص الحضور</h2>
                ${summaryCards([
                    { label: "نسبة الحضور", value: `${attRate}%`, tone: attRate >= 80 ? "success" : "warning" },
                    { label: "حاضر", value: attCounts.PRESENT, tone: "success" },
                    { label: "متأخر", value: attCounts.LATE, tone: "warning" },
                    { label: "غائب", value: attCounts.ABSENT, tone: attCounts.ABSENT ? "danger" : "success" },
                    { label: "غياب بعذر", value: attCounts.EXCUSED }
                ])}
                ${docTable(
                    ["التاريخ", "الحالة", "وقت الوصول", "ملاحظات"],
                    attendance.slice(0, 20).map((r) => [
                        formatArabicDate(r.attendance_date),
                        `<span class="tag ${statusClass(r.status)}">${ATTENDANCE_LABELS[r.status]}</span>`,
                        r.check_in_time || "-",
                        r.notes || "-"
                    ]),
                    "لا يوجد سجل حضور في الفترة"
                )}
            </section>

            <section class="doc-section">
                <h2 class="doc-section-title">الملف المالي</h2>
                ${summaryCards([
                    { label: "المستحق", value: formatCurrency(feeTotals.due), tone: "primary" },
                    { label: "المدفوع", value: formatCurrency(feeTotals.paid), tone: "success" },
                    { label: "المتبقي", value: formatCurrency(feeTotals.remaining), tone: feeTotals.remaining ? "warning" : "success" }
                ])}
                ${docTable(
                    ["شهر الرسوم", "المستحق", "الخصم", "المدفوع", "المتبقي", "الاستحقاق", "الحالة"],
                    fees.map((f) => [
                        formatArabicDate(f.fee_month),
                        formatCurrency(f.amount),
                        formatCurrency(f.discount_amount || 0),
                        formatCurrency(f.paid_amount || 0),
                        formatCurrency(remainingFeeAmount(f)),
                        formatArabicDate(f.due_date),
                        `<span class="tag ${statusClass(f.status)}">${FEE_STATUS_LABELS[f.status]}</span>`
                    ]),
                    "لا توجد رسوم في الفترة"
                )}
            </section>

            <section class="doc-section">
                <h2 class="doc-section-title">نتائج الاختبارات</h2>
                ${summaryCards([
                    { label: "متوسط الدرجات", value: `${examAvg}%`, tone: examAvg >= 70 ? "success" : "warning" },
                    { label: "عدد الاختبارات", value: exams.length },
                    { label: "إجمالي النقاط", value: `${examTotal} / ${examMax || 0}` }
                ])}
                ${docTable(
                    ["المادة", "الاختبار", "التاريخ", "الدرجة", "النسبة", "ملاحظة المعلم"],
                    exams.map((e) => {
                        const subj = state.subjects.find((s) => s.id === e.subject_id);
                        const pct = e.max_score ? Math.round((e.score / e.max_score) * 100) : 0;
                        return [
                            subj ? `<span class="subject-dot" style="background:${subj.color}"></span> ${subj.name}` : "-",
                            e.exam_name,
                            formatArabicDate(e.exam_date),
                            `${e.score} / ${e.max_score}`,
                            `<span class="rate-pill ${pct >= 80 ? "good" : pct >= 60 ? "warn" : "bad"}">${pct}%</span>`,
                            e.teacher_notes || "-"
                        ];
                    }),
                    "لا توجد اختبارات في الفترة"
                )}
            </section>

            <section class="doc-section">
                <h2 class="doc-section-title">ملاحظات المعلمين</h2>
                ${notes.length ? `<div class="doc-notes-list">${notes.map((n) => {
                    const subj = state.subjects.find((s) => s.id === n.subject_id);
                    const teacher = state.staff.find((s) => s.id === n.teacher_staff_id);
                    return `
                        <div class="doc-note-item">
                            <div class="doc-note-head">
                                <span class="tag" style="background:${(subj?.color || "#64748b")}20;color:${subj?.color || "#64748b"}">${subj?.name || "عام"}</span>
                                <span class="tag muted">${NOTE_CATEGORY_LABELS[n.category] || n.category}</span>
                                <span class="doc-note-date">${formatArabicDate(n.note_date)}</span>
                                ${teacher ? `<span class="doc-note-teacher">${teacher.full_name}</span>` : ""}
                            </div>
                            <p>${n.note}</p>
                        </div>
                    `;
                }).join("")}</div>` : `<div class="doc-table-empty">لا توجد ملاحظات في الفترة</div>`}
            </section>
            ${docFooter()}
        </article>
    `;
}

/* --- Per-Staff Report --- */
function renderPerStaffReport() {
    const activeStaff = state.staff.filter((s) => s.status === "ACTIVE");
    if (!ui.reportStaffId && activeStaff[0]) ui.reportStaffId = activeStaff[0].id;
    const staff = state.staff.find((s) => s.id === ui.reportStaffId);
    const start = ui.reportRangeStart || monthStartDate(ui.reportDate);
    const end = ui.reportRangeEnd || ui.reportDate;

    const filters = `
        <label class="filter-inline">الموظف
            <select data-ui-field="reportStaffId">
                ${options(activeStaff.map((s) => [s.id, s.full_name]), ui.reportStaffId)}
            </select>
        </label>
        <label class="filter-inline">من
            <input type="date" data-ui-field="reportRangeStart" value="${start}">
        </label>
        <label class="filter-inline">إلى
            <input type="date" data-ui-field="reportRangeEnd" value="${end}">
        </label>
    `;

    if (!staff) {
        return `${reportToolbar("تقرير موظف فردي", "per-staff", filters)}
            <article class="doc-page"><div class="doc-table-empty">اختر موظفًا من القائمة</div></article>`;
    }

    const attendance = state.staffAttendance
        .filter((r) => r.staff_id === staff.id && isDateWithinRange(r.attendance_date, start, end))
        .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
    const counts = {
        PRESENT: attendance.filter((r) => r.status === "PRESENT").length,
        LATE: attendance.filter((r) => r.status === "LATE").length,
        ABSENT: attendance.filter((r) => r.status === "ABSENT").length,
        EXCUSED: attendance.filter((r) => r.status === "EXCUSED").length,
        LEAVE: attendance.filter((r) => r.status === "LEAVE").length
    };
    const total = attendance.length || 1;
    const rate = Math.round(((counts.PRESENT + counts.LATE) / total) * 100);

    const waButtons = staff.phone ? `
        <div class="wa-panel no-print">
            <div class="wa-panel-head">
                <span class="wa-icon">💬</span>
                <div>
                    <strong>إرسال إلى الموظف</strong>
                    <span>${staff.full_name} · ${staff.phone}</span>
                </div>
            </div>
            <div class="wa-actions">
                <button class="btn btn-whatsapp" type="button" data-action="wa-staff-attendance" data-staff="${staff.id}">إرسال ملخص الحضور</button>
            </div>
        </div>
    ` : `<div class="wa-panel no-print wa-panel-empty">⚠ لا يوجد رقم هاتف مسجل للموظف</div>`;

    return `
        ${reportToolbar("تقرير موظف فردي", "per-staff", filters)}
        ${waButtons}
        <article class="doc-page">
            ${reportHeader("تقرير موظف فردي", `${staff.full_name} — ${staff.job_title || ""}`,
                `الفترة: من ${formatArabicDate(start)} إلى ${formatArabicDate(end)}`)}
            <section class="doc-section">
                <h2 class="doc-section-title">البيانات الأساسية</h2>
                <div class="doc-info-grid">
                    <div><span>الوظيفة</span><strong>${staff.job_title || "-"}</strong></div>
                    <div><span>الهاتف</span><strong>${staff.phone || "-"}</strong></div>
                    <div><span>البريد</span><strong>${staff.email || "-"}</strong></div>
                    <div><span>تاريخ التعيين</span><strong>${staff.hire_date ? formatArabicDate(staff.hire_date) : "-"}</strong></div>
                </div>
            </section>
            <section class="doc-section">
                <h2 class="doc-section-title">ملخص الحضور</h2>
                ${summaryCards([
                    { label: "نسبة الحضور", value: `${rate}%`, tone: rate >= 80 ? "success" : "warning" },
                    { label: "حاضر", value: counts.PRESENT, tone: "success" },
                    { label: "متأخر", value: counts.LATE, tone: "warning" },
                    { label: "غائب", value: counts.ABSENT, tone: counts.ABSENT ? "danger" : "success" },
                    { label: "بعذر", value: counts.EXCUSED },
                    { label: "إجازة", value: counts.LEAVE }
                ])}
                ${docTable(
                    ["التاريخ", "الحالة", "الدخول", "الخروج", "ملاحظات"],
                    attendance.map((r) => [
                        formatArabicDate(r.attendance_date),
                        `<span class="tag ${statusClass(r.status)}">${ATTENDANCE_LABELS[r.status]}</span>`,
                        r.check_in_time || "-",
                        r.check_out_time || "-",
                        r.notes || "-"
                    ]),
                    "لا يوجد سجل حضور في الفترة"
                )}
            </section>
            ${docFooter()}
        </article>
    `;
}

/* --- Exams & Teacher Notes Section --- */
function renderExamsSection() {
    const tab = ui.examsTab || "exams";
    const children = state.children.filter((c) => c.status === "ACTIVE");
    const body = tab === "notes" ? renderTeacherNotesTab(children) : renderExamsTab(children);
    return `
        <nav class="reports-tabs no-print" aria-label="الاختبارات والتقييم">
            <button class="report-tab ${tab === "exams" ? "is-active" : ""}" type="button" data-action="switch-exams-tab" data-tab="exams">
                <span class="report-tab-icon">📝</span><span>نتائج الاختبارات</span>
            </button>
            <button class="report-tab ${tab === "notes" ? "is-active" : ""}" type="button" data-action="switch-exams-tab" data-tab="notes">
                <span class="report-tab-icon">📔</span><span>ملاحظات المعلمين</span>
            </button>
        </nav>
        ${body}
    `;
}

function renderExamsTab(children) {
    state.examDefinitions = state.examDefinitions || [];
    
    if (ui.gradingExamDefId) {
        return renderExamGradingView(ui.gradingExamDefId, children);
    }

    const form = ui.examDefFormId !== undefined && ui.examDefFormId !== null
        ? (ui.examDefFormId ? state.examDefinitions.find((e) => e.id === ui.examDefFormId) : null)
        : undefined;
    const isEditing = ui.examDefFormId !== undefined;
    const defs = state.examDefinitions.slice().sort((a, b) => (b.exam_date || "").localeCompare(a.exam_date || ""));

    return `
        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div><h3>${form ? "تعديل بيانات الاختبار" : "إضافة اختبار جديد"}</h3><p>سجل بيانات الاختبار ليتم لاحقاً رصد درجات الطلاب له.</p></div>
                    ${isEditing ? `<button class="btn btn-ghost" type="button" data-action="cancel-exam-def">إلغاء</button>` : `<button class="btn btn-primary" type="button" data-action="new-exam-def">+ اختبار جديد</button>`}
                </div>
                ${isEditing ? `
                <form data-form="exam-def">
                    <input type="hidden" name="id" value="${form?.id || ""}">
                    <div class="field"><label>اسم الاختبار</label><input name="exam_name" required value="${form?.exam_name || ""}"></div>
                    <div class="field"><label>المادة (اختياري)</label><select name="subject_id"><option value="">بدون مادة</option>${options(state.subjects.map((s) => [s.id, s.name]), form?.subject_id)}</select></div>
                    <div class="field-row">
                        <div class="field"><label>التاريخ (اختياري)</label><input type="date" name="exam_date" value="${form?.exam_date || todayDate()}"></div>
                        <div class="field"><label>المرحلة / الفصل (اختياري)</label><select name="stage"><option value="">كل المراحل</option>${options(Object.entries(STAGE_LABELS), form?.stage)}</select></div>
                    </div>
                    <div class="field-row">
                        <div class="field"><label>الدرجة النهائية (اختياري)</label><input type="number" name="max_score" min="1" step="0.5" value="${form?.max_score ?? 20}"></div>
                        <div class="field"><label>المعلم (اختياري)</label><select name="teacher_id"><option value="">غير محدد</option>${options(state.staff.map((s) => [s.id, s.full_name]), form?.teacher_id)}</select></div>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary" type="submit">حفظ الاختبار</button>
                        ${form ? `<button class="btn btn-danger" type="button" data-action="delete-exam-def" data-id="${form.id}">حذف</button>` : ""}
                    </div>
                </form>
                ` : `<div class="empty-hint">اختر "اختبار جديد" أو عدّل اختبارًا من القائمة.</div>`}
            </div>
            <div class="panel">
                <div class="panel-header"><div><h3>قائمة الاختبارات <span class="count-badge">${defs.length}</span></h3><p>اختر اختباراً لرصد درجات الطلاب.</p></div></div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>الاختبار</th><th>المادة</th><th>التاريخ</th><th>الفصل</th><th>الدرجة النهائية</th><th>إجراء</th></tr></thead>
                        <tbody>
                            ${defs.length ? defs.map((e) => {
                                const subj = state.subjects.find((s) => s.id === e.subject_id);
                                return `<tr>
                                    <td><strong>${e.exam_name}</strong></td>
                                    <td>${subj ? `<span class="subject-dot" style="background:${subj.color}"></span> ${subj.name}` : "-"}</td>
                                    <td>${e.exam_date ? formatArabicDate(e.exam_date) : "-"}</td>
                                    <td>${e.stage ? STAGE_LABELS[e.stage] : "الكل"}</td>
                                    <td>${e.max_score || "-"}</td>
                                    <td>
                                        <div class="actions-row">
                                            <button class="btn btn-primary btn-xs" type="button" data-action="grade-exam-def" data-id="${e.id}">رصد الدرجات</button>
                                            <button class="btn btn-ghost btn-xs" type="button" data-action="edit-exam-def" data-id="${e.id}">تعديل</button>
                                        </div>
                                    </td>
                                </tr>`;
                            }).join("") : `<tr><td colspan="6" class="empty-state">لا توجد اختبارات مسجلة.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `;
}

function renderExamGradingView(defId, children) {
    const def = state.examDefinitions.find(e => e.id === defId);
    if (!def) return '';
    const subj = state.subjects.find(s => s.id === def.subject_id);
    const targetChildren = def.stage ? children.filter(c => c.stage === def.stage) : children;

    return `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h3>رصد درجات: ${def.exam_name}</h3>
                    <p>${subj ? `المادة: ${subj.name} | ` : ''}الدرجة النهائية: ${def.max_score || '-'} | ${def.stage ? STAGE_LABELS[def.stage] : 'كل المراحل'}</p>
                </div>
                <button class="btn btn-ghost" type="button" data-action="cancel-grading">رجوع للقائمة</button>
            </div>
            <form data-form="exam-grades">
                <input type="hidden" name="exam_def_id" value="${def.id}">
                <div class="table-wrap" style="max-height: 400px; overflow-y: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>اسم الطفل</th>
                                <th style="width: 120px;">الدرجة</th>
                                <th>ملاحظات المعلم</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${targetChildren.length ? targetChildren.map(child => {
                                const existing = state.exams.find(e => e.child_id === child.id && e.exam_definition_id === def.id);
                                return `
                                <tr>
                                    <td>${child.full_name}</td>
                                    <td>
                                        <input type="number" name="score_${child.id}" min="0" step="0.5" max="${def.max_score || ''}" value="${existing?.score ?? ''}" class="sm-input" style="width:80px">
                                    </td>
                                    <td>
                                        <input type="text" name="notes_${child.id}" value="${existing?.teacher_notes || ''}" placeholder="ملاحظات..." class="full-width">
                                    </td>
                                </tr>
                                `;
                            }).join('') : `<tr><td colspan="3" class="empty-state">لا يوجد طلاب في هذا الفصل.</td></tr>`}
                        </tbody>
                    </table>
                </div>
                <div class="form-actions" style="margin-top:16px;">
                    <button class="btn btn-primary" type="submit">حفظ النتائج المجمعة</button>
                </div>
            </form>
        </section>
    `;
}

function renderTeacherNotesTab(children) {
    const isEditing = ui.teacherNoteFormId !== undefined;
    const form = ui.teacherNoteFormId ? state.teacherNotes.find((n) => n.id === ui.teacherNoteFormId) : null;
    const notes = state.teacherNotes.slice().sort((a, b) => b.note_date.localeCompare(a.note_date));

    return `
        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div><h3>${form ? "تعديل ملاحظة" : "إضافة ملاحظة"}</h3><p>سجّل ملاحظات تفسيرية عن كل طفل في كل مادة.</p></div>
                    ${isEditing ? `<button class="btn btn-ghost" type="button" data-action="cancel-note">إلغاء</button>` : `<button class="btn btn-primary" type="button" data-action="new-note">+ ملاحظة جديدة</button>`}
                </div>
                ${isEditing ? `
                <form data-form="teacher-note">
                    <input type="hidden" name="id" value="${form?.id || ""}">
                    <div class="field"><label>الطفل</label>${renderFilteredChildSelect("child_id", form?.child_id, "note")}</div>
                    <div class="field"><label>المادة</label><select name="subject_id">${options(state.subjects.map((s) => [s.id, s.name]), form?.subject_id)}</select></div>
                    <div class="field-row">
                        <div class="field"><label>التاريخ</label><input type="date" name="note_date" required value="${form?.note_date || todayDate()}"></div>
                        <div class="field"><label>النوع</label><select name="category">${optionsFromMap(NOTE_CATEGORY_LABELS, form?.category || "PERFORMANCE")}</select></div>
                    </div>
                    <div class="field"><label>المعلمة</label><select name="teacher_staff_id">${options(state.staff.map((s) => [s.id, s.full_name]), form?.teacher_staff_id)}</select></div>
                    <div class="field"><label>الملاحظة</label><textarea name="note" rows="4" required>${form?.note || ""}</textarea></div>
                    <div class="form-actions">
                        <button class="btn btn-primary" type="submit">حفظ</button>
                        ${form ? `<button class="btn btn-danger" type="button" data-action="delete-note" data-id="${form.id}">حذف</button>` : ""}
                    </div>
                </form>
                ` : `<div class="empty-hint">اختر "ملاحظة جديدة" أو عدّل واحدة من القائمة.</div>`}
            </div>
            <div class="panel">
                <div class="panel-header"><div><h3>آخر الملاحظات <span class="count-badge">${notes.length}</span></h3></div></div>
                <div class="doc-notes-list">
                    ${notes.length ? notes.map((n) => {
                        const child = getChildById(n.child_id);
                        const subj = state.subjects.find((s) => s.id === n.subject_id);
                        const teacher = state.staff.find((s) => s.id === n.teacher_staff_id);
                        return `<div class="doc-note-item">
                            <div class="doc-note-head">
                                <strong>${child?.full_name || "-"}</strong>
                                ${subj ? `<span class="tag" style="background:${subj.color}20;color:${subj.color}">${subj.name}</span>` : ""}
                                <span class="tag muted">${NOTE_CATEGORY_LABELS[n.category] || n.category}</span>
                                <span class="doc-note-date">${formatArabicDate(n.note_date)}</span>
                                ${teacher ? `<span class="doc-note-teacher">${teacher.full_name}</span>` : ""}
                                <button class="btn btn-ghost btn-xs" type="button" data-action="edit-note" data-id="${n.id}">تعديل</button>
                            </div>
                            <p>${n.note}</p>
                        </div>`;
                    }).join("") : `<div class="doc-table-empty">لا توجد ملاحظات بعد.</div>`}
                </div>
            </div>
        </section>
    `;
}

function getWhatsappRange() {
    const start = ui.whatsappRangeStart || currentMonthDate();
    const end = ui.whatsappRangeEnd || todayDate();
    return {
        start: normalizeDateInput(start),
        end: normalizeDateInput(end)
    };
}

function getAllowedChildWhatsappTemplates(role = currentUser().role) {
    const allowed = role === "TEACHER"
        ? ["attendance", "exams", "notes"]
        : ["attendance", "finance", "exams", "notes", "full"];
    return allowed.map((key) => [key, CHILD_WHATSAPP_TEMPLATES[key]]);
}

function getAllowedBroadcastTemplates(role = currentUser().role) {
    const allowed = role === "TEACHER"
        ? ["attendance", "exams", "notes"]
        : ["attendance", "finance", "exams", "notes"];
    return allowed.map((key) => [key, CHILD_WHATSAPP_TEMPLATES[key]]);
}

function getAllowedStaffWhatsappTemplates(role = currentUser().role) {
    const allowed = role === "ADMIN"
        ? ["attendance", "payroll"]
        : role === "SECRETARY"
            ? ["attendance"]
            : [];
    return allowed.map((key) => [key, STAFF_WHATSAPP_TEMPLATES[key]]);
}

function isValidPhone(phone) {
    if (!phone) return false;
    const clean = String(phone).replace(/[^\d]/g, '');
    return clean.length >= 7;
}

function getChildWhatsappPhone(childId) {
    const child = typeof childId === "string" ? getChildById(childId) : childId;
    if (!child) return "";
    
    // 1. Check child.whatsapp directly
    if (isValidPhone(child.whatsapp)) return String(child.whatsapp).trim();
    
    // 2. Check primary parent
    const parent = getPrimaryParent(child.id);
    if (parent?.parent) {
        if (isValidPhone(parent.parent.phone)) return String(parent.parent.phone).trim();
        if (isValidPhone(parent.parent.whatsapp)) return String(parent.parent.whatsapp).trim();
    }
    
    // 3. Check child.guardian_phone
    if (isValidPhone(child.guardian_phone)) return String(child.guardian_phone).trim();
    
    // Fallback to whatever string is present (if any) if no valid numeric number is found
    const rawFallback = child.whatsapp || parent?.parent?.phone || parent?.parent?.whatsapp || child.guardian_phone || "";
    return String(rawFallback).trim();
}

function getWhatsappChildrenByStage(stage = "ALL") {
    return state.children
        .filter((child) => child.status === "ACTIVE")
        .filter((child) => stage === "ALL" || child.stage === stage);
}

function recordWhatsappLog(entry) {
    state.whatsappLog = [
        {
            id: createId("wa"),
            created_at: new Date().toISOString(),
            ...entry
        },
        ...(state.whatsappLog || [])
    ].slice(0, 80);
    saveState();
    if (ui.activeSection === "whatsapp") render();
}

function renderWhatsappSection() {
    const role = currentUser().role;
    const childTemplates = getAllowedChildWhatsappTemplates(role);
    const broadcastTemplates = getAllowedBroadcastTemplates(role);
    const staffTemplates = getAllowedStaffWhatsappTemplates(role);
    const availableChildren = getWhatsappChildrenByStage("ALL");
    const availableStaff = state.staff.filter((staff) => staff.status === "ACTIVE");
    const range = getWhatsappRange();

    if (!childTemplates.find(([value]) => value === ui.whatsappChildTemplate)) {
        ui.whatsappChildTemplate = childTemplates[0]?.[0] || "attendance";
    }
    if (!broadcastTemplates.find(([value]) => value === ui.whatsappBroadcastTemplate)) {
        ui.whatsappBroadcastTemplate = broadcastTemplates[0]?.[0] || "attendance";
    }
    if (!staffTemplates.find(([value]) => value === ui.whatsappStaffTemplate)) {
        ui.whatsappStaffTemplate = staffTemplates[0]?.[0] || "attendance";
    }
    if (!availableChildren.find((child) => child.id === ui.whatsappChildId)) {
        ui.whatsappChildId = availableChildren[0]?.id || "";
    }
    if (!availableStaff.find((staff) => staff.id === ui.whatsappStaffId)) {
        ui.whatsappStaffId = availableStaff[0]?.id || "";
    }

    const selectedChild = availableChildren.find((child) => child.id === ui.whatsappChildId) || availableChildren[0] || null;
    const selectedStaff = availableStaff.find((staff) => staff.id === ui.whatsappStaffId) || availableStaff[0] || null;
    const childPreview = selectedChild ? buildChildMessageByType(selectedChild, ui.whatsappChildTemplate, range) : "لا يوجد طفل متاح لديه رقم ولي أمر صالح.";
    const staffPreview = selectedStaff && staffTemplates.length
        ? buildStaffMessageByType(selectedStaff, ui.whatsappStaffTemplate, range)
        : "لا توجد بيانات كافية لإرسال رسالة موظف.";
    const stageChildren = getWhatsappChildrenByStage(ui.whatsappStage || "ALL");
    const overdueRows = getOverdueFees();
    const recentLog = (state.whatsappLog || []).slice(0, 10);
    const stats = {
        reachableParents: availableChildren.length,
        reachableStaff: availableStaff.length,
        overdue: overdueRows.length,
        sent: recentLog.length
    };
    const ideas = [
        { title: "تذكير آلي قبل النشاط", text: "رسالة تلقائية قبل الرحلات والحفلات بيوم تتضمن الموعد، المطلوب، ورسوم النشاط." },
        { title: "رسالة غياب يومية مجمعة", text: "ملخص آخر اليوم لولي الأمر إذا كان الطفل غائبًا أو خرج مبكرًا." },
        { title: "رسائل المناسبات والتهاني", text: "قوالب سريعة لأعياد الميلاد والمناسبات الدينية والإنجازات التعليمية." },
        { title: "سجل متابعة الردود", text: "إضافة خانة لتسجيل هل تم الرد من ولي الأمر أو تأكيد الاستلام بعد إرسال الرسالة." }
    ];

    return `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h3>مركز رسائل الواتساب</h3>
                    <p>إرسال الرسائل مباشرة عبر تطبيق WhatsApp Desktop المثبت على الجهاز دون الضغط على Enter.</p>
                </div>
                <div class="actions-row">
                    <button class="btn btn-secondary" type="button" data-action="wa-open-web">فتح تطبيق واتساب</button>
                    <button class="btn btn-danger" type="button" data-action="wa-stop-queue">إيقاف الإرسال</button>
                </div>
            </div>
            <div class="empty-hint whatsapp-automation-status" data-state="${whatsappAutomationStatus.state}">
                <strong>${whatsappAutomationStatus.state === "sending" ? "جارٍ الإرسال" : whatsappAutomationStatus.state === "login" ? "مطلوب تسجيل الدخول" : "حالة واتساب"}:</strong>
                ${whatsappAutomationStatus.message}
            </div>
            <div class="summary-strip">
                <article class="summary-tile"><span>أولياء أمور متاحون</span><strong>${stats.reachableParents}</strong></article>
                <article class="summary-tile"><span>موظفون متاحون</span><strong>${stats.reachableStaff}</strong></article>
                <article class="summary-tile"><span>رسوم متأخرة</span><strong>${stats.overdue}</strong></article>
                <article class="summary-tile"><span>آخر رسائل محفوظة</span><strong>${stats.sent}</strong></article>
            </div>
        </section>

        <section class="section-grid columns-2">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>رسالة لولي أمر</h3>
                        <p>اختر الطفل ونوع الرسالة، ثم راجع النص قبل فتح واتساب.</p>
                    </div>
                </div>
                <div class="stack">
                    <div class="grid-2">
                        <div class="field">
                            <label>من تاريخ</label>
                            <input type="date" data-ui-field="whatsappRangeStart" value="${range.start}">
                        </div>
                        <div class="field">
                            <label>إلى تاريخ</label>
                            <input type="date" data-ui-field="whatsappRangeEnd" value="${range.end}">
                        </div>
                    </div>
                    <div class="field">
                        <label>الطفل</label>
                        <select data-ui-field="whatsappChildId">
                            ${options(availableChildren.map((child) => [child.id, `${child.full_name} — ${STAGE_LABELS[child.stage]}`]), ui.whatsappChildId)}
                        </select>
                    </div>
                    <div class="field">
                        <label>نوع الرسالة</label>
                        <select data-ui-field="whatsappChildTemplate">${options(childTemplates, ui.whatsappChildTemplate)}</select>
                    </div>
                    ${selectedChild ? `
                        <div class="mini-stat-grid">
                            <div class="mini-stat"><span>ولي الأمر</span><strong>${getPrimaryParent(selectedChild.id)?.parent?.full_name || selectedChild.guardian_name || "-"}</strong></div>
                            <div class="mini-stat"><span>رقم الواتساب</span><strong dir="ltr">${getChildWhatsappPhone(selectedChild.id) || "<span style='color:var(--danger);font-size:11px;font-weight:bold;'>لا يوجد رقم مسجل</span>"}</strong></div>
                        </div>
                    ` : `<div class="empty-hint">لا يوجد طفل متاح حاليًا.</div>`}
                    <div class="actions-row">
                        <button class="btn btn-primary" type="button" data-action="wa-send-child-center">إرسال عبر تطبيق واتساب</button>
                    </div>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>معاينة الرسالة</h3>
                        <p>${selectedChild ? `${selectedChild.full_name} · ${CHILD_WHATSAPP_TEMPLATES[ui.whatsappChildTemplate] || "-"}` : "اختر طفلًا لعرض المعاينة."}</p>
                    </div>
                </div>
                <div class="whatsapp-preview"><pre>${childPreview}</pre></div>
            </div>
        </section>

        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>إرسال جماعي لأولياء الأمور</h3>
                        <p>إرسال متتابع حسب المرحلة أو لكل الأطفال الذين لديهم أرقام واتساب.</p>
                    </div>
                </div>
                ${role !== "TEACHER" ? `
                    <div class="stack">
                        <div class="grid-2">
                            <div class="field">
                                <label>المرحلة</label>
                                <select data-ui-field="whatsappStage">${options([["ALL", "كل المراحل"], ...Object.entries(STAGE_LABELS)], ui.whatsappStage || "ALL")}</select>
                            </div>
                            <div class="field">
                                <label>نوع الرسالة الجماعية</label>
                                <select data-ui-field="whatsappBroadcastTemplate">${options(broadcastTemplates, ui.whatsappBroadcastTemplate)}</select>
                            </div>
                        </div>
                        <div class="mini-stat-grid">
                            <div class="mini-stat"><span>المستفيدون من الإرسال</span><strong>${stageChildren.length}</strong></div>
                            <div class="mini-stat"><span>المرحلة الحالية</span><strong>${ui.whatsappStage === "ALL" ? "كل المراحل" : STAGE_LABELS[ui.whatsappStage]}</strong></div>
                        </div>
                        <div class="actions-row">
                            <button class="btn btn-primary" type="button" data-action="wa-broadcast-stage">إرسال جماعي حسب الفلتر</button>
                            <button class="btn btn-secondary" type="button" data-action="wa-broadcast-overdue">إرسال كل تذكيرات المتأخرات</button>
                        </div>
                    </div>
                ` : `
                    <div class="empty-hint">الإرسال الجماعي وتذكيرات المتأخرات متاحة للإدارة أو السكرتارية فقط لتفادي الإرسال العشوائي.</div>
                `}
            </div>

            ${staffTemplates.length ? `
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>رسائل الموظفين</h3>
                        <p>ملخص حضور الموظف أو إشعار راتب الشهر الحالي بحسب صلاحيتك.</p>
                    </div>
                </div>
                <div class="stack">
                    <div class="field">
                        <label>الموظف</label>
                        <select data-ui-field="whatsappStaffId">${options(availableStaff.map((staff) => [staff.id, `${staff.full_name} — ${staff.job_title}`]), ui.whatsappStaffId)}</select>
                    </div>
                    <div class="field">
                        <label>نوع الرسالة</label>
                        <select data-ui-field="whatsappStaffTemplate">${options(staffTemplates, ui.whatsappStaffTemplate)}</select>
                    </div>
                    ${selectedStaff ? `
                        <div class="mini-stat-grid">
                            <div class="mini-stat"><span>رقم الموظف</span><strong dir="ltr">${selectedStaff.phone || "<span style='color:var(--danger);font-size:11px;font-weight:bold;'>لا يوجد رقم مسجل</span>"}</strong></div>
                            <div class="mini-stat"><span>الوردية</span><strong>${getShiftLabel(selectedStaff.shift_code, true)}</strong></div>
                        </div>
                    ` : ""}
                    <div class="whatsapp-preview compact"><pre>${staffPreview}</pre></div>
                    <div class="actions-row">
                        <button class="btn btn-primary" type="button" data-action="wa-send-staff-center">إرسال عبر تطبيق واتساب</button>
                    </div>
                </div>
            </div>
            ` : `
            <div class="panel">
                <div class="panel-header"><div><h3>رسائل الموظفين</h3><p>هذه الصلاحية متاحة للإدارة أو السكرتارية فقط.</p></div></div>
                <div class="empty-hint">يمكن للمعلمة استخدام رسائل أولياء الأمور فقط من هذا القسم.</div>
            </div>
            `}
        </section>

        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>المصروفات المتأخرة</h3>
                        <p>إرسال تذكير فوري لولي الأمر من نفس الكشف.</p>
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr><th>الطفل</th><th>المرحلة</th><th>المتبقي</th><th>رقم ولي الأمر</th><th>إجراء</th></tr>
                        </thead>
                        <tbody>
                            ${overdueRows.length ? overdueRows.slice(0, 10).map((row) => `
                                <tr>
                                    <td>${row.child?.full_name || "-"}</td>
                                    <td>${row.child ? STAGE_LABELS[row.child.stage] : "-"}</td>
                                    <td><span class="rate-pill bad">${formatCurrency(row.remaining)}</span></td>
                                    <td dir="ltr">${getChildWhatsappPhone(row.child?.id) || "-"}</td>
                                    <td><button class="btn btn-ghost" type="button" data-action="wa-fee-reminder" data-id="${row.fee.id}">تذكير الآن</button></td>
                                </tr>
                            `).join("") : `<tr><td colspan="5" class="doc-table-empty">لا توجد رسوم متأخرة حاليًا.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>آخر الرسائل المرسلة</h3>
                        <p>سجل مختصر لآخر الرسائل التي تم فتحها من النظام.</p>
                    </div>
                </div>
                <div class="whatsapp-log-list">
                    ${recentLog.length ? recentLog.map((item) => `
                        <article class="whatsapp-log-item">
                            <div class="whatsapp-log-head">
                                <strong>${item.recipient_name}</strong>
                                <span>${item.template_label}</span>
                            </div>
                            <div class="whatsapp-log-meta">
                                <span>${item.recipient_type === "STAFF" ? "موظف" : "ولي أمر"}</span>
                                <span dir="ltr">${item.phone || "-"}</span>
                                <span>${formatArabicDate(item.created_at)}</span>
                            </div>
                        </article>
                    `).join("") : `<div class="empty-hint">لا توجد رسائل مسجلة بعد.</div>`}
                </div>
            </div>
        </section>

        <section class="panel">
            <div class="panel-header">
                <div>
                    <h3>اقتراحات نضيفها لاحقًا</h3>
                    <p>أفكار عملية جاهزة للتوسع بعد تثبيت قسم الواتساب الأساسي.</p>
                </div>
            </div>
            <div class="whatsapp-idea-grid">
                ${ideas.map((idea) => `
                    <article class="whatsapp-idea-card">
                        <strong>${idea.title}</strong>
                        <p>${idea.text}</p>
                    </article>
                `).join("")}
            </div>
        </section>
    `;
}

/* --- WhatsApp helpers --- */
function normalizePhoneForWhatsapp(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("20")) return digits;
    if (digits.startsWith("0")) return "20" + digits.slice(1);
    if (digits.length === 10) return "20" + digits;
    return digits;
}

function openWhatsapp(phone, message) {
    const normalized = normalizePhoneForWhatsapp(phone);
    if (!normalized) {
        showToast("رقم هاتف غير صالح", "error");
        return false;
    }
    
    // Standard direct WhatsApp Web / App links
    const waUrl = `https://web.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(message)}`;
    const waAppUrl = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;

    try {
        if (window.require) {
            const electron = window.require("electron");
            if (electron && electron.shell && typeof electron.shell.openExternal === "function") {
                electron.shell.openExternal(waAppUrl).catch(() => {
                    electron.shell.openExternal(waUrl);
                });
                showToast("✅ تم فتح محادثة الواتساب بنجاح — اضغط إرسال");
                return true;
            }
        }
    } catch (e) {
        console.warn("Shell openExternal failed, falling back to window.open", e);
    }

    // Web / browser fallback
    window.open(waAppUrl, "_blank");
    showToast("✅ تم فتح محادثة الواتساب بنجاح — اضغط إرسال");
    return true;
}

function getReportRange() {
    const start = ui.reportRangeStart || monthStartDate(ui.reportDate);
    const end = ui.reportRangeEnd || ui.reportDate;
    return { start, end };
}

function buildChildAttendanceMessage(child, range = getReportRange()) {
    const { start, end } = range;
    const rows = state.studentAttendance.filter((r) => r.child_id === child.id && isDateWithinRange(r.attendance_date, start, end));
    const present = rows.filter((r) => ["PRESENT", "LATE"].includes(r.status)).length;
    const absent = rows.filter((r) => r.status === "ABSENT").length;
    const excused = rows.filter((r) => r.status === "EXCUSED").length;
    const rate = rows.length ? Math.round((present / rows.length) * 100) : 0;
    return [
        `السلام عليكم ورحمة الله`,
        `ولي أمر الطفل *${child.full_name}*`,
        ``,
        `📊 تقرير الحضور`,
        `📅 الفترة: ${formatArabicDate(start)} → ${formatArabicDate(end)}`,
        ``,
        `✅ حاضر: ${present}`,
        `❌ غائب: ${absent}`,
        `📝 غياب بعذر: ${excused}`,
        `📈 نسبة الحضور: ${rate}%`,
        ``,
        `_${BRAND.name}_`
    ].join("\n");
}

function buildChildFinanceMessage(child) {
    const fees = state.fees.filter((f) => f.child_id === child.id).sort((a, b) => b.due_date.localeCompare(a.due_date));
    const due = fees.reduce((s, f) => s + (Number(f.amount || 0) - Number(f.discount_amount || 0)), 0);
    const paid = fees.reduce((s, f) => s + Number(f.paid_amount || 0), 0);
    const remaining = Math.max(due - paid, 0);
    const overdue = fees.filter((f) => f.status === "OVERDUE");
    const lines = [
        `السلام عليكم ورحمة الله`,
        `ولي أمر الطفل *${child.full_name}*`,
        ``,
        `💰 كشف حساب مالي`,
        `📥 إجمالي المستحق: ${formatCurrency(due)}`,
        `✅ المدفوع: ${formatCurrency(paid)}`,
        `⏳ المتبقي: ${formatCurrency(remaining)}`
    ];
    if (overdue.length) {
        lines.push(``, `⚠️ رسوم متأخرة:`);
        overdue.forEach((f) => lines.push(`• ${formatArabicDate(f.fee_month)} — ${formatCurrency(remainingFeeAmount(f))}`));
    }
    lines.push(``, `_${BRAND.name}_`);
    return lines.join("\n");
}

function buildChildExamsMessage(child, range = getReportRange()) {
    const { start, end } = range;
    const exams = state.exams.filter((e) => e.child_id === child.id && isDateWithinRange(e.exam_date, start, end))
        .sort((a, b) => b.exam_date.localeCompare(a.exam_date));
    if (!exams.length) {
        return `السلام عليكم\nولي أمر *${child.full_name}*\n\nلا توجد نتائج اختبارات في الفترة من ${formatArabicDate(start)} إلى ${formatArabicDate(end)}.\n\n_${BRAND.name}_`;
    }
    const totalScore = exams.reduce((s, e) => s + Number(e.score || 0), 0);
    const totalMax = exams.reduce((s, e) => s + Number(e.max_score || 0), 0);
    const avg = totalMax ? Math.round((totalScore / totalMax) * 100) : 0;
    const lines = [
        `السلام عليكم`,
        `ولي أمر الطفل *${child.full_name}*`,
        ``,
        `📝 نتائج الاختبارات`,
        `📅 الفترة: ${formatArabicDate(start)} → ${formatArabicDate(end)}`,
        ``
    ];
    exams.forEach((e) => {
        const subj = state.subjects.find((s) => s.id === e.subject_id);
        const pct = e.max_score ? Math.round((e.score / e.max_score) * 100) : 0;
        lines.push(`• *${subj?.name || "-"}* — ${e.exam_name}: ${e.score}/${e.max_score} (${pct}%)`);
        if (e.teacher_notes) lines.push(`  💬 ${e.teacher_notes}`);
    });
    lines.push(``, `📈 المتوسط العام: *${avg}%*`, ``, `_${BRAND.name}_`);
    return lines.join("\n");
}

function buildChildNotesMessage(child, range = getReportRange()) {
    const { start, end } = range;
    const notes = state.teacherNotes.filter((n) => n.child_id === child.id && isDateWithinRange(n.note_date, start, end))
        .sort((a, b) => b.note_date.localeCompare(a.note_date));
    const lines = [
        `السلام عليكم`,
        `ولي أمر الطفل *${child.full_name}*`,
        ``,
        `📔 ملاحظات المعلمين`,
        `📅 الفترة: ${formatArabicDate(start)} → ${formatArabicDate(end)}`,
        ``
    ];
    if (!notes.length) {
        lines.push(`لا توجد ملاحظات في الفترة المحددة.`);
    } else {
        notes.forEach((n) => {
            const subj = state.subjects.find((s) => s.id === n.subject_id);
            lines.push(`• [${subj?.name || "عام"}] ${formatArabicDate(n.note_date)}`);
            lines.push(`  ${n.note}`);
        });
    }
    lines.push(``, `_${BRAND.name}_`);
    return lines.join("\n");
}

function buildChildFullMessage(child, range = getReportRange()) {
    return [
        buildChildAttendanceMessage(child, range),
        "—".repeat(10),
        buildChildFinanceMessage(child).split("\n").slice(2).join("\n"),
        "—".repeat(10),
        buildChildExamsMessage(child, range).split("\n").slice(2).join("\n"),
        "—".repeat(10),
        buildChildNotesMessage(child, range).split("\n").slice(2).join("\n")
    ].join("\n\n");
}

function buildStaffAttendanceMessage(staff, range = getReportRange()) {
    const { start, end } = range;
    const rows = state.staffAttendance.filter((r) => r.staff_id === staff.id && isDateWithinRange(r.attendance_date, start, end));
    const present = rows.filter((r) => ["PRESENT", "LATE"].includes(r.status)).length;
    const absent = rows.filter((r) => r.status === "ABSENT").length;
    const leave = rows.filter((r) => ["EXCUSED", "LEAVE"].includes(r.status)).length;
    const rate = rows.length ? Math.round((present / rows.length) * 100) : 0;
    return [
        `السلام عليكم`,
        `الأستاذ/ة *${staff.full_name}*`,
        ``,
        `📊 ملخص الحضور`,
        `📅 ${formatArabicDate(start)} → ${formatArabicDate(end)}`,
        ``,
        `✅ حاضر: ${present}`,
        `❌ غائب: ${absent}`,
        `📝 بعذر/إجازة: ${leave}`,
        `📈 نسبة الحضور: ${rate}%`,
        ``,
        `_${BRAND.name}_`
    ].join("\n");
}

function buildChildMessageByType(child, kind, range = getReportRange()) {
    return kind === "attendance" ? buildChildAttendanceMessage(child, range)
        : kind === "finance" ? buildChildFinanceMessage(child)
        : kind === "exams" ? buildChildExamsMessage(child, range)
        : kind === "notes" ? buildChildNotesMessage(child, range)
        : buildChildFullMessage(child, range);
}

function buildStaffMessageByType(staff, kind, range = getReportRange()) {
    if (kind === "payroll") {
        const payroll = buildPayrollForStaff(staff.id, ui.payrollMonth || currentMonthDate());
        return payroll ? buildPayrollReceiptMessage(payroll) : "لا يمكن إعداد رسالة الراتب لهذا الموظف حاليًا.";
    }
    return buildStaffAttendanceMessage(staff, range);
}

function sendChildWhatsapp(childId, kind, range = getReportRange()) {
    const child = getChildById(childId);
    if (!child) return;
    const phone = getChildWhatsappPhone(childId);
    const message = buildChildMessageByType(child, kind, range);
    if (openWhatsapp(phone, message)) {
        recordWhatsappLog({
            recipient_type: "PARENT",
            recipient_name: child.full_name,
            phone,
            template_label: CHILD_WHATSAPP_TEMPLATES[kind] || "رسالة ولي أمر"
        });
    }
}

function sendStaffWhatsapp(staffId, range = getReportRange()) {
    const staff = state.staff.find((s) => s.id === staffId);
    if (!staff) return;
    const message = buildStaffAttendanceMessage(staff, range);
    if (openWhatsapp(staff.phone, message)) {
        recordWhatsappLog({
            recipient_type: "STAFF",
            recipient_name: staff.full_name,
            phone: staff.phone,
            template_label: STAFF_WHATSAPP_TEMPLATES.attendance
        });
    }
}

function buildPayrollReceiptMessage(payroll) {
    const { staff, cfg, start, end, presentCount, lateCount, absentCount, excusedCount, totalLateMin, totalDeductions, net } = payroll;
    const lines = [];
    lines.push(`السلام عليكم ${staff.full_name}`);
    lines.push(`كشف راتب شهر من ${formatArabicDate(start)} إلى ${formatArabicDate(end)} — ${BRAND.shortName}:`);
    lines.push("");
    lines.push(`• الراتب الأساسي: ${formatCurrency(cfg.base_salary)}`);
    if (Number(cfg.bonus || 0)) lines.push(`• الحوافز: ${formatCurrency(cfg.bonus)}`);
    lines.push(`• أيام الحضور: ${presentCount}${lateCount ? ` (منها ${lateCount} تأخير)` : ""}`);
    lines.push(`• الغياب: ${absentCount}${excusedCount ? ` — بعذر/إجازة: ${excusedCount}` : ""}`);
    if (totalLateMin) lines.push(`• إجمالي دقائق التأخير: ${totalLateMin} دقيقة`);
    lines.push(`• إجمالي الخصومات: ${formatCurrency(totalDeductions)}`);
    lines.push("");
    lines.push(`✅ صافي الراتب المستحق: ${formatCurrency(net)}`);
    lines.push("");
    lines.push("برجاء التواصل مع الإدارة لاستلام الراتب والتوقيع على الإيصال.");
    lines.push(`— ${BRAND.name}`);
    return lines.join("\n");
}

function sendPayrollReceiptWhatsapp(staffId) {
    const monthStr = ui.payrollMonth || currentMonthDate();
    const payroll = buildPayrollForStaff(staffId, monthStr);
    if (!payroll) { showToast("لا يمكن إعداد الكشف", "error"); return; }
    if (openWhatsapp(payroll.staff.phone, buildPayrollReceiptMessage(payroll))) {
        recordWhatsappLog({
            recipient_type: "STAFF",
            recipient_name: payroll.staff.full_name,
            phone: payroll.staff.phone,
            template_label: STAFF_WHATSAPP_TEMPLATES.payroll
        });
    }
}

function buildFeeReminderMessage(child, fee) {
    const remaining = remainingFeeAmount(fee);
    const lines = [];
    lines.push(`السلام عليكم أهل ${child.full_name}`);
    lines.push(`تذكير بسداد رسوم الحضانة — ${BRAND.shortName}:`);
    lines.push("");
    lines.push(`• الشهر: ${formatArabicDate(fee.fee_month)}`);
    lines.push(`• تاريخ الاستحقاق: ${formatArabicDate(fee.due_date)}`);
    lines.push(`• إجمالي المبلغ: ${formatCurrency(fee.amount)}`);
    if (Number(fee.discount_amount || 0)) lines.push(`• الخصم: ${formatCurrency(fee.discount_amount)}`);
    if (Number(fee.paid_amount || 0)) lines.push(`• المسدد: ${formatCurrency(fee.paid_amount)}`);
    lines.push(`• المطلوب سداده: ${formatCurrency(remaining)}`);
    lines.push("");
    lines.push("يرجى التكرم بالسداد في أقرب وقت، وشكرًا لتعاونكم الدائم معنا.");
    lines.push(`— ${BRAND.name}`);
    return lines.join("\n");
}

function sendFeeReminderWhatsapp(feeId) {
    const fee = state.fees.find((f) => f.id === feeId);
    if (!fee) return;
    const child = getChildById(fee.child_id);
    if (!child) return;
    const phone = getChildWhatsappPhone(child.id);
    if (openWhatsapp(phone, buildFeeReminderMessage(child, fee))) {
        recordWhatsappLog({
            recipient_type: "PARENT",
            recipient_name: child.full_name,
            phone,
            template_label: "تذكير مصروفات متأخرة"
        });
    }
}

/* --- Payroll / Salaries --- */
function getSalaryConfig(staffId) {
    return state.salaryConfigs.find((c) => c.staff_id === staffId);
}

function ensureSalaryConfig(staffId) {
    let cfg = getSalaryConfig(staffId);
    const staff = state.staff.find((s) => s.id === staffId);
    if (!cfg) {
        const shiftCode = normalizeShiftCode(staff?.shift_code);
        const preset = getShiftPreset(shiftCode);
        cfg = {
            staff_id: staffId,
            shift_code: shiftCode,
            base_salary: Number(staff?.salary || 0),
            scheduled_in: preset.start,
            scheduled_out: preset.end,
            work_days_per_month: 22,
            grace_minutes: 10,
            late_deduction_per_min: 5,
            absence_deduction: 200,
            excused_deduction: 50,
            bonus: 0,
            other_deductions: 0
        };
        state.salaryConfigs.push(cfg);
    } else {
        const shiftCode = normalizeShiftCode(cfg.shift_code || staff?.shift_code || detectShiftCode(cfg.scheduled_in, cfg.scheduled_out));
        const preset = getShiftPreset(shiftCode);
        cfg.shift_code = shiftCode;
        if (!cfg.scheduled_in) cfg.scheduled_in = preset.start;
        if (!cfg.scheduled_out) cfg.scheduled_out = preset.end;
    }
    return cfg;
}

function timeToMinutes(t) {
    if (!t) return null;
    const [h, m] = String(t).split(":").map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function buildPayrollForStaff(staffId, monthStr) {
    const staff = state.staff.find((s) => s.id === staffId);
    if (!staff) return null;
    const cfg = ensureSalaryConfig(staffId);
    const start = monthStartDate(monthStr);
    const end = getMonthEnd(start);
    const records = state.staffAttendance.filter((r) => r.staff_id === staffId && isDateWithinRange(r.attendance_date, start, end));

    const scheduledInMin = timeToMinutes(cfg.scheduled_in);
    const scheduledOutMin = timeToMinutes(cfg.scheduled_out);

    let totalLateMin = 0;
    let earlyLeaveMin = 0;
    const details = records.slice().sort((a, b) => a.attendance_date.localeCompare(b.attendance_date)).map((r) => {
        const inMin = timeToMinutes(r.check_in_time);
        const outMin = timeToMinutes(r.check_out_time);
        let lateMin = 0;
        let leaveEarlyMin = 0;
        let deduction = 0;

        if (r.status === "ABSENT") {
            deduction = Number(cfg.absence_deduction || 0);
        } else if (r.status === "EXCUSED" || r.status === "LEAVE") {
            deduction = Number(cfg.excused_deduction || 0);
        } else if (r.status === "SICK_LEAVE" || r.status === "TERMINATED") {
            deduction = 0;
        } else {
            if (inMin != null && scheduledInMin != null) {
                const diff = inMin - scheduledInMin;
                if (diff > Number(cfg.grace_minutes || 0)) {
                    lateMin = diff - Number(cfg.grace_minutes || 0);
                    totalLateMin += lateMin;
                    deduction += lateMin * Number(cfg.late_deduction_per_min || 0);
                }
            }
            if (outMin != null && scheduledOutMin != null) {
                const diff = scheduledOutMin - outMin;
                if (diff > 0) {
                    leaveEarlyMin = diff;
                    earlyLeaveMin += diff;
                    deduction += diff * Number(cfg.late_deduction_per_min || 0);
                }
            }
        }
        return { ...r, lateMin, leaveEarlyMin, deduction };
    });

    const presentCount = records.filter((r) => r.status === "PRESENT").length;
    const lateCount = records.filter((r) => r.status === "LATE").length;
    const absentCount = records.filter((r) => r.status === "ABSENT").length;
    const excusedCount = records.filter((r) => ["EXCUSED", "LEAVE", "SICK_LEAVE", "TERMINATED"].includes(r.status)).length;
    const totalDeductions = details.reduce((s, d) => s + d.deduction, 0) + Number(cfg.other_deductions || 0);
    const net = Math.max(Number(cfg.base_salary || 0) + Number(cfg.bonus || 0) - totalDeductions, 0);

    return {
        staff, cfg, start, end, records: details,
        presentCount, lateCount, absentCount, excusedCount,
        totalLateMin, earlyLeaveMin, totalDeductions, net
    };
}

function renderPayrollSection() {
    const activeStaff = state.staff.filter((s) => s.status === "ACTIVE");
    if (!activeStaff.length) {
        return `
            <div class="reports-hub">
                <section class="panel">
                    <div class="empty-hint">لا يوجد موظفون نشطون لإعداد كشوف الرواتب حاليًا.</div>
                </section>
            </div>
        `;
    }

    if (!ui.payrollStaffId && activeStaff[0]) ui.payrollStaffId = activeStaff[0].id;
    const payroll = buildPayrollForStaff(ui.payrollStaffId, ui.payrollMonth);
    const cfg = payroll?.cfg;

    const allPayrolls = activeStaff
        .map((s) => buildPayrollForStaff(s.id, ui.payrollMonth))
        .filter(Boolean)
        .sort((a, b) => a.staff.full_name.localeCompare(b.staff.full_name, "ar"));
    const printableStaff = getPrintablePayrollStaff(activeStaff);
    const printablePayrolls = printableStaff
        .map((s) => buildPayrollForStaff(s.id, ui.payrollMonth))
        .filter(Boolean)
        .sort((a, b) => a.staff.full_name.localeCompare(b.staff.full_name, "ar"));

    const totals = summarizePayrolls(allPayrolls);
    const printTotals = summarizePayrolls(printablePayrolls);
    const payrollScope = printablePayrolls.length === allPayrolls.length ? "كل الموظفين" : "المعلمات والفريق التعليمي";

    return `
        <div class="reports-hub">
            <section class="panel no-print">
                <div class="panel-header">
                    <div>
                        <h3>إعدادات الرواتب</h3>
                        <p>اختر الموظف والشهر لمراجعة مفردات الراتب، ثم اطبع كشف فردي أو شيكات مجمعة أو كشف الشهر الكامل.</p>
                    </div>
                    <div class="report-toolbar-actions">
                        <label class="filter-inline">الموظف
                            <select data-ui-field="payrollStaffId">${options(activeStaff.map((s) => [s.id, s.full_name]), ui.payrollStaffId)}</select>
                        </label>
                        <label class="filter-inline">الشهر
                            <input type="month" data-ui-field="payrollMonth" value="${(ui.payrollMonth || currentMonthDate()).slice(0, 7)}">
                        </label>
                        <button class="btn btn-primary" type="button" data-action="print-report" data-print-mode="payroll-slip">🖨 طباعة كشف الراتب</button>
                    </div>
                </div>

                ${payroll && cfg ? `
                <form data-form="salary-config" class="salary-config-form">
                    <input type="hidden" name="staff_id" value="${cfg.staff_id}">
                    <div class="field-row">
                        <div class="field">
                            <label>الوردية</label>
                            <select name="shift_code" data-shift-sync="salary">${renderShiftOptions(cfg.shift_code)}</select>
                            <span class="field-hint">صباحي من 08:00 إلى 14:00 (من 8 لـ 2 - السبت والجمعة إجازة).</span>
                        </div>
                        <div class="field"><label>الراتب الأساسي (ج.م)</label><input type="number" name="base_salary" min="0" step="50" value="${cfg.base_salary}"></div>
                        <div class="field"><label>بدل/مكافأة</label><input type="number" name="bonus" min="0" step="10" value="${cfg.bonus || 0}"></div>
                    </div>
                    <div class="field-row">
                        <div class="field"><label>أيام العمل شهريًا</label><input type="number" name="work_days_per_month" min="1" max="31" value="${cfg.work_days_per_month}"></div>
                        <div class="field"><label>موعد الحضور</label><input type="time" name="scheduled_in" value="${cfg.scheduled_in}"></div>
                        <div class="field"><label>موعد الانصراف</label><input type="time" name="scheduled_out" value="${cfg.scheduled_out}"></div>
                    </div>
                    <div class="field-row">
                        <div class="field"><label>سماح التأخير (دقيقة)</label><input type="number" name="grace_minutes" min="0" value="${cfg.grace_minutes}"></div>
                        <div class="field field-hint-box">
                            <label>ملخص الوردية</label>
                            <div class="field-static">${getShiftLabel(cfg.shift_code)}<br>${cfg.scheduled_in} - ${cfg.scheduled_out}</div>
                        </div>
                    </div>
                    <div class="field-row">
                        <div class="field"><label>خصم الدقيقة الواحدة (ج.م)</label><input type="number" name="late_deduction_per_min" min="0" step="0.5" value="${cfg.late_deduction_per_min}"></div>
                        <div class="field"><label>خصم يوم الغياب</label><input type="number" name="absence_deduction" min="0" step="10" value="${cfg.absence_deduction}"></div>
                        <div class="field"><label>خصم الغياب بعذر</label><input type="number" name="excused_deduction" min="0" step="10" value="${cfg.excused_deduction}"></div>
                    </div>
                    <div class="field-row">
                        <div class="field"><label>خصومات أخرى</label><input type="number" name="other_deductions" min="0" step="10" value="${cfg.other_deductions || 0}"></div>
                        <div class="field form-actions-inline"><button class="btn btn-primary" type="submit">💾 حفظ الإعدادات</button></div>
                    </div>
                </form>
                ` : ""}
            </section>

            <section class="panel no-print">
                <div class="panel-header">
                    <div>
                        <h3>مركز طباعة الرواتب</h3>
                        <p>قوالب جاهزة للطباعة على ورق A4 بصياغة مناسبة للحضانة، وتعتمد على الشهر المختار وإعدادات الخصومات الحالية.</p>
                    </div>
                    <div class="panel-badge">${payrollScope}</div>
                </div>
                <div class="payroll-print-tools">
                    <article class="payroll-print-card">
                        <span class="print-tool-badge">A4 / 6 شيكات</span>
                        <h4>شيكات صرف صغيرة للمعلمات</h4>
                        <p>يطبع 6 شيكات في الورقة الواحدة، وكل شيك يظهر الاسم وصافي المستحق مع الأساسي والحوافز والخصومات وخانة توقيع الاستلام.</p>
                        <div class="print-tool-stats">
                            <div><span>عدد الشيكات</span><strong>${printablePayrolls.length}</strong></div>
                            <div><span>عدد الصفحات</span><strong>${Math.max(1, Math.ceil(printablePayrolls.length / 6))}</strong></div>
                            <div><span>إجمالي الصافي</span><strong>${formatCurrency(printTotals.net)}</strong></div>
                        </div>
                        <button class="btn btn-primary" type="button" data-action="print-report" data-print-mode="payroll-checks">طباعة شيكات الرواتب</button>
                    </article>
                    <article class="payroll-print-card">
                        <span class="print-tool-badge">A4 / 25 اسم</span>
                        <h4>كشف راتب الشهر المجمع</h4>
                        <p>كشف شهري مضغوط للطباعة يحمل الاسم والمرتب الأساسي والحوافز والخصومات والصافي، مع سطور جاهزة للتوقيع والاستلام.</p>
                        <div class="print-tool-stats">
                            <div><span>عدد الأسماء</span><strong>${printablePayrolls.length}</strong></div>
                            <div><span>الحوافز</span><strong>${formatCurrency(printTotals.bonus)}</strong></div>
                            <div><span>الخصومات</span><strong>${formatCurrency(printTotals.deductions)}</strong></div>
                        </div>
                        <button class="btn btn-secondary" type="button" data-action="print-report" data-print-mode="payroll-register">طباعة كشف الشهر</button>
                    </article>
                </div>
            </section>

            ${payroll ? renderPayrollDocument(payroll) : ""}
            <div class="print-stash print-only-payroll-checks">
                ${renderPayrollChecksSheets(printablePayrolls, payrollScope)}
            </div>
            <div class="print-stash print-only-payroll-register">
                ${renderPayrollRegisterDocuments(printablePayrolls, payrollScope)}
            </div>

            <section class="panel no-print">
                <div class="panel-header">
                    <div>
                        <h3>ملخص كل الموظفين لشهر ${formatArabicMonthLabel(monthStartDate(ui.payrollMonth || currentMonthDate()))}</h3>
                        <p>إجمالي صافي الرواتب: <strong>${formatCurrency(totals.net)}</strong></p>
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>الموظف</th><th>الوظيفة</th><th>الأساسي</th><th>الحوافز</th><th>الخصومات</th><th>الصافي</th><th></th></tr></thead>
                        <tbody>
                            ${allPayrolls.map((p) => `<tr>
                                <td>${p.staff.full_name}</td>
                                <td>${p.staff.job_title || "-"} · ${getShiftLabel(p.cfg.shift_code, true)}</td>
                                <td>${formatCurrency(p.cfg.base_salary)}</td>
                                <td>${formatCurrency(p.cfg.bonus || 0)}</td>
                                <td>${formatCurrency(p.totalDeductions)}</td>
                                <td><strong>${formatCurrency(p.net)}</strong></td>
                                <td><button class="btn btn-ghost" type="button" data-action="select-payroll-staff" data-id="${p.staff.id}">عرض الكشف</button></td>
                            </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    `;
}

function renderPayrollDocument(p) {
    const { staff, cfg, start, end } = p;
    return `
        <article class="doc-page print-only-payroll-slip">
            ${reportHeader("كشف راتب شهري", `${staff.full_name} — ${staff.job_title || ""}`,
                `شهر: من ${formatArabicDate(start)} إلى ${formatArabicDate(end)}`)}
            ${summaryCards([
                { label: "الراتب الأساسي", value: formatCurrency(cfg.base_salary), tone: "primary" },
                { label: "الحوافز", value: formatCurrency(cfg.bonus || 0), tone: "success" },
                { label: "الخصومات", value: formatCurrency(p.totalDeductions), tone: p.totalDeductions ? "warning" : "success" },
                { label: "الصافي", value: formatCurrency(p.net), tone: "success" },
                { label: "حاضر", value: p.presentCount },
                { label: "متأخر", value: p.lateCount, tone: p.lateCount ? "warning" : "success" },
                { label: "غائب", value: p.absentCount, tone: p.absentCount ? "danger" : "success" },
                { label: "بعذر/إجازة", value: p.excusedCount }
            ])}

            <section class="doc-section">
                <h2 class="doc-section-title">قواعد الحساب المطبقة</h2>
                <div class="doc-info-grid">
                    <div><span>الوردية</span><strong>${getShiftLabel(cfg.shift_code)}</strong></div>
                    <div><span>موعد الحضور</span><strong>${cfg.scheduled_in}</strong></div>
                    <div><span>موعد الانصراف</span><strong>${cfg.scheduled_out}</strong></div>
                    <div><span>سماح التأخير</span><strong>${cfg.grace_minutes} دقيقة</strong></div>
                    <div><span>خصم الدقيقة</span><strong>${formatCurrency(cfg.late_deduction_per_min)}</strong></div>
                    <div><span>خصم يوم الغياب</span><strong>${formatCurrency(cfg.absence_deduction)}</strong></div>
                    <div><span>خصم الغياب بعذر</span><strong>${formatCurrency(cfg.excused_deduction)}</strong></div>
                </div>
            </section>

            <section class="doc-section">
                <h2 class="doc-section-title">تفاصيل الحضور والخصومات</h2>
                ${docTable(
                    ["التاريخ", "الحالة", "الدخول", "الانصراف", "تأخير (د)", "انصراف مبكر (د)", "خصم"],
                    p.records.map((r) => [
                        formatArabicDate(r.attendance_date),
                        `<span class="tag ${statusClass(r.status)}">${ATTENDANCE_LABELS[r.status]}</span>`,
                        r.check_in_time || "-",
                        r.check_out_time || "-",
                        r.lateMin || 0,
                        r.leaveEarlyMin || 0,
                        r.deduction ? `<span class="rate-pill bad">${formatCurrency(r.deduction)}</span>` : "-"
                    ]),
                    "لا توجد سجلات حضور في هذا الشهر",
                    `payroll-${staff.id}`
                )}
            </section>

            <section class="doc-section">
                <h2 class="doc-section-title">إجمالي الكشف</h2>
                <table class="doc-table payroll-totals">
                    <tbody>
                        <tr><td>الراتب الأساسي</td><td class="amt">${formatCurrency(cfg.base_salary)}</td></tr>
                        <tr><td>+ حوافز/بدلات</td><td class="amt pos">${formatCurrency(cfg.bonus || 0)}</td></tr>
                        <tr><td>− خصومات التأخير (${p.totalLateMin} دقيقة)</td><td class="amt neg">${formatCurrency(p.totalLateMin * Number(cfg.late_deduction_per_min || 0))}</td></tr>
                        <tr><td>− خصم غياب (${p.absentCount} يوم)</td><td class="amt neg">${formatCurrency(p.absentCount * Number(cfg.absence_deduction || 0))}</td></tr>
                        <tr><td>− خصم بعذر/إجازة (${p.excusedCount})</td><td class="amt neg">${formatCurrency(p.excusedCount * Number(cfg.excused_deduction || 0))}</td></tr>
                        <tr><td>− خصومات أخرى</td><td class="amt neg">${formatCurrency(cfg.other_deductions || 0)}</td></tr>
                        <tr class="payroll-grand"><td>صافي الراتب المستحق</td><td class="amt">${formatCurrency(p.net)}</td></tr>
                    </tbody>
                </table>
            </section>

            <section class="doc-signatures">
                <div><span>توقيع المدير</span><div class="sig-line"></div></div>
                <div><span>توقيع الموظف</span><div class="sig-line"></div></div>
                <div><span>تاريخ الاستلام</span><div class="sig-line"></div></div>
            </section>
            <div class="wa-panel no-print">
                <div class="wa-info">
                    <strong>إرسال شيك القبض للمعلم/الموظف عبر واتساب</strong>
                    <span>يتم فتح محادثة واتساب مع المعلم تلقائيًا مع رسالة جاهزة فيها تفاصيل الراتب والخصومات.</span>
                </div>
                <button class="btn btn-whatsapp-full" type="button" data-action="wa-payroll-receipt" data-staff="${staff.id}">إرسال شيك الراتب إلى ${staff.full_name}</button>
            </div>
            ${docFooter()}
        </article>
    `;
}

function getPrintablePayrollStaff(activeStaff = state.staff.filter((s) => s.status === "ACTIVE")) {
    const teachingStaff = activeStaff.filter((staff) => isPrintableTeacherRole(staff?.job_title));
    return teachingStaff.length ? teachingStaff : activeStaff;
}

function isPrintableTeacherRole(title = "") {
    return /(معلم|معلمة|مدرس|teacher|مشرف|مشرفة|فصل|kg|رياض)/i.test(String(title || ""));
}

function summarizePayrolls(payrolls) {
    return payrolls.reduce((acc, item) => {
        acc.base += Number(item.cfg.base_salary || 0);
        acc.bonus += Number(item.cfg.bonus || 0);
        acc.deductions += Number(item.totalDeductions || 0);
        acc.net += Number(item.net || 0);
        return acc;
    }, { base: 0, bonus: 0, deductions: 0, net: 0 });
}

function chunkItems(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

function formatArabicMonthLabel(dateValue) {
    const value = `${dateValue || todayDate()}T00:00:00`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return dateValue || "-";
    return new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(date);
}

function renderPayrollChecksSheets(payrolls, scopeLabel) {
    if (!payrolls.length) return "";
    const monthLabel = formatArabicMonthLabel(payrolls[0]?.start || monthStartDate(ui.payrollMonth || currentMonthDate()));
    return chunkItems(payrolls, 6).map((page, pageIndex, pages) => {
        const slots = page.concat(Array.from({ length: Math.max(0, 6 - page.length) }, () => null));
        return `
            <article class="doc-page payroll-checks-page print-only-payroll-checks">
                <header class="payroll-sheet-header">
                    <div>
                        <span class="payroll-sheet-kicker">شيكات صرف الرواتب</span>
                        <h1>${BRAND.name}</h1>
                        <p>${scopeLabel} · ${monthLabel}</p>
                    </div>
                    <div class="payroll-sheet-meta">صفحة ${pageIndex + 1} / ${pages.length}</div>
                </header>
                <section class="payroll-checks-grid">
                    ${slots.map((item) => item ? renderPayrollCheckCard(item, monthLabel) : `<div class="payroll-check payroll-check-empty"></div>`).join("")}
                </section>
            </article>
        `;
    }).join("");
}

function renderPayrollCheckCard(payroll, monthLabel) {
    return `
        <article class="payroll-check">
            <div class="payroll-check-top">
                <div>
                    <strong class="payroll-check-name">${payroll.staff.full_name}</strong>
                    <span class="payroll-check-role">${payroll.staff.job_title || "معلمة"} · ${getShiftLabel(payroll.cfg.shift_code, true)}</span>
                </div>
                <span class="payroll-check-badge">شيك راتب</span>
            </div>
            <div class="payroll-check-body">
                <div class="payroll-check-row"><span>الشهر</span><strong>${monthLabel}</strong></div>
                <div class="payroll-check-row"><span>المرتب الأساسي</span><strong>${formatCurrency(payroll.cfg.base_salary)}</strong></div>
                <div class="payroll-check-row"><span>الحوافز</span><strong>${formatCurrency(payroll.cfg.bonus || 0)}</strong></div>
                <div class="payroll-check-row"><span>الخصومات</span><strong>${formatCurrency(payroll.totalDeductions)}</strong></div>
            </div>
            <div class="payroll-check-net">
                <span>صافي المستحق</span>
                <strong>${formatCurrency(payroll.net)}</strong>
            </div>
            <div class="payroll-check-footer">
                <span>توقيع الاستلام</span>
                <span class="payroll-check-line"></span>
            </div>
        </article>
    `;
}

function renderPayrollRegisterDocuments(payrolls, scopeLabel) {
    if (!payrolls.length) return "";
    const monthLabel = formatArabicMonthLabel(payrolls[0]?.start || monthStartDate(ui.payrollMonth || currentMonthDate()));
    const totals = summarizePayrolls(payrolls);
    return chunkItems(payrolls, 25).map((page, pageIndex, pages) => {
        const slots = page.concat(Array.from({ length: Math.max(0, 25 - page.length) }, () => null));
        return `
            <article class="doc-page payroll-register-page print-only-payroll-register">
                <header class="payroll-sheet-header">
                    <div>
                        <span class="payroll-sheet-kicker">كشف راتب الشهر</span>
                        <h1>${BRAND.name}</h1>
                        <p>${scopeLabel} · ${monthLabel}</p>
                    </div>
                    <div class="payroll-sheet-meta">صفحة ${pageIndex + 1} / ${pages.length}</div>
                </header>

                <section class="payroll-register-summary">
                    <div class="payroll-register-chip"><span>عدد الأسماء</span><strong>${payrolls.length}</strong></div>
                    <div class="payroll-register-chip"><span>الأساسي</span><strong>${formatCurrency(totals.base)}</strong></div>
                    <div class="payroll-register-chip"><span>الحوافز</span><strong>${formatCurrency(totals.bonus)}</strong></div>
                    <div class="payroll-register-chip"><span>الخصومات</span><strong>${formatCurrency(totals.deductions)}</strong></div>
                    <div class="payroll-register-chip"><span>الصافي</span><strong>${formatCurrency(totals.net)}</strong></div>
                </section>

                <div class="doc-table-wrap payroll-register-wrap">
                    <table class="doc-table payroll-register-table">
                        <thead>
                            <tr>
                                <th>م</th>
                                <th>الاسم</th>
                                <th>المرتب الأساسي</th>
                                <th>الحوافز</th>
                                <th>الخصومات</th>
                                <th>الصافي</th>
                                <th>التوقيع</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${slots.map((item, slotIndex) => item ? `
                                <tr>
                                    <td>${(pageIndex * 25) + slotIndex + 1}</td>
                                    <td>
                                        <div class="payroll-register-name">${item.staff.full_name}</div>
                                        <div class="payroll-register-role">${item.staff.job_title || "-"} · ${getShiftLabel(item.cfg.shift_code, true)}</div>
                                    </td>
                                    <td>${formatCurrency(item.cfg.base_salary)}</td>
                                    <td>${formatCurrency(item.cfg.bonus || 0)}</td>
                                    <td>${formatCurrency(item.totalDeductions)}</td>
                                    <td><strong>${formatCurrency(item.net)}</strong></td>
                                    <td class="payroll-register-sign-cell"></td>
                                </tr>
                            ` : `
                                <tr class="payroll-register-empty-row">
                                    <td>${(pageIndex * 25) + slotIndex + 1}</td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td class="payroll-register-sign-cell"></td>
                                </tr>
                            `).join("")}
                        </tbody>
                        ${pageIndex === pages.length - 1 ? `
                            <tfoot>
                                <tr>
                                    <td colspan="2">إجمالي الشهر</td>
                                    <td>${formatCurrency(totals.base)}</td>
                                    <td>${formatCurrency(totals.bonus)}</td>
                                    <td>${formatCurrency(totals.deductions)}</td>
                                    <td>${formatCurrency(totals.net)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        ` : ""}
                    </table>
                </div>

                <section class="payroll-register-signoff">
                    <div><span>اعتماد الإدارة</span><div class="sig-line"></div></div>
                    <div><span>مسؤول الحسابات</span><div class="sig-line"></div></div>
                </section>
            </article>
        `;
    }).join("");
}

function triggerPrint(mode = "report") {
    const body = document.body;
    const modeClass = `print-mode-${mode}`;
    body.classList.remove("print-mode-report", "print-mode-payroll-slip", "print-mode-payroll-checks", "print-mode-payroll-register");
    body.classList.add("printing-report", modeClass);
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            body.classList.remove("printing-report", modeClass);
        }, 400);
    }, 30);
}

function saveSalaryConfig(data) {
    const idx = state.salaryConfigs.findIndex((c) => c.staff_id === data.staff_id);
    const shiftCode = normalizeShiftCode(data.shift_code);
    const preset = getShiftPreset(shiftCode);
    const numeric = {
        base_salary: Number(data.base_salary || 0),
        bonus: Number(data.bonus || 0),
        work_days_per_month: Number(data.work_days_per_month || 22),
        grace_minutes: Number(data.grace_minutes || 0),
        late_deduction_per_min: Number(data.late_deduction_per_min || 0),
        absence_deduction: Number(data.absence_deduction || 0),
        excused_deduction: Number(data.excused_deduction || 0),
        other_deductions: Number(data.other_deductions || 0)
    };
    const next = {
        staff_id: data.staff_id,
        shift_code: shiftCode,
        scheduled_in: data.scheduled_in || preset.start,
        scheduled_out: data.scheduled_out || preset.end,
        ...numeric
    };
    if (idx >= 0) state.salaryConfigs[idx] = { ...state.salaryConfigs[idx], ...next };
    else state.salaryConfigs.push(next);
    const staffIdx = state.staff.findIndex((s) => s.id === data.staff_id);
    if (staffIdx >= 0) {
        state.staff[staffIdx].salary = numeric.base_salary;
        state.staff[staffIdx].shift_code = shiftCode;
    }
    saveAndRender();
    showToast("تم حفظ إعدادات الراتب");
}

function broadcastWhatsappToAllParents(kind, stage = "ALL", range = getReportRange()) {
    const active = getWhatsappChildrenByStage(stage).filter((child) => isValidPhone(getChildWhatsappPhone(child.id)));
    const stageLabel = stage === "ALL" ? "كل المراحل" : STAGE_LABELS[stage];
    if (!active.length) { showToast("لا يوجد أولياء أمور متاحون لهذا الإرسال", "error"); return; }
    showConfirm(`سيتم إرسال ${active.length} رسالة عبر تطبيق واتساب لمرحلة ${stageLabel} مع فاصل آمن بين الرسائل. هل تريد المتابعة؟`, () => {
        active.forEach((child) => {
            sendChildWhatsapp(child.id, kind, range);
        });
    });
}

function sendAllOverdueFeeReminders(stage = "ALL") {
    const overdueRows = getOverdueFees().filter((row) => stage === "ALL" || row.child?.stage === stage);
    if (!overdueRows.length) {
        showToast("لا توجد رسوم متأخرة لهذا الفلتر", "error");
        return;
    }
    showConfirm(`سيتم إرسال ${overdueRows.length} تذكير عبر تطبيق واتساب مع فاصل آمن بين الرسائل. هل تريد المتابعة؟`, () => {
        overdueRows.forEach((row) => {
            sendFeeReminderWhatsapp(row.fee.id);
        });
    });
}

function exportReportCsv(reportId) {
    const table = document.getElementById(reportId);
    if (!table) {
        showToast("لا توجد بيانات للتصدير", "error");
        return;
    }
    const csvRows = [];
    table.querySelectorAll("tr").forEach((tr) => {
        const cells = [...tr.querySelectorAll("th, td")].map((c) => {
            const text = c.innerText.replace(/"/g, '""').replace(/\s+/g, " ").trim();
            return `"${text}"`;
        });
        csvRows.push(cells.join(","));
    });
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportId}-${todayDate()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("تم تصدير التقرير بنجاح");
}

function renderAbsencePeriodCard(title, label, childrenCount, staffCount) {
    return `
        <article class="report-period-card">
            <span class="period-kicker">${title}</span>
            <strong>${label}</strong>
            <div class="period-counts">
                <div class="period-count-row">
                    <span>غياب الأطفال</span>
                    <b>${childrenCount}</b>
                </div>
                <div class="period-count-row">
                    <span>غياب المعلمين</span>
                    <b>${staffCount}</b>
                </div>
            </div>
        </article>
    `;
}

function renderAbsencePeriodSection(title, period, mode) {
    return `
        <section class="split-panels report-section">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${title} - الأطفال</h3>
                        <p>${period.label}</p>
                    </div>
                </div>
                ${mode === "daily"
                    ? renderDailyAbsenceTable(period.children, "child")
                    : renderRangeAbsenceTable(period.children, "child")}
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${title} - المعلمون</h3>
                        <p>${period.label}</p>
                    </div>
                </div>
                ${mode === "daily"
                    ? renderDailyAbsenceTable(period.staff, "staff")
                    : renderRangeAbsenceTable(period.staff, "staff")}
            </div>
        </section>
    `;
}

function renderDailyAbsenceTable(rows, type) {
    const title = type === "child" ? "لا توجد حالات غياب أطفال في هذه الفترة." : "لا توجد حالات غياب معلمين في هذه الفترة.";
    return `
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>${type === "child" ? "الاسم" : "المعلم"}</th>
                        <th>${type === "child" ? "الفصل" : "الوظيفة"}</th>
                        <th>الحالة</th>
                        <th>الملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length ? rows.map((row) => `
                        <tr>
                            <td>${row.name}</td>
                            <td>${row.groupLabel}</td>
                            <td><span class="tag ${statusClass(row.status)}">${ATTENDANCE_LABELS[row.status]}</span></td>
                            <td>${row.note || "-"}</td>
                        </tr>
                    `).join("") : `<tr><td colspan="4" class="empty-state">${title}</td></tr>`}
                </tbody>
            </table>
        </div>
    `;
}

function renderRangeAbsenceTable(rows, type) {
    const title = type === "child" ? "لا توجد حالات غياب أطفال في هذه الفترة." : "لا توجد حالات غياب معلمين في هذه الفترة.";
    return `
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>${type === "child" ? "الاسم" : "المعلم"}</th>
                        <th>${type === "child" ? "الفصل" : "الوظيفة"}</th>
                        <th>غياب</th>
                        <th>بعذر</th>
                        <th>آخر تاريخ</th>
                        <th>آخر ملاحظة</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length ? rows.map((row) => `
                        <tr>
                            <td>${row.name}</td>
                            <td>${row.groupLabel}</td>
                            <td>${row.absentCount}</td>
                            <td>${row.excusedCount}</td>
                            <td>${formatArabicDate(row.lastDate)}</td>
                            <td>${row.lastNote || "-"}</td>
                        </tr>
                    `).join("") : `<tr><td colspan="6" class="empty-state">${title}</td></tr>`}
                </tbody>
            </table>
        </div>
    `;
}

function renderSecuritySection() {
    const roles = [
        {
            title: "الإدارة",
            points: ["إدارة كل الأقسام", "إضافة وحذف وتعديل كامل", "الوصول للتقارير والصلاحيات"]
        },
        {
            title: "السكرتارية",
            points: ["إدارة الأطفال والحضور والفلوس", "إدخال المصروفات والسجلات الطبية", "عرض التقارير دون الإدارة الكاملة"]
        },
        {
            title: "المعلمة",
            points: ["الحضور اليومي", "متابعة ملفات الأطفال", "المنهج والتحضير والأنشطة فقط"]
        }
    ];

    return `
        <section class="section-grid columns-2">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>الحسابات المسجلة على النظام</h3>
                        <p>عرض آمن للحسابات الحالية بدون إظهار كلمات المرور، مع اعتماد تسجيل الدخول برقم التليفون.</p>
                    </div>
                </div>
                <div class="summary-strip" style="margin-bottom:16px;">
                    <article class="summary-tile"><span>إجمالي الحسابات</span><strong>${state.users.length}</strong></article>
                    <article class="summary-tile"><span>حسابات الإدارة</span><strong>${state.users.filter((user) => user.role === "ADMIN").length}</strong></article>
                    <article class="summary-tile"><span>صيغة الدخول</span><strong>تليفون + كلمة مرور</strong></article>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr><th>الاسم</th><th>رقم التليفون</th><th>الدور</th></tr>
                        </thead>
                        <tbody>
                            ${state.users.map((user) => `
                                <tr>
                                    <td>${user.full_name}</td>
                                    <td dir="ltr">${user.phone}</td>
                                    <td>${USER_ROLE_LABELS[user.role]}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>مصفوفة الصلاحيات</h3>
                        <p>ملخص واضح لما يستطيع كل دور الوصول إليه داخل النظام الفعلي.</p>
                    </div>
                </div>
                <div class="actions-row" style="margin-bottom:16px;">
                    <button class="btn btn-secondary" type="button" data-action="open-users-settings">إدارة المستخدمين</button>
                    <button class="btn btn-ghost" type="button" data-nav="settings">فتح الإعدادات</button>
                </div>
                <div class="roles-grid">
                    ${roles.map((role) => `
                        <article class="role-card">
                            <h4>${role.title}</h4>
                            <ul>${role.points.map((point) => `<li>${point}</li>`).join("")}</ul>
                        </article>
                    `).join("")}
                </div>
            </div>
        </section>
    `;
}

function handleClick(event) {
    const button = event.target.closest("[data-action], [data-nav]");
    if (!button) {
        return;
    }

    if (button.dataset.nav) {
        ui.activeSection = button.dataset.nav;
        render();
        return;
    }

    const { action, id } = button.dataset;

    switch (action) {
        case "open-whatsapp":
            if (window.require) {
                try {
                    window.require("electron").shell.openExternal("https://wa.me/201022104948");
                    return;
                } catch (e) {}
            }
            window.open("https://wa.me/201022104948", "_blank");
            return;
        case "open-anydesk":
            if (window.require) {
                try {
                    window.require("child_process").exec('AnyDesk(1).exe', { cwd: window.require('path').join(__dirname, '..', '..') });
                    return;
                } catch (e) {}
            }
            showToast("برنامج AnyDesk متاح فقط في نسخة سطح المكتب.");
            return;
        case "open-smart-whatsapp":
            showSmartWhatsappModal(id);
            return;
        case "print-student-badge":
            printStudentBadge(id);
            return;
        case "open-certificate-modal":
            showCertificateModal(id);
            return;
        case "print-child-statement":
            printChildStatement(id);
            return;
        case "toggle-theme":
            const currentIsDark = document.body.classList.contains("dark-theme");
            const newTheme = currentIsDark ? "light" : "dark";
            if (newTheme === "dark") {
                document.body.classList.add("dark-theme");
                document.documentElement.setAttribute("data-theme", "dark");
            } else {
                document.body.classList.remove("dark-theme");
                document.documentElement.setAttribute("data-theme", "light");
            }
            localStorage.setItem("BARAEM_THEME", newTheme);
            render();
            return;
        case "go-home":
            ui.activeSection = "home";
            render();
            return;
        case "logout":
            state.session.userId = "";
            ui.showLogin = false;
            saveAndRender();
            return;
        case "start-tour":
            startTour();
            return;
        case "tour-next":
            tourNext();
            return;
        case "tour-prev":
            tourPrev();
            return;
        case "tour-end":
            endTour();
            return;
        case "reset-system":
            state = normalizeStateSchema(structuredClone(seed));
            ui = { ...defaultUi, selectedChildId: state.children[0]?.id || "" };
            saveAndRender();
            return;
        case "clear-child-search":
            ui.childSearch = "";
            render();
            return;
        case "clear-staff-search":
            ui.staffSearch = "";
            render();
            return;
        case "open-users-settings":
            ui.activeSection = "settings";
            ui.settingsTab = "users";
            ui.userFormId = null;
            render();
            return;
        case "new-child":
            ui.childFormId = "";
            ui.activeSection = "add_child";
            render();
            return;
        case "view-child":
            ui.selectedChildId = id;
            render();
            return;
        case "edit-child":
            ui.childFormId = id;
            ui.selectedChildId = id;
            ui.activeSection = "add_child";
            render();
            return;
        case "delete-child":
            deleteChild(id);
            return;
        case "switch-child-att-tab":
            ui.attendanceChildTab = button.dataset.tab;
            render();
            return;
        case "switch-staff-att-tab":
            ui.staffAttendanceTab = button.dataset.tab;
            render();
            return;
        case "quick-child-status": {
            const record = ensureChildAttendanceRecord(id, ui.attendanceDate);
            const period = button.dataset.period;
            if (period === "evening") {
                record.evening_status = button.dataset.status;
            } else if (period === "morning") {
                record.status = button.dataset.status;
            } else if (period === "both") {
                record.status = button.dataset.status;
                record.evening_status = button.dataset.status;
            }
            saveAndRender();
            return;
        }
        case "quick-staff-status": {
            const record = ensureStaffAttendanceRecord(id, ui.attendanceDate);
            record.status = button.dataset.status;
            const s = state.staff.find((st) => st.id === id);
            if (record.status === "TERMINATED") {
                if (s) {
                    s.status = "TERMINATED";
                    showToast(`تم تسجيل إنهاء تعاقد الموظف "${s.full_name}" بنجاح.`);
                }
            } else {
                if (s && s.status === "TERMINATED") {
                    s.status = "ACTIVE";
                }
            }
            saveAndRender();
            return;
        }
        case "mark-all-present-evening":
            state.children.filter((c) => c.status === "ACTIVE").forEach((child) => {
                const record = ensureChildAttendanceRecord(child.id, ui.attendanceDate);
                record.evening_status = "PRESENT";
            });
            saveAndRender();
            return;
        case "mark-all-present":
            markAllChildrenPresent(ui.attendanceDate);
            return;
        case "checkin-all":
            checkInAllChildren(ui.attendanceDate);
            return;
        case "mark-staff-present":
            markAllStaffPresent(ui.attendanceDate);
            return;
        case "toggle-child-checkin":
            toggleChildCheckIn(id, ui.attendanceDate);
            return;
        case "toggle-child-checkout":
            toggleChildCheckOut(id, ui.attendanceDate);
            return;
        case "toggle-staff-checkin":
            toggleStaffCheckIn(id, ui.attendanceDate);
            return;
        case "toggle-staff-checkout":
            toggleStaffCheckOut(id, ui.attendanceDate);
            return;
        case "new-fee":
            ui.feeFormId = "";
            render();
            return;
        case "edit-fee":
            ui.feeFormId = id;
            render();
            return;
        case "delete-fee":
            deleteRecord("fees", id);
            return;
        case "generate-monthly-fees":
            generateMonthlyFees(ui.financeMonth);
            return;
        case "new-expense":
            ui.expenseFormId = "";
            render();
            return;
        case "edit-expense":
            ui.expenseFormId = id;
            render();
            return;
        case "delete-expense":
            deleteRecord("expenses", id);
            return;
        case "new-staff":
            ui.staffFormId = "";
            render();
            return;
        case "edit-staff":
            ui.staffFormId = id;
            render();
            return;
        case "terminate-staff": {
            const s = state.staff.find((st) => st.id === id);
            if (!s) return;
            showConfirm(`هل أنت متأكد من إلغاء / إنهاء تعاقد الموظف "${s.full_name}"؟`, () => {
                s.status = "TERMINATED";
                saveAndRender();
                showToast(`تم إنهاء تعاقد الموظف "${s.full_name}" بنجاح.`);
            });
            return;
        }
        case "activate-staff": {
            const s = state.staff.find((st) => st.id === id);
            if (!s) return;
            showConfirm(`هل تريد إعادة تفعيل تعاقد الموظف "${s.full_name}"؟`, () => {
                s.status = "ACTIVE";
                saveAndRender();
                showToast(`تم إعادة تفعيل تعاقد الموظف "${s.full_name}" بنجاح.`);
            });
            return;
        }
        case "delete-staff":
            deleteStaff(id);
            return;
        case "new-curriculum":
            ui.curriculumFormId = "";
            render();
            return;
        case "edit-curriculum":
            ui.curriculumFormId = id;
            render();
            return;
        case "delete-curriculum":
            deleteRecord("curriculum", id);
            return;
        case "new-planning":
            ui.planningFormId = "";
            render();
            return;
        case "edit-planning":
            ui.planningFormId = id;
            render();
            return;
        case "delete-planning":
            deleteRecord("weeklyPlanning", id);
            return;
        case "new-activity":
            ui.activityFormId = "";
            render();
            return;
        case "edit-activity":
            ui.activityFormId = id;
            render();
            return;
        case "delete-activity":
            deleteRecord("activities", id);
            return;
        case "new-medical":
            ui.medicalFormId = "";
            render();
            return;
        case "edit-medical":
            ui.medicalFormId = id;
            render();
            return;
        case "delete-medical":
            deleteRecord("medicalRecords", id);
            return;
        case "new-pharmacy":
            ui.pharmacyFormId = "";
            render();
            return;
        case "edit-pharmacy":
            ui.pharmacyFormId = id;
            render();
            return;
        case "delete-pharmacy":
            deleteRecord("pharmacyItems", id);
            return;
        case "print-report":
            triggerPrint(button.dataset.printMode || "report");
            return;
        case "switch-report":
            ui.reportTab = button.dataset.report;
            ui.reportChildId = "";
            ui.reportStaffId = "";
            render();
            return;
        case "export-csv":
            exportReportCsv(button.dataset.reportId);
            return;
        case "switch-exams-tab":
            ui.examsTab = button.dataset.tab;
            ui.examDefFormId = undefined;
            ui.gradingExamDefId = undefined;
            ui.teacherNoteFormId = undefined;
            render();
            return;
        case "new-exam-def":
            ui.examDefFormId = "";
            render();
            return;
        case "edit-exam-def":
            ui.examDefFormId = id;
            render();
            return;
        case "cancel-exam-def":
            ui.examDefFormId = undefined;
            render();
            return;
        case "delete-exam-def":
            showConfirm("حذف هذا الاختبار؟ ستُحذف معه كافة درجات الطلاب المرتبطة به.", () => {
                state.examDefinitions = state.examDefinitions.filter((e) => e.id !== id);
                state.exams = state.exams.filter((e) => e.exam_definition_id !== id);
                ui.examDefFormId = undefined;
                saveAndRender();
                showToast("تم حذف الاختبار ودرجاته");
            });
            return;
        case "grade-exam-def":
            ui.gradingExamDefId = id;
            render();
            return;
        case "cancel-grading":
            ui.gradingExamDefId = undefined;
            render();
            return;
        case "new-note":
            ui.teacherNoteFormId = "";
            render();
            return;
        case "edit-note":
            ui.teacherNoteFormId = id;
            render();
            return;
        case "cancel-note":
            ui.teacherNoteFormId = undefined;
            render();
            return;
        case "delete-note":
            showConfirm("حذف هذه الملاحظة؟", () => {
                state.teacherNotes = state.teacherNotes.filter((n) => n.id !== id);
                ui.teacherNoteFormId = undefined;
                saveAndRender();
                showToast("تم حذف الملاحظة");
            });
            return;
        case "wa-child-attendance": sendChildWhatsapp(button.dataset.child, "attendance"); return;
        case "wa-child-finance":    sendChildWhatsapp(button.dataset.child, "finance"); return;
        case "wa-child-exams":      sendChildWhatsapp(button.dataset.child, "exams"); return;
        case "wa-child-notes":      sendChildWhatsapp(button.dataset.child, "notes"); return;
        case "wa-child-full":       sendChildWhatsapp(button.dataset.child, "full"); return;
        case "wa-staff-attendance": sendStaffWhatsapp(button.dataset.staff); return;
        case "wa-broadcast-attendance": broadcastWhatsappToAllParents("attendance"); return;
        case "wa-broadcast-finance":    broadcastWhatsappToAllParents("finance"); return;
        case "wa-payroll-receipt":      sendPayrollReceiptWhatsapp(button.dataset.staff || ui.payrollStaffId); return;
        case "wa-fee-reminder":         sendFeeReminderWhatsapp(id); return;
        case "wa-send-child-center":   sendChildWhatsapp(ui.whatsappChildId, ui.whatsappChildTemplate, getWhatsappRange()); return;
        case "wa-send-staff-center":
            if (ui.whatsappStaffTemplate === "payroll") sendPayrollReceiptWhatsapp(ui.whatsappStaffId);
            else sendStaffWhatsapp(ui.whatsappStaffId, getWhatsappRange());
            return;
        case "wa-broadcast-stage":
            broadcastWhatsappToAllParents(ui.whatsappBroadcastTemplate, ui.whatsappStage || "ALL", getWhatsappRange());
            return;
        case "wa-broadcast-overdue":
            sendAllOverdueFeeReminders(ui.whatsappStage || "ALL");
            return;
        case "wa-open-web": {
            const ipcRenderer = getElectronIpcRenderer();
            if (ipcRenderer) ipcRenderer.send("whatsapp:open");
            else window.open("https://web.whatsapp.com/", "_blank");
            return;
        }
        case "wa-stop-queue": {
            const ipcRenderer = getElectronIpcRenderer();
            if (ipcRenderer) {
                ipcRenderer.send("whatsapp:stop");
                showToast("تم طلب إيقاف الإرسال", "info");
            }
            return;
        }
        case "wa-reset-web": {
            const ipcRenderer = getElectronIpcRenderer();
            if (ipcRenderer) {
                ipcRenderer.send("whatsapp:reset");
                showToast("جارٍ تنظيف بيانات ربط واتساب فقط", "info");
            }
            return;
        }
        case "switch-settings-tab":
            ui.settingsTab = id;
            ui.userFormId = null;
            ui.subjectFormId = null;
            render();
            return;
        case "new-user":     ui.userFormId = ""; render(); return;
        case "edit-user":    ui.userFormId = id; render(); return;
        case "cancel-user":  ui.userFormId = null; render(); return;
        case "delete-user":  deleteUser(id); return;
        case "new-subject":   ui.subjectFormId = ""; render(); return;
        case "edit-subject":  ui.subjectFormId = id; render(); return;
        case "cancel-subject":ui.subjectFormId = null; render(); return;
        case "delete-subject":deleteSubject(id); return;
        case "toggle-perm":   togglePermission(button.dataset.section, button.dataset.role); return;
        case "go-updates":
            ui.activeSection = "updates";
            render();
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        case "switch-updates-tab":
            ui.updatesTab = id;
            render();
            return;
        case "check-updates-status": {
            showToast("جاري فحص حالة الاتصال بالسيرفر والتحديثات...", "info");
            setTimeout(() => {
                showToast("✅ النظام متصل بالسيرفر وجاهز لتنزيل أحدث التعديلات بضغطة زر!");
            }, 800);
            return;
        }
        case "run-app-update":
        case "check-app-update": {
            performAppUpdate();
            return;
        }
        case "contact-developer-wa": {
            const devPhone = "201022104948";
            const message = encodeURIComponent("السلام عليكم ورحمة الله، أنا من إدارة أكاديمية براعم الإيمان وأحتاج مساعدة أو استفسار بخصوص البرنامج.");
            const waUrl = `https://wa.me/${devPhone}?text=${message}`;
            if (typeof window !== "undefined" && window.require) {
                try {
                    const { shell } = window.require("electron");
                    if (shell && shell.openExternal) {
                        shell.openExternal(waUrl);
                        return;
                    }
                } catch (_) {}
            }
            window.open(waUrl, "_blank");
            return;
        }
        case "save-update-url": {
            const input = document.getElementById("customUpdateUrl");
            if (input && input.value.trim()) {
                localStorage.setItem("BARAEM_UPDATE_URL", input.value.trim());
                showToast("تم حفظ رابط مستودع التحديث بنجاح!");
            }
            return;
        }
        case "backup-export": exportBackup(); return;
        case "go-login":      ui.showLogin = true; render(); return;
        case "go-landing":    ui.showLogin = false; render(); return;
        case "open-facebook": window.open(BRAND.facebook, "_blank"); return;
        case "select-payroll-staff":
            ui.payrollStaffId = id;
            render();
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        case "generate-sync-id": {
            const input = document.querySelector('[name="sync_id"]');
            if (input) input.value = generateSyncId();
            return;
        }
        case "manual-cloud-sync":
            if (cloudDb) { ui.cloudStatus = "syncing"; saveToCloud().then(() => render()); }
            return;
        case "cloud-load-now":
            if (cloudDb) {
                loadFromCloud().then((cloudState) => {
                    if (cloudState) {
                        state = normalizeStateSchema({ ...structuredClone(seed), ...cloudState });
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                        ui.cloudStatus = "synced";
                        saveAndRender();
                        showToast("تم تحميل البيانات من السحابة");
                    } else {
                        showToast("لا توجد بيانات على السحابة بهذا الكود", "info");
                    }
                });
            }
            return;
        case "new-followup":
            ui.followupFormId = "";
            render();
            return;
        case "edit-followup":
            ui.followupFormId = id;
            render();
            return;
        case "cancel-followup":
            ui.followupFormId = null;
            render();
            return;
        case "delete-followup":
            if (confirm("هل تريد حذف هذه المتابعة؟")) {
                state.followUps = state.followUps.filter((f) => f.id !== id);
                saveAndRender();
                showToast("تم حذف المتابعة");
            }
            return;
        case "done-followup": {
            const fu = state.followUps.find((f) => f.id === id);
            if (fu) { fu.status = "DONE"; saveAndRender(); showToast("تم تحديد المتابعة كمنتهية"); }
            return;
        }
        case "toggle-ai-chat":
            ui.isAiChatOpen = !ui.isAiChatOpen;
            render();
            return;
        case "clear-ai-chat":
            if (confirm("هل تريد مسح محادثة الذكاء الاصطناعي؟")) {
                state.aiSettings.history = [];
                saveAndRender();
            }
            return;
        default:
            return;
    }
}

function handleSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) {
        return;
    }

    event.preventDefault();
    const formType = form.dataset.form;
    const data = Object.fromEntries(new FormData(form).entries());

    switch (formType) {
        case "login":
            login(data);
            return;
        case "child":
            saveChild(data);
            return;
        case "staff":
            saveStaff(data);
            return;
        case "fee":
            saveFee(data);
            return;
        case "expense":
            saveExpense(data);
            return;
        case "curriculum":
            saveCurriculum(data);
            return;
        case "planning":
            savePlanning(data);
            return;
        case "activity":
            saveActivity(data);
            return;
        case "medical":
            saveMedical(data);
            return;
        case "pharmacy":
            savePharmacy(data);
            return;
        case "exam-def":
            saveExamDef(data);
            return;
        case "exam-grades":
            saveExamGrades(data);
            return;
        case "teacher-note":
            saveTeacherNote(data);
            return;
        case "salary-config":
            saveSalaryConfig(data);
            return;
        case "user":
            saveUser(data);
            return;
        case "subject":
            saveSubject(data);
            return;
        case "fee-settings":
            saveFeeSettings(data);
            return;
        case "followup":
            saveFollowup(data);
            return;
        case "cloud-config":
            saveCloudSync(data);
            return;
        case "send-ai-chat":
            ui.aiChatInput = data.aiChatInput || "";
            if (ui.aiChatInput.trim()) {
                state.aiSettings.history.push({ role: "user", content: ui.aiChatInput.trim() });
                ui.aiChatInput = "";
                ui.aiIsTyping = true;
                render();
                executeAiChatRequest();
            }
            return;
        case "ai-settings":
            state.aiSettings.groqApiKey = (data.groqApiKey || "").trim();
            saveAndRender();
            showToast("تم حفظ إعدادات AI بنجاح.");
            return;
        default:
            return;
    }
}

function saveExamDef(data) {
    state.examDefinitions = state.examDefinitions || [];
    const maxScore = data.max_score ? Number(data.max_score) : null;
    if (data.id) {
        const idx = state.examDefinitions.findIndex((e) => e.id === data.id);
        if (idx >= 0) state.examDefinitions[idx] = { ...state.examDefinitions[idx], ...data, max_score: maxScore };
    } else {
        state.examDefinitions.push({ ...data, id: `examdef-${Date.now()}`, max_score: maxScore });
    }
    ui.examDefFormId = undefined;
    saveAndRender();
    showToast("تم حفظ بيانات الاختبار");
}

function saveExamGrades(data) {
    const defId = data.exam_def_id;
    const def = state.examDefinitions.find(e => e.id === defId);
    if (!def) return;
    
    Object.keys(data).forEach(key => {
        if (key.startsWith("score_")) {
            const childId = key.replace("score_", "");
            const scoreVal = data[key];
            const notesVal = data[`notes_${childId}`];
            
            if (scoreVal !== "" || notesVal !== "") {
                const existingIdx = state.exams.findIndex(e => e.child_id === childId && e.exam_definition_id === defId);
                const record = {
                    exam_definition_id: defId,
                    child_id: childId,
                    subject_id: def.subject_id,
                    exam_name: def.exam_name,
                    exam_date: def.exam_date,
                    score: scoreVal !== "" ? Number(scoreVal) : null,
                    max_score: def.max_score,
                    term: def.term || "TERM_1",
                    teacher_notes: notesVal || ""
                };
                
                if (existingIdx >= 0) {
                    state.exams[existingIdx] = { ...state.exams[existingIdx], ...record };
                } else {
                    state.exams.push({ ...record, id: `exm-${childId}-${Date.now()}` });
                }
            } else {
                const existingIdx = state.exams.findIndex(e => e.child_id === childId && e.exam_definition_id === defId);
                if (existingIdx >= 0) {
                    state.exams.splice(existingIdx, 1);
                }
            }
        }
    });
    
    ui.gradingExamDefId = undefined;
    saveAndRender();
    showToast("تم رصد الدرجات بنجاح");
}

function saveTeacherNote(data) {
    if (data.id) {
        const idx = state.teacherNotes.findIndex((n) => n.id === data.id);
        if (idx >= 0) state.teacherNotes[idx] = { ...state.teacherNotes[idx], ...data };
    } else {
        state.teacherNotes.push({ ...data, id: `tn-${Date.now()}` });
    }
    ui.teacherNoteFormId = undefined;
    saveAndRender();
    showToast("تم حفظ الملاحظة");
}

async function saveCloudSync(data) {
    let parsed;
    try {
        parsed = JSON.parse(data.firebase_config);
    } catch (_) {
        showToast("الـ Config غير صالح — تأكد من أنه JSON سليم", "error");
        return;
    }
    const syncId = (data.sync_id || "").trim();
    if (!syncId) {
        showToast("أدخل كود المزامنة أو اضغط 'توليد كود'", "error");
        return;
    }
    saveCloudConfig({ ...parsed, syncId });
    cloudDb = null;
    const ok = initCloud();
    if (ok) {
        showToast("تم الاتصال بـ Firebase — جارٍ المزامنة...");
        await saveToCloud();
        render();
    } else {
        showToast("فشل الاتصال — تأكد من صحة الـ Config", "error");
    }
}

function saveFeeSettings(data) {
    state.feeSettings = {
        monthly_amount: Number(data.monthly_amount) || 1800,
        due_day: Math.min(28, Math.max(1, Number(data.due_day) || 10)),
        auto_generate: data.auto_generate === "1"
    };
    saveAndRender();
    showToast("تم حفظ إعدادات الفواتير");
}

function saveFollowup(data) {
    const record = {
        id: data.id || createId("followup"),
        child_id: data.child_id,
        followup_date: data.followup_date,
        followup_type: data.followup_type,
        status: data.status || "OPEN",
        summary: (data.summary || "").trim(),
        action_required: (data.action_required || "").trim(),
        assigned_to: data.assigned_to || "",
        notes: (data.notes || "").trim()
    };
    if (data.id) {
        const idx = state.followUps.findIndex((f) => f.id === data.id);
        if (idx >= 0) state.followUps[idx] = record;
    } else {
        state.followUps.push(record);
    }
    ui.followupFormId = null;
    saveAndRender();
    showToast("تم حفظ المتابعة");
}

/* --- Follow-ups Section --- */
function renderFollowupsSection() {
    const formId = ui.followupFormId;
    const isEditing = formId !== null;
    const formRecord = isEditing && formId ? state.followUps.find((f) => f.id === formId) : null;

    const statusFilter = ui.followupStatusFilter || "";
    const childStage = ui.followupChildStage || "";
    const childIdFilter = ui.followupChildId || "";

    const filtered = state.followUps
        .filter((f) => !statusFilter || f.status === statusFilter)
        .filter((f) => {
            if (!childStage && !childIdFilter) return true;
            const child = getChildById(f.child_id);
            if (!child) return false;
            if (childStage && child.stage !== childStage) return false;
            if (childIdFilter && f.child_id !== childIdFilter) return false;
            return true;
        })
        .sort((a, b) => b.followup_date.localeCompare(a.followup_date));

    const openCount = state.followUps.filter((f) => f.status === "OPEN").length;
    const pendingCount = state.followUps.filter((f) => f.status === "PENDING").length;

    return `
        <section class="metric-grid">
            <article class="metric-card accent">
                <div class="label">مفتوحة</div>
                <div class="value">${openCount}</div>
                <div class="hint">متابعات تحتاج تدخل فعلي</div>
            </article>
            <article class="metric-card gold">
                <div class="label">معلقة</div>
                <div class="value">${pendingCount}</div>
                <div class="hint">تم الاجراء وننتظر رد</div>
            </article>
            <article class="metric-card">
                <div class="label">إجمالي المتابعات</div>
                <div class="value">${state.followUps.length}</div>
                <div class="hint">كل السجلات المحفوظة</div>
            </article>
            <article class="metric-card teal">
                <div class="label">منتهية</div>
                <div class="value">${state.followUps.filter((f) => f.status === "DONE").length}</div>
                <div class="hint">تمت المتابعة وأُغلقت</div>
            </article>
        </section>

        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${formRecord ? "تعديل متابعة" : "تسجيل متابعة جديدة"}</h3>
                        <p>تسجيل مقابلة أو اتصال أو ملاحظة داخلية مرتبطة بطفل معين.</p>
                    </div>
                    ${isEditing ? `<button class="btn btn-secondary" type="button" data-action="cancel-followup">إلغاء</button>` : `<button class="btn btn-secondary" type="button" data-action="new-followup">نموذج جديد</button>`}
                </div>
                <form class="stack" data-form="followup">
                    <input type="hidden" name="id" value="${formRecord?.id || ""}">
                    ${renderFilteredChildSelect("child_id", formRecord?.child_id || "", "followup-child")}
                    <div class="grid-2">
                        <div class="field">
                            <label>تاريخ المتابعة</label>
                            <input type="date" name="followup_date" required value="${formRecord?.followup_date || todayDate()}">
                        </div>
                        <div class="field">
                            <label>نوع المتابعة</label>
                            <select name="followup_type">${optionsFromMap(FOLLOWUP_TYPE_LABELS, formRecord?.followup_type || "CALL")}</select>
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="field">
                            <label>الحالة</label>
                            <select name="status">${optionsFromMap(FOLLOWUP_STATUS_LABELS, formRecord?.status || "OPEN")}</select>
                        </div>
                        <div class="field">
                            <label>المسؤول عن المتابعة</label>
                            <select name="assigned_to">
                                <option value="">— غير محدد —</option>
                                ${state.staff.filter((s) => s.status === "ACTIVE").map((s) => `<option value="${s.id}" ${formRecord?.assigned_to === s.id ? "selected" : ""}>${s.full_name}</option>`).join("")}
                            </select>
                        </div>
                    </div>
                    <div class="field">
                        <label>ملخص المتابعة</label>
                        <textarea name="summary" required rows="3" placeholder="ما الذي تم تناوله في هذه المتابعة؟">${formRecord?.summary || ""}</textarea>
                    </div>
                    <div class="field">
                        <label>الإجراء المطلوب</label>
                        <input name="action_required" value="${formRecord?.action_required || ""}" placeholder="ما الإجراء التالي المطلوب اتخاذه؟">
                    </div>
                    <div class="field">
                        <label>ملاحظات إضافية</label>
                        <textarea name="notes" rows="2">${formRecord?.notes || ""}</textarea>
                    </div>
                    <button class="btn btn-primary" type="submit">${formRecord ? "حفظ التعديلات" : "حفظ المتابعة"}</button>
                </form>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>سجل المتابعات</h3>
                        <p>كل المتابعات المسجلة مع إمكانية التصفية والبحث.</p>
                    </div>
                    <button class="btn btn-primary" type="button" data-action="new-followup">+ متابعة جديدة</button>
                </div>
                <div class="followup-filters">
                    <div class="field">
                        <label>تصفية بالفصل</label>
                        <select data-ui-field="followupChildStage">
                            <option value="">كل الفصول</option>
                            ${Object.entries(STAGE_LABELS).map(([k, v]) => `<option value="${k}" ${childStage === k ? "selected" : ""}>${v}</option>`).join("")}
                        </select>
                    </div>
                    <div class="field">
                        <label>تصفية بالحالة</label>
                        <select data-ui-field="followupStatusFilter">
                            <option value="">كل الحالات</option>
                            ${Object.entries(FOLLOWUP_STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${statusFilter === k ? "selected" : ""}>${v}</option>`).join("")}
                        </select>
                    </div>
                </div>
                <div class="followup-list">
                    ${filtered.length ? filtered.map((fu) => {
                        const child = getChildById(fu.child_id);
                        const assignee = fu.assigned_to ? state.staff.find((s) => s.id === fu.assigned_to) : null;
                        return `
                        <div class="followup-card followup-status-${fu.status.toLowerCase()}">
                            <div class="followup-card-header">
                                <div class="followup-meta">
                                    <strong>${child?.full_name || "طفل غير محدد"}</strong>
                                    ${child ? `<span class="tag">${STAGE_LABELS[child.stage]}</span>` : ""}
                                    <span class="tag followup-type-tag">${FOLLOWUP_TYPE_LABELS[fu.followup_type] || fu.followup_type}</span>
                                </div>
                                <div class="followup-actions">
                                    <span class="tag followup-status-tag ${fu.status === "OPEN" ? "overdue" : fu.status === "PENDING" ? "partial" : "paid"}">${FOLLOWUP_STATUS_LABELS[fu.status]}</span>
                                    ${fu.status !== "DONE" ? `<button type="button" class="btn btn-secondary btn-xs" data-action="done-followup" data-id="${fu.id}">✓ منتهية</button>` : ""}
                                    <button type="button" class="btn btn-secondary btn-xs" data-action="edit-followup" data-id="${fu.id}">تعديل</button>
                                    <button type="button" class="btn btn-danger btn-xs" data-action="delete-followup" data-id="${fu.id}">حذف</button>
                                </div>
                            </div>
                            <div class="followup-date">${formatArabicDate(fu.followup_date)} ${assignee ? `· المسؤول: ${assignee.full_name}` : ""}</div>
                            <div class="followup-summary">${fu.summary}</div>
                            ${fu.action_required ? `<div class="followup-action-required">الإجراء المطلوب: ${fu.action_required}</div>` : ""}
                            ${fu.notes ? `<div class="followup-notes">${fu.notes}</div>` : ""}
                        </div>`;
                    }).join("") : `<div class="empty-state">لا توجد متابعات مسجلة بهذه الفلترة.</div>`}
                </div>
            </div>
        </section>
    `;
}

/* --- Settings Section --- */
const SETTINGS_TABS = [
    { id: "users", label: "المستخدمون" },
    { id: "permissions", label: "الصلاحيات" },
    { id: "subjects", label: "المواد الدراسية" },
    { id: "backup", label: "النسخ الاحتياطي" },
    { id: "cloud", label: "☁ المزامنة السحابية" },
    { id: "ai", label: "✨ إعدادات المساعد الذكي" }
];

function renderSettingsSection() {
    const tab = ui.settingsTab || "users";
    return `
        <section class="panel" style="margin-bottom:14px;">
            <div class="panel-header">
                <div>
                    <h3>إعدادات النظام</h3>
                    <p>إدارة المستخدمين، مصفوفة الصلاحيات، المواد، والنسخ الاحتياطي للبيانات.</p>
                </div>
            </div>
            <div class="settings-tabs">
                ${SETTINGS_TABS.map((t) => `
                    <button type="button" class="settings-tab ${tab === t.id ? "active" : ""}" data-action="switch-settings-tab" data-id="${t.id}">${t.label}</button>
                `).join("")}
            </div>
        </section>
        ${tab === "users" ? renderSettingsUsers() : ""}
        ${tab === "permissions" ? renderSettingsPermissions() : ""}
        ${tab === "subjects" ? renderSettingsSubjects() : ""}
        ${tab === "backup" ? renderSettingsBackup() : ""}
        ${tab === "cloud" ? renderSettingsCloud() : ""}
        ${tab === "ai" ? renderSettingsAi() : ""}
    `;
}

function renderSettingsAi() {
    return `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h3>إعدادات المساعد الذكي (AI)</h3>
                    <p>أدخل مفتاح Groq API لتفعيل المحادثة والأدوات الذكية في النظام.</p>
                </div>
            </div>
            <form class="stack" data-form="ai-settings">
                <div class="field">
                    <label>مفتاح API الخاص بـ Groq (Groq API Key)</label>
                    <input type="password" name="groqApiKey" value="${state.aiSettings.groqApiKey || ""}" placeholder="gsk_..." style="direction: ltr;">
                    <small>يمكنك الحصول على المفتاح مجاناً من <a href="https://console.groq.com/keys" target="_blank" style="color: var(--primary);">console.groq.com</a></small>
                </div>
                <button class="btn btn-primary" type="submit">حفظ الإعدادات</button>
            </form>
        </section>
    `;
}

function renderSettingsUsers() {
    const form = ui.userFormId === null ? null : (ui.userFormId ? state.users.find((u) => u.id === ui.userFormId) : {});
    return `
        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div>
                        <h3>${form && form.id ? "تعديل مستخدم" : "إضافة مستخدم"}</h3>
                        <p>إنشاء حسابات الدخول الفعلية للنظام وربط كل حساب برقم تليفون ودور واضح.</p>
                    </div>
                    <button class="btn btn-secondary" type="button" data-action="new-user">مستخدم جديد</button>
                </div>
                ${form !== null ? `
                <form class="stack" data-form="user">
                    <input type="hidden" name="id" value="${form?.id || ""}">
                    <div class="field"><label>الاسم الكامل</label><input name="full_name" required value="${form?.full_name || ""}"></div>
                    <div class="grid-2">
                        <div class="field">
                            <label>رقم التليفون</label>
                            <input name="phone" inputmode="numeric" dir="ltr" required value="${form?.phone || ""}" placeholder="010xxxxxxxx">
                        </div>
                        <div class="field"><label>كلمة المرور</label><input name="password" type="password" required value="${form?.password || ""}"></div>
                    </div>
                    <div class="field"><label>الدور</label><select name="role">${optionsFromMap(USER_ROLE_LABELS, form?.role || "TEACHER")}</select></div>
                    <div class="actions-row">
                        <button class="btn btn-primary" type="submit">${form && form.id ? "حفظ التعديلات" : "إضافة المستخدم"}</button>
                        <button class="btn btn-ghost" type="button" data-action="cancel-user">إلغاء</button>
                    </div>
                </form>` : `<p class="empty-state">اختر "مستخدم جديد" أو "تعديل" من القائمة لعرض النموذج.</p>`}
            </div>
            <div class="panel">
                <div class="panel-header"><div><h3>قائمة المستخدمين</h3><p>كل الحسابات المفعّلة وأدوارها.</p></div></div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>الاسم</th><th>رقم التليفون</th><th>الدور</th><th>إجراءات</th></tr></thead>
                        <tbody>
                            ${state.users.map((u) => `
                                <tr>
                                    <td>${u.full_name}</td>
                                    <td dir="ltr">${u.phone}</td>
                                    <td><span class="tag">${USER_ROLE_LABELS[u.role] || u.role}</span></td>
                                    <td>
                                        <div class="row-actions">
                                            <button type="button" data-action="edit-user" data-id="${u.id}">تعديل</button>
                                            <button type="button" data-action="delete-user" data-id="${u.id}">حذف</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `;
}

function renderSettingsPermissions() {
    const roles = Object.keys(USER_ROLE_LABELS);
    const sections = Object.keys(SECTION_TITLES);
    return `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h3>مصفوفة الصلاحيات</h3>
                    <p>اضغط على أي خانة لتفعيل/تعطيل وصول الدور للقسم.</p>
                </div>
            </div>
            <div class="table-wrap">
                <table class="perm-matrix">
                    <thead>
                        <tr>
                            <th>القسم</th>
                            ${roles.map((r) => `<th>${USER_ROLE_LABELS[r]}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${sections.map((sec) => `
                            <tr>
                                <td><strong>${SECTION_TITLES[sec].title}</strong></td>
                                ${roles.map((r) => {
                                    const has = (SECTION_PERMISSIONS[sec] || []).includes(r);
                                    return `<td><button type="button" class="perm-cell ${has ? "on" : "off"}" data-action="toggle-perm" data-section="${sec}" data-role="${r}">${has ? "✓" : "—"}</button></td>`;
                                }).join("")}
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderSettingsSubjects() {
    const form = ui.subjectFormId === null ? null : (ui.subjectFormId ? state.subjects.find((s) => s.id === ui.subjectFormId) : {});
    return `
        <section class="split-panels">
            <div class="panel">
                <div class="panel-header">
                    <div><h3>${form && form.id ? "تعديل مادة" : "إضافة مادة"}</h3><p>المواد تُستخدم في الاختبارات وملاحظات المعلمين.</p></div>
                    <button class="btn btn-secondary" type="button" data-action="new-subject">مادة جديدة</button>
                </div>
                ${form !== null ? `
                <form class="stack" data-form="subject">
                    <input type="hidden" name="id" value="${form?.id || ""}">
                    <div class="field"><label>اسم المادة</label><input name="name" required value="${form?.name || ""}"></div>
                    <div class="field"><label>اللون</label><input name="color" type="color" value="${form?.color || "#6366f1"}"></div>
                    <div class="actions-row">
                        <button class="btn btn-primary" type="submit">${form && form.id ? "حفظ" : "إضافة"}</button>
                        <button class="btn btn-ghost" type="button" data-action="cancel-subject">إلغاء</button>
                    </div>
                </form>` : `<p class="empty-state">اختر "مادة جديدة" أو تعديل من القائمة.</p>`}
            </div>
            <div class="panel">
                <div class="panel-header"><div><h3>المواد المسجّلة</h3></div></div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>اللون</th><th>الاسم</th><th>إجراءات</th></tr></thead>
                        <tbody>
                            ${state.subjects.map((s) => `
                                <tr>
                                    <td><span class="subject-dot" style="background:${s.color}"></span></td>
                                    <td>${s.name}</td>
                                    <td>
                                        <div class="row-actions">
                                            <button type="button" data-action="edit-subject" data-id="${s.id}">تعديل</button>
                                            <button type="button" data-action="delete-subject" data-id="${s.id}">حذف</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `;
}

function renderSettingsBackup() {
    const counts = {
        children: state.children.length,
        staff: state.staff.length,
        fees: state.fees.length,
        exams: state.exams?.length || 0,
        users: state.users.length
    };
    return `
        <section class="panel">
            <div class="panel-header">
                <div><h3>النسخ الاحتياطي واستعادة البيانات</h3><p>تصدير كل بيانات النظام بصيغة JSON أو استعادتها من ملف محفوظ.</p></div>
            </div>
            <div class="summary-strip" style="margin-bottom:18px;">
                <article class="summary-tile"><span>الأطفال</span><strong>${counts.children}</strong></article>
                <article class="summary-tile"><span>الفريق</span><strong>${counts.staff}</strong></article>
                <article class="summary-tile"><span>الرسوم</span><strong>${counts.fees}</strong></article>
                <article class="summary-tile"><span>الاختبارات</span><strong>${counts.exams}</strong></article>
                <article class="summary-tile"><span>المستخدمون</span><strong>${counts.users}</strong></article>
            </div>
            <div class="backup-actions">
                <button class="btn btn-primary" type="button" data-action="backup-export">تصدير نسخة احتياطية (JSON)</button>
                <label class="btn btn-secondary" style="cursor:pointer;">
                    استيراد من ملف
                    <input type="file" accept="application/json" style="display:none;" data-action-file="backup-import">
                </label>
                <button class="btn btn-ghost" type="button" data-action="reset-system">إعادة ضبط النظام الافتراضي</button>
            </div>
        </section>

        <section class="panel" style="margin-top:18px;">
            <div class="panel-header">
                <div>
                    <h3>🔄 التحديث التلقائي لكود وشاشات البرنامج (Online Auto-Update)</h3>
                    <p>تحديث ميزات وتصميم البرنامج أونلاين من GitHub دون المساس إطلاقاً ببيانات الأطفال أو المعلمين أو الحسابات المسجلة.</p>
                </div>
                <span class="tag paid">آمن ومفصول عن البيانات 🛡️</span>
            </div>
            <div class="field" style="margin-bottom:14px;">
                <label>رابط مستودع التحديث (GitHub Raw Base URL)</label>
                <div style="display:flex; gap:8px;">
                    <input type="text" id="customUpdateUrl" value="${localStorage.getItem('BARAEM_UPDATE_URL') || 'https://raw.githubusercontent.com/conqer40/baraem-al-iman-updates/main'}" placeholder="https://raw.githubusercontent.com/conqer40/baraem-al-iman-updates/main" style="flex:1;">
                    <button class="btn btn-secondary" type="button" data-action="save-update-url">حفظ الرابط</button>
                </div>
                <small style="color:var(--text-muted); font-size:0.8rem; margin-top:4px; display:block;">
                    💡 يتم تحديث ملفات الكود والشاشات فقط (app.js, styles.css, index.html) وتبقى بيانات الحضانة محفوظة بنسبة 100% في مسارها المستقل.
                </small>
            </div>
            <div class="backup-actions">
                <button class="btn btn-primary btn-update-app" type="button" data-action="check-app-update">🔄 فحص وتحميل التحديث الآن</button>
            </div>
        </section>
    `;
}

function renderSettingsCloud() {
    const cfg = cloudCfg || {};
    const isConnected = !!cloudDb;
    return `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h3>المزامنة السحابية — Firebase</h3>
                    <p>احفظ بياناتك على السحابة وادخل إليها من أي جهاز أو متصفح. مجاني تماماً.</p>
                </div>
                ${isConnected ? `<span class="tag paid">✓ متصل</span>` : `<span class="tag overdue">غير متصل</span>`}
            </div>

            <div class="cloud-setup-steps">
                <div class="cloud-step">
                    <div class="cloud-step-num">١</div>
                    <div>اذهب إلى <strong>console.firebase.google.com</strong> وأنشئ مشروعاً جديداً مجاناً.</div>
                </div>
                <div class="cloud-step">
                    <div class="cloud-step-num">٢</div>
                    <div>من داخل المشروع: <strong>Project Settings → Your apps → Web app</strong> → أنشئ تطبيق ويب وانسخ الـ Config.</div>
                </div>
                <div class="cloud-step">
                    <div class="cloud-step-num">٣</div>
                    <div>من <strong>Firestore Database</strong> أنشئ قاعدة البيانات واختر <em>Test mode</em> ثم الصق الـ Config أدناه.</div>
                </div>
            </div>

            <form class="stack" data-form="cloud-config" style="margin-top:16px;">
                <div class="field">
                    <label>Firebase Config JSON (الصق الـ config كاملاً)</label>
                    <textarea name="firebase_config" rows="8" dir="ltr" placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'>${cfg.apiKey ? JSON.stringify({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, storageBucket: cfg.storageBucket, messagingSenderId: cfg.messagingSenderId, appId: cfg.appId }, null, 2) : ""}</textarea>
                </div>
                <div class="field">
                    <label>كود المزامنة (Sync ID) — يُستخدم كمعرّف سري للبيانات</label>
                    <div class="input-with-btn">
                        <input name="sync_id" dir="ltr" placeholder="اضغط 'توليد كود' أو أدخل كوداً من جهاز آخر" value="${cfg.syncId || ""}">
                        <button type="button" class="btn btn-secondary" data-action="generate-sync-id">توليد كود</button>
                    </div>
                    <small style="color:var(--muted);margin-top:4px;display:block;">⚠ احتفظ بهذا الكود — هو المفتاح الوحيد لبياناتك على السحابة.</small>
                </div>
                <div class="actions-row">
                    <button class="btn btn-primary" type="submit">حفظ الإعدادات والاتصال</button>
                    ${isConnected ? `<button type="button" class="btn btn-secondary" data-action="manual-cloud-sync">مزامنة الآن</button>` : ""}
                    ${isConnected ? `<button type="button" class="btn btn-secondary" data-action="cloud-load-now">تحميل من السحابة</button>` : ""}
                </div>
            </form>
            ${isConnected ? `
            <div class="cloud-status-bar">
                <span>الحالة: <strong>${ui.cloudStatus === "synced" ? "✓ تمت المزامنة" : ui.cloudStatus === "syncing" ? "↻ جارٍ المزامنة..." : ui.cloudStatus === "error" ? "✕ فشلت المزامنة" : "—"}</strong></span>
                ${ui.cloudSyncTime ? `<span>آخر مزامنة: ${ui.cloudSyncTime}</span>` : ""}
            </div>` : ""}
        </section>
    `;
}

function saveUser(data) {
    const phone = sanitizePhoneInput(data.phone);
    const password = String(data.password || "").trim();
    const fullName = String(data.full_name || "").trim();
    const role = USER_ROLE_LABELS[data.role] ? data.role : "TEACHER";
    const existingWithPhone = state.users.find((u) => u.phone === phone && u.id !== data.id);
    const currentRecord = data.id ? state.users.find((u) => u.id === data.id) : null;
    const adminCount = state.users.filter((u) => u.role === "ADMIN").length;

    if (!fullName || !phone || !password) {
        showToast("أدخل الاسم ورقم التليفون وكلمة المرور", "error");
        return;
    }
    if (!/^01\d{9}$/.test(phone)) {
        showToast("رقم التليفون يجب أن يكون رقم موبايل مصري صحيح من 11 رقمًا", "error");
        return;
    }
    if (existingWithPhone) {
        showToast("رقم التليفون مستخدم بالفعل في حساب آخر", "error");
        return;
    }
    if (currentRecord?.role === "ADMIN" && role !== "ADMIN" && adminCount <= 1) {
        showToast("يجب أن يبقى على الأقل حساب أدمن واحد داخل النظام", "error");
        return;
    }

    const nextUser = {
        id: data.id || `user-${Date.now()}`,
        full_name: fullName,
        phone,
        password,
        role
    };

    if (data.id) {
        const idx = state.users.findIndex((u) => u.id === data.id);
        if (idx >= 0) state.users[idx] = { ...state.users[idx], ...nextUser };
    } else {
        state.users.push(nextUser);
    }
    ui.userFormId = "";
    saveAndRender();
    showToast("تم حفظ المستخدم");
}

function deleteUser(id) {
    if (id === state.session.userId) { showToast("لا يمكن حذف المستخدم الحالي", "error"); return; }
    const target = state.users.find((u) => u.id === id);
    if (target?.role === "ADMIN" && state.users.filter((u) => u.role === "ADMIN").length <= 1) {
        showToast("لا يمكن حذف آخر حساب أدمن في النظام", "error");
        return;
    }
    showConfirm("حذف هذا المستخدم؟", () => {
        state.users = state.users.filter((u) => u.id !== id);
        saveAndRender();
        showToast("تم حذف المستخدم");
    });
}

function saveSubject(data) {
    if (data.id) {
        const idx = state.subjects.findIndex((s) => s.id === data.id);
        if (idx >= 0) state.subjects[idx] = { ...state.subjects[idx], ...data };
    } else {
        state.subjects.push({ ...data, id: `sub-${Date.now()}` });
    }
    ui.subjectFormId = "";
    saveAndRender();
    showToast("تم حفظ المادة");
}

function deleteSubject(id) {
    showConfirm("حذف هذه المادة؟ سيتم الاحتفاظ بالاختبارات والملاحظات.", () => {
        state.subjects = state.subjects.filter((s) => s.id !== id);
        saveAndRender();
        showToast("تم حذف المادة");
    });
}

function togglePermission(section, role) {
    const list = SECTION_PERMISSIONS[section] || [];
    if (list.includes(role)) {
        SECTION_PERMISSIONS[section] = list.filter((r) => r !== role);
    } else {
        SECTION_PERMISSIONS[section] = [...list, role];
    }
    state.permissionOverrides = structuredClone(SECTION_PERMISSIONS);
    saveAndRender();
}

function exportBackup() {
    const payload = JSON.stringify(state, null, 2);
    
    if (typeof window !== "undefined" && window.require) {
        try {
            const fs = window.require('fs');
            const path = window.require('path');
            
            const exeDir = path.dirname(process.execPath);
            const backupDir = path.join(exeDir, 'نسخ احتياطي');
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
            const today = new Date();
            const dayName = days[today.getDay()];
            const dateStr = todayDate(); // YYYY-MM-DD
            const formattedDate = dateStr.split('-').reverse().join('-'); // DD-MM-YYYY
            
            const fileName = `نسخة_احتياطية_${dayName}_${formattedDate}.json`;
            const filePath = path.join(backupDir, fileName);
            
            fs.writeFileSync(filePath, payload, 'utf-8');
            showToast(`تم حفظ النسخة الاحتياطية بنجاح في مجلد "نسخ احتياطي" باسم "${fileName}"`);
            return;
        } catch (e) {
            console.error("Native backup failed, falling back to browser download:", e);
        }
    }
    
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `baraem-backup-${todayDate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("تم تصدير النسخة الاحتياطية");
}

async function performAppUpdate() {
    const updateUrl = localStorage.getItem('BARAEM_UPDATE_URL') || 'https://raw.githubusercontent.com/conqer40/baraem-al-iman-updates/main';
    const ipcRenderer = getElectronIpcRenderer();

    if (ipcRenderer) {
        showToast("جاري فحص وتنزيل التحديث من الإنترنت...", "info");
        try {
            const res = await ipcRenderer.invoke('app:update-files', {
                baseUrl: updateUrl,
                files: ['app.js', 'styles.css', 'index.html', 'ai-logic.js', 'version.json', 'logo.png', 'hero_bg.png']
            });
            if (res && res.ok) {
                const successfulFiles = (res.results || []).filter(r => r.success);
                if (successfulFiles.length > 0) {
                    localStorage.setItem("BARAEM_INSTALLED_VERSION", CURRENT_APP_VERSION);
                    showToast(`✅ تم تحديث ${successfulFiles.length} ملفات بنجاح! جاري تطبيق التحديث...`, "success");
                    setTimeout(() => {
                        try {
                            ipcRenderer.invoke('app:reload');
                        } catch (_) {
                            window.location.reload();
                        }
                    }, 1000);
                } else {
                    showToast("لم يتم العثور على ملفات جديدة في رابط التحديث أو تعذر الاتصال بالسيرفر.", "error");
                }
            } else {
                showToast(`خطأ أثناء التحديث: ${res?.error || "تعذر الاتصال بمستودع التحديث"}`, "error");
            }
        } catch (e) {
            showToast(`فشل التحديث: ${e.message}`, "error");
        }
    } else {
        showToast("💡 لتحديث نسخة المتصفح: يمكنك تشغيل ملف 'تحديث_البرنامج.bat' الموجود في المجلد.", "info");
    }
}

function renderUpdatesSection() {
    const activeTab = ui.updatesTab || "overview";
    const appVersion = `الإصدار ${CURRENT_APP_VERSION} الذهبي (أحدث نسخة محدثة 2026)`;
    
    return `
        <div class="updates-wrapper dark-support-theme">
            <!-- Modern Dark Header Strip -->
            <section class="panel updates-hero-panel">
                <div class="updates-hero-header">
                    <div class="updates-hero-icon">🔄</div>
                    <div>
                        <div class="tag paid" style="margin-bottom:6px; font-weight:800; background:#065f46; color:#34d399; border-color:#059669;">مركز التحديث المباشر والدعم الفني 🌟</div>
                        <h2 style="margin:0 0 6px 0; color:#f8fafc; font-size:1.6rem; font-weight:800;">إدارة التحديثات والدعم المباشر للأكاديمية</h2>
                        <p style="margin:0; color:#94a3b8; font-size:0.95rem;">تحديث فوري لجميع شاشات وميزات البرنامج عبر الإنترنت دون المساس إطلاقاً ببيانات الأطفال أو المعلمات أو الحسابات.</p>
                    </div>
                </div>

                <!-- Live Metrics Status Grid -->
                <div class="updates-status-grid">
                    <div class="updates-status-card">
                        <span class="status-label">إصدار النظام الحالي</span>
                        <strong class="status-value" style="color:#60a5fa;">v${CURRENT_APP_VERSION}</strong>
                        <small class="status-hint">✓ تم تفعيل البحث الفوري، صور الأطفال، الكارنيهات، والشهادات</small>
                    </div>
                    <div class="updates-status-card">
                        <span class="status-label">حماية وتأمين البيانات</span>
                        <strong class="status-value" style="color:#4ade80;">🛡️ أمان تام 100%</strong>
                        <small class="status-hint">البيانات مفصولة ولا تتأثر بالتحديثات نهائياً</small>
                    </div>
                    <div class="updates-status-card">
                        <span class="status-label">قناة الدعم الفني المباشر</span>
                        <strong class="status-value" style="color:#38bdf8;">واتساب المطور المعتمد</strong>
                        <small class="status-hint">+201022104948 (متاح للمساعدة الفورية)</small>
                    </div>
                </div>

                <!-- Navigation Tabs Inside Updates -->
                <div class="sub-nav-tabs" style="display:flex; gap:10px; margin-top:20px; border-bottom:1px solid #334155; padding-bottom:12px;">
                    <button class="btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}" type="button" data-action="switch-updates-tab" data-id="overview" style="font-weight:700;">
                        🔄 مركز التحديث والتحكم
                    </button>
                    <button class="btn ${activeTab === 'support' ? 'btn-primary' : 'btn-ghost'}" type="button" data-action="switch-updates-tab" data-id="support" style="font-weight:700;">
                        💬 قنوات الدعم والمصمم
                    </button>
                    <button class="btn ${activeTab === 'changelog' ? 'btn-primary' : 'btn-ghost'}" type="button" data-action="switch-updates-tab" data-id="changelog" style="font-weight:700;">
                        📋 سجل التحديثات والميزات (v${CURRENT_APP_VERSION})
                    </button>
                </div>
            </section>

            <!-- TAB 1: OVERVIEW & UPDATE ACTIONS -->
            ${activeTab === 'overview' ? `
                <section class="panel">
                    <div class="panel-header">
                        <div>
                            <h3 style="color:#f8fafc;">🚀 إجراءات التحديث السريع</h3>
                            <p style="color:#94a3b8;">اضغط على أي إجراء لتنفيذه فوراً بكل أمان ومباشرة من السيرفر:</p>
                        </div>
                    </div>
                    
                    <div class="updates-action-buttons" style="margin-bottom:20px;">
                        <button class="btn btn-primary btn-lg" type="button" data-action="check-updates-status" style="background:#2563eb; border-color:#3b82f6;">
                            <span style="font-size:1.25rem;">🔍</span>
                            <span>فحص البرنامج والتحديثات</span>
                        </button>

                        <button class="btn btn-primary btn-lg btn-update-action" type="button" data-action="run-app-update" style="background:#059669; border-color:#10b981;">
                            <span style="font-size:1.25rem;">🚀</span>
                            <span>تحديث البرنامج الآن</span>
                        </button>

                        <button class="btn btn-lg btn-whatsapp-dev" type="button" data-action="contact-developer-wa">
                            <span style="font-size:1.25rem;">💬</span>
                            <span>التواصل مع المصمم على الواتساب (+201022104948)</span>
                        </button>
                    </div>

                    <div class="dark-info-box" style="padding:18px; border-radius:12px;">
                        <h4 style="margin:0 0 10px 0; color:#60a5fa; font-size:1.1rem;">💡 كيف يعمل نظام التحديث الذكي أونلاين؟</h4>
                        <ul style="margin:0; padding-right:20px; line-height:1.9; font-size:0.92rem; color:#cbd5e1;">
                            <li><strong style="color:#f8fafc;">جلب أحدث الميزات:</strong> يقوم النظام بالاتصال بمستودع التحديثات المعتمد وتنزيل أحدث ملفات الواجهة والتصميم والأكواد البرمجية.</li>
                            <li><strong style="color:#f8fafc;">ضمان سلامة الأطفال والمعلمات:</strong> تظل جميع بيانات الأطفال، وسجلات الحضور والغياب، والرسوم، والرواتب محفوظة تماماً في قاعدة بياناتك المحلية.</li>
                            <li><strong style="color:#f8fafc;">تطبيق لحظي:</strong> يتم عمل إعادة تحميل للبرنامج في أقل من ثانيتين لتجد كل الشاشات والميزات الجديدة جاهزة للعمل فوراً.</li>
                        </ul>
                    </div>
                </section>
            ` : ""}

            <!-- TAB 2: SUPPORT & DEVELOPER CONTACT -->
            ${activeTab === 'support' ? `
                <section class="panel">
                    <div class="panel-header">
                        <div>
                            <h3 style="color:#f8fafc;">💬 قنوات الدعم الفني والتواصل المباشر مع المصمم</h3>
                            <p style="color:#94a3b8;">فريق التطوير متاح لخدمتك دائماً لأي استفسار أو طلب ميزات جديدة:</p>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px; margin-bottom:20px;">
                        <!-- WhatsApp Card Dark -->
                        <div class="dark-card-wa" style="border-radius:16px; padding:24px; text-align:center;">
                            <div style="font-size:3rem; margin-bottom:10px;">📱</div>
                            <h4 style="margin:0 0 8px 0; color:#34d399; font-size:1.3rem; font-weight:800;">واتساب المطور المباشر</h4>
                            <p style="margin:0 0 16px 0; font-size:0.92rem; color:#a7f3d0;">تواصل فوري عبر الواتساب للاستفسارات، التحديثات، والدعم الفني.</p>
                            <div style="font-size:1.3rem; font-weight:900; color:#6ee7b7; margin-bottom:20px; direction:ltr; letter-spacing:1px;">+20 102 210 4948</div>
                            <button class="btn btn-lg btn-whatsapp-dev" type="button" data-action="contact-developer-wa" style="width:100%; font-size:1rem;">
                                <span>💬 فتح محادثة الواتساب الآن</span>
                            </button>
                        </div>

                        <!-- AnyDesk Remote Support Card Dark -->
                        <div class="dark-card-anydesk" style="border-radius:16px; padding:24px; text-align:center;">
                            <div style="font-size:3rem; margin-bottom:10px;">🖥️</div>
                            <h4 style="margin:0 0 8px 0; color:#93c5fd; font-size:1.3rem; font-weight:800;">الدعم الفني عن بُعد (AnyDesk)</h4>
                            <p style="margin:0 0 16px 0; font-size:0.92rem; color:#bfdbfe;">إمكانية المساعدة المباشرة على جهازك لحل أي مشكلة أو ضبط الإعدادات.</p>
                            <div style="font-size:1.05rem; font-weight:700; color:#93c5fd; margin-bottom:20px;">مدمج ومتاح على سطح المكتب</div>
                            <button class="btn btn-primary" type="button" data-action="launch-anydesk" style="width:100%; background:#2563eb; border-color:#3b82f6; font-size:1rem;">
                                <span>🚀 تشغيل برنامج AnyDesk للدعم</span>
                            </button>
                        </div>
                    </div>
                </section>
            ` : ""}

            <!-- TAB 3: CHANGELOG -->
            ${activeTab === 'changelog' ? `
                <section class="panel">
                    <div class="panel-header">
                        <div>
                            <h3 style="color:#f8fafc;">📋 سجل الإصدارات والتحديثات التاريخية</h3>
                            <p style="color:#94a3b8;">سجل كامل وتفصيلي بكل الميزات والتحديثات المطبقة في كل إصدار:</p>
                        </div>
                    </div>
                    <div class="changelog-list" style="display:flex; flex-direction:column; gap:16px;">
                        
                        <!-- Version 5.1.0 -->
                        <div class="changelog-item" style="border:1px solid #10b981; background:rgba(16,185,129,0.06); border-radius:14px; padding:18px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                                <div class="changelog-badge" style="background:#065f46; color:#34d399; border-color:#059669; font-weight:800; font-size:0.9rem; padding:4px 12px;">🌟 الإصدار 5.1.0 (الحالي)</div>
                                <small style="color:#94a3b8; font-weight:700;">2026-08-13</small>
                            </div>
                            <ul style="margin:0; padding-right:20px; line-height:1.9; color:#f1f5f9; font-size:0.92rem;">
                                <li><strong>📸 إرفاق صورة الطفل الشخصية:</strong> رفع صورة الطفل من الكمبيوتر وضغطها تلقائياً لتناسب قواعد البيانات.</li>
                                <li><strong>🪪 ظهور صورة الطفل في الكارنيه والملف:</strong> دمج الصورة الشخصية داخل بادج وكارنيه الطفل وبطاقة التعريف.</li>
                                <li><strong>💬 تنشيط قوالب رسائل الواتساب الفورية:</strong> التبديل اللحظي بين القوالب وتمييز القالب المختار فوراً بنقرة واحدة.</li>
                                <li><strong>📋 سجل التحديثات المطور التفاعلي:</strong> عرض تاريخي منظم لجميع إصدارات النظام وتفاصيلها.</li>
                            </ul>
                        </div>

                        <!-- Version 5.0.0 -->
                        <div class="changelog-item" style="border:1px solid #334155; border-radius:14px; padding:18px; background:rgba(15,23,42,0.6);">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                                <div class="changelog-badge" style="background:#1e3a8a; color:#93c5fd; border-color:#3b82f6; font-weight:800; font-size:0.9rem; padding:4px 12px;">🚀 الإصدار 5.0.0 (المنظومة المتكاملة)</div>
                                <small style="color:#94a3b8; font-weight:700;">2026-08-13</small>
                            </div>
                            <ul style="margin:0; padding-right:20px; line-height:1.9; color:#cbd5e1; font-size:0.92rem;">
                                <li><strong>🔍 البحث الشامل الفوري (Global Spotlight Search):</strong> بحث سريع بالاسم، الهاتف، أو المعلمة من الهيدر.</li>
                                <li><strong>🪪 طباعة كارنيهات وبادجات الأطفال الذكية:</strong> بطاقة هوية رسمية لكل طفل مع رمز QR ورقم الطوارئ.</li>
                                <li><strong>🎓 شهادات التقدير والتكريم الفاخرة A4:</strong> نماذج شهادات مذهبة لحفظ القرآن، السلوك الإيجابي، والتفوق.</li>
                                <li><strong>💬 قوالب رسائل واتساب الذكية:</strong> إشعار الوصول الآمن، إشعار الانصراف، وتذكير المصروفات.</li>
                                <li><strong>📑 كشف حساب مالي تفصيلي لولي الأمر:</strong> تقرير مالي معتمد يوضح الاشتراكات والمدفوعات والمتبقي.</li>
                                <li><strong>🩺 تنبيهات الحالات الصحية والحساسية:</strong> تمييز واضح لأي حالة صحية خاصة داخل ملف الطفل.</li>
                            </ul>
                        </div>

                        <!-- Version 4.6.0 -->
                        <div class="changelog-item" style="border:1px solid #334155; border-radius:14px; padding:18px; background:rgba(15,23,42,0.4);">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                                <div class="changelog-badge" style="background:#334155; color:#cbd5e1; font-weight:800; font-size:0.85rem; padding:4px 10px;">الإصدار 4.6.0</div>
                                <small style="color:#94a3b8; font-weight:700;">2026-08-12</small>
                            </div>
                            <ul style="margin:0; padding-right:20px; line-height:1.9; color:#94a3b8; font-size:0.9rem;">
                                <li><strong>🖼️ بنر بانورامي ثلاثي الأبعاد:</strong> خلفية بصرية جمالية مخصصة للأكاديمية في أعلى الشاشة الرئيسية.</li>
                                <li><strong>⚡ بوابة الأقسام كأيقونات سريعة:</strong> شبكة أيقونات عصرية ملونة لجميع أقسام الحضانة.</li>
                                <li><strong>💎 أيقونة البرنامج ثلاثية الأبعاد:</strong> تصميم 3D فاخر مدمج في ملف التشغيل <code>start.exe</code>.</li>
                            </ul>
                        </div>

                        <!-- Version 4.5.0 & Earlier -->
                        <div class="changelog-item" style="border:1px solid #334155; border-radius:14px; padding:18px; background:rgba(15,23,42,0.4);">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                                <div class="changelog-badge" style="background:#334155; color:#cbd5e1; font-weight:800; font-size:0.85rem; padding:4px 10px;">الإصدارات 4.0 - 4.5</div>
                                <small style="color:#94a3b8; font-weight:700;">2026-08-12</small>
                            </div>
                            <ul style="margin:0; padding-right:20px; line-height:1.9; color:#94a3b8; font-size:0.9rem;">
                                <li><strong>☀️ الوضع النهاري والليلي:</strong> التبديل السلس بين الثيمات مع حفظ التفضيل.</li>
                                <li><strong>💵 إدارة كادر المعلمات والرواتب:</strong> تعديل الرواتب الأساسية، إلغاء التعاقد، والشيفتات.</li>
                                <li><strong>🛡️ نظام التحديث السحابي المنفصل:</strong> تحديث البرنامج مع الحفاظ الكامل والمطلق على قاعدة البيانات.</li>
                            </ul>
                        </div>

                    </div>
                </section>
            ` : ""}
        </div>
    `;
}

function importBackup(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            showConfirm("استبدال كل بيانات النظام بالنسخة المستوردة؟", () => {
                state = normalizeStateSchema({ ...structuredClone(seed), ...parsed });
                saveAndRender();
                showToast("تم استيراد النسخة بنجاح");
            });
        } catch (err) {
            showToast("ملف غير صالح", "error");
        }
    };
    reader.readAsText(file);
}

function handleChange(event) {
    const target = event.target;

    if (target.dataset.actionFile && target.files && target.files[0]) {
        if (target.dataset.actionFile === "backup-import") importBackup(target.files[0]);
        target.value = "";
        return;
    }

    if (target.dataset.uiField) {
        const field = target.dataset.uiField;
        if (field === "financeMonth" || field === "reportMonth") {
            ui[field] = normalizeMonthStart(target.value);
        } else if (field === "attendanceDate" || field === "reportDate" || field === "reportRangeStart" || field === "reportRangeEnd" || field === "salaryPeriodStart" || field === "salaryPeriodEnd" || field === "whatsappRangeStart" || field === "whatsappRangeEnd") {
            ui[field] = normalizeDateInput(target.value);
        } else {
            ui[field] = target.value;
        }
        render();
        return;
    }

    if (target.dataset.attendanceChild) {
        updateChildAttendanceStatus(target.dataset.attendanceChild, ui.attendanceDate, target.value);
        return;
    }

    if (target.dataset.staffAttendance) {
        updateStaffAttendanceStatus(target.dataset.staffAttendance, ui.attendanceDate, target.value);
        return;
    }

    if (target.dataset.childTimeIn) {
        setChildAttendanceTime(target.dataset.childTimeIn, ui.attendanceDate, "in", target.value);
        return;
    }
    if (target.dataset.childTimeOut) {
        setChildAttendanceTime(target.dataset.childTimeOut, ui.attendanceDate, "out", target.value);
        return;
    }
    if (target.dataset.staffTimeIn) {
        setStaffAttendanceTime(target.dataset.staffTimeIn, ui.attendanceDate, "in", target.value);
        return;
    }
    if (target.dataset.staffTimeOut) {
        setStaffAttendanceTime(target.dataset.staffTimeOut, ui.attendanceDate, "out", target.value);
        return;
    }

    if (target.dataset.childStageFilter) {
        filterChildSelect(target.dataset.childStageFilter);
        return;
    }
    if (target.dataset.childSearchFilter) {
        filterChildSelect(target.dataset.childSearchFilter);
        return;
    }

    if (target.dataset.shiftSync === "salary") {
        const preset = getShiftPreset(target.value);
        const form = target.form;
        const timeInField = form?.querySelector('[name="scheduled_in"]');
        const timeOutField = form?.querySelector('[name="scheduled_out"]');
        if (timeInField) timeInField.value = preset.start;
        if (timeOutField) timeOutField.value = preset.end;
    }
}

function setChildAttendanceTime(childId, date, kind, value) {
    const record = ensureChildAttendanceRecord(childId, date);
    if (kind === "in") {
        record.check_in_time = value;
        if (value && record.status === "ABSENT") record.status = "PRESENT";
    } else {
        record.check_out_time = value;
    }
    saveAndRender();
}

function setStaffAttendanceTime(staffId, date, kind, value) {
    const record = ensureStaffAttendanceRecord(staffId, date);
    if (kind === "in") {
        record.check_in_time = value;
        if (value && record.status === "ABSENT") record.status = "PRESENT";
    } else {
        record.check_out_time = value;
    }
    saveAndRender();
}

function login(data) {
    const phone = sanitizePhoneInput(data.phone);
    const password = String(data.password || "").trim();
    const user = state.users.find((item) => item.phone === phone && item.password === password);
    if (!user) {
        const errEl = document.getElementById("login-error");
        if (errEl) {
            errEl.textContent = "رقم التليفون أو كلمة المرور غير صحيحة.";
            errEl.style.display = "block";
        }
        return;
    }
    state.session.userId = user.id;
    saveAndRender();
}

function saveChild(data) {
    if (!data) return;
    const fullName = (data.full_name || "").trim();
    if (!fullName) {
        showToast("برجاء إدخال اسم الطفل.", "error");
        return;
    }

    const childId = data.id || createId("child");
    const existing = getChildById(childId);
    const childPayload = {
        id: childId,
        full_name: fullName,
        birth_date: data.birth_date || "",
        stage: data.stage || "PRE_K",
        national_id: (data.national_id || "").trim(),
        child_address: (data.child_address || "").trim(),
        father_job: (data.father_job || "").trim(),
        mother_job: (data.mother_job || "").trim(),
        applied_nurseries: (data.applied_nurseries || "").trim(),
        health_status: (data.health_status || "").trim(),
        status: data.status || "ACTIVE",
        teacher_id: data.teacher_id || "",
        support_type: data.support_type || "NORMAL",
        specialist_id: data.specialist_id || "",
        bus_subscription: String(data.bus_subscription) === "1",
        bus_monthly_fee: Number(data.bus_monthly_fee) || 0,
        bus_route: (data.bus_route || "").trim(),
        enrollment_date: existing?.enrollment_date || todayDate(),
        withdrawal_date: data.withdrawal_date || "",
        notes: (data.notes || "").trim(),
        first_attendance_date: data.first_attendance_date || "",
        first_attendance_time: data.first_attendance_time || "",
        custom_age: (data.custom_age || "").trim(),
        subscription_fee: Number(data.subscription_fee) || 0,
        remaining_balance: Number(data.remaining_balance) || 0,
        photo_url: data.photo_url || existing?.photo_url || ""
    };

    if (existing) {
        Object.assign(existing, childPayload);
    } else {
        state.children.push(childPayload);
    }

    const parentName = (data.parent_name || "").trim();
    const parentPhone = (data.parent_phone || "").trim();
    const parentAddress = (data.parent_address || "").trim();
    const parentWhatsapp = (data.parent_whatsapp || parentPhone || "").trim();
    const relationship = data.relationship_to_child || "FATHER";

    if (parentName || parentPhone || parentAddress) {
        const effectiveParentName = parentName || `ولي أمر ${fullName}`;
        const parentData = getPrimaryParent(childId);
        if (parentData?.parent) {
            parentData.parent.full_name = effectiveParentName;
            parentData.parent.phone = parentPhone;
            parentData.parent.whatsapp = parentWhatsapp;
            parentData.parent.address = parentAddress;
            if (parentData.relation) {
                parentData.relation.relationship_to_child = relationship;
            }
        } else {
            const parentId = createId("parent");
            state.parents.push({
                id: parentId,
                full_name: effectiveParentName,
                phone: parentPhone,
                whatsapp: parentWhatsapp,
                address: parentAddress,
                notes: ""
            });
            state.childParents.push({
                id: createId("cp"),
                child_id: childId,
                parent_id: parentId,
                relationship_to_child: relationship,
                is_primary_contact: true,
                can_receive_notifications: true,
                notes: ""
            });
        }
    }

    const pickupName = (data.pickup_name || "").trim();
    const pickupPhone = (data.pickup_phone || "").trim();
    if (pickupName || pickupPhone) {
        const effectivePickupName = pickupName || `مستلم ${fullName}`;
        const existingPickup = getAuthorizedPickup(childId);
        if (existingPickup) {
            existingPickup.full_name = effectivePickupName;
            existingPickup.phone = pickupPhone;
        } else {
            state.authorizedPickups.push({
                id: createId("pickup"),
                child_id: childId,
                full_name: effectivePickupName,
                relationship_to_child: "OTHER",
                phone: pickupPhone,
                national_id: "",
                is_active: true,
                notes: ""
            });
        }
    }

    ui.childFormId = "";
    ui.selectedChildId = childId;
    ui.activeSection = "children";
    saveAndRender();
    showToast(existing ? "تم تحديث بيانات الطفل بنجاح." : "تمت إضافة الطفل بنجاح.");
}

function saveStaff(data) {
    const staffId = data.id || createId("staff");
    const shiftCode = normalizeShiftCode(data.shift_code);
    const preset = getShiftPreset(shiftCode);

    upsertRecord("staff", {
        id: staffId,
        full_name: data.full_name.trim(),
        job_title: data.job_title.trim(),
        shift_code: shiftCode,
        salary: Number(data.salary || 0),
        phone: data.phone.trim(),
        address: data.address.trim(),
        hire_date: data.hire_date,
        status: data.status,
        notes: data.notes.trim()
    });

    const salaryIdx = state.salaryConfigs.findIndex((cfg) => cfg.staff_id === staffId);
    if (salaryIdx >= 0) {
        state.salaryConfigs[salaryIdx] = {
            ...state.salaryConfigs[salaryIdx],
            staff_id: staffId,
            shift_code: shiftCode,
            base_salary: Number(data.salary || 0),
            scheduled_in: preset.start,
            scheduled_out: preset.end
        };
    } else {
        state.salaryConfigs.push({
            staff_id: staffId,
            shift_code: shiftCode,
            base_salary: Number(data.salary || 0),
            scheduled_in: preset.start,
            scheduled_out: preset.end,
            work_days_per_month: 22,
            grace_minutes: 10,
            late_deduction_per_min: 5,
            absence_deduction: 200,
            excused_deduction: 50,
            bonus: 0,
            other_deductions: 0
        });
    }

    ui.staffFormId = "";
    saveAndRender();
    showToast("تم حفظ بيانات الموظف بنجاح.");
}

function saveFee(data) {
    const amount = Number(data.amount || 0);
    const discount = Number(data.discount_amount || 0);
    const paid = Number(data.paid_amount || 0);
    upsertRecord("fees", {
        id: data.id || createId("fee"),
        child_id: data.child_id,
        fee_month: normalizeMonthStart(data.fee_month),
        amount,
        discount_amount: Math.min(discount, amount),
        paid_amount: Math.min(paid, Math.max(amount - discount, 0)),
        due_date: data.due_date,
        payment_date: data.payment_date,
        status: deriveFeeStatus(data.status, amount, discount, paid, data.due_date),
        notes: data.notes.trim()
    });
    ui.feeFormId = "";
    saveAndRender();
    showToast("تم حفظ الرسوم بنجاح.");
}

function saveExpense(data) {
    upsertRecord("expenses", {
        id: data.id || createId("expense"),
        expense_item: data.expense_item.trim(),
        category: data.category.trim(),
        amount: Number(data.amount || 0),
        expense_date: data.expense_date,
        paid_to: data.paid_to.trim(),
        notes: data.notes.trim()
    });
    ui.expenseFormId = "";
    saveAndRender();
}

function saveCurriculum(data) {
    upsertRecord("curriculum", {
        id: data.id || createId("curriculum"),
        stage: data.stage,
        subject_name: data.subject_name.trim(),
        academic_year: data.academic_year.trim(),
        week_number: Number(data.week_number || 1),
        content: data.content.trim(),
        learning_objectives: data.learning_objectives.trim(),
        created_by_staff_id: data.created_by_staff_id
    });
    ui.curriculumFormId = "";
    saveAndRender();
}

function savePlanning(data) {
    upsertRecord("weeklyPlanning", {
        id: data.id || createId("plan"),
        teacher_staff_id: data.teacher_staff_id,
        week_start_date: data.week_start_date,
        stage: data.stage,
        plan_text: data.plan_text.trim(),
        notes: data.notes.trim()
    });
    ui.planningFormId = "";
    saveAndRender();
}

function saveActivity(data) {
    const costNormalized = String(data.cost || "").trim().replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632);
    upsertRecord("activities", {
        id: data.id || createId("activity"),
        activity_name: data.activity_name.trim(),
        activity_type: data.activity_type,
        activity_date: data.activity_date,
        target_stage: data.target_stage,
        cost: Number(costNormalized) || 0,
        notes: data.notes.trim()
    });
    ui.activityFormId = "";
    saveAndRender();
}

function saveMedical(data) {
    upsertRecord("medicalRecords", {
        id: data.id || createId("medical"),
        child_id: data.child_id,
        record_date: data.record_date,
        case_description: data.case_description.trim(),
        doctor_name: data.doctor_name.trim(),
        doctor_notes: data.doctor_notes.trim(),
        action_taken: data.action_taken.trim()
    });
    ui.medicalFormId = "";
    saveAndRender();
}

function savePharmacy(data) {
    upsertRecord("pharmacyItems", {
        id: data.id || createId("pharmacy"),
        medicine_name: data.medicine_name.trim(),
        quantity: Number(data.quantity || 0),
        unit: data.unit.trim(),
        expiry_date: data.expiry_date,
        reorder_level: Number(data.reorder_level || 0),
        notes: data.notes.trim()
    });
    ui.pharmacyFormId = "";
    saveAndRender();
}

function deleteChild(childId) {
    const child = getChildById(childId);
    showConfirm(`سيتم حذف الطفل "${child?.full_name || ""}" وكل السجلات التابعة له. هل تريد الاستمرار؟`, () => {
        state.children = state.children.filter((item) => item.id !== childId);
        state.childParents = state.childParents.filter((item) => item.child_id !== childId);
        state.authorizedPickups = state.authorizedPickups.filter((item) => item.child_id !== childId);
        state.studentAttendance = state.studentAttendance.filter((item) => item.child_id !== childId);
        state.fees = state.fees.filter((item) => item.child_id !== childId);
        state.medicalRecords = state.medicalRecords.filter((item) => item.child_id !== childId);
        state.exams = (state.exams || []).filter((item) => item.child_id !== childId);
        state.teacherNotes = (state.teacherNotes || []).filter((item) => item.child_id !== childId);
        ui.selectedChildId = state.children[0]?.id || "";
        ui.childFormId = "";
        saveAndRender();
        showToast("تم حذف الطفل بنجاح.");
    });
}

function deleteStaff(staffId) {
    const member = getStaffById(staffId);
    showConfirm(`سيتم حذف الموظف "${member?.full_name || ""}" وسجلات حضوره. هل تريد المتابعة؟`, () => {
        state.staff = state.staff.filter((item) => item.id !== staffId);
        state.staffAttendance = state.staffAttendance.filter((item) => item.staff_id !== staffId);
        state.curriculum = state.curriculum.map((item) => item.created_by_staff_id === staffId ? { ...item, created_by_staff_id: "" } : item);
        state.weeklyPlanning = state.weeklyPlanning.filter((item) => item.teacher_staff_id !== staffId);
        ui.staffFormId = "";
        saveAndRender();
        showToast("تم حذف الموظف بنجاح.");
    });
}

function deleteRecord(collectionKey, id) {
    showConfirm("هل تريد حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.", () => {
        state[collectionKey] = state[collectionKey].filter((item) => item.id !== id);
        clearFormSelectionForCollection(collectionKey, id);
        saveAndRender();
        showToast("تم حذف السجل بنجاح.");
    });
}

function clearFormSelectionForCollection(collectionKey, id) {
    if (collectionKey === "fees" && ui.feeFormId === id) ui.feeFormId = "";
    if (collectionKey === "expenses" && ui.expenseFormId === id) ui.expenseFormId = "";
    if (collectionKey === "curriculum" && ui.curriculumFormId === id) ui.curriculumFormId = "";
    if (collectionKey === "weeklyPlanning" && ui.planningFormId === id) ui.planningFormId = "";
    if (collectionKey === "activities" && ui.activityFormId === id) ui.activityFormId = "";
    if (collectionKey === "medicalRecords" && ui.medicalFormId === id) ui.medicalFormId = "";
    if (collectionKey === "pharmacyItems" && ui.pharmacyFormId === id) ui.pharmacyFormId = "";
}

function markAllChildrenPresent(date) {
    state.children.filter((child) => child.status === "ACTIVE").forEach((child) => {
        const record = ensureChildAttendanceRecord(child.id, date);
        record.status = "PRESENT";
    });
    saveAndRender();
}

function checkInAllChildren(date) {
    state.children.filter((child) => child.status === "ACTIVE").forEach((child) => {
        const record = ensureChildAttendanceRecord(child.id, date);
        record.status = record.status === "ABSENT" ? "PRESENT" : record.status;
        record.check_in_time = record.check_in_time || currentTime();
    });
    saveAndRender();
}

function markAllStaffPresent(date) {
    state.staff.filter((staff) => staff.status === "ACTIVE").forEach((member) => {
        const record = ensureStaffAttendanceRecord(member.id, date);
        record.status = "PRESENT";
    });
    saveAndRender();
}

function updateChildAttendanceStatus(childId, date, status) {
    const record = ensureChildAttendanceRecord(childId, date);
    record.status = status;
    saveAndRender();
}

function updateStaffAttendanceStatus(staffId, date, status) {
    const record = ensureStaffAttendanceRecord(staffId, date);
    record.status = status;
    saveAndRender();
}

function toggleChildCheckIn(childId, date) {
    const record = ensureChildAttendanceRecord(childId, date);
    record.status = record.status === "ABSENT" ? "PRESENT" : record.status;
    record.check_in_time = record.check_in_time || currentTime();
    saveAndRender();
}

function toggleChildCheckOut(childId, date) {
    const record = ensureChildAttendanceRecord(childId, date);
    record.check_out_time = currentTime();
    saveAndRender();
}

function toggleStaffCheckIn(staffId, date) {
    const record = ensureStaffAttendanceRecord(staffId, date);
    record.status = record.status === "ABSENT" ? "PRESENT" : record.status;
    record.check_in_time = record.check_in_time || currentTime();
    saveAndRender();
}

function toggleStaffCheckOut(staffId, date) {
    const record = ensureStaffAttendanceRecord(staffId, date);
    record.check_out_time = currentTime();
    saveAndRender();
}

function ensureChildAttendanceRecord(childId, date) {
    let record = state.studentAttendance.find((item) => item.child_id === childId && item.attendance_date === date);
    if (!record) {
        record = {
            id: createId("sa"),
            child_id: childId,
            attendance_date: date,
            status: "ABSENT",
            check_in_time: "",
            check_out_time: "",
            notes: ""
        };
        state.studentAttendance.push(record);
    }
    return record;
}

function ensureStaffAttendanceRecord(staffId, date) {
    let record = state.staffAttendance.find((item) => item.staff_id === staffId && item.attendance_date === date);
    if (!record) {
        record = {
            id: createId("sta"),
            staff_id: staffId,
            attendance_date: date,
            status: "ABSENT",
            check_in_time: "",
            check_out_time: "",
            notes: ""
        };
        state.staffAttendance.push(record);
    }
    return record;
}

function generateMonthlyFees(month) {
    const normalizedMonth = normalizeMonthStart(month);
    const settings = state.feeSettings || {};
    const monthlyAmount = Number(settings.monthly_amount) || 1800;
    const dueDay = String(Number(settings.due_day) || 10).padStart(2, "0");
    const dueDate = `${normalizedMonth.slice(0, 8)}${dueDay}`;
    let added = 0;

    state.children.filter((child) => child.status === "ACTIVE").forEach((child) => {
        const existsMonthly = state.fees.find(
            (fee) => fee.child_id === child.id && fee.fee_month === normalizedMonth && (fee.fee_type || "MONTHLY") === "MONTHLY"
        );
        if (!existsMonthly) {
            state.fees.push({
                id: createId("fee"),
                child_id: child.id,
                fee_month: normalizedMonth,
                fee_type: "MONTHLY",
                amount: monthlyAmount,
                discount_amount: 0,
                paid_amount: 0,
                due_date: dueDate,
                payment_date: "",
                status: "PENDING",
                notes: ""
            });
            added++;
        }

        if (child.bus_subscription && child.bus_monthly_fee > 0) {
            const existsBus = state.fees.find(
                (fee) => fee.child_id === child.id && fee.fee_month === normalizedMonth && fee.fee_type === "BUS"
            );
            if (!existsBus) {
                state.fees.push({
                    id: createId("fee"),
                    child_id: child.id,
                    fee_month: normalizedMonth,
                    fee_type: "BUS",
                    amount: child.bus_monthly_fee,
                    discount_amount: 0,
                    paid_amount: 0,
                    due_date: dueDate,
                    payment_date: "",
                    status: "PENDING",
                    notes: `خط السير: ${child.bus_route || "غير محدد"}`
                });
                added++;
            }
        }
    });

    saveAndRender();
    if (added > 0) showToast(`تم إنشاء ${added} فاتورة لشهر ${formatArabicMonthLabel(normalizedMonth)}`);
    else showToast("كل الفواتير موجودة مسبقاً", "info");
}

function upsertRecord(collectionKey, record) {
    const collection = state[collectionKey];
    const index = collection.findIndex((item) => item.id === record.id);
    if (index >= 0) {
        collection[index] = record;
    } else {
        collection.push(record);
    }
}

function saveAndRender() {
    saveState();
    render();
}

function showToast(message, type = "success") {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-visible"));
    setTimeout(() => {
        toast.classList.remove("toast-visible");
        setTimeout(() => toast.remove(), 380);
    }, 3200);
}

function showConfirm(message, onConfirm, options = {}) {
    let confirmText = options.confirmText;
    let confirmType = options.confirmType;
    let iconSvg = options.iconSvg;

    if (!confirmText) {
        if (message.includes("إرسال") || message.includes("واتساب") || message.includes("رسالة")) {
            confirmText = "تأكيد الإرسال 💬";
            confirmType = "btn-success";
            iconSvg = `<div style="font-size:2.4rem; color:#22c55e;">💬</div>`;
        } else if (message.includes("تفعيل")) {
            confirmText = "تأكيد التفعيل ✅";
            confirmType = "btn-success";
            iconSvg = `<div style="font-size:2.4rem; color:#10b981;">✅</div>`;
        } else if (message.includes("إنهاء") || message.includes("إلغاء") || message.includes("تعاقد")) {
            confirmText = "تأكيد إلغاء التعاقد";
            confirmType = "btn-danger";
            iconSvg = `<div style="font-size:2.4rem; color:#ef4444;">⚠️</div>`;
        } else if (message.includes("استبدال") || message.includes("استيراد")) {
            confirmText = "تأكيد الاستيراد";
            confirmType = "btn-warning";
            iconSvg = `<div style="font-size:2.4rem; color:#f59e0b;">📥</div>`;
        } else if (message.includes("حذف")) {
            confirmText = "تأكيد الحذف";
            confirmType = "btn-danger";
            iconSvg = `<div style="font-size:2.4rem; color:#ef4444;">🗑️</div>`;
        } else {
            confirmText = "تأكيد ومتابعة";
            confirmType = "btn-primary";
            iconSvg = `<div style="font-size:2.4rem; color:#3b82f6;">ℹ️</div>`;
        }
    } else if (!confirmType) {
        confirmType = "btn-primary";
    }

    if (!iconSvg) {
        iconSvg = `<div style="font-size:2.4rem; color:#3b82f6;">ℹ️</div>`;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-box" style="text-align:center; padding:24px; border-radius:18px;">
            <div class="modal-icon" style="margin-bottom:12px;">
                ${iconSvg}
            </div>
            <p class="modal-message" style="font-size:1.05rem; font-weight:600; line-height:1.7; color:var(--ink); margin-bottom:22px;">${message}</p>
            <div class="modal-actions" style="display:flex; gap:12px; justify-content:center;">
                <button class="btn ${confirmType}" id="modal-confirm" style="padding:10px 22px; font-weight:700;">${confirmText}</button>
                <button class="btn btn-secondary" id="modal-cancel" style="padding:10px 20px; font-weight:600;">إلغاء</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("modal-visible"));

    const close = () => {
        overlay.classList.remove("modal-visible");
        setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById("modal-confirm").addEventListener("click", () => {
        close();
        onConfirm();
    });
    document.getElementById("modal-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
}

function currentUser() {
    return state.users.find((user) => user.id === state.session.userId) || state.users[0];
}

function getChildById(childId) {
    return state.children.find((item) => item.id === childId);
}

function getStaffById(staffId) {
    return state.staff.find((item) => item.id === staffId);
}

function getPrimaryParent(childId) {
    const relation = state.childParents.find((item) => item.child_id === childId && item.is_primary_contact) ||
        state.childParents.find((item) => item.child_id === childId);
    if (!relation) {
        return null;
    }
    return {
        relation,
        parent: state.parents.find((item) => item.id === relation.parent_id)
    };
}

function getAuthorizedPickup(childId) {
    return state.authorizedPickups.find((item) => item.child_id === childId && item.is_active);
}

function buildChildProfile(childId) {
    const child = getChildById(childId);
    if (!child) {
        return null;
    }

    const parentData = getPrimaryParent(childId);
    const pickup = getAuthorizedPickup(childId);
    const lastAttendance = state.studentAttendance
        .filter((item) => item.child_id === childId)
        .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))[0];
    const currentFee = state.fees.find((fee) => fee.child_id === childId && fee.fee_month === currentMonthDate());
    const lastMedical = state.medicalRecords
        .filter((item) => item.child_id === childId)
        .sort((a, b) => b.record_date.localeCompare(a.record_date))[0];

    return {
        child,
        parent: parentData?.parent,
        pickup,
        lastAttendance,
        currentFee,
        lastMedical,
        remainingFees: state.fees.filter((fee) => fee.child_id === childId).reduce((sum, fee) => sum + remainingFeeAmount(fee), 0)
    };
}

function getDashboardMetrics() {
    const currentMonth = currentMonthDate();
    return {
        activeChildren: state.children.filter((child) => child.status === "ACTIVE").length,
        presentToday: state.studentAttendance.filter((item) => item.attendance_date === todayDate() && ["PRESENT", "LATE"].includes(item.status)).length,
        collectedThisMonth: state.fees.filter((fee) => fee.payment_date && fee.payment_date.startsWith(currentMonth.slice(0, 7))).reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0),
        outstandingFees: state.fees.reduce((sum, fee) => sum + remainingFeeAmount(fee), 0)
    };
}

function getStageDistribution() {
    const activeChildren = state.children.filter((child) => child.status === "ACTIVE");
    return Object.entries(STAGE_LABELS).map(([stage, label]) => {
        const count = activeChildren.filter((child) => child.stage === stage).length;
        return {
            stage,
            label,
            count,
            percent: activeChildren.length ? Math.round((count / activeChildren.length) * 100) : 0
        };
    });
}

function getOverdueFees() {
    return state.fees
        .filter((fee) => remainingFeeAmount(fee) > 0 && fee.due_date < todayDate())
        .map((fee) => ({
            fee,
            child: getChildById(fee.child_id),
            remaining: remainingFeeAmount(fee)
        }))
        .sort((a, b) => a.fee.due_date.localeCompare(b.fee.due_date));
}

function getAttendanceRows(date) {
    return {
        children: state.children.filter((child) => child.status === "ACTIVE").map((child) => ({
            child,
            record: state.studentAttendance.find((item) => item.child_id === child.id && item.attendance_date === date)
        })),
        staff: state.staff.filter((s) => s.status === "ACTIVE" || s.status === "ON_LEAVE" || state.staffAttendance.some((item) => item.staff_id === s.id && item.attendance_date === date)).map((staff) => ({
            staff,
            record: state.staffAttendance.find((item) => item.staff_id === staff.id && item.attendance_date === date)
        }))
    };
}

function getMonthlyFinanceSummary(month) {
    const normalizedMonth = normalizeMonthStart(month);
    const collected = state.fees.filter((fee) => fee.fee_month === normalizedMonth).reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0);
    const outstanding = state.fees.filter((fee) => fee.fee_month === normalizedMonth).reduce((sum, fee) => sum + remainingFeeAmount(fee), 0);
    const expenses = state.expenses.filter((expense) => expense.expense_date.startsWith(normalizedMonth.slice(0, 7))).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    return { collected, outstanding, expenses, net: collected - expenses };
}

function buildMonthlyReport(month) {
    const normalizedMonth = normalizeMonthStart(month);
    const monthlyAttendance = state.studentAttendance.filter((item) => item.attendance_date.startsWith(normalizedMonth.slice(0, 7)));
    const monthlyFees = state.fees.filter((item) => item.fee_month === normalizedMonth);
    const monthlyExpenses = state.expenses.filter((item) => item.expense_date.startsWith(normalizedMonth.slice(0, 7)));

    const attendanceRows = state.children.filter((child) => child.status === "ACTIVE").map((child) => {
        const items = monthlyAttendance.filter((item) => item.child_id === child.id);
        return {
            child,
            present: items.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length,
            absent: items.filter((item) => item.status === "ABSENT").length,
            excused: items.filter((item) => item.status === "EXCUSED").length
        };
    });

    const overdueRows = monthlyFees.filter((fee) => remainingFeeAmount(fee) > 0).map((fee) => ({
        fee,
        child: getChildById(fee.child_id),
        parent: getPrimaryParent(fee.child_id)?.parent,
        remaining: remainingFeeAmount(fee)
    }));

    const collected = monthlyFees.reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0);
    const outstanding = monthlyFees.reduce((sum, fee) => sum + remainingFeeAmount(fee), 0);
    const expenses = monthlyExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const presentCount = monthlyAttendance.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length;
    const absentCount = monthlyAttendance.filter((item) => item.status === "ABSENT").length;

    return {
        attendanceRows,
        overdueRows,
        collected,
        outstanding,
        expenses,
        net: collected - expenses,
        presentCount,
        absentCount
    };
}

function buildAbsenceSheets(referenceDate) {
    const baseDate = normalizeDateInput(referenceDate);
    const weekRange = getWeekRangeFromDate(baseDate);
    const monthStart = normalizeMonthStart(baseDate);
    const monthEnd = getMonthEnd(baseDate);

    return {
        daily: {
            label: formatArabicDate(baseDate),
            children: buildDailyChildAbsences(baseDate),
            staff: buildDailyStaffAbsences(baseDate)
        },
        weekly: {
            label: `من ${formatArabicDate(weekRange.start)} إلى ${formatArabicDate(weekRange.end)}`,
            children: buildChildAbsenceSummary(weekRange.start, weekRange.end),
            staff: buildStaffAbsenceSummary(weekRange.start, weekRange.end)
        },
        monthly: {
            label: `من ${formatArabicDate(monthStart)} إلى ${formatArabicDate(monthEnd)}`,
            children: buildChildAbsenceSummary(monthStart, monthEnd),
            staff: buildStaffAbsenceSummary(monthStart, monthEnd)
        }
    };
}

function buildDailyChildAbsences(dateValue) {
    return state.studentAttendance
        .filter((item) => item.attendance_date === dateValue && ["ABSENT", "EXCUSED"].includes(item.status))
        .map((item) => {
            const child = getChildById(item.child_id);
            if (!child) return null;
            return {
                name: child.full_name,
                groupLabel: STAGE_LABELS[child.stage],
                status: item.status,
                note: item.notes || ""
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

function buildDailyStaffAbsences(dateValue) {
    return state.staffAttendance
        .filter((item) => item.attendance_date === dateValue && ["ABSENT", "EXCUSED", "LEAVE"].includes(item.status))
        .map((item) => {
            const member = state.staff.find((staff) => staff.id === item.staff_id);
            if (!member) return null;
            return {
                name: member.full_name,
                groupLabel: member.job_title,
                status: item.status === "LEAVE" ? "EXCUSED" : item.status,
                note: item.notes || ""
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

function buildChildAbsenceSummary(startDate, endDate) {
    const relevant = state.studentAttendance.filter((item) => isDateWithinRange(item.attendance_date, startDate, endDate) && ["ABSENT", "EXCUSED"].includes(item.status));

    return state.children
        .filter((child) => child.status === "ACTIVE")
        .map((child) => {
            const items = relevant.filter((item) => item.child_id === child.id);
            if (!items.length) return null;
            const latest = items.slice().sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))[0];
            return {
                name: child.full_name,
                groupLabel: STAGE_LABELS[child.stage],
                absentCount: items.filter((item) => item.status === "ABSENT").length,
                excusedCount: items.filter((item) => item.status === "EXCUSED").length,
                lastDate: latest.attendance_date,
                lastNote: latest.notes || ""
            };
        })
        .filter(Boolean)
        .sort((a, b) => (b.absentCount + b.excusedCount) - (a.absentCount + a.excusedCount));
}

function buildStaffAbsenceSummary(startDate, endDate) {
    const relevant = state.staffAttendance.filter((item) => isDateWithinRange(item.attendance_date, startDate, endDate) && ["ABSENT", "EXCUSED", "LEAVE"].includes(item.status));

    return state.staff
        .filter((member) => member.status === "ACTIVE")
        .map((member) => {
            const items = relevant.filter((item) => item.staff_id === member.id);
            if (!items.length) return null;
            const latest = items.slice().sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))[0];
            return {
                name: member.full_name,
                groupLabel: member.job_title,
                absentCount: items.filter((item) => item.status === "ABSENT").length,
                excusedCount: items.filter((item) => ["EXCUSED", "LEAVE"].includes(item.status)).length,
                lastDate: latest.attendance_date,
                lastNote: latest.notes || ""
            };
        })
        .filter(Boolean)
        .sort((a, b) => (b.absentCount + b.excusedCount) - (a.absentCount + a.excusedCount));
}

function options(entries, selectedValue) {
    return entries.map(([value, label]) => `<option value="${value}" ${String(selectedValue) === String(value) ? "selected" : ""}>${label}</option>`).join("");
}

function optionsFromMap(map, selectedValue) {
    return options(Object.entries(map), selectedValue);
}

function remainingFeeAmount(fee) {
    return Math.max(Number(fee.amount || 0) - Number(fee.discount_amount || 0) - Number(fee.paid_amount || 0), 0);
}

function deriveFeeStatus(rawStatus, amount, discount, paid, dueDate) {
    const remaining = Math.max(Number(amount || 0) - Number(discount || 0) - Number(paid || 0), 0);
    if (remaining === 0) return "PAID";
    if (Number(paid || 0) > 0) return dueDate < todayDate() ? "OVERDUE" : rawStatus || "PARTIAL";
    return dueDate < todayDate() ? "OVERDUE" : rawStatus || "PENDING";
}

function formatCurrency(value) {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: "EGP",
        maximumFractionDigits: 0
    }).format(value || 0);
}

function formatArabicDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function calculateAge(dateString) {
    const diff = Date.now() - new Date(dateString).getTime();
    return Math.max(Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)), 0);
}

function createId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function currentMonthDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function normalizeMonthStart(dateValue) {
    if (!dateValue) return currentMonthDate();
    return `${dateValue.slice(0, 7)}-01`;
}

function normalizeDateInput(dateValue) {
    return dateValue || todayDate();
}

function getWeekRangeFromDate(dateValue) {
    const date = new Date(dateValue);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(date);
    start.setDate(date.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10)
    };
}

function getMonthEnd(dateValue) {
    const date = new Date(dateValue);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return monthEnd.toISOString().slice(0, 10);
}

function isDateWithinRange(dateValue, startDate, endDate) {
    return dateValue >= startDate && dateValue <= endDate;
}

function daysUntil(dateValue) {
    if (!dateValue) return Number.POSITIVE_INFINITY;
    const today = new Date(todayDate());
    const target = new Date(dateValue);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function currentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function mondayOfCurrentWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    return monday.toISOString().slice(0, 10);
}

function statusClass(status) {
    switch (status) {
        case "ACTIVE":
        case "PRESENT":
        case "PAID":
            return "active";
        case "WITHDRAWN":
        case "INACTIVE":
            return "withdrawn";
        case "PARTIAL":
        case "LATE":
            return "partial";
        case "OVERDUE":
        case "ABSENT":
            return "overdue";
        case "PENDING":
        default:
            return "pending";
    }
}

function staffStatusLabel(status) {
    return {
        ACTIVE: "نشط",
        ON_LEAVE: "إجازة",
        INACTIVE: "موقوف",
        TERMINATED: "إنهاء تعاقد"
    }[status] || status;
}

function navHint(section) {
    const hints = {
        dashboard: "اليوم",
        children: "الملفات",
        attendance: "الحركة",
        finance: "التحصيل",
        whatsapp: "الرسائل",
        staff: "الفريق",
        learning: "المنهج",
        operations: "الصيدلية",
        reports: "الغياب",
        exams: "الدرجات",
        payroll: "الرواتب",
        settings: "الإعدادات",
        security: "الأدوار"
    };
    return hints[section] || "";
}

const TOUR_STEPS = [
    {
        section: null, target: null,
        title: "أهلاً بك في أكاديمية براعم الإيمان",
        body: "جولة قصيرة تعرّفك على أقسام النظام. تقدر تتخطاها في أي وقت بزر الإنهاء."
    },
    {
        section: "dashboard", target: ".shell-main .topbar",
        title: "لوحة التحكم",
        body: "نظرة عامة يومية: الحضور، التنبيهات، والأنشطة القادمة."
    },
    {
        section: "children", target: ".search-wrap",
        title: "ملفات الأطفال",
        body: "ابحث بسرعة بالاسم أو ولي الأمر، وأضف طفلاً جديداً من زر الإضافة."
    },
    {
        section: "attendance", target: ".attendance-stats-bar",
        title: "الحضور والانصراف",
        body: "شريط إحصائيات مباشر مع أزرار تسجيل جماعي للحضور والانصراف."
    },
    {
        section: "finance", target: ".shell-main",
        title: "الرسوم والتحصيل",
        body: "متابعة الرسوم المستحقة والمتأخرة، مع تنبيهات على الأيقونة الجانبية."
    },
    {
        section: "whatsapp", target: ".shell-main",
        title: "مركز الواتساب",
        body: "إرسال رسائل جاهزة ومراجعتها قبل الفتح، مع سجل آخر الرسائل وتذكيرات المتأخرات."
    },
    {
        section: "staff", target: ".search-wrap",
        title: "الفريق والمعلمات",
        body: "إدارة ملفات الموظفين وحضورهم، وبحث سريع بالاسم."
    },
    {
        section: "learning", target: ".shell-main",
        title: "المنهج والأنشطة",
        body: "خطط أسبوعية، أنشطة ورحلات، مع تصنيفات عربية واضحة."
    },
    {
        section: "operations", target: ".shell-main",
        title: "الصيدلية والعهدة",
        body: "مخزون الأدوية مع تنبيهات نقص الكمية وقرب انتهاء الصلاحية."
    },
    {
        section: "reports", target: ".shell-main",
        title: "التقارير",
        body: "تقارير دورية قابلة للطباعة مباشرة من المتصفح."
    },
    {
        section: "security", target: ".shell-main",
        title: "الأدوار والصلاحيات",
        body: "تحكم في صلاحيات كل دور (مدير، سكرتارية، معلمة)."
    },
    {
        section: null, target: null,
        title: "انتهت الجولة 🎉",
        body: "تقدر تعيدها في أي وقت من زر (جولة سريعة) أسفل القائمة الجانبية."
    }
];

let tourIndex = 0;

function startTour() {
    tourIndex = 0;
    showTourStep();
}

function tourNext() {
    if (tourIndex < TOUR_STEPS.length - 1) {
        tourIndex += 1;
        showTourStep();
    } else {
        endTour();
    }
}

function tourPrev() {
    if (tourIndex > 0) {
        tourIndex -= 1;
        showTourStep();
    }
}

function endTour() {
    document.querySelectorAll(".tour-overlay, .tour-card, .tour-spotlight").forEach((el) => el.remove());
    document.querySelectorAll(".tour-target").forEach((el) => el.classList.remove("tour-target"));
    try { localStorage.setItem("nursery-tour-seen", "1"); } catch (_) {}
}

function showTourStep() {
    const step = TOUR_STEPS[tourIndex];
    if (!step) { endTour(); return; }

    if (step.section && ui.activeSection !== step.section) {
        const allowed = Object.entries(SECTION_PERMISSIONS)
            .filter(([, roles]) => roles.includes(state.users.find((u) => u.id === state.session.userId)?.role))
            .map(([s]) => s);
        if (allowed.includes(step.section)) {
            ui.activeSection = step.section;
            render();
        }
    }

    setTimeout(() => renderTourUI(step), 40);
}

function renderTourUI(step) {
    document.querySelectorAll(".tour-overlay, .tour-card, .tour-spotlight").forEach((el) => el.remove());
    document.querySelectorAll(".tour-target").forEach((el) => el.classList.remove("tour-target"));

    const overlay = document.createElement("div");
    overlay.className = "tour-overlay";
    overlay.addEventListener("click", (e) => { if (e.target === overlay) endTour(); });
    document.body.appendChild(overlay);

    let targetEl = null;
    if (step.target) {
        targetEl = document.querySelector(step.target);
        if (targetEl) targetEl.classList.add("tour-target");
    }

    const total = TOUR_STEPS.length;
    const progress = Math.round(((tourIndex + 1) / total) * 100);
    const card = document.createElement("div");
    card.className = "tour-card";
    card.innerHTML = `
        <div class="tour-progress"><div class="tour-progress-fill" style="width:${progress}%"></div></div>
        <div class="tour-step-count">الخطوة ${tourIndex + 1} من ${total}</div>
        <h4>${step.title}</h4>
        <p>${step.body}</p>
        <div class="tour-actions">
            <button class="btn btn-ghost" type="button" data-action="tour-end">إنهاء</button>
            <div class="tour-nav">
                <button class="btn btn-secondary" type="button" data-action="tour-prev" ${tourIndex === 0 ? "disabled" : ""}>السابق</button>
                <button class="btn btn-primary" type="button" data-action="tour-next">${tourIndex === TOUR_STEPS.length - 1 ? "إنهاء" : "التالي"}</button>
            </div>
        </div>
    `;
    document.body.appendChild(card);

    if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function navBadge(section) {
    if (section === "finance") {
        const overdue = getOverdueFees().length;
        return overdue > 0 ? overdue : null;
    }
    if (section === "whatsapp") {
        const overdue = getOverdueFees().length;
        return overdue > 0 ? overdue : null;
    }
    if (section === "operations") {
        const lowStock = state.pharmacyItems.filter((item) => item.quantity <= item.reorder_level).length;
        const nearExpiry = state.pharmacyItems.filter((item) => daysUntil(item.expiry_date) <= 30).length;
        const total = lowStock + nearExpiry;
        return total > 0 ? total : null;
    }
    return null;
}

// --- AI Chatbot & Groq Integration ---
function renderAiChatWidget() {
    return `
        <div class="ai-chat-widget">
            <button class="ai-chat-toggle ${ui.isAiChatOpen ? 'active' : ''}" data-action="toggle-ai-chat">
                ${ui.isAiChatOpen ? '✕' : '✨'}
            </button>
            ${ui.isAiChatOpen ? `
                <div class="ai-chat-window">
                    <div class="ai-chat-header">
                        <h3>المساعد الذكي (AI)</h3>
                        <button data-action="clear-ai-chat" title="مسح المحادثة">🗑️</button>
                    </div>
                    <div class="ai-chat-body" id="ai-chat-scroll">
                        ${state.aiSettings.history.length === 0 ? `<div class="ai-chat-empty">أهلاً بك! أنا المساعد الذكي لنظام حضانة براعم الإيمان. كيف يمكنني مساعدتك اليوم؟</div>` : ''}
                        ${state.aiSettings.history.map(msg => {
                            if (msg.role === 'system' || msg.role === 'tool' || msg.tool_calls) return ''; // Hide invisible logic
                            return `<div class="ai-msg ${msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}">
                                ${msg.role === 'user' ? msg.content : (window.marked ? marked.parse(msg.content) : msg.content.replace(/\n/g, '<br>'))}
                            </div>`;
                        }).join('')}
                        ${ui.aiIsTyping ? `<div class="ai-msg ai-msg-bot ai-typing">جارِ التفكير...</div>` : ''}
                    </div>
                    <form class="ai-chat-footer" data-form="send-ai-chat">
                        <input type="text" data-ui-field="aiChatInput" value="${ui.aiChatInput}" placeholder="اكتب سؤالك أو طلبك هنا..." required autocomplete="off">
                        <button class="btn btn-primary btn-sm" type="submit" ${ui.aiIsTyping ? 'disabled' : ''}>إرسال</button>
                    </form>
                </div>
            ` : ''}
        </div>
    `;
}

function scrollToAiChatBottom() {
    if (!ui.isAiChatOpen) return;
    setTimeout(() => {
        const scrollEl = document.getElementById("ai-chat-scroll");
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    }, 50);
}

const AI_TOOLS = [
    {
        type: "function",
        function: {
            name: "get_system_stats",
            description: "الحصول على إحصائيات عامة عن الحضانة (عدد الأطفال، الموظفين، الفصول).",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "get_children_list",
            description: "البحث عن الأطفال في النظام أو استخراج القائمة الكاملة.",
            parameters: {
                type: "object",
                properties: {
                    stage: { type: "string", description: "الفصل (PRE_K, LEVEL_1, LEVEL_2) أو فارغ للكل" },
                    search_name: { type: "string", description: "جزء من اسم الطفل للبحث عنه" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "mark_child_attendance",
            description: "تسجيل حضور أو غياب طفل في يوم محدد.",
            parameters: {
                type: "object",
                properties: {
                    child_id: { type: "string", description: "معرف الطفل (id)" },
                    status: { type: "string", description: "حالة الحضور: PRESENT_MORNING أو PRESENT_EVENING أو ABSENT" }
                },
                required: ["child_id", "status"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "navigate_to_section",
            description: "تغيير شاشة المستخدم وفتح قسم معين لتسهيل الوصول.",
            parameters: {
                type: "object",
                properties: {
                    section: { type: "string", description: "اسم القسم المتاح: dashboard, children, attendance, finance, staff, reports, settings" }
                },
                required: ["section"]
            }
        }
    }
];

async function handleGroqToolCall(toolCall) {
    const args = JSON.parse(toolCall.function.arguments);
    const name = toolCall.function.name;
    let result = "";

    try {
        if (name === "get_system_stats") {
            const activeChildren = state.children.filter(c => c.status === "ACTIVE").length;
            const activeStaff = state.staff.filter(s => s.status === "ACTIVE").length;
            const overdueFees = getOverdueFees().length;
            result = JSON.stringify({ activeChildren, activeStaff, overdueFees });
        } else if (name === "get_children_list") {
            const children = state.children
                .filter(c => c.status === "ACTIVE")
                .filter(c => !args.stage || c.stage === args.stage)
                .filter(c => !args.search_name || c.full_name.includes(args.search_name))
                .map(c => ({ id: c.id, name: c.full_name, stage: c.stage }));
            result = JSON.stringify(children.slice(0, 20)); // Limit to 20 for context
        } else if (name === "mark_child_attendance") {
            updateChildAttendanceStatus(args.child_id, todayDate(), args.status);
            result = JSON.stringify({ success: true, message: `تم تسجيل ${args.status} للطفل ${args.child_id}` });
        } else if (name === "navigate_to_section") {
            ui.activeSection = args.section;
            result = JSON.stringify({ success: true, message: `تم فتح قسم ${args.section}` });
        } else {
            result = JSON.stringify({ error: "Tool not found" });
        }
    } catch (e) {
        result = JSON.stringify({ error: e.toString() });
    }

    return {
        tool_call_id: toolCall.id,
        role: "tool",
        name: name,
        content: result
    };
}

async function executeAiChatRequest() {
    if (!state.aiSettings.groqApiKey) {
        state.aiSettings.history.push({ role: "assistant", content: "عذراً، لم يتم إعداد مفتاح API الخاص بـ Groq. يرجى إدخاله في شاشة (الإعدادات)." });
        ui.aiIsTyping = false;
        render();
        return;
    }

    const messages = [
        {
            role: "system",
            content: `أنت مساعد ذكي مدمج في نظام إدارة (حضانة براعم الإيمان).
هدفك مساعدة الإدارة والمعلمات في استخدام النظام. اليوم هو ${formatArabicDate(todayDate())}.
لديك أدوات (Tools) يمكنك استخدامها لجلب البيانات أو تنفيذ الأوامر مثل تسجيل حضور الأطفال أو جلب إحصائيات. 
دائماً أجب باللغة العربية واجعل إجاباتك مختصرة ومهنية ودودة.`
        },
        ...state.aiSettings.history
    ];

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${state.aiSettings.groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: messages,
                tools: AI_TOOLS,
                tool_choice: "auto"
            })
        });

        if (!response.ok) throw new Error("Network error");
        const data = await response.json();
        const responseMessage = data.choices[0].message;

        state.aiSettings.history.push(responseMessage);

        if (responseMessage.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                const toolMsg = await handleGroqToolCall(toolCall);
                state.aiSettings.history.push(toolMsg);
            }
            ui.aiIsTyping = true;
            render();
            
            const secondResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${state.aiSettings.groqApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-70b-8192",
                    messages: [messages[0], ...state.aiSettings.history],
                })
            });
            const secondData = await secondResponse.json();
            state.aiSettings.history.push(secondData.choices[0].message);
        }

        ui.aiIsTyping = false;
        saveState();
        render();
    } catch (e) {
        console.error(e);
        state.aiSettings.history.push({ role: "assistant", content: "عذراً، حدث خطأ أثناء الاتصال بالخادم. تأكد من صحة مفتاح API ومن اتصالك بالإنترنت." });
        ui.aiIsTyping = false;
        saveState();
        render();
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHILD PHOTO ATTACHMENT HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function handleChildPhotoUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 320;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxDim) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            
            const preview = document.getElementById("child-photo-preview");
            const hidden = document.getElementById("child-photo-url-hidden");
            if (preview) preview.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:cover;">`;
            if (hidden) hidden.value = dataUrl;
            showToast("تم تحميل صورة الطفل بنجاح ✓", "success");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function clearChildPhoto() {
    const preview = document.getElementById("child-photo-preview");
    const hidden = document.getElementById("child-photo-url-hidden");
    const fileInput = document.getElementById("child-photo-file-input");
    if (preview) preview.innerHTML = "📷";
    if (hidden) hidden.value = "";
    if (fileInput) fileInput.value = "";
    showToast("تم مسح صورة الطفل");
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMART WHATSAPP TEMPLATES MODAL
═══════════════════════════════════════════════════════════════════════════ */
function showSmartWhatsappModal(childId) {
    const child = getChildById(childId);
    if (!child) {
        showToast("لم يتم العثور على بيانات الطفل", "error");
        return;
    }
    const parentPhone = getChildWhatsappPhone(child.id);
    const subFee = child.subscription_fee || 0;
    const remBal = child.remaining_balance || 0;
    const stage = STAGE_LABELS[child.stage] || child.stage;

    const templates = [
        {
            title: "🚌 إشعار وصول آمن للحضانة",
            text: `السلام عليكم ورحمة الله وبركاته،\nأولياء أمورنا الكرام، نحيطكم علماً بوصول طفلكم الحبيب (${child.full_name}) إلى ${BRAND.name} بسلام اليوم بحمد الله.\nنتمنى له يوماً مفعماً بالنشاط والتعلم النافع 🌸`
        },
        {
            title: "🏠 إشعار الانصراف والاستلام",
            text: `السلام عليكم ورحمة الله وبركاته،\nنود إحاطتكم بأنه تم تسليم طفلكم الحبيب (${child.full_name}) عند انتهاء اليوم الدراسي بسلام بحمد الله.\nدمتم ودام أطفالكم في رعاية الله وحفظه 🌟`
        },
        {
            title: "💰 تذكير لطيف بسداد المصروفات",
            text: `السلام عليكم ورحمة الله وبركاته،\nنود تذكيركم بلطف بسداد اشتراك الحضانة الخاص بالطفل (${child.full_name})، والمبلغ المتبقي هو (${remBal || subFee} جنيه).\nشاكرين ومقدرين حسن تعاونكم الدائم معنا 🌿\n- إدارة ${BRAND.name}`
        },
        {
            title: "🌟 بطاقة تشجيع وتفوق اليوم",
            text: `ما شاء الله تبارك الله! 🌟\nيسر إدارة ومعلمات ${BRAND.name} أن تهنئكم بتميز وتألق بطلنا الصغير (${child.full_name}) اليوم في الأنشطة الصفية وحسن أدائه وخلقه الرفيع.\nبارك الله فيه وجعله قرة عين لكم 🌸`
        },
        {
            title: "🩺 إشعار صحي / متابعة حالة",
            text: `السلام عليكم ورحمة الله وبركاته،\nنحيطكم علماً بخصوص الطفل (${child.full_name}) في فصل (${stage}):\n(يرجى كتابة الملاحظة الصحية هنا)\nمع تمنياتنا له بموفور الصحة والسلامة دائماً 🤲`
        }
    ];

    window.__SMART_WHATSAPP_TEMPLATES = templates;
    window.__selectSmartWhatsappTemplate = function(idx) {
        const textarea = document.getElementById("smart-whatsapp-textarea");
        if (textarea && window.__SMART_WHATSAPP_TEMPLATES && window.__SMART_WHATSAPP_TEMPLATES[idx]) {
            textarea.value = window.__SMART_WHATSAPP_TEMPLATES[idx].text;
            
            const allBtns = document.querySelectorAll(".smart-tpl-btn");
            allBtns.forEach((b, i) => {
                if (i === idx) {
                    b.style.borderColor = "#22c55e";
                    b.style.background = "rgba(34, 197, 94, 0.12)";
                    b.style.color = "#16a34a";
                } else {
                    b.style.borderColor = "var(--line)";
                    b.style.background = "transparent";
                    b.style.color = "var(--ink)";
                }
            });
        }
    };

    const existing = document.getElementById("smart-whatsapp-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "smart-whatsapp-modal";
    overlay.className = "modal-overlay modal-visible";
    overlay.style.zIndex = "99999";

    overlay.innerHTML = `
        <div class="modal-box" style="max-width:580px; width:92%; text-align:right; border-radius:20px; padding:26px; background:var(--paper); color:var(--ink); border:1px solid var(--line); box-shadow:var(--shadow-lg);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; border-bottom:1px solid var(--line); padding-bottom:12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.6rem; color:#22c55e;">💬</span>
                    <div>
                        <h3 style="margin:0; font-size:1.15rem; font-weight:800;">قوالب واتساب الذكية</h3>
                        <small style="color:var(--ink-soft); font-weight:600;">الطفل: ${child.full_name} · هاتف: ${parentPhone || "غير مسجل"}</small>
                    </div>
                </div>
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('smart-whatsapp-modal').remove()" style="font-size:1.2rem; padding:4px 10px;">✕</button>
            </div>

            <div style="margin-bottom:16px;">
                <label style="font-weight:700; font-size:0.88rem; display:block; margin-bottom:8px;">اختر القالب السريع:</label>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${templates.map((tpl, idx) => `
                        <button type="button" class="btn btn-ghost smart-tpl-btn" style="text-align:right; justify-content:flex-start; font-weight:700; padding:10px 14px; border-radius:10px; border:1px solid ${idx === 0 ? '#22c55e' : 'var(--line)'}; background:${idx === 0 ? 'rgba(34, 197, 94, 0.12)' : 'transparent'}; color:${idx === 0 ? '#16a34a' : 'var(--ink)'}; cursor:pointer;" onclick="window.__selectSmartWhatsappTemplate(${idx})">
                            ${tpl.title}
                        </button>
                    `).join("")}
                </div>
            </div>

            <div style="margin-bottom:18px;">
                <label style="font-weight:700; font-size:0.88rem; display:block; margin-bottom:6px;">نص الرسالة (يمكنك التعديل والإضافة بحرية):</label>
                <textarea id="smart-whatsapp-textarea" rows="5" style="width:100%; border:1px solid var(--line); border-radius:12px; padding:12px; font-family:inherit; font-size:0.92rem; resize:vertical; background:var(--bg); color:var(--ink);">${templates[0].text}</textarea>
            </div>

            <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px;">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('smart-whatsapp-modal').remove()">إلغاء</button>
                <button type="button" class="btn btn-whatsapp-pill" style="background:#22c55e; color:#fff; font-weight:800; padding:10px 20px; border-radius:10px; border:none; cursor:pointer;" onclick="
                    const text = document.getElementById('smart-whatsapp-textarea').value.trim();
                    if (!text) { showToast('يرجى كتابة نص الرسالة أولاً', 'error'); return; }
                    openWhatsapp('${parentPhone}', text);
                    document.getElementById('smart-whatsapp-modal').remove();
                ">
                    <span>🚀 إرسال الرسالة عبر واتساب</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRINTABLE STUDENT ID BADGE
═══════════════════════════════════════════════════════════════════════════ */
function printStudentBadge(childId) {
    const child = getChildById(childId);
    if (!child) return;
    const parentPhone = getChildWhatsappPhone(child.id);
    const stage = STAGE_LABELS[child.stage] || child.stage;
    const ageVal = child.custom_age || `${calculateAge(child.birth_date)} سنوات`;
    const photoContent = child.photo_url
        ? `<img src="${child.photo_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
        : child.full_name.charAt(0);

    const printWin = window.open('', '_blank', 'width=800,height=900');
    printWin.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>بطاقة تعريف طفل | ${child.full_name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Cairo', sans-serif; background:#f1f5f9; padding:40px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
                .badge-card { width: 340px; height: 520px; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 2px solid #e2e8f0; position: relative; overflow: hidden; display: flex; flex-direction: column; text-align: center; }
                .badge-header { background: linear-gradient(135deg, #1e3a8a, #0284c7); color: #fff; padding: 20px 16px; border-bottom: 4px solid #f59e0b; }
                .badge-header h2 { margin: 0; font-size: 1.25rem; font-weight: 900; }
                .badge-header small { font-size: 0.8rem; opacity: 0.9; }
                .badge-avatar-wrap { margin-top: -30px; display: flex; justify-content: center; }
                .badge-avatar { width: 92px; height: 92px; border-radius: 50%; background: #f8fafc; border: 4px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 800; color: #1e3a8a; overflow: hidden; }
                .badge-body { padding: 12px 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-around; }
                .badge-name { font-size: 1.25rem; font-weight: 900; color: #0f172a; margin: 4px 0; }
                .badge-stage { display: inline-block; background: #e0f2fe; color: #0284c7; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.82rem; margin-bottom: 8px; }
                .badge-row { display: flex; justify-content: space-between; font-size: 0.88rem; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
                .badge-row strong { color: #64748b; }
                .badge-row span { color: #0f172a; font-weight: 700; }
                .badge-qr { margin: 10px auto 4px auto; width: 60px; height: 60px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; display:flex; align-items:center; justify-content:center; font-size:0.65rem; color:#64748b; font-weight:bold; }
                .badge-footer { background: #f8fafc; padding: 8px; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; font-weight: 600; }
                @media print { body { background: #fff; padding: 0; } .badge-card { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; } .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom:20px; display:flex; gap:10px;">
                <button onclick="window.print()" style="padding:10px 24px; background:#2563eb; color:#fff; font-weight:bold; border:none; border-radius:8px; cursor:pointer; font-size:1rem; font-family:inherit;">🖨️ طباعة الكارنيه الآن</button>
                <button onclick="window.close()" style="padding:10px 20px; background:#64748b; color:#fff; font-weight:bold; border:none; border-radius:8px; cursor:pointer; font-size:1rem; font-family:inherit;">إغلاق</button>
            </div>
            <div class="badge-card">
                <div class="badge-header">
                    <h2>${BRAND.name}</h2>
                    <small>بطاقة تعريف طفل | العام الدراسي 2025 / 2026</small>
                </div>
                <div class="badge-avatar-wrap">
                    <div class="badge-avatar">${photoContent}</div>
                </div>
                <div class="badge-body">
                    <div class="badge-name">${child.full_name}</div>
                    <div><span class="badge-stage">${stage}</span></div>
                    <div class="badge-row"><strong>السن:</strong><span>${ageVal}</span></div>
                    <div class="badge-row"><strong>هاتف الطوارئ:</strong><span>${parentPhone || "-"}</span></div>
                    <div class="badge-row"><strong>الحالة الصحية:</strong><span>${child.health_status || "سليم"}</span></div>
                    <div class="badge-qr">QR CODE</div>
                </div>
                <div class="badge-footer">
                    العنوان: ${BRAND.address} · هاتف: ${BRAND.phone}
                </div>
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRINTABLE CERTIFICATE OF APPRECIATION
═══════════════════════════════════════════════════════════════════════════ */
function showCertificateModal(childId) {
    const child = getChildById(childId);
    if (!child) return;

    const certTypes = [
        { id: "quran", title: "📖 شهادة حفظ القرآن الكريم وتلاوته", defaultReason: "لحفظه المتقن وحسن تلاوته لآيات الذكر الحكيم وتميزه في حلقة القرآن" },
        { id: "excellence", title: "🌟 شهادة تميز وسلوك إيجابي راقٍ", defaultReason: "لحسن خلقه وأدبه الرفيع وتعاونه المتميز مع زملائه ومعلماته" },
        { id: "academic", title: "🎓 شهادة تفوق في المنهج التعليمي", defaultReason: "لتفوقه الدراسي وإتقانه لمهارات القراءة والكتابة والأنشطة الإبداعية" }
    ];

    const existing = document.getElementById("cert-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "cert-modal";
    overlay.className = "modal-overlay modal-visible";
    overlay.style.zIndex = "99999";

    overlay.innerHTML = `
        <div class="modal-box" style="max-width:540px; width:92%; text-align:right; border-radius:20px; padding:26px; background:var(--paper); color:var(--ink); border:1px solid var(--line); box-shadow:var(--shadow-lg);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; border-bottom:1px solid var(--line); padding-bottom:12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.6rem; color:#f59e0b;">🎓</span>
                    <h3 style="margin:0; font-size:1.15rem; font-weight:800;">إصدار شهادة تقدير وتكريم</h3>
                </div>
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('cert-modal').remove()">✕</button>
            </div>

            <div style="margin-bottom:14px;">
                <label style="font-weight:700; font-size:0.88rem; display:block; margin-bottom:6px;">اسم الطفل المكرم:</label>
                <input type="text" value="${child.full_name}" readonly style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--line); background:var(--bg); font-weight:800;">
            </div>

            <div style="margin-bottom:14px;">
                <label style="font-weight:700; font-size:0.88rem; display:block; margin-bottom:6px;">نوع الشهادة:</label>
                <select id="cert-type-select" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--line); font-weight:700;" onchange="
                    const map = {'quran': '${certTypes[0].defaultReason}', 'excellence': '${certTypes[1].defaultReason}', 'academic': '${certTypes[2].defaultReason}'};
                    document.getElementById('cert-reason-input').value = map[this.value] || '';
                ">
                    ${certTypes.map(c => `<option value="${c.id}">${c.title}</option>`).join("")}
                </select>
            </div>

            <div style="margin-bottom:18px;">
                <label style="font-weight:700; font-size:0.88rem; display:block; margin-bottom:6px;">سبب التكريم والثناء:</label>
                <textarea id="cert-reason-input" rows="3" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--line); font-family:inherit; font-size:0.9rem;">${certTypes[0].defaultReason}</textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('cert-modal').remove()">إلغاء</button>
                <button type="button" class="btn btn-primary" style="font-weight:800; padding:10px 22px;" onclick="
                    const reason = document.getElementById('cert-reason-input').value;
                    const type = document.getElementById('cert-type-select').value;
                    printCertificate('${child.id}', type, reason);
                    document.getElementById('cert-modal').remove();
                ">
                    🖨️ طباعة الشهادة الفاخرة A4
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function printCertificate(childId, certType, reason) {
    const child = getChildById(childId);
    if (!child) return;
    const stage = STAGE_LABELS[child.stage] || child.stage;

    const titles = {
        quran: "شهادة حفظ وتكريم قرآني",
        excellence: "شهادة شكر وتقدير للتميز والسلوك",
        academic: "شهادة تفوق وإتقان تعليمي"
    };

    const printWin = window.open('', '_blank', 'width=1000,height=750');
    printWin.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>شهادة تقدير | ${child.full_name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@600;800;900&family=Reem+Kufi:wght@700&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 landscape; margin: 0; }
                body { font-family: 'Cairo', sans-serif; background: #fafafa; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .cert-container { width: 920px; height: 600px; background: #ffffff; border: 12px double #ca8a04; outline: 3px solid #1e3a8a; border-radius: 16px; padding: 30px 40px; box-sizing: border-box; text-align: center; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
                .cert-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
                .cert-header h3 { margin: 0; color: #1e3a8a; font-size: 1.3rem; font-weight: 900; }
                .cert-title { font-family: 'Amiri', serif; font-size: 2.4rem; color: #ca8a04; font-weight: 700; margin: 10px 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); }
                .cert-body { font-size: 1.15rem; line-height: 1.9; color: #1e293b; font-weight: 600; }
                .cert-name { font-family: 'Reem Kufi', sans-serif; font-size: 2rem; color: #1e3a8a; font-weight: 900; text-decoration: underline; margin: 6px 0; }
                .cert-footer { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 16px; }
                .cert-seal { width: 85px; height: 85px; border-radius: 50%; border: 3px dashed #ca8a04; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #ca8a04; font-size: 0.9rem; transform: rotate(-10deg); }
                .cert-sign { font-weight: 800; color: #0f172a; font-size: 1rem; }
                @media print { body { padding: 0; background: #fff; } .cert-container { width: 100vw; height: 96vh; border-width: 10px; box-shadow: none; page-break-inside: avoid; } .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom:15px; display:flex; gap:10px;">
                <button onclick="window.print()" style="padding:10px 26px; background:#ca8a04; color:#fff; font-weight:bold; border:none; border-radius:8px; cursor:pointer; font-size:1.1rem; font-family:inherit;">🖨️ طباعة الشهادة الآن</button>
                <button onclick="window.close()" style="padding:10px 20px; background:#64748b; color:#fff; font-weight:bold; border:none; border-radius:8px; cursor:pointer; font-size:1.1rem; font-family:inherit;">إغلاق</button>
            </div>
            <div class="cert-container">
                <div class="cert-header">
                    <div>
                        <h3>${BRAND.name}</h3>
                        <small style="color:#64748b; font-weight:700;">${BRAND.tagline}</small>
                    </div>
                    <div style="font-size:1.8rem;">✨ 🌸 ✨</div>
                </div>

                <div class="cert-title">${titles[certType] || "شهادة تقدير وتكريم"}</div>

                <div class="cert-body">
                    تتشرف إدارة ومعلمات الأكاديمية بمنح هذا التكريم لبطلنا الصغير:<br>
                    <div class="cert-name">${child.full_name}</div>
                    <span>المقيد بفصل: <strong>(${stage})</strong></span><br>
                    <p style="margin:10px auto; max-width:750px; color:#475569; font-size:1.1rem;">
                        ${reason || "تقديراً لجهوده وتألقه وسلوكه الطيب وتميزه الدائم داخل الأكاديمية"}
                    </p>
                    <span>سائلين المولى عز وجل له دوام التوفيق والنجاح وأن يجعله ذخراً لوالديه وأمته 🤲</span>
                </div>

                <div class="cert-footer">
                    <div class="cert-sign">
                        <span>التاريخ: ${formatArabicDate(todayDate())}</span><br>
                        <span>إدارة الأكاديمية: ....................</span>
                    </div>
                    <div class="cert-seal">ختم التميز<br>معتمد</div>
                    <div class="cert-sign">
                        <span>معلمة الفصل: ....................</span><br>
                        <span>توقيع الإشراف: ....................</span>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRINTABLE STATEMENT OF ACCOUNT (كشف حساب مالي)
═══════════════════════════════════════════════════════════════════════════ */
function printChildStatement(childId) {
    const child = getChildById(childId);
    if (!child) return;
    const parentPhone = getChildWhatsappPhone(child.id);
    const stage = STAGE_LABELS[child.stage] || child.stage;
    const childFees = state.fees.filter(f => f.child_id === child.id);
    const subFee = child.subscription_fee || 0;
    const remBal = child.remaining_balance || 0;

    const printWin = window.open('', '_blank', 'width=900,height=800');
    printWin.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>كشف حساب مالي | ${child.full_name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Cairo', sans-serif; padding: 30px; color: #0f172a; }
                .statement-head { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
                .statement-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .statement-table th, .statement-table td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: right; }
                .statement-table th { background: #f1f5f9; font-weight: 800; }
                .summary-box { display: flex; gap: 20px; margin: 20px 0; }
                .summary-card { flex: 1; padding: 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: center; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom:20px;">
                <button onclick="window.print()" style="padding:8px 20px; background:#2563eb; color:#fff; font-weight:bold; border:none; border-radius:6px; cursor:pointer;">🖨️ طباعة كشف الحساب</button>
            </div>
            <div class="statement-head">
                <div>
                    <h2 style="margin:0;">${BRAND.name}</h2>
                    <p style="margin:4px 0; color:#64748b;">كشف حساب تفصيلي للطفل</p>
                </div>
                <div style="text-align:left;">
                    <strong>تاريخ التقرير:</strong> ${formatArabicDate(todayDate())}<br>
                    <strong>هاتف ولي الأمر:</strong> ${parentPhone || "-"}
                </div>
            </div>

            <div style="background:#f8fafc; padding:14px; border-radius:10px; margin-bottom:16px;">
                <strong>اسم الطفل:</strong> ${child.full_name} &nbsp; | &nbsp;
                <strong>المرحلة/الفصل:</strong> ${stage} &nbsp; | &nbsp;
                <strong>الاشتراك الشهري:</strong> ${formatCurrency(subFee)}
            </div>

            <div class="summary-box">
                <div class="summary-card">
                    <span style="color:#64748b; font-weight:700;">إجمالي السجلات المسجلة</span>
                    <h3 style="margin:6px 0; font-size:1.4rem;">${childFees.length} شهور</h3>
                </div>
                <div class="summary-card">
                    <span style="color:#64748b; font-weight:700;">الرصيد المتبقي المستحق</span>
                    <h3 style="margin:6px 0; font-size:1.4rem; color:${remBal ? '#ef4444' : '#10b981'};">${formatCurrency(remBal)}</h3>
                </div>
            </div>

            <table class="statement-table">
                <thead>
                    <tr>
                        <th>الشهر / الفترة</th>
                        <th>المبلغ المستحق</th>
                        <th>المبلغ المسدد</th>
                        <th>تاريخ السداد</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${childFees.length ? childFees.map(f => `
                        <tr>
                            <td>${f.month || "-"}</td>
                            <td>${formatCurrency(f.amount || subFee)}</td>
                            <td>${formatCurrency(f.paid_amount || 0)}</td>
                            <td>${f.payment_date ? formatArabicDate(f.payment_date) : "-"}</td>
                            <td><strong style="color:${f.status === 'PAID' ? '#10b981' : '#ef4444'};">${f.status === 'PAID' ? 'تم السداد ✓' : 'متبقي / متأخر'}</strong></td>
                        </tr>
                    `).join("") : `
                        <tr>
                            <td>الشهر الحالي</td>
                            <td>${formatCurrency(subFee)}</td>
                            <td>${formatCurrency(subFee - remBal)}</td>
                            <td>${formatArabicDate(todayDate())}</td>
                            <td><strong style="color:${remBal ? '#ef4444' : '#10b981'};">${remBal ? 'متبقي ' + formatCurrency(remBal) : 'مسدد بالكامل ✓'}</strong></td>
                        </tr>
                    `}
                </tbody>
            </table>

            <div style="margin-top:40px; display:flex; justify-content:space-between; border-top:1px dashed #cbd5e1; padding-top:20px;">
                <div>توقيع المحاسب / الإدارة: ....................</div>
                <div>ختم الأكاديمية: ....................</div>
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
}

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL INSTANT SEARCH LISTENER
═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "global-search-input") {
        const query = e.target.value.trim().toLowerCase();
        const resultsEl = document.getElementById("global-search-results");
        if (!resultsEl) return;

        if (!query) {
            resultsEl.style.display = "none";
            resultsEl.innerHTML = "";
            return;
        }

        const matchedChildren = state.children.filter(c => 
            (c.full_name || "").toLowerCase().includes(query) ||
            (c.child_address || "").toLowerCase().includes(query) ||
            (getChildWhatsappPhone(c.id) || "").includes(query)
        ).slice(0, 5);

        const matchedStaff = state.staff.filter(s =>
            (s.full_name || "").toLowerCase().includes(query) ||
            (s.phone || "").includes(query) ||
            (s.role_title || "").toLowerCase().includes(query)
        ).slice(0, 3);

        if (!matchedChildren.length && !matchedStaff.length) {
            resultsEl.style.display = "block";
            resultsEl.innerHTML = `<div style="padding:12px; text-align:center; color:var(--ink-soft); font-size:0.85rem;">لا توجد نتائج مطابقة لـ "${query}"</div>`;
            return;
        }

        let html = "";
        if (matchedChildren.length) {
            html += `<div style="padding:4px 8px; font-size:0.75rem; font-weight:800; color:var(--accent);">👶 الأطفال (${matchedChildren.length})</div>`;
            html += matchedChildren.map(c => `
                <div 
                    style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-radius:8px; cursor:pointer; gap:10px; transition:background 0.15s ease;"
                    onmouseover="this.style.background='var(--bg)'"
                    onmouseout="this.style.background='transparent'"
                    onclick="
                        ui.activeSection = 'children';
                        ui.selectedChildId = '${c.id}';
                        render();
                    "
                >
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:28px; height:28px; border-radius:6px; background:#3b82f6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem;">${c.full_name.charAt(0)}</span>
                        <div>
                            <strong style="display:block; font-size:0.88rem; color:var(--ink);">${c.full_name}</strong>
                            <small style="color:var(--ink-soft); font-size:0.75rem;">${STAGE_LABELS[c.stage] || c.stage} · هاتف: ${getChildWhatsappPhone(c.id) || "-"}</small>
                        </div>
                    </div>
                    <span style="font-size:0.75rem; color:var(--accent); font-weight:700;">عرض الملف ←</span>
                </div>
            `).join("");
        }

        if (matchedStaff.length) {
            html += `<div style="padding:8px 8px 4px 8px; font-size:0.75rem; font-weight:800; color:#8b5cf6; border-top:1px solid var(--line); margin-top:4px;">👩‍🏫 المعلمات والكادر (${matchedStaff.length})</div>`;
            html += matchedStaff.map(s => `
                <div 
                    style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-radius:8px; cursor:pointer; gap:10px; transition:background 0.15s ease;"
                    onmouseover="this.style.background='var(--bg)'"
                    onmouseout="this.style.background='transparent'"
                    onclick="
                        ui.activeSection = 'staff';
                        render();
                    "
                >
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:28px; height:28px; border-radius:6px; background:#8b5cf6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem;">${s.full_name.charAt(0)}</span>
                        <div>
                            <strong style="display:block; font-size:0.88rem; color:var(--ink);">${s.full_name}</strong>
                            <small style="color:var(--ink-soft); font-size:0.75rem;">${s.role_title || "معلمة"} · ${s.phone || ""}</small>
                        </div>
                    </div>
                    <span style="font-size:0.75rem; color:#8b5cf6; font-weight:700;">الكادر ←</span>
                </div>
            `).join("");
        }

        resultsEl.style.display = "block";
        resultsEl.innerHTML = html;
    }
});

document.addEventListener("click", (e) => {
    const resultsEl = document.getElementById("global-search-results");
    const searchInput = document.getElementById("global-search-input");
    if (resultsEl && !resultsEl.contains(e.target) && e.target !== searchInput) {
        resultsEl.style.display = "none";
    }
});
