// Shared domain types for SwiftBill POS

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice: number;
  stock: number;
  unitType: string; // "count" | "kg"
  category: string;
  expiryDate?: string | null;
  expiryDate2?: string | null;
  imageUrl?: string | null;
  supplierId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewProduct {
  name: string;
  barcode: string;
  price: number;
  costPrice?: number;
  stock: number;
  unitType?: string;
  category?: string;
  expiryDate?: string | null;
  expiryDate2?: string | null;
  imageUrl?: string | null;
}

export interface Shop {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  phoneNumber: string;
  ripNumber: string;
  footerText: string;
  currency: string;
  taxRate: number;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Sale {
  id: string;
  receiptNo: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  itemCount: number;
  sellerId?: string | null;
  createdAt: string;
  items: SaleItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type ViewKey =
  | "dashboard"
  | "pos"
  | "products"
  | "sales"
  | "suppliers"
  | "expiry"
  | "shop"
  | "settings"
  | "admin"
  | "sellerDashboard"
  | "sellerMgmt"
  | "sellerSettings"
  | "inventoryAudit"
  | "zakat";

export interface DailyStats {
  totalSales: number;
  transactionCount: number;
  itemsSold: number;
  avgTicket: number;
}

/* ---------------- SaaS types ---------------- */

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  invoices?: SupplierInvoice[];
}

export interface NewSupplier {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface SupplierInvoiceItem {
  id: string;
  invoiceId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  invoiceNo: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
  notes: string;
  createdAt: string;
  items: SupplierInvoiceItem[];
  supplier?: Pick<Supplier, "id" | "name">;
}

export interface NewSupplierInvoiceItem {
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface NewSupplierInvoice {
  supplierId: string;
  invoiceNo: string;
  invoiceDate?: string;
  items: NewSupplierInvoiceItem[];
  paidAmount?: number;
  notes?: string;
}

export type ExpiryProduct = Product;

export interface ExpiryData {
  expired: ExpiryProduct[];
  nearExpiry: ExpiryProduct[];
  thresholdDays: number;
}

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "NONE";
export type SubscriptionPlan = "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface SubscriptionInfo {
  store: {
    id: string;
    name: string;
    status: string;
  };
  subscription: {
    id: string;
    status: SubscriptionStatus;
    storedStatus: string;
    plan: SubscriptionPlan;
    startDate: string;
    endDate: string;
    trialEndsAt: string | null;
  } | null;
  daysRemaining: number;
  planPrice: number;
  planDurationDays: number;
}

export interface AdminStats {
  totalStores: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  suspendedStores: number;
  estimatedMonthlyRevenue: number;
  recentStores: Array<{
    id: string;
    name: string;
    email: string;
    businessType: string;
    status: string;
    createdAt: string;
    subscription: {
      status: string;
      plan: string;
      endDate: string;
    } | null;
  }>;
}

export interface AdminStore {
  id: string;
  name: string;
  businessType: string;
  phone: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  subscription: {
    id: string;
    status: string;
    plan: string;
    startDate: string;
    endDate: string;
    trialEndsAt: string | null;
  } | null;
  counts: {
    users: number;
    products: number;
    sales: number;
  };
}

export interface LicenseKey {
  id: string;
  key: string;
  signature: string;
  plan: SubscriptionPlan;
  durationDays: number;
  status: "UNUSED" | "USED" | "EXPIRED" | "CANCELLED";
  storeId: string | null;
  store?: { id: string; name: string } | null;
  createdBy?: { id: string; email: string; name: string | null };
  activatedAt: string | null;
  createdAt: string;
}

/* ---------------- Seller (Staff) types ---------------- */

export interface Seller {
  id: string;
  name: string | null;
  email: string;
  role: string;
  storeId: string | null;
  createdAt: string;
  updatedAt: string;
  // Optional aggregates returned by /api/sellers (computed server-side)
  totalSales?: number;
  totalRevenue?: number;
  totalProfit?: number;
}

export interface NewSeller {
  name: string;
  email: string;
  password: string;
}

export interface SellerEarnings {
  sellerId: string;
  totalRevenue: number;
  totalProfit: number;
  todayRevenue: number;
  todaySales: number;
  weekRevenue: number;
  weekSales: number;
  monthRevenue: number;
  monthSales: number;
  totalSales: number;
  // Optional daily series for charts
  dailySeries?: { date: string; revenue: number; profit: number }[];
}

export interface MyEarnings extends SellerEarnings {
  scope: "STORE" | "SELLER";
  storeName?: string | null;
  sellerName?: string | null;
}

/* ---------------- Inventory Audit types ---------------- */

export type AuditStatus = "DRAFT" | "COMPLETED" | "APPROVED";

export interface InventoryAuditItem {
  id: string;
  auditId: string;
  productId: string;
  productName: string;
  barcode: string;
  unitType: string; // "count" | "kg"
  systemStock: number;
  countedStock: number;
  difference: number;
  costPrice: number;
  differenceValue: number;
  createdAt: string;
}

export interface InventoryAudit {
  id: string;
  year: number;
  auditDate: string;
  status: AuditStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  approver?: { id: string; name: string | null; email: string } | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  items: InventoryAuditItem[];
}

export interface NewInventoryAudit {
  year: number;
  auditDate?: string;
  notes?: string;
}

export interface InventoryAuditStats {
  totalProducts: number;
  matchedCount: number;
  shortageCount: number;
  surplusCount: number;
  shortageValue: number;
  surplusValue: number;
}

/* ---------------- Zakat types ---------------- */

export interface ZakatSettings {
  id: string;
  zakatRate: number;
  nisabAmount: number;
  haulStartDate: string | null;
  cashOnHand: number;
  receivables: number;
  liabilities: number;
  includeInventory: boolean;
  includeCash: boolean;
  includeReceivables: boolean;
  valuationMethod: "cost" | "selling";
  updatedAt: string;
}

export type ZakatStatus = "UNPAID" | "PAID";

export interface ZakatRecord {
  id: string;
  year: number;
  calculationDate: string;
  inventoryValue: number;
  cashValue: number;
  receivablesValue: number;
  liabilitiesValue: number;
  zakatBase: number;
  zakatRate: number;
  zakatAmount: number;
  status: ZakatStatus;
  paidDate: string | null;
  notes: string;
  createdAt: string;
}

export interface ZakatCalculationInput {
  year: number;
  inventoryValue?: number;
  cashValue?: number;
  receivablesValue?: number;
  liabilitiesValue?: number;
  notes?: string;
}

// A computed zakat calculation result is identical in shape to a ZakatRecord.
export type ZakatCalculationResult = ZakatRecord;

/* ---------------- Supplier Payment types ---------------- */

export type PaymentMethod = "Cash" | "Bank" | "Cheque" | "Other";

export interface SupplierPayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes: string;
  userId: string | null;
  user?: { id: string; name: string | null; email: string } | null;
  createdAt: string;
}

export interface NewSupplierPayment {
  amount: number;
  paymentDate?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}
