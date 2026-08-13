"use client";

import { create } from "zustand";
import type { CartItem, Product } from "./types";

interface CartState {
  items: CartItem[];
  discount: number;
  paymentMethod: "Cash" | "UPI" | "Card";
  addProduct: (product: Product) => void;
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

  addByBarcode: (barcode, products) => {
    const product = products.find(
      (p) => p.barcode.toLowerCase() === barcode.trim().toLowerCase()
    );
    if (!product) return false;
    get().addProduct(product);
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
