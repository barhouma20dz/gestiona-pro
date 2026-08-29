// API client helpers for SwiftBill POS

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
      status: "PAID" | "PARTIAL" | "UNPAID";
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
  update: (id: string, data: Partial<{ name: string; email: string }>) =>
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
