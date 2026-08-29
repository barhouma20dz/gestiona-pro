// Payment method helpers — single source of truth for DZ payment methods
// Stored values: "Cash" | "BARIDIMOB" | "CARD" | "CHEQUE" (+ legacy "UPI"/"Card")
import type { TranslationKey } from "./i18n";

export function paymentLabelKey(method: string): TranslationKey {
  const m = (method || "Cash").toLowerCase();
  if (m === "baridimob" || m === "upi") return "baridimob";
  if (m === "card") return "card";
  if (m === "cheque") return "cheque";
  return "cash";
}

export const SALE_PAYMENT_METHODS = [
  "Cash",
  "BARIDIMOB",
  "CARD",
  "CHEQUE",
] as const;

export type SalePaymentMethod = (typeof SALE_PAYMENT_METHODS)[number];
