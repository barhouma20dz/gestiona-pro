"use client";

import { create } from "zustand";
import type { CartItem, Product } from "./types";

/**
 * Returns true when the cart item (or product) is sold by weight (kg).
 */
export function isKgProduct(
  itemOrProduct: CartItem | Product
): boolean {
  return (itemOrProduct as Product).unitType === "kg";
}

/**
 * Detects and parses retail electronic scale barcodes (EAN-13 starting with 20, 21, 28).
 * Format: PPCCCCCWWWWWC
 * - PP: 20 or 21 (weight in grams), 28 (price/weight)
 * - CCCCC: 5-digit product item code
 * - WWWWW: 5-digit weight in grams (e.g. 01500 = 1.500 kg)
 */
export function parseScaleBarcode(code: string): { isScale: boolean; itemCode: string; weightKg: number } | null {
  const clean = code.trim();
  if (clean.length === 13 && /^\d{13}$/.test(clean)) {
    const prefix = clean.substring(0, 2);
    if (prefix === "20" || prefix === "21" || prefix === "28") {
      const itemCode = clean.substring(2, 7);
      const grams = parseInt(clean.substring(7, 12), 10);
      const weightKg = grams / 1000;
      if (weightKg > 0) {
        return { isScale: true, itemCode, weightKg };
      }
    }
  }
  return null;
}

interface CartState {
  items: CartItem[];
  discount: number;
  paymentMethod: "Cash" | "BARIDIMOB" | "CARD" | "CHEQUE" | "CREDIT" | "UPI" | "Card";
  addProduct: (product: Product) => void;
  /**
   * Add a product with an arbitrary quantity (used for kg / weight products).
   * For kg products, `weight` is the weight in kg (e.g. 1.750).
   * For count products, the weight is treated as an integer increment.
   * Merges with existing line if the same product id is already in the cart.
   */
  addWeightedProduct: (product: Product, weight: number) => void;
  addByBarcode: (
    barcode: string,
    products: Product[]
  ) => { product: Product; weightKg?: number } | null;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setDiscount: (amount: number) => void;
  setPaymentMethod: (method: "Cash" | "BARIDIMOB" | "CARD" | "CHEQUE" | "CREDIT" | "UPI" | "Card") => void;
  subtotal: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  paymentMethod: "Cash",

  addProduct: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1 }] };
    }),

  addWeightedProduct: (product, weight) =>
    set((state) => {
      const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
      if (safeWeight <= 0) return state;
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + safeWeight }
              : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity: safeWeight }] };
    }),

  addByBarcode: (barcode, products) => {
    const clean = barcode.trim();
    // 1. Direct barcode match
    let product = products.find(
      (p) => p.barcode.toLowerCase() === clean.toLowerCase()
    );
    if (product) {
      if (isKgProduct(product)) {
        get().addWeightedProduct(product, 1);
        return { product, weightKg: 1 };
      } else {
        get().addProduct(product);
        return { product };
      }
    }

    // 2. Electronic Scale Barcode Match (EAN-13 starting with 20, 21, 28)
    const scale = parseScaleBarcode(clean);
    if (scale) {
      const rawCode = scale.itemCode;
      const strippedCode = String(parseInt(rawCode, 10));
      product = products.find(
        (p) =>
          p.barcode === rawCode ||
          p.barcode === strippedCode ||
          p.barcode === `20${rawCode}` ||
          p.barcode === `21${rawCode}` ||
          p.barcode === `28${rawCode}`
      );
      if (product) {
        get().addWeightedProduct(product, scale.weightKg);
        return { product, weightKg: scale.weightKg };
      }
    }

    return null;
  },

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.product.id !== productId) };
      }
      return {
        items: state.items.map((i) =>
          i.product.id === productId ? { ...i, quantity } : i
        ),
      };
    }),

  clearCart: () => set({ items: [], discount: 0, paymentMethod: "Cash" }),

  setDiscount: (amount) => set({ discount: Math.max(0, amount) }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  subtotal: () =>
    get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
