// API client helpers for Gestiona Pro

import type {
  Product,
  NewProduct,
  Shop,
  Sale,
  DailyStats,
  Supplier,
  NewSupplier,
  SupplierInvoice,
  NewSupplierInvoice,
  ExpiryData,
  SubscriptionInfo,
  AdminStats,
  AdminStore,
  LicenseKey,
  SubscriptionPlan,
  Seller,
  NewSeller,
  SellerEarnings,
  MyEarnings,
  InventoryAudit,
  NewInventoryAudit,
  InventoryAuditStats,
  Customer,
  NewCustomer,
  CustomerPayment,
  ZakatSettings,
  ZakatRecord,
  ZakatCalculationInput,
  ZakatCalculationResult,
  SupplierPayment,
  NewSupplierPayment,
  StockMovement,
  ProductBatch,
  PurchaseOrder,
  NewPurchaseOrder,
  PurchaseOrderStatus,
  Expense,
  NewExpense,
  CashSession,
  CashTransaction,
  DailyFinancialReport,
  StatementOfAccount,
  ReorderRecommendationsResponse,
  AssistantResponse,
  AuditLogEntry,
  CommissionRule,
  SellerRewardRecord,
  SellerPerformanceReport,
} from "./types";

// Read stored JWT token — shared accessor with auth-context so the in-memory
// copy works even when localStorage is blocked (Safari third-party iframes).
import { getStoredToken } from "./auth-context";

function getAuthToken(): string | null {
  return getStoredToken();
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Request failed");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/* ---------------- Products ---------------- */
export const productsApi = {
  list: () => request<Product[]>("/api/products"),
  create: (data: NewProduct) =>
    request<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<NewProduct>) =>
    request<Product>(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/products/${id}`, { method: "DELETE" }),
  findByBarcode: (barcode: string) =>
    request<Product>(`/api/products/barcode/${encodeURIComponent(barcode)}`),
};

/* ---------------- Shop ---------------- */
export const shopApi = {
  get: () => request<Shop>("/api/shop"),
  update: (data: Partial<Shop>) =>
    request<Shop>("/api/shop", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

/* ---------------- Sales ---------------- */
export interface CreateSalePayload {
  items: { productId: string; quantity: number }[];
  discount: number;
  paymentMethod:
    | "Cash"
    | "BARIDIMOB"
    | "CARD"
    | "CHEQUE"
    | "CREDIT"
    | "UPI"
    | "Card";
  customerId?: string | null;
  redeemPoints?: number;
}

export const salesApi = {
  list: () => request<Sale[]>("/api/sales"),
  get: (id: string) => request<Sale>(`/api/sales/${id}`),
  create: (data: CreateSalePayload) =>
    request<Sale>("/api/sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  stats: () => request<DailyStats>("/api/sales/stats"),
};

/* ---------------- Suppliers ---------------- */
export const customersApi = {
  list: () => request<Customer[]>("/api/customers"),
  create: (data: NewCustomer) =>
    request<Customer>("/api/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<NewCustomer>) =>
    request<Customer>(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/customers/${id}`, { method: "DELETE" }),
  payments: (id: string) =>
    request<CustomerPayment[]>(`/api/customers/${id}/payments`),
  addPayment: (
    id: string,
    data: { amount: number; paymentMethod?: string; notes?: string; saleId?: string }
  ) =>
    request<CustomerPayment>(`/api/customers/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const suppliersApi = {
  list: () => request<Supplier[]>("/api/suppliers"),
  create: (data: NewSupplier) =>
    request<Supplier>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<NewSupplier>) =>
    request<Supplier>(`/api/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/suppliers/${id}`, { method: "DELETE" }),
  invoices: (id: string) =>
    request<{ supplier: { id: string; name: string }; invoices: SupplierInvoice[] }>(
      `/api/suppliers/${id}/invoices`
    ),
};

/* ---------------- Supplier Invoices ---------------- */
export const supplierInvoicesApi = {
  list: () => request<SupplierInvoice[]>("/api/supplier-invoices"),
  create: (data: NewSupplierInvoice) =>
    request<SupplierInvoice>("/api/supplier-invoices", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  get: (id: string) => request<SupplierInvoice>(`/api/supplier-invoices/${id}`),
  update: (
    id: string,
    data: Partial<{
      invoiceNo: string;
      paidAmount: number;
      totalAmount: number;
      status: "PAID" | "PARTIAL" | "UNPAID";
      attachmentUrl: string | null;
      notes: string;
    }>
  ) =>
    request<SupplierInvoice>(`/api/supplier-invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/supplier-invoices/${id}`, { method: "DELETE" }),
};

/* ---------------- File Upload ---------------- */
export const uploadApi = {
  upload: async (
    file: File,
    folder: "invoices" | "branding" | "store" | "general" = "general"
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "فشل رفع الملف");
    }
    return res.json() as Promise<{ url: string; filename: string; size: number }>;
  },
};

/* ---------------- Expiry tracking ---------------- */
export const expiryApi = {
  list: () => request<ExpiryData>("/api/products/expiry"),
};

/* ---------------- Subscription (current store) ---------------- */
export const subscriptionApi = {
  get: () => request<SubscriptionInfo>("/api/subscription"),
  activate: (key: string) =>
    request<{
      message: string;
      subscription: SubscriptionInfo["subscription"];
      plan: SubscriptionPlan;
      durationDays: number;
    }>("/api/subscription/activate", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
};

/* ---------------- Super Admin ---------------- */
export const adminApi = {
  stats: () => request<AdminStats>("/api/admin/stats"),
  stores: () => request<AdminStore[]>("/api/admin/stores"),
  generateLicense: (plan: SubscriptionPlan) =>
    request<{
      id: string;
      key: string;
      signature: string;
      plan: SubscriptionPlan;
      durationDays: number;
      status: string;
      createdAt: string;
    }>("/api/admin/licenses", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
  licenses: () => request<LicenseKey[]>("/api/admin/licenses"),
  suspendStore: (id: string) =>
    request<{ id: string; name: string; status: string; message: string }>(
      `/api/admin/stores/${id}/suspend`,
      { method: "POST" }
    ),
  activateSubscription: (id: string, durationDays: number, plan?: string) =>
    request<{ message: string; subscription: SubscriptionInfo["subscription"] }>(
      `/api/admin/stores/${id}/activate-subscription`,
      {
        method: "POST",
        body: JSON.stringify({ durationDays, plan }),
      }
    ),
};

/* ---------------- Sellers (Staff) ---------------- */
export const sellersApi = {
  list: () => request<Seller[]>("/api/sellers"),
  create: (data: NewSeller) =>
    request<Seller>("/api/sellers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<{
      name: string;
      username: string;
      email: string;
      phone: string;
      password: string;
      isActive: boolean;
      permissions: string[];
    }>
  ) =>
    request<Seller>(`/api/sellers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/sellers/${id}`, { method: "DELETE" }),
  earnings: (id: string) =>
    request<SellerEarnings>(`/api/sellers/${id}/earnings`),
  changePassword: (id: string, password: string) =>
    request<{ message: string }>(`/api/sellers/${id}/change-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
};

export const myEarningsApi = {
  get: () => request<MyEarnings>("/api/my-earnings"),
};

/* ---------------- Inventory Audit ---------------- */
export const inventoryAuditApi = {
  list: () => request<InventoryAudit[]>("/api/inventory-audits"),
  create: (data: NewInventoryAudit) =>
    request<InventoryAudit>("/api/inventory-audits", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  get: (id: string) => request<InventoryAudit>(`/api/inventory-audits/${id}`),
  update: (
    id: string,
    data: Partial<{ notes: string; status: "DRAFT" | "COMPLETED" | "APPROVED" }>
  ) =>
    request<InventoryAudit>(`/api/inventory-audits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/inventory-audits/${id}`, { method: "DELETE" }),
  updateItems: (
    id: string,
    items: { id: string; countedStock: number }[]
  ) =>
    request<InventoryAudit>(`/api/inventory-audits/${id}/items`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),
  approve: (id: string) =>
    request<InventoryAudit>(`/api/inventory-audits/${id}/approve`, {
      method: "POST",
    }),
  stats: (id: string) =>
    request<InventoryAuditStats>(`/api/inventory-audits/${id}/stats`),
};

/* ---------------- Zakat ---------------- */
export const zakatApi = {
  getSettings: () => request<ZakatSettings>("/api/zakat/settings"),
  updateSettings: (data: Partial<ZakatSettings>) =>
    request<ZakatSettings>("/api/zakat/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  calculate: (data: ZakatCalculationInput) =>
    request<ZakatCalculationResult>("/api/zakat/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRecords: () => request<ZakatRecord[]>("/api/zakat/records"),
  markPaid: (
    id: string,
    data: { status: "PAID"; paidDate?: string }
  ) =>
    request<ZakatRecord>(`/api/zakat/records/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

/* ---------------- Supplier Payments ---------------- */
export const supplierPaymentsApi = {
  list: (invoiceId: string) =>
    request<SupplierPayment[]>(
      `/api/supplier-invoices/${invoiceId}/payments`
    ),
  create: (invoiceId: string, data: NewSupplierPayment) =>
    request<SupplierPayment>(
      `/api/supplier-invoices/${invoiceId}/payments`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
  delete: (invoiceId: string, paymentId: string) =>
    request<void>(
      `/api/supplier-invoices/${invoiceId}/payments/${paymentId}`,
      { method: "DELETE" }
    ),
};

/* ---------------- Stock Movements & Inventory Ledger ---------------- */
export const stockMovementsApi = {
  list: (params?: { productId?: string; type?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.productId) qs.set("productId", params.productId);
    if (params?.type) qs.set("type", params.type);
    if (params?.limit) qs.set("limit", String(params.limit));
    const qStr = qs.toString();
    return request<StockMovement[]>(`/api/stock-movements${qStr ? `?${qStr}` : ""}`);
  },
  create: (data: {
    productId: string;
    type: string;
    quantity: number;
    reason?: string;
    isTarget?: boolean;
  }) =>
    request<StockMovement>("/api/stock-movements", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

/* ---------------- Batches & Expiry Analysis ---------------- */
export const batchesApi = {
  list: (filter?: "all" | "expired" | "3days" | "7days" | "30days") =>
    request<{
      batches: (ProductBatch & {
        diffDays: number;
        urgency: "expired" | "urgent_3" | "near_7" | "medium_30" | "safe";
        stockValue: number;
        sellingValue: number;
        product: { id: string; name: string; barcode: string; price: number; unitType: string; category: string };
      })[];
      stats: {
        totalBatches: number;
        expiredCount: number;
        urgent3Count: number;
        near7Count: number;
        medium30Count: number;
        totalAtRiskValue: number;
      };
    }>(`/api/batches${filter ? `?filter=${filter}` : ""}`),

  createForProduct: (
    productId: string,
    data: { batchNumber?: string; expiryDate: string; quantity: number; costPrice?: number }
  ) =>
    request<ProductBatch>(`/api/products/${productId}/batches`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

/* ---------------- Purchase Orders (طلبيات الشراء) ---------------- */
export const purchaseOrdersApi = {
  list: (params?: { supplierId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.supplierId) qs.set("supplierId", params.supplierId);
    if (params?.status) qs.set("status", params.status);
    const qStr = qs.toString();
    return request<PurchaseOrder[]>(`/api/purchase-orders${qStr ? `?${qStr}` : ""}`);
  },
  get: (id: string) => request<PurchaseOrder>(`/api/purchase-orders/${id}`),
  create: (data: NewPurchaseOrder) =>
    request<PurchaseOrder>("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { status?: PurchaseOrderStatus; notes?: string; expectedDate?: string | null }) =>
    request<PurchaseOrder>(`/api/purchase-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/api/purchase-orders/${id}`, { method: "DELETE" }),
  receive: (
    id: string,
    data: {
      items: Array<{
        itemId: string;
        receivedQty: number;
        batchNumber?: string;
        expiryDate?: string;
      }>;
      createInvoice?: boolean;
      invoiceNo?: string;
      notes?: string;
    }
  ) =>
    request<PurchaseOrder>(`/api/purchase-orders/${id}/receive`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

/* ---------------- Phase 3: Expenses ---------------- */
export const expensesApi = {
  list: (params?: { category?: string; paymentMethod?: string; dateFrom?: string; dateTo?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.paymentMethod) qs.set("paymentMethod", params.paymentMethod);
    if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params?.dateTo) qs.set("dateTo", params.dateTo);
    const qStr = qs.toString();
    return request<{
      totalAmount: number;
      count: number;
      byCategory: Record<string, { label: string; total: number; count: number }>;
      expenses: Expense[];
    }>(`/api/expenses${qStr ? `?${qStr}` : ""}`);
  },
  create: (data: NewExpense) =>
    request<Expense>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<NewExpense>) =>
    request<Expense>(`/api/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/expenses/${id}`, { method: "DELETE" }),
};

/* ---------------- Phase 3: Cash Sessions & Drawer ---------------- */
export const cashSessionsApi = {
  get: () =>
    request<{
      activeSession: CashSession | null;
      history: CashSession[];
    }>("/api/cash-sessions"),
  open: (data: { openingCash: number; notes?: string }) =>
    request<CashSession>("/api/cash-sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  close: (id: string, data: { closingCashActual: number; notes?: string }) =>
    request<{
      session: CashSession;
      flow: any;
      closingCashExpected: number;
      difference: number;
    }>(`/api/cash-sessions/${id}/close`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addTransaction: (
    id: string,
    data: { type: "DEPOSIT" | "WITHDRAWAL"; amount: number; reason?: string }
  ) =>
    request<CashTransaction>(`/api/cash-sessions/${id}/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

/* ---------------- Phase 3: Daily Financial Report ---------------- */
export const dailyReportApi = {
  get: (date?: string) =>
    request<DailyFinancialReport>(
      `/api/reports/daily${date ? `?date=${date}` : ""}`
    ),
};

/* ---------------- Phase 3: Statements of Account ---------------- */
export const statementsApi = {
  customer: (id: string) =>
    request<StatementOfAccount>(`/api/customers/${id}/statement`),
  supplier: (id: string) =>
    request<StatementOfAccount>(`/api/suppliers/${id}/statement`),
};

/* ---------------- Phase 5: Reorder & Assistant APIs ---------------- */
export const recommendationsApi = {
  reorder: () =>
    request<ReorderRecommendationsResponse>("/api/recommendations/reorder"),
};

export const assistantApi = {
  ask: (query: string) =>
    request<AssistantResponse>("/api/assistant", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
};

/* ---------------- Audit Logs ---------------- */
export const auditLogsApi = {
  list: (params?: { limit?: number; action?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.action) q.set("action", params.action);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<AuditLogEntry[]>(`/api/audit-logs${qs}`);
  },
};

/* ---------------- Commissions & Rewards ---------------- */
export const commissionsApi = {
  getRule: () => request<CommissionRule>("/api/commissions/rule"),
  saveRule: (data: Partial<CommissionRule>) =>
    request<CommissionRule>("/api/commissions/rule", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  calculate: (period?: string) =>
    request<{
      rule: CommissionRule;
      records: SellerRewardRecord[];
    }>(`/api/commissions/calculate${period ? `?period=${period}` : ""}`),
  listRewards: () => request<SellerRewardRecord[]>("/api/commissions/records"),
  approveReward: (id: string, approvedAmount?: number) =>
    request<SellerRewardRecord>(`/api/commissions/records/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ approvedAmount }),
    }),
  payReward: (id: string, paymentMethod?: string) =>
    request<SellerRewardRecord>(`/api/commissions/records/${id}/pay`, {
      method: "POST",
      body: JSON.stringify({ paymentMethod }),
    }),
};

/* ---------------- Seller Performance Reports ---------------- */
export const sellerReportsApi = {
  get: (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.period) q.set("period", params.period);
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<SellerPerformanceReport>(`/api/reports/sellers${qs}`);
  },
};



