"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Shop, Sale } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useLanguage } from "@/lib/language-context";
import { paymentLabelKey } from "@/lib/payment";

interface ReceiptProps {
  shop: Shop;
  sale: Sale;
  className?: string;
  size?: "80mm" | "58mm";
  showQr?: boolean;
}

/**
 * Print-optimized thermal-style receipt.
 * Supports 80mm (default) and 58mm paper widths.
 * Optionally renders a QR code linking to a digital receipt payload.
 * Use `window.print()` to print — CSS hides everything except `.print-receipt`.
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  function Receipt({ shop, sale, className, size = "80mm", showQr = true }, ref) {
    const { t } = useLanguage();
    const currency = shop.currency || "دج";
    const is58 = size === "58mm";
    const width = is58 ? 220 : 300;
    const padding = is58 ? "p-4" : "p-5";
    const fontBase = is58 ? "text-[11px]" : "text-[12px]";
    const titleSize = is58 ? "text-sm" : "text-base";

    // Digital receipt QR payload — encodes receipt summary as a URL fragment
    const qrData = `swiftbill://receipt/${sale.id}?no=${encodeURIComponent(
      sale.receiptNo
    )}&total=${sale.total.toFixed(2)}&items=${sale.itemCount}`;

    return (
      <div
        ref={ref}
        className={`print-receipt mx-auto bg-white ${padding} font-mono ${fontBase} leading-relaxed text-black ${className ?? ""}`}
        style={{ width: `${width}px` }}
      >
        {/* Header */}
        <div className="text-center">
          <p className={`${titleSize} font-bold uppercase tracking-wide`}>
            {shop.name || "My Store"}
          </p>
          {shop.addressLine1 && <p>{shop.addressLine1}</p>}
          {shop.addressLine2 && <p>{shop.addressLine2}</p>}
          {shop.phoneNumber && <p>{t("phoneNumber")}: {shop.phoneNumber}</p>}
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        <div className="flex justify-between">
          <span>{t("receipt")}: {sale.receiptNo}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("date")}: {formatDateTime(sale.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("payment")}: {t(paymentLabelKey(sale.paymentMethod))}</span>
          <span>{t("items")}: {sale.itemCount}</span>
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        {/* Items */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2">
          <span className="font-bold">{t("product")}</span>
          <span className="text-right font-bold">{t("qty")}</span>
          <span className="text-right font-bold">{t("amount")}</span>
          {sale.items.map((it) => (
            <div key={it.id} className="contents">
              <span className="break-words">{it.productName}</span>
              <span className="text-right">x{it.quantity}</span>
              <span className="text-right">
                {formatMoney(it.total, currency)}
              </span>
              <span className="col-span-3 text-right text-[10px] text-black/60">
                @ {formatMoney(it.unitPrice, currency)}
              </span>
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        {/* Totals */}
        <div className="flex justify-between">
          <span>{t("subtotal")}</span>
          <span>{formatMoney(sale.subtotal, currency)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span>{t("discount")}</span>
            <span>- {formatMoney(sale.discount, currency)}</span>
          </div>
        )}
        {sale.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>{t("tax")}</span>
            <span>{formatMoney(sale.taxAmount, currency)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-black/40 pt-1 text-sm font-bold">
          <span>{t("total")}</span>
          <span>{formatMoney(sale.total, currency)}</span>
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        {/* QR code (digital receipt) */}
        {showQr && (
          <div className="flex flex-col items-center gap-1 pb-2">
            <div className="rounded bg-white p-1">
              <QRCodeSVG
                value={qrData}
                size={is58 ? 72 : 84}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-center text-[9px] text-black/60">
              {t("scanReceiptQR")}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p>{shop.footerText || "شكراً لزيارتكم!"}</p>
          <p className="mt-1 text-[10px] text-black/50">
            Gestiona Pro POS
          </p>
        </div>
      </div>
    );
  }
);
