"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Shop, Sale, ReceiptConfig } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useLanguage } from "@/lib/language-context";
import { paymentLabelKey } from "@/lib/payment";

export interface ReceiptProps {
  shop: Shop;
  sale: Sale;
  className?: string;
  size?: "80mm" | "58mm" | "a4";
  showQr?: boolean;
  configOverride?: ReceiptConfig;
}

/**
 * High-Precision POS Receipt & Invoice Component.
 * Supports exact thermal styling matching retail standards:
 * - Clean centered header with store name / INFO, address & phone
 * - Crisp dashed horizontal line dividers
 * - 2-column key-value transaction metadata
 * - 3-column product table (المنتج / الكمية / المبلغ) with @ unit price
 * - Solid subtotal / total divider
 * - Centered high-contrast QR code with custom verification text
 * - Bold customer appreciation footer & POS branding
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  function Receipt(
    { shop, sale, className, size: propSize, showQr: propShowQr, configOverride },
    ref
  ) {
    const { t } = useLanguage();
    const currency = shop.currency || "دج";

    // Merge settings: propOverride > shop.parsedReceiptConfig > shop direct fields > defaults
    const cfg: ReceiptConfig = {
      headerTitle:
        configOverride?.headerTitle ??
        shop.parsedReceiptConfig?.headerTitle ??
        shop.name ??
        "INFO",
      addressLine1:
        configOverride?.addressLine1 ??
        shop.parsedReceiptConfig?.addressLine1 ??
        shop.addressLine1 ??
        "",
      addressLine2:
        configOverride?.addressLine2 ??
        shop.parsedReceiptConfig?.addressLine2 ??
        shop.addressLine2 ??
        "",
      phoneNumber:
        configOverride?.phoneNumber ??
        shop.parsedReceiptConfig?.phoneNumber ??
        shop.phoneNumber ??
        "",
      paperSize:
        propSize ??
        configOverride?.paperSize ??
        shop.parsedReceiptConfig?.paperSize ??
        "80mm",
      showQr:
        propShowQr ??
        configOverride?.showQr ??
        shop.parsedReceiptConfig?.showQr ??
        true,
      qrText:
        configOverride?.qrText ??
        shop.parsedReceiptConfig?.qrText ??
        "مسح إيصال QR",
      showUnitPrice:
        configOverride?.showUnitPrice ??
        shop.parsedReceiptConfig?.showUnitPrice ??
        true,
      showSubtotal:
        configOverride?.showSubtotal ??
        shop.parsedReceiptConfig?.showSubtotal ??
        true,
      showPaymentMethod:
        configOverride?.showPaymentMethod ??
        shop.parsedReceiptConfig?.showPaymentMethod ??
        true,
      showItemCount:
        configOverride?.showItemCount ??
        shop.parsedReceiptConfig?.showItemCount ??
        true,
      showDate:
        configOverride?.showDate ??
        shop.parsedReceiptConfig?.showDate ??
        true,
      showReceiptNo:
        configOverride?.showReceiptNo ??
        shop.parsedReceiptConfig?.showReceiptNo ??
        true,
      showBranding:
        configOverride?.showBranding ??
        shop.parsedReceiptConfig?.showBranding ??
        true,
      footerText:
        configOverride?.footerText ??
        shop.parsedReceiptConfig?.footerText ??
        shop.footerText ??
        "شكراً لزيارتكم – نتشرف بخدمتكم دائماً",
      fontDensity:
        configOverride?.fontDensity ??
        shop.parsedReceiptConfig?.fontDensity ??
        "normal",
    };

    const size = cfg.paperSize || "80mm";

    // Digital receipt QR verification payload
    const qrData = `gestiona://receipt/${sale.id}?no=${encodeURIComponent(
      sale.receiptNo
    )}&total=${sale.total.toFixed(2)}&items=${sale.itemCount}&date=${encodeURIComponent(
      sale.createdAt
    )}`;

    // --------------------------------------------------------------------------
    // A4 Standard Commercial Invoice Layout (for Canon LBP6020 / Laser / Desktop)
    // --------------------------------------------------------------------------
    if (size === "a4") {
      return (
        <div
          ref={ref}
          dir="rtl"
          className={`print-receipt mx-auto bg-white p-8 text-black font-sans leading-normal ${className ?? ""}`}
          style={{ width: "100%", maxWidth: "210mm", minHeight: "297mm", boxSizing: "border-box" }}
        >
          {/* Top Header Bar */}
          <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-5 mb-6">
            <div className="flex items-center gap-4">
              {shop.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={shop.logoUrl}
                  alt={cfg.headerTitle || "Logo"}
                  className="h-16 w-16 object-contain rounded-md border p-1"
                />
              )}
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-emerald-900 tracking-tight">
                  {cfg.headerTitle || "متجرنا"}
                </h1>
                {cfg.addressLine1 && (
                  <p className="text-xs text-gray-700">{cfg.addressLine1}</p>
                )}
                {cfg.addressLine2 && (
                  <p className="text-xs text-gray-700">{cfg.addressLine2}</p>
                )}
                {cfg.phoneNumber && (
                  <p className="text-xs font-semibold text-gray-800">
                    رقم الهاتف: {cfg.phoneNumber}
                  </p>
                )}
              </div>
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
            <div className="flex-1 space-y-3">
              {cfg.showQr && (
                <div className="flex items-center gap-3">
                  <div className="rounded border border-gray-200 p-1.5 bg-white">
                    <QRCodeSVG value={qrData} size={70} level="M" />
                  </div>
                  <div className="text-[11px] text-gray-500 leading-relaxed">
                    <p className="font-semibold text-gray-700">{cfg.qrText || "رمز التحقق الرقمي"}</p>
                    <p>امسح الرمز للتحقق من صحة الفاتورة</p>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-gray-600 font-semibold">
                {cfg.footerText}
              </p>
            </div>

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
                  <span className="text-gray-600">الضريبة:</span>
                  <span className="font-bold tabular-nums text-gray-900">
                    {formatMoney(sale.taxAmount, currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between px-3 py-2.5 bg-emerald-50 text-emerald-950 font-bold text-sm">
                <span>الإجمالي الكلي:</span>
                <span className="tabular-nums text-emerald-800">
                  {formatMoney(sale.total, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200 text-xs">
            <div className="text-center">
              <p className="font-bold text-gray-700 mb-14">ختم وتوقيع المحل</p>
              <div className="mx-auto w-36 border-b border-dashed border-gray-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-700 mb-14">توقيع العميل</p>
              <div className="mx-auto w-36 border-b border-dashed border-gray-400" />
            </div>
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // Thermal Receipt Layout (80mm & 58mm POS Rolls)
    // Pixel-perfect match for the user's uploaded thermal receipt template
    // --------------------------------------------------------------------------
    const is58 = size === "58mm";
    const width = is58 ? 230 : 295;
    const padding = is58 ? "p-3" : "p-4";
    const isCompact = cfg.fontDensity === "compact";

    return (
      <div
        ref={ref}
        dir="rtl"
        className={`print-receipt mx-auto bg-white ${padding} text-black font-sans leading-relaxed shadow-sm ${className ?? ""}`}
        style={{
          width: `${width}px`,
          maxWidth: "100%",
          boxSizing: "border-box",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Noto Naskh Arabic", sans-serif',
        }}
      >
        {/* ========================================================
            1. STORE HEADER (INFO / Address / Phone)
            ======================================================== */}
        <div className="text-center space-y-1 mb-2">
          {shop.logoUrl && (
            <div className="flex justify-center mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shop.logoUrl}
                alt={cfg.headerTitle || "Logo"}
                className="h-10 w-auto max-w-[120px] object-contain grayscale"
              />
            </div>
          )}
          {/* Header Title (e.g. INFO) */}
          <h1 className="text-[17px] font-black tracking-wider text-black uppercase">
            {cfg.headerTitle || "INFO"}
          </h1>

          {/* Address Line 1 */}
          {cfg.addressLine1 && (
            <p className="text-[12px] text-black font-medium leading-tight">
              {cfg.addressLine1}
            </p>
          )}

          {/* Address Line 2 / City */}
          {cfg.addressLine2 && (
            <p className="text-[12px] text-black font-medium leading-tight">
              {cfg.addressLine2}
            </p>
          )}

          {/* Phone Number */}
          {cfg.phoneNumber && (
            <p className="text-[12px] font-bold text-black pt-0.5">
              <span>رقم الهاتف: </span>
              <span dir="ltr" className="font-bold inline-block">
                {cfg.phoneNumber}
              </span>
            </p>
          )}
        </div>

        {/* Dashed Separator */}
        <div className="my-2 border-t border-dashed border-neutral-400" />

        {/* ========================================================
            2. TRANSACTION METADATA (Key-Value)
            ======================================================== */}
        <div className={`space-y-1 text-[12px] ${isCompact ? "leading-tight" : "leading-normal"}`}>
          {cfg.showReceiptNo && (
            <div className="flex justify-between items-center">
              <span className="text-neutral-800">الإيصال:</span>
              <span className="font-extrabold text-black font-mono tracking-tight">
                {sale.receiptNo}
              </span>
            </div>
          )}

          {cfg.showDate && (
            <div className="flex justify-between items-center">
              <span className="text-neutral-800">التاريخ:</span>
              <span className="font-normal text-black">
                {formatDateTime(sale.createdAt)}
              </span>
            </div>
          )}

          {cfg.showPaymentMethod && (
            <div className="flex justify-between items-center">
              <span className="text-neutral-800">الدفع:</span>
              <span className="font-semibold text-black">
                {t(paymentLabelKey(sale.paymentMethod))}
              </span>
            </div>
          )}

          {cfg.showItemCount && (
            <div className="flex justify-between items-center">
              <span className="text-neutral-800">العناصر:</span>
              <span className="font-extrabold text-black">
                {sale.itemCount}
              </span>
            </div>
          )}
        </div>

        {/* Dashed Separator */}
        <div className="my-2 border-t border-dashed border-neutral-400" />

        {/* ========================================================
            3. ITEMS TABLE (المنتج / الكمية / المبلغ)
            ======================================================== */}
        <div className="w-full text-[12px]">
          {/* Table Header */}
          <div className="flex justify-between items-center font-bold text-black pb-1.5 border-b border-transparent">
            <span className="text-right flex-1">المنتج</span>
            <span className="text-center w-16">الكمية</span>
            <span className="text-left w-20">المبلغ</span>
          </div>

          {/* Table Rows */}
          <div className="space-y-2 pt-1">
            {sale.items.map((it, idx) => (
              <div key={it.id || idx} className="space-y-0.5">
                <div className="flex justify-between items-baseline">
                  {/* Product Name */}
                  <span className="font-semibold text-black flex-1 text-right break-words pl-1">
                    {it.productName}
                  </span>

                  {/* Quantity */}
                  <span className="text-center w-16 tabular-nums font-medium text-neutral-800">
                    x{it.quantity}
                  </span>

                  {/* Line Total */}
                  <span className="text-left w-20 tabular-nums font-bold text-black">
                    {formatMoney(it.total, currency)}
                  </span>
                </div>

                {/* Unit Price (e.g. @ 25,00 دج) */}
                {cfg.showUnitPrice && (
                  <div className="text-right text-[11px] text-neutral-600 pr-1">
                    @ {formatMoney(it.unitPrice, currency)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dashed Separator */}
        <div className="my-2 border-t border-dashed border-neutral-400" />

        {/* ========================================================
            4. TOTALS (المجموع الفرعي / الإجمالي)
            ======================================================== */}
        <div className="space-y-1.5 text-[12px]">
          {cfg.showSubtotal && (
            <div className="flex justify-between items-center text-neutral-800">
              <span className="font-medium">المجموع الفرعي:</span>
              <span className="tabular-nums font-semibold text-black">
                {formatMoney(sale.subtotal, currency)}
              </span>
            </div>
          )}

          {sale.discount > 0 && (
            <div className="flex justify-between items-center text-red-600">
              <span className="font-medium">الخصم:</span>
              <span className="tabular-nums font-semibold">
                - {formatMoney(sale.discount, currency)}
              </span>
            </div>
          )}

          {sale.taxAmount > 0 && (
            <div className="flex justify-between items-center text-neutral-800">
              <span className="font-medium">الضريبة:</span>
              <span className="tabular-nums font-semibold text-black">
                {formatMoney(sale.taxAmount, currency)}
              </span>
            </div>
          )}

          {/* Solid line divider for Grand Total */}
          <div className="pt-1 border-t border-neutral-800" />

          {/* Grand Total */}
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-[15px] font-black text-black">الإجمالي:</span>
            <span className="text-[15px] font-black text-black tabular-nums">
              {formatMoney(sale.total, currency)}
            </span>
          </div>
        </div>

        {/* Dashed Separator */}
        <div className="my-2 border-t border-dashed border-neutral-400" />

        {/* ========================================================
            5. QR CODE & VERIFICATION
            ======================================================== */}
        {cfg.showQr && (
          <div className="flex flex-col items-center justify-center pt-1 pb-1">
            <div className="bg-white p-1 rounded">
              <QRCodeSVG
                value={qrData}
                size={is58 ? 85 : 105}
                level="M"
                includeMargin={false}
              />
            </div>
            {cfg.qrText && (
              <p className="mt-1 text-center text-[10px] font-medium text-neutral-600">
                {cfg.qrText}
              </p>
            )}
          </div>
        )}

        {/* ========================================================
            6. FOOTER & BRANDING
            ======================================================== */}
        <div className="text-center pt-2 space-y-1">
          {cfg.footerText && (
            <p className="text-[12px] font-bold text-black leading-snug">
              {cfg.footerText}
            </p>
          )}

          {cfg.showBranding && (
            <p className="text-[9px] text-neutral-500 font-mono tracking-wide pt-0.5">
              Gestiona Pro POS
            </p>
          )}
        </div>
      </div>
    );
  }
);
