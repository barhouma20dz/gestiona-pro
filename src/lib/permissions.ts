// Permission definitions and access control utilities

export type PermissionCategoryKey =
  | "sales"
  | "products"
  | "suppliers"
  | "finance"
  | "admin";

export interface PermissionDefinition {
  key: string;
  label: string;
  category: PermissionCategoryKey;
  description: string;
}

export const PERMISSION_CATEGORIES: {
  key: PermissionCategoryKey;
  label: string;
  icon: string;
}[] = [
  { key: "sales", label: "المبيعات والعملاء", icon: "ShoppingCart" },
  { key: "products", label: "المنتجات والمخزون", icon: "Package" },
  { key: "suppliers", label: "الموردون والمشتريات", icon: "Truck" },
  { key: "finance", label: "المالية والتقارير", icon: "BarChart3" },
  { key: "admin", label: "الإدارة والنظام", icon: "ShieldCheck" },
];

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // --- Sales ---
  {
    key: "sales.view",
    label: "فتح صفحة المبيعات (نقطة البيع)",
    category: "sales",
    description: "الوصول إلى واجهة البيع وإدخال السلات",
  },
  {
    key: "sales.create",
    label: "تسجيل عملية بيع",
    category: "sales",
    description: "إتمام عمليات البيع وقبول الدفع وإصدار الوصل",
  },
  {
    key: "sales.view_own",
    label: "الاطلاع على مبيعاته الخاصة",
    category: "sales",
    description: "استعراض فواتير وعمليات البيع التي أنشأها البائع فقط",
  },
  {
    key: "sales.view_all",
    label: "الاطلاع على مبيعات جميع البائعين",
    category: "sales",
    description: "استعراض جميع فواتير المبيعات عبر المتجر كاملاً",
  },
  {
    key: "sales.cancel_return",
    label: "إلغاء أو إرجاع عملية بيع",
    category: "sales",
    description: "تنفيذ المرتجعات أو إلغاء فواتير البيع",
  },

  // --- Products & Inventory ---
  {
    key: "products.view",
    label: "عرض قائمة المنتجات",
    category: "products",
    description: "استعراض قائمة المواد والأسماء والباركود",
  },
  {
    key: "products.create",
    label: "إضافة منتج جديد",
    category: "products",
    description: "إنشاء بطاقات مواد جديدة في النظام",
  },
  {
    key: "products.edit",
    label: "تعديل المنتجات والأسعار",
    category: "products",
    description: "تغيير أسعار البيع وتفاصيل المنتجات",
  },
  {
    key: "products.view_cost",
    label: "الاطلاع على تكلفة الشراء",
    category: "products",
    description: "مشاهدة أسعار التكلفة ورأس المال والهامش الربحي",
  },
  {
    key: "products.view_stock",
    label: "الاطلاع على الكميات والمخزون",
    category: "products",
    description: "رؤية كميات المواد الموجودة في المخزن والرفوف",
  },
  {
    key: "inventory.audit",
    label: "إجراء الجرد المخزني",
    category: "products",
    description: "تسجيل عمليات الجرد وتعديل الفروقات المخزنية",
  },

  // --- Suppliers & Purchases ---
  {
    key: "suppliers.view",
    label: "عرض الموردين",
    category: "suppliers",
    description: "استعراض قائمة الموردين وبيانات الاتصال بهم",
  },
  {
    key: "suppliers.view_invoices",
    label: "الاطلاع على فواتير الموردين",
    category: "suppliers",
    description: "مشاهدة فواتير الشراء وصور الفواتير السابقة",
  },
  {
    key: "suppliers.manage_invoices_payments",
    label: "تسجيل فواتير ومدفوعات الموردين",
    category: "suppliers",
    description: "تصوير الفواتير وتسجيل المبالغ والمدفوعات النقدية للموردين",
  },
  {
    key: "suppliers.purchase_orders",
    label: "إنشاء وإدارة طلبيات الشراء",
    category: "suppliers",
    description: "إعداد طلبيات توريد السلع ومتابعة استلامها",
  },

  // --- Finance & Reports ---
  {
    key: "finance.view_profits",
    label: "عرض الأرباح والهوامش",
    category: "finance",
    description: "مشاهدة صافي الأرباح والأداء المالي للمتجر",
  },
  {
    key: "finance.view_expenses",
    label: "عرض المصاريف اليومية",
    category: "finance",
    description: "استعراض النفقات والمصاريف التشغيلية للمتجر",
  },
  {
    key: "finance.cash_drawer",
    label: "فتح الصندوق وإغلاقه (الوردية)",
    category: "finance",
    description: "بدء وإنهاء جلسات الصندوق وتدقيق الرصيد النقدي",
  },
  {
    key: "finance.customer_debts",
    label: "عرض ديون الزبائن ومدفوعاتهم",
    category: "finance",
    description: "متابعة كشوف حساب الزبائن والديون المعلقة",
  },
  {
    key: "finance.supplier_debts",
    label: "عرض ديون الموردين ومستحقاتهم",
    category: "finance",
    description: "متابعة كشوف حساب الموردين والأرصدة المستحقة",
  },
  {
    key: "reports.view_financial",
    label: "الاطلاع على التقارير المالية واليومية",
    category: "finance",
    description: "قراءة التقارير اليومية والشهرية وتصدير البيانات",
  },

  // --- Administration ---
  {
    key: "admin.manage_users",
    label: "إدارة المستخدمين والبائعين",
    category: "admin",
    description: "إنشاء وتعديل وتعطيل حسابات البائعين وتعيين الصلاحيات",
  },
  {
    key: "admin.settings",
    label: "تعديل إعدادات المتجر",
    category: "admin",
    description: "التحكم في بيانات المتجر والعملة والطباعة والضرائب",
  },
  {
    key: "admin.sidebar_customize",
    label: "تخصيص القائمة الجانبية",
    category: "admin",
    description: "إظهار وإخفاء وترتيب صفحات البرنامج بالقائمة",
  },
  {
    key: "admin.manage_rewards",
    label: "إدارة المكافآت والحوافز",
    category: "admin",
    description: "تفعيل نظام المكافآت، تحديد القواعد، واعتماد وصرف العمولات",
  },
  {
    key: "admin.audit_logs",
    label: "الاطلاع على سجل العمليات والتدقيق",
    category: "admin",
    description: "مشاهدة سجل التدقيق للعمليات الحساسة في النظام",
  },
];

/**
 * Checks if a user has a specific permission.
 * - Store OWNER and SUPER_ADMIN have all permissions automatically (`*`).
 * - Users with '*' permission wildcard have full access.
 * - Disabled accounts (`isActive === false`) have NO permissions.
 */
export function hasPermission(
  user: {
    role?: string | null;
    isActive?: boolean | null;
    permissions?: string | string[] | null;
  } | null | undefined,
  requiredKey: string
): boolean {
  if (!user) return false;
  if (user.isActive === false) return false;
  if (user.role === "OWNER" || user.role === "SUPER_ADMIN") return true;

  const perms = parsePermissions(user.permissions);
  if (perms.includes("*")) return true;
  return perms.includes(requiredKey);
}

/**
 * Parse permissions safely from JSON string or string array.
 */
export function parsePermissions(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Serialize permissions array into a JSON string for DB storage.
 */
export function serializePermissions(perms: string[]): string {
  return JSON.stringify(Array.from(new Set(perms)));
}

/**
 * Returns a map of permission keys to their full definitions.
 */
export const PERMISSIONS_BY_KEY = new Map<string, PermissionDefinition>(
  ALL_PERMISSIONS.map((p) => [p.key, p])
);
