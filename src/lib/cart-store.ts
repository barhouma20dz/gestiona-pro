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

interface CartState {
  items: CartItem[];
  discount: number;
  paymentMethod: "Cash" | "UPI" | "Card";
  addProduct: (product: Product) => void;
  /**
   * Add a product with an arbitrary quantity (used for kg / weight products).
   * For kg products, `weight` is the weight in kg (e.g. 1.750).
   * For count products, the weight is treated as an integer increment.
   * Merges with existing line if the same product id is already in the cart.
   */
  addWeightedProduct: (product: Product, weight: number) => void;
  addByBarcode: (barcode: string, products: Product[]) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setDiscount: (amount: number) => void;
  setPaymentMethod: (method: "Cash" | "UPI" | "Card") => void;
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
    const product = products.find(
      (p) => p.barcode.toLowerCase() === barcode.trim().toLowerCase()
    );
    if (!product) return false;
    // Count products add 1 piece; kg products need a weight dialog in the UI,
    // but for barcode-driven flow we add 1 kg by default.
    if (isKgProduct(product)) {
      get().addWeightedProduct(product, 1);
    } else {
      get().addProduct(product);
    }
    return true;
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
