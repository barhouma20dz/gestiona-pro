"use client";

import { forwardRef } from "react";
import type { Shop, Sale } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/format";

interface ReceiptProps {
  shop: Shop;
  sale: Sale;
  className?: string;
}

/**
 * Print-optimized thermal-style receipt (80mm).
 * Use `window.print()` to print — CSS hides everything except `.print-receipt`.
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  function Receipt({ shop, sale, className }, ref) {
    const currency = shop.currency || "₹";
    return (
      <div
        ref={ref}
        className={`print-receipt mx-auto w-[300px] bg-white p-5 font-mono text-[12px] leading-relaxed text-black ${className ?? ""}`}
      >
        {/* Header */}
        <div className="text-center">
          <p className="text-base font-bold uppercase tracking-wide">
            {shop.name || "My Store"}
          </p>
          {shop.addressLine1 && <p>{shop.addressLine1}</p>}
          {shop.addressLine2 && <p>{shop.addressLine2}</p>}
          {shop.phoneNumber && <p>Ph: {shop.phoneNumber}</p>}
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        <div className="flex justify-between">
          <span>Receipt: {sale.receiptNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Date: {formatDateTime(sale.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Pay: {sale.paymentMethod}</span>
          <span>Items: {sale.itemCount}</span>
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        {/* Items */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2">
          <span className="font-bold">Item</span>
          <span className="text-right font-bold">Qty</span>
          <span className="text-right font-bold">Amount</span>
          {sale.items.map((it) => (
            <div key={it.id} className="contents">
              <span className="break-words">{it.productName}</span>
              <span className="text-right">x{it.quantity}</span>
              <span className="text-right">
                {formatMoney(it.total, currency)}
              </span>
              <span className="col-span-3 text-right text-[10px] text-black/60">
                @ {formatMoney(it.unitPrice, currency)} each
              </span>
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        {/* Totals */}
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(sale.subtotal, currency)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>- {formatMoney(sale.discount, currency)}</span>
          </div>
        )}
        {sale.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatMoney(sale.taxAmount, currency)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-black/40 pt-1 text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatMoney(sale.total, currency)}</span>
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        {/* Footer */}
        <div className="text-center">
          <p>{shop.footerText || "Thank you!"}</p>
          <p className="mt-1 text-[10px] text-black/50">
            Powered by SwiftBill POS
          </p>
        </div>
      </div>
    );
  }
);
