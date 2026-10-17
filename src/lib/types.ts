// Shared domain types for Gestiona Pro

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock?: number;
  unitType: string; // "count" | "kg"
  category: string;
  expiryDate?: string | null;
  expiryDate2?: string | null;
  imageUrl?: string | null;
  isNoBarcode?: boolean;
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
  minStock?: number;
  unitType?: string;
  category?: string;
  expiryDate?: string | null;
  expiryDate2?: string | null;
  imageUrl?: string | null;
  isNoBarcode?: boolean;
}

export interface ReceiptConfig {
  headerTitle?: string;
  addressLine1?: string;
  addressLine2?: string;
  phoneNumber?: string;
  paperSize?: "80mm" | "58mm" | "a4";
  showQr?: boolean;
  qrText?: string;
  showUnitPrice?: boolean;
  showSubtotal?: boolean;
  showPaymentMethod?: boolean;
  showItemCount?: boolean;
  showDate?: boolean;
  showReceiptNo?: boolean;
  showBranding?: boolean;
  footerText?: string;
  fontDensity?: "normal" | "compact" | "spacious";
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
  businessType?: string | null;
  loyaltyEnabled?: boolean;
  loyaltyEarnRate?: number;
  loyaltyPointValue?: number;
  receiptConfig?: string | null;
  parsedReceiptConfig?: ReceiptConfig;
  logoUrl?: string | null;
  storePhotoUrl?: string | null;
  primaryDisplayImage?: "LOGO" | "STORE_PHOTO";
  sidebarConfig?: string | null;
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
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
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
  | "customers"
  | "suppliers"
  | "expiry"
  | "shop"
  | "settings"
  | "admin"
  | "sellerDashboard"
  | "sellerMgmt"
  | "sellerSettings"
  | "inventoryAudit"
  | "zakat"
  | "roomSync"
  | "dailyReport"
  | "expenses";

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
  leadTimeDays?: number;
  paymentTerms?: string;
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
  leadTimeDays?: number;
  paymentTerms?: string;
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
  dueDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
  attachmentUrl?: string | null;
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
  invoiceNo?: string;
  invoiceDate?: string;
  dueDate?: string | null;
  items?: NewSupplierInvoiceItem[];
  totalAmount?: number;
  paidAmount?: number;
  attachmentUrl?: string | null;
  notes?: string;
}

export type PurchaseOrderStatus = "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  total: number;
  product?: Pick<Product, "id" | "name" | "barcode" | "unitType"> | null;
}

export interface PurchaseOrder {
  id: string;
  storeId: string;
  supplierId: string;
  orderNo: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate?: string | null;
  totalAmount: number;
  notes: string;
  invoiceId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
  supplier?: Pick<Supplier, "id" | "name" | "phone" | "leadTimeDays" | "paymentTerms">;
  invoice?: Pick<SupplierInvoice, "id" | "invoiceNo" | "status" | "totalAmount"> | null;
}

export interface NewPurchaseOrderItem {
  productId?: string | null;
  productName: string;
  orderedQty: number;
  unitCost: number;
}

export interface NewPurchaseOrder {
  supplierId: string;
  orderNo?: string;
  expectedDate?: string | null;
  notes?: string;
  items: NewPurchaseOrderItem[];
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
  username?: string | null;
  email: string;
  role: string;
  isActive?: boolean;
  permissions?: string[] | string | null;
  phone?: string | null;
  storeId: string | null;
  createdAt: string;
  updatedAt: string;
  // Optional aggregates returned by /api/sellers (computed server-side)
  totalSales?: number;
  totalRevenue?: number;
  totalProfit?: number;
}

export interface NewSeller {
  username?: string;
  name?: string;
  email?: string;
  password: string;
  phone?: string;
  isActive?: boolean;
  permissions?: string[];
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


/* ---------------- Customers & Loyalty ---------------- */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  loyaltyPoints: number;
  totalSales: number;
  salesCount: number;
  creditOutstanding: number;
  lastSaleAt: string | null;
  createdAt: string;
}

export interface NewCustomer {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  saleId: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
  user?: { name: string | null } | null;
  createdAt: string;
}

export type StockMovementType =
  | "SALE"
  | "PURCHASE"
  | "RETURN"
  | "ADJUSTMENT"
  | "WASTE"
  | "AUDIT";

export interface StockMovement {
  id: string;
  storeId: string;
  productId: string;
  product?: { name: string; barcode: string; unitType: string };
  type: StockMovementType;
  quantity: number;
  beforeQty: number;
  afterQty: number;
  unitCost: number;
  reason: string;
  referenceId?: string | null;
  userId?: string | null;
  user?: { name: string | null; email: string } | null;
  createdAt: string;
}

export interface ProductBatch {
  id: string;
  storeId: string;
  productId: string;
  product?: { name: string; barcode: string };
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  costPrice: number;
  receivedDate: string;
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED";
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Phase 3: Expenses types ---------------- */

export type ExpenseCategoryKey =
  | "RENT"
  | "UTILITIES"
  | "SALARIES"
  | "TRANSPORT"
  | "MAINTENANCE"
  | "MARKETING"
  | "PACKAGING"
  | "OTHER";

export interface Expense {
  id: string;
  storeId: string;
  category: string;
  categoryLabel: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  paidTo?: string | null;
  notes: string;
  receiptUrl?: string | null;
  userId?: string | null;
  user?: { name: string | null } | null;
  cashSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewExpense {
  category: string;
  categoryLabel?: string;
  amount: number;
  expenseDate?: string;
  paymentMethod?: string;
  paidTo?: string;
  notes?: string;
  receiptUrl?: string;
}

/* ---------------- Phase 3: Cash Drawer Session types ---------------- */

export interface CashTransaction {
  id: string;
  sessionId: string;
  storeId: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  reason: string;
  userId?: string | null;
  user?: { name: string | null } | null;
  createdAt: string;
}

export interface CashSessionFlow {
  cashSales: number;
  salesCount: number;
  cashCustomerDebts: number;
  cashDeposits: number;
  totalIn: number;
  cashSupplierPayments: number;
  cashExpenses: number;
  cashWithdrawals: number;
  totalOut: number;
  netCashFlow: number;
}

export interface CashSession {
  id: string;
  storeId: string;
  userId: string;
  user?: { name: string | null } | null;
  openedAt: string;
  closedAt?: string | null;
  status: "OPEN" | "CLOSED";
  openingCash: number;
  closingCashActual?: number | null;
  closingCashExpected?: number | null;
  difference?: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  transactions?: CashTransaction[];
  flow?: CashSessionFlow;
  expectedCash?: number;
}

/* ---------------- Phase 3: Daily Financial Report types ---------------- */

export interface DailyFinancialReport {
  date: string;
  currentDay: {
    salesCount: number;
    totalSales: number;
    totalDiscounts: number;
    netSales: number;
    cogs: number;
    grossProfit: number;
    grossProfitMargin: number;
    totalOperatingExpenses: number;
    expensesByCategory: Record<string, number>;
    netOperatingProfit: number;
    netProfitMargin: number;
    paymentBreakdown: Record<string, { total: number; count: number }>;
    totalCustomerDebtCollected: number;
    totalSupplierPaid: number;
    cashFlow: {
      totalCashIn: number;
      totalCashOut: number;
      netCashFlow: number;
      cashFromSales: number;
      cashDebtCollected: number;
      cashExpenses: number;
      cashSupplierPaid: number;
    };
  };
  comparison: {
    salesDiff: number;
    salesPercentChange: number;
    grossProfitDiff: number;
    grossProfitPercentChange: number;
    netProfitDiff: number;
    prevDayNetSales: number;
    prevDayNetProfit: number;
  };
}

/* ---------------- Phase 3: Statement of Account types ---------------- */

export interface StatementEntry {
  id: string;
  date: string;
  type: string;
  title: string;
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
  details?: string;
  receivedBy?: string | null;
  paidBy?: string | null;
}

export interface StatementOfAccount {
  customer?: {
    id: string;
    name: string;
    phone: string;
    address?: string;
  };
  supplier?: {
    id: string;
    name: string;
    phone: string;
    leadTimeDays?: number;
    paymentTerms?: string;
  };
  summary: {
    totalDebit?: number;
    totalCredit?: number;
    totalInvoices?: number;
    totalPaid?: number;
    currentOutstanding: number;
  };
  ledger: StatementEntry[];
}

/* ---------------- Phase 5: Reorder & Assistant types ---------------- */

export interface ReorderItemRecommendation {
  productId: string;
  productName: string;
  barcode: string;
  category: string;
  unitType: string;
  currentStock: number;
  minStock: number;
  pendingOrdersQty: number;
  avgDailySales: number;
  daysOfSupply: number;
  leadTimeDays: number;
  reorderPoint: number;
  recommendedQty: number;
  unitCost: number;
  estimatedCost: number;
  urgency: "OUT_OF_STOCK" | "CRITICAL" | "WARNING" | "NORMAL";
  urgencyLabel: string;
  supplier: {
    id: string;
    name: string;
    phone: string;
    leadTimeDays: number;
  } | null;
}

export interface ReorderRecommendationsResponse {
  summary: {
    totalProductsScanned: number;
    itemsNeedingReorder: number;
    outOfStockCount: number;
    criticalCount: number;
    warningCount: number;
    totalEstimatedInvestment: number;
  };
  recommendations: ReorderItemRecommendation[];
}

export interface AssistantResponse {
  answer: string;
  metrics?: {
    todayNetSales: number;
    todayGrossProfit: number;
    todayOperatingExpenses: number;
    todayNetOperatingProfit: number;
    totalInventoryValue: number;
    outOfStockCount: number;
    lowStockCount: number;
    nearExpiryBatchesCount: number;
    totalSupplierDebt: number;
    totalCustomerDebt: number;
    isShiftOpen: boolean;
    expectedDrawerCash: number;
  };
  topSelling?: Array<{ name: string; qty: number; rev: number }>;
  suggestedQuestions: string[];
}

/* ---------------- Permissions & Users ---------------- */

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  description: string;
  permissions: PermissionItem[];
}

/* ---------------- Sidebar Configuration ---------------- */

export interface SidebarItemConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

/* ---------------- Audit Log ---------------- */

export interface AuditLogEntry {
  id: string;
  storeId: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

/* ---------------- Commission & Rewards ---------------- */

export interface CommissionRule {
  id: string;
  storeId: string;
  isEnabled: boolean;
  calculationBasis: "TOTAL_SALES" | "NET_SALES" | "GROSS_PROFIT";
  rewardType: "PERCENTAGE" | "FIXED_AMOUNT" | "TIERED";
  rateValue: number;
  tiersConfig?: string | null;
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  minTarget: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerRewardRecord {
  id: string;
  storeId: string;
  sellerId: string;
  seller?: Pick<Seller, "id" | "name" | "username" | "email">;
  ruleId?: string | null;
  rule?: CommissionRule | null;
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  discounts: number;
  netSales: number;
  grossProfit: number;
  salesCount: number;
  calculatedAmount: number;
  approvedAmount: number;
  status: "CALCULATED" | "APPROVED" | "REJECTED" | "PAID";
  ruleSnapshot?: string | null;
  notes: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Seller Performance Reports ---------------- */

export interface SellerPerformanceItem {
  sellerId: string;
  sellerName: string;
  username: string | null;
  salesCount: number;
  totalGrossSales: number;
  totalDiscounts: number;
  returnsCount: number;
  returnsTotal: number;
  netSales: number;
  averageTicket: number;
  grossProfit: number;
  profitMarginPercent: number;
}

export interface SellerPerformanceReport {
  period: "today" | "week" | "month" | "custom";
  startDate: string;
  endDate: string;
  summary: {
    totalSalesCount: number;
    totalGrossRevenue: number;
    totalNetRevenue: number;
    totalDiscounts: number;
    totalReturns: number;
    totalProfit: number;
  };
  sellers: SellerPerformanceItem[];
}


