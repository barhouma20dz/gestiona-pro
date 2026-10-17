import {
  LayoutDashboard,
  ScanLine,
  Package,
  ReceiptText,
  Store,
  Settings,
  Truck,
  CalendarClock,
  ShieldCheck,
  Users,
  UserCircle,
  UserRound,
  LayoutGrid,
  ClipboardCheck,
  HandHeart,
  Radio,
  BarChart3,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";
import type { TranslationKey } from "@/lib/i18n";

export interface NavSectionDef {
  id: string;
  titleAr: string;
  titleEn: string;
  order: number;
}

export interface NavItemDef {
  key: ViewKey;
  labelAr: string;
  labelEn: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  icon: LucideIcon;
  sectionId: string;
  defaultOrder: number;
  ownerOnly?: boolean;
  staffOnly?: boolean;
  superAdminOnly?: boolean;
  requiredPermission?: string;
  fixed?: boolean; // If fixed, cannot be hidden by mistake (like settings)
}

export const NAV_SECTIONS: NavSectionDef[] = [
  {
    id: "operations",
    titleAr: "العمليات ونقطة البيع",
    titleEn: "Operations & POS",
    order: 0,
  },
  {
    id: "inventory",
    titleAr: "المخزون والتوريد",
    titleEn: "Inventory & Procurement",
    order: 1,
  },
  {
    id: "finance",
    titleAr: "المالية والتقارير",
    titleEn: "Finance & Reports",
    order: 2,
  },
  {
    id: "management",
    titleAr: "إدارة المتجر والنظام",
    titleEn: "Store Administration",
    order: 3,
  },
];

export const NAV_ITEMS_CATALOG: NavItemDef[] = [
  // Section: Operations
  {
    key: "dashboard",
    labelAr: "لوحة التحكم الرئيسية",
    labelEn: "Dashboard",
    labelKey: "dashboard",
    descKey: "storeOverview",
    icon: LayoutDashboard,
    sectionId: "operations",
    defaultOrder: 0,
    ownerOnly: true,
  },
  {
    key: "sellerDashboard",
    labelAr: "لوحة تحكم البائع",
    labelEn: "Seller Dashboard",
    labelKey: "sellerDashboard",
    descKey: "sellerDashboardSubtitle",
    icon: LayoutGrid,
    sectionId: "operations",
    defaultOrder: 1,
    staffOnly: true,
  },
  {
    key: "pos",
    labelAr: "نقطة البيع (الكاشير)",
    labelEn: "POS Terminal",
    labelKey: "posTerminal",
    descKey: "scanBillCheckout",
    icon: ScanLine,
    sectionId: "operations",
    defaultOrder: 2,
  },
  {
    key: "sales",
    labelAr: "سجل المبيعات والفواتير",
    labelEn: "Sales History",
    labelKey: "salesHistory",
    descKey: "pastBills",
    icon: ReceiptText,
    sectionId: "operations",
    defaultOrder: 3,
  },
  {
    key: "roomSync",
    labelAr: "غرف الاتصال والربط السحابي",
    labelEn: "Room Sync",
    labelKey: "roomSync",
    descKey: "roomSyncDesc",
    icon: Radio,
    sectionId: "operations",
    defaultOrder: 4,
  },

  // Section: Inventory
  {
    key: "products",
    labelAr: "إدارة المنتجات والمخزون",
    labelEn: "Products & Stock",
    labelKey: "products",
    descKey: "manageInventory",
    icon: Package,
    sectionId: "inventory",
    defaultOrder: 10,
  },
  {
    key: "expiry",
    labelAr: "تتبع الصلاحية والتنبيهات",
    labelEn: "Expiry Tracking",
    labelKey: "expiryTracking",
    descKey: "expiryTrackingSubtitle",
    icon: CalendarClock,
    sectionId: "inventory",
    defaultOrder: 11,
  },
  {
    key: "suppliers",
    labelAr: "الموردين وفواتير الشراء",
    labelEn: "Suppliers",
    labelKey: "suppliers",
    descKey: "suppliersSubtitle",
    icon: Truck,
    sectionId: "inventory",
    defaultOrder: 12,
  },
  {
    key: "inventoryAudit",
    labelAr: "الجرد السنوي والمطابقة",
    labelEn: "Inventory Audit",
    labelKey: "inventoryAudit",
    descKey: "annualAuditDesc",
    icon: ClipboardCheck,
    sectionId: "inventory",
    defaultOrder: 13,
    ownerOnly: true,
  },

  // Section: Finance
  {
    key: "customers",
    labelAr: "سجل الزبائن والديون",
    labelEn: "Customers & Debts",
    labelKey: "customers",
    descKey: "customersSubtitle",
    icon: UserRound,
    sectionId: "finance",
    defaultOrder: 20,
    ownerOnly: true,
  },
  {
    key: "dailyReport",
    labelAr: "التقرير المالي وأداء البائعين",
    labelEn: "Financial & Seller Report",
    labelKey: "dailyReport",
    descKey: "dailyReportDesc",
    icon: BarChart3,
    sectionId: "finance",
    defaultOrder: 21,
    ownerOnly: true,
  },
  {
    key: "expenses",
    labelAr: "المصاريف التشغيلية للمحل",
    labelEn: "Operating Expenses",
    labelKey: "expenses",
    descKey: "expensesDesc",
    icon: Landmark,
    sectionId: "finance",
    defaultOrder: 22,
    ownerOnly: true,
  },
  {
    key: "zakat",
    labelAr: "حساب زكاة التجارة والمال",
    labelEn: "Zakat Calculator",
    labelKey: "zakat",
    descKey: "zakatDesc",
    icon: HandHeart,
    sectionId: "finance",
    defaultOrder: 23,
    ownerOnly: true,
  },

  // Section: Store Management & Admin
  {
    key: "sellerMgmt",
    labelAr: "المستخدمون والصلاحيات والمكافآت",
    labelEn: "Staff & Permissions",
    labelKey: "sellerManagement",
    descKey: "sellerManagementSubtitle",
    icon: Users,
    sectionId: "management",
    defaultOrder: 30,
    ownerOnly: true,
  },
  {
    key: "shop",
    labelAr: "بيانات المتجر والطباعة",
    labelEn: "Store Details",
    labelKey: "shopDetails",
    descKey: "businessInformation",
    icon: Store,
    sectionId: "management",
    defaultOrder: 31,
    ownerOnly: true,
  },
  {
    key: "settings",
    labelAr: "الإعدادات العامة وتخصيص القائمة",
    labelEn: "Settings",
    labelKey: "settings",
    descKey: "appConfiguration",
    icon: Settings,
    sectionId: "management",
    defaultOrder: 32,
    ownerOnly: true,
    fixed: true, // Always accessible so owner can never lock themselves out
  },
  {
    key: "sellerSettings",
    labelAr: "إعدادات البائع الشخصية",
    labelEn: "Seller Profile",
    labelKey: "sellerSettings",
    descKey: "sellerSettingsSubtitle",
    icon: UserCircle,
    sectionId: "management",
    defaultOrder: 33,
    staffOnly: true,
  },
  {
    key: "admin",
    labelAr: "لوحة تحكم السوبر أدمن",
    labelEn: "Super Admin",
    labelKey: "adminDashboard",
    descKey: "adminSubtitle",
    icon: ShieldCheck,
    sectionId: "management",
    defaultOrder: 34,
    superAdminOnly: true,
  },
];

export interface SidebarItemConfig {
  id: ViewKey;
  visible: boolean;
  order: number;
  sectionId: string;
}

export interface SidebarSectionConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface FullSidebarConfig {
  sections: SidebarSectionConfig[];
  items: SidebarItemConfig[];
}

export function getDefaultSidebarConfig(): FullSidebarConfig {
  return {
    sections: NAV_SECTIONS.map((sec) => ({
      id: sec.id,
      visible: true,
      order: sec.order,
    })),
    items: NAV_ITEMS_CATALOG.map((item) => ({
      id: item.key,
      visible: true,
      order: item.defaultOrder,
      sectionId: item.sectionId,
    })),
  };
}

export function parseSidebarConfig(saved: string | null | undefined): FullSidebarConfig {
  const defaults = getDefaultSidebarConfig();
  if (!saved) return defaults;

  try {
    const parsed = JSON.parse(saved);
    if (!parsed) return defaults;

    // Handle new format with sections and items
    if (parsed.sections && Array.isArray(parsed.items)) {
      const sectionMap = new Map<string, SidebarSectionConfig>();
      parsed.sections.forEach((s: any, idx: number) => {
        sectionMap.set(s.id, {
          id: s.id,
          visible: s.visible !== false,
          order: typeof s.order === "number" ? s.order : idx,
        });
      });

      const itemMap = new Map<string, SidebarItemConfig>();
      parsed.items.forEach((it: any, idx: number) => {
        itemMap.set(it.id, {
          id: it.id,
          visible: it.visible !== false,
          order: typeof it.order === "number" ? it.order : idx,
          sectionId: it.sectionId || "operations",
        });
      });

      const mergedSections = defaults.sections.map((defSec) => {
        const savedSec = sectionMap.get(defSec.id);
        return savedSec || defSec;
      });

      const mergedItems = defaults.items.map((defItem) => {
        const savedItem = itemMap.get(defItem.id);
        if (!savedItem) return defItem;
        return {
          ...defItem,
          visible: defItem.id === "settings" ? true : savedItem.visible,
          order: savedItem.order,
          sectionId: savedItem.sectionId || defItem.sectionId,
        };
      });

      mergedSections.sort((a, b) => a.order - b.order);
      mergedItems.sort((a, b) => a.order - b.order);

      return { sections: mergedSections, items: mergedItems };
    }

    // Handle legacy flat array format: [ { id, visible, order }, ... ]
    if (Array.isArray(parsed)) {
      const legacyMap = new Map<string, { visible: boolean; order: number }>();
      parsed.forEach((it: any, idx: number) => {
        legacyMap.set(it.id, {
          visible: it.visible !== false,
          order: typeof it.order === "number" ? it.order : idx,
        });
      });

      const mergedItems = defaults.items.map((defItem) => {
        const savedItem = legacyMap.get(defItem.id);
        if (!savedItem) return defItem;
        return {
          ...defItem,
          visible: defItem.id === "settings" ? true : savedItem.visible,
          order: savedItem.order,
        };
      });

      mergedItems.sort((a, b) => a.order - b.order);
      return { sections: defaults.sections, items: mergedItems };
    }
  } catch {
    // fallback to defaults on corrupt JSON
  }

  return defaults;
}

export function serializeSidebarConfig(config: FullSidebarConfig): string {
  return JSON.stringify(config);
}
