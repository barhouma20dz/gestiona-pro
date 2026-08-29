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

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(currentDateLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(currentDateLocale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(currentDateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
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
