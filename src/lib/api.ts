// API client helpers for SwiftBill POS

import type { Product, NewProduct, Shop, Sale, DailyStats } from "./types";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
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
  paymentMethod: "Cash" | "UPI" | "Card";
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
