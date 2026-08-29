"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations, type Locale, type TranslationKey } from "./i18n";
import { setDateFormatLocale } from "./format";

interface LanguageContextValue {
  locale: Locale;
  isRTL: boolean;
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "swiftbill-locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Arabic since the user requested Arabic.
  // Lazily read the saved locale from localStorage on the client (avoids
  // the setState-in-effect pattern that triggers cascading renders).
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "ar";
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "ar" || saved === "en") {
        return saved;
      }
    } catch {
      // localStorage not available — use default (ar)
    }
    return "ar";
  });

  // Update <html> dir + lang attributes when locale changes
  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
    // Keep date formatting (format.ts) in sync with the UI language
    setDateFormatLocale(locale);
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === "ar" ? "en" : "ar";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey) => {
      return translations[locale][key] ?? translations.en[key] ?? key;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider
      value={{ locale, isRTL: locale === "ar", t, setLocale, toggleLocale }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
