/**
 * Gestiona Pro - Print Utility
 * Provides isolated, clean printing for Thermal Receipts (80mm/58mm) and Standard A4 Invoices.
 * Uses an isolated iframe to prevent dialog clipping, scroll limits, and backdrop artifacts.
 */

export interface PrintOptions {
  format?: "80mm" | "58mm" | "a4";
  title?: string;
}

export function printReceiptElement(
  element: HTMLElement | null,
  options: PrintOptions = {}
): void {
  if (!element || typeof window === "undefined") return;

  const format = options.format || "80mm";
  const isA4 = format === "a4";
  const is58 = format === "58mm";
  const pageSize = isA4 ? "A4 portrait" : is58 ? "58mm auto" : "80mm auto";
  const pageMargin = isA4 ? "10mm" : "3mm";

  // Create isolated iframe
  const iframe = document.createElement("iframe");
  iframe.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;z-index:-1;");
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback to window.print if iframe fails
    window.print();
    document.body.removeChild(iframe);
    return;
  }

  // Clone element content
  const contentHtml = element.outerHTML;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${options.title || "Gestiona Pro - إيصال"}</title>
  <style>
    @page {
      size: ${pageSize};
      margin: ${pageMargin};
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Noto Naskh Arabic";
      font-size: ${isA4 ? "12px" : "11px"};
      line-height: 1.4;
      direction: rtl;
      text-align: right;
    }
    .print-receipt {
      width: 100% !important;
      max-width: ${isA4 ? "100%" : is58 ? "54mm" : "76mm"} !important;
      margin: 0 auto !important;
      padding: ${isA4 ? "0" : "4px"} !important;
      background: transparent !important;
      box-shadow: none !important;
      border: none !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      vertical-align: top;
    }
    img, svg {
      max-width: 100%;
      height: auto;
    }
    .no-print {
      display: none !important;
    }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`);
  doc.close();

  // Allow styles, fonts and SVG to render before invoking print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        try {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        } catch {
          // ignore
        }
      }, 2000);
    }
  }, 350);
}
