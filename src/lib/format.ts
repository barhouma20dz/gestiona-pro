// Formatting helpers for Gestiona Pro
// Locale strategy (Algeria):
//  - Numbers: Latin digits, space thousand grouping, comma decimals (fr-DZ style)
//  - Dates: Arabic month/day names with Latin digits (ar-DZ with -u-nu-latn)

const NUMBER_LOCALE = "fr-DZ";
const DATE_LOCALE_AR = "ar-DZ-u-nu-latn";
const DATE_LOCALE_EN = "en-GB";

// Date locale follows the UI language; defaults to Arabic (primary audience).
let currentDateLocale = DATE_LOCALE_AR;

export function setDateFormatLocale(locale: "ar" | "en"): void {
  currentDateLocale = locale === "en" ? DATE_LOCALE_EN : DATE_LOCALE_AR;
}

export function getDateFormatLocale(): string {
  return currentDateLocale;
}

export function formatMoney(amount: number, currency = "دج"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = value.toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatMoneyNumber(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return value.toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format any date/time into strict, unified YYYY/MM/DD (e.g. 2026/10/18)
 * Immune to timezone offset day-shifting.
 */
export function formatDate(input: string | Date | number | null | undefined): string {
  if (!input) return "—";

  if (typeof input === "string") {
    const trimmed = input.trim();
    // Fast match for ISO or standard dates starting with YYYY-MM-DD or YYYY/MM/DD
    const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, "0");
      const day = match[3].padStart(2, "0");
      return `${year}/${month}/${day}`;
    }
  }

  const d = typeof input === "object" && input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "—";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/**
 * Format date & time into strict YYYY/MM/DD HH:mm
 */
export function formatDateTime(input: string | Date | number | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "object" && input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "—";

  const datePart = formatDate(input);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${datePart} ${hours}:${minutes}`;
}

export function formatTime(input: string | Date | number | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "object" && input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "—";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? parts[1][0] ?? "" : "";
  return (first + second).toUpperCase() || "S";
}

// Deterministic pastel color from a string (for product tile accents)
export function colorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 95%)`;
}
