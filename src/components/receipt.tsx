"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Shop, Sale } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useLanguage } from "@/lib/language-context";
import { paymentLabelKey } from "@/lib/payment";

export interface ReceiptProps {
  shop: Shop;
  sale: Sale;
  className?: string;
  size?: "80mm" | "58mm" | "a4";
  showQr?: boolean;
}

/**
 * Print-optimized Receipt & Invoice Component.
 * Supports:
 * - "80mm": Standard POS thermal roll (default)
 * - "58mm": Compact POS thermal roll
 * - "a4": Full A4 standard commercial invoice (for laser printers like Canon LBP6020)
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  function Receipt({ shop, sale, className, size = "80mm", showQr = true }, ref) {
    const { t } = useLanguage();
    const currency = shop.currency || "دج";

    // Digital receipt QR payload
    const qrData = `gestiona://receipt/${sale.id}?no=${encodeURIComponent(
      sale.receiptNo
    )}&total=${sale.total.toFixed(2)}&items=${sale.itemCount}&date=${encodeURIComponent(sale.createdAt)}`;

    // --------------------------------------------------------------------------
    // A4 Standard Commercial Invoice Layout (for Canon LBP6020 / Laser / Desktop)
    // --------------------------------------------------------------------------
    if (size === "a4") {
      return (
        <div
          ref={ref}
          className={`print-receipt mx-auto bg-white p-8 text-black font-sans leading-normal ${className ?? ""}`}
          style={{ width: "100%", maxWidth: "210mm", minHeight: "297mm", boxSizing: "border-box" }}
        >
          {/* Top Header Bar */}
          <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-5 mb-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-emerald-900 tracking-tight">
                {shop.name || "متجرنا"}
              </h1>
              {shop.addressLine1 && (
                <p className="text-xs text-gray-700">{shop.addressLine1}</p>
              )}
              {shop.addressLine2 && (
                <p className="text-xs text-gray-700">{shop.addressLine2}</p>
              )}
              {shop.phoneNumber && (
                <p className="text-xs font-semibold text-gray-800">
                  {t("phoneNumber")}: {shop.phoneNumber}
                </p>
              )}
            </div>

            <div className="text-left space-y-1">
              <div className="inline-block rounded bg-emerald-800 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                فاتورة بيع / FACTURE
              </div>
              <p className="text-sm font-bold text-gray-900 mt-1">
                رقم الفاتورة: <span className="font-mono text-emerald-800">{sale.receiptNo}</span>
              </p>
              <p className="text-xs text-gray-600">
                التاريخ: {formatDateTime(sale.createdAt)}
              </p>
              <p className="text-xs text-gray-600">
                طريقة الدفع: <span className="font-semibold text-gray-800">{t(paymentLabelKey(sale.paymentMethod))}</span>
              </p>
            </div>
          </div>

          {/* Customer / Transaction Meta */}
          <div className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 bg-gray-50/70 p-3 mb-6 text-xs">
            <div>
              <span className="text-gray-500 font-medium">العميل / Client:</span>
              <p className="font-bold text-gray-800 mt-0.5">زبون عادي (Comptoir)</p>
            </div>
            <div className="text-left">
              <span className="text-gray-500 font-medium">حالة الدفع / Statut:</span>
              <p className="font-bold text-emerald-700 mt-0.5">مدفوعة بالكامل (Payée)</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6 overflow-hidden rounded border border-gray-300">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-800 border-b border-gray-300">
                  <th className="py-2.5 px-3 text-right font-bold w-12">#</th>
                  <th className="py-2.5 px-3 text-right font-bold">البيان / الصنف (Désignation)</th>
                  <th className="py-2.5 px-3 text-center font-bold w-24">السعر الفردي</th>
                  <th className="py-2.5 px-3 text-center font-bold w-20">الكمية</th>
                  <th className="py-2.5 px-3 text-left font-bold w-28">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sale.items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 text-gray-500 text-right">{idx + 1}</td>
                    <td className="py-2 px-3 font-medium text-gray-900">{it.productName}</td>
                    <td className="py-2 px-3 text-center tabular-nums text-gray-700">
                      {formatMoney(it.unitPrice, currency)}
                    </td>
                    <td className="py-2 px-3 text-center tabular-nums font-semibold text-gray-800">
                      {it.quantity}
                    </td>
                    <td className="py-2 px-3 text-left tabular-nums font-bold text-gray-900">
                      {formatMoney(it.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-between items-start gap-6 mb-8">
            {/* Legal text & QR code */}
            <div className="flex-1 space-y-3">
              {showQr && (
                <div className="flex items-center gap-3">
                  <div className="rounded border border-gray-200 p-1.5 bg-white">
                    <QRCodeSVG value={qrData} size={70} level="M" />
                  </div>
                  <div className="text-[11px] text-gray-500 leading-relaxed">
                    <p className="font-semibold text-gray-700">رمز التحقق الرقمي</p>
                    <p>امسح الرمز للتحقق من صحة الفاتورة</p>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-gray-500 italic">
                {shop.footerText || "شكراً لتعاملكم معنا - يرجى الاحتفاظ بهذه الفاتورة"}
              </p>
            </div>

            {/* Calculations Box */}
            <div className="w-72 rounded border border-gray-300 overflow-hidden text-xs">
              <div className="flex justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-gray-600">المجموع الفرعي:</span>
                <span className="font-bold tabular-nums text-gray-900">
                  {formatMoney(sale.subtotal, currency)}
                </span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between px-3 py-2 border-b border-gray-200 bg-red-50/40 text-red-700">
                  <span>الخصم الممنوح:</span>
                  <span className="font-bold tabular-nums">
                    - {formatMoney(sale.discount, currency)}
                  </span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div className="flex justify-between px-3 py-2 border-b border-gray-200">
                  <span className="text-gray-600">الضريبة / الرسم:</span>
                  <span className="font-bold tabular-nums text-gray-900">
                    {formatMoney(sale.taxAmount, currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between px-3 py-2.5 bg-emerald-50 text-emerald-950 font-bold text-sm">
                <span>الإجمالي الكلي (TTC):</span>
                <span className="tabular-nums text-emerald-800">
                  {formatMoney(sale.total, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Stamp and Signature Box */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200 text-xs">
            <div className="text-center">
              <p className="font-bold text-gray-700 mb-14">ختم وتوقيع المحل / Cachet</p>
              <div className="mx-auto w-36 border-b border-dashed border-gray-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-700 mb-14">توقيع العميل / Signature Client</p>
              <div className="mx-auto w-36 border-b border-dashed border-gray-400" />
            </div>
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // Thermal Receipt Layout (80mm & 58mm POS Rolls)
    // --------------------------------------------------------------------------
    const is58 = size === "58mm";
    const width = is58 ? 220 : 290;
    const padding = is58 ? "p-3" : "p-4";
    const fontBase = is58 ? "text-[11px]" : "text-[12px]";
    const titleSize = is58 ? "text-sm" : "text-base";

    return (
      <div
        ref={ref}
        className={`print-receipt mx-auto bg-white ${padding} font-mono ${fontBase} leading-relaxed text-black shadow-sm ${className ?? ""}`}
        style={{ width: `${width}px`, maxWidth: "100%", boxSizing: "border-box" }}
      >
        {/* Header */}
        <div className="text-center space-y-0.5">
          <p className={`${titleSize} font-bold uppercase tracking-wide text-gray-900`}>
            {shop.name || "Gestiona Pro"}
          </p>
          {shop.addressLine1 && <p className="text-[11px] text-gray-700">{shop.addressLine1}</p>}
          {shop.addressLine2 && <p className="text-[11px] text-gray-700">{shop.addressLine2}</p>}
          {shop.phoneNumber && (
            <p className="text-[11px] font-semibold text-gray-800">
              {t("phoneNumber")}: {shop.phoneNumber}
            </p>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        <div className="flex justify-between text-[11px]">
          <span>{t("receipt")}:</span>
          <span className="font-bold">{sale.receiptNo}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span>{t("date")}:</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span>{t("payment")}:</span>
          <span>{t(paymentLabelKey(sale.paymentMethod))}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span>{t("items")}:</span>
          <span className="font-bold">{sale.itemCount}</span>
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        {/* Items list */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 text-[11px]">
          <span className="font-bold">{t("product")}</span>
          <span className="text-center font-bold px-1">{t("qty")}</span>
          <span className="text-left font-bold">{t("amount")}</span>
          {sale.items.map((it, idx) => (
            <div key={it.id || idx} className="contents">
              <span className="break-words py-0.5 font-medium">{it.productName}</span>
              <span className="text-center py-0.5 tabular-nums">x{it.quantity}</span>
              <span className="text-left py-0.5 tabular-nums font-bold">
                {formatMoney(it.total, currency)}
              </span>
              <span className="col-span-3 text-left text-[10px] text-black/60 pb-1">
                @ {formatMoney(it.unitPrice, currency)}
              </span>
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        {/* Totals */}
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>{t("subtotal")}:</span>
            <span className="tabular-nums">{formatMoney(sale.subtotal, currency)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>{t("discount")}:</span>
              <span className="tabular-nums">- {formatMoney(sale.discount, currency)}</span>
            </div>
          )}
          {sale.taxAmount > 0 && (
            <div className="flex justify-between">
              <span>{t("tax")}:</span>
              <span className="tabular-nums">{formatMoney(sale.taxAmount, currency)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-black/40 pt-1 text-sm font-bold">
            <span>{t("total")}:</span>
            <span className="tabular-nums">{formatMoney(sale.total, currency)}</span>
          </div>
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        {/* QR code */}
        {showQr && (
          <div className="flex flex-col items-center gap-1 pb-1 pt-0.5">
            <div className="rounded bg-white p-1">
              <QRCodeSVG
                value={qrData}
                size={is58 ? 68 : 80}
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
        <div className="text-center pt-1 space-y-0.5">
          <p className="text-[11px] font-semibold">{shop.footerText || "شكراً لزيارتكم!"}</p>
          <p className="text-[9px] text-black/50">Gestiona Pro POS</p>
        </div>
      </div>
    );
  }
);
