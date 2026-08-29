"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "./types";

export interface HeldOrder {
  id: string;
  label: string;
  items: CartItem[];
  discount: number;
  paymentMethod: "Cash" | "BARIDIMOB" | "CARD" | "CHEQUE" | "CREDIT" | "UPI" | "Card";
  heldAt: number; // epoch ms
}

interface HeldOrdersState {
  orders: HeldOrder[];
  holdOrder: (order: Omit<HeldOrder, "id" | "heldAt" | "label">) => string;
  resumeOrder: (id: string) => HeldOrder | null;
  deleteOrder: (id: string) => void;
  clearAll: () => void;
}

function generateLabel(items: CartItem[]): string {
  if (items.length === 0) return "Empty order";
  if (items.length === 1) return items[0].product.name;
  return `${items[0].product.name} +${items.length - 1} more`;
}

export const useHeldOrdersStore = create<HeldOrdersState>()(
  persist(
    (set, get) => ({
      orders: [],

      holdOrder: (order) => {
        const id = `hold-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        const heldOrder: HeldOrder = {
          id,
          label: generateLabel(order.items),
          items: order.items,
          discount: order.discount,
          paymentMethod: order.paymentMethod,
          heldAt: Date.now(),
        };
        set((state) => ({ orders: [heldOrder, ...state.orders] }));
        return id;
      },

      resumeOrder: (id) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return null;
        // Remove from held list when resumed
        set((state) => ({ orders: state.orders.filter((o) => o.id !== id) }));
        return order;
      },

      deleteOrder: (id) =>
        set((state) => ({ orders: state.orders.filter((o) => o.id !== id) })),

      clearAll: () => set({ orders: [] }),
    }),
    {
      name: "swiftbill-held-orders",
      // Only persist the orders array
      partialize: (state) => ({ orders: state.orders }),
    }
  )
);
