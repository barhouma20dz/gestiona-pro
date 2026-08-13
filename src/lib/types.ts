// Shared domain types for SwiftBill POS

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewProduct {
  name: string;
  barcode: string;
  price: number;
  costPrice?: number;
  stock: number;
  category?: string;
}

export interface Shop {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  phoneNumber: string;
  upiId: string;
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
  | "shop"
  | "settings";

export interface DailyStats {
  totalSales: number;
  transactionCount: number;
  itemsSold: number;
  avgTicket: number;
}
