"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

export function LanguageToggle() {
  const { locale, toggleLocale } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 relative"
      onClick={toggleLocale}
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={locale === "ar" ? "English" : "العربية"}
    >
      <Languages className="h-[18px] w-[18px]" />
      <span className="absolute -bottom-0.5 right-0.5 text-[8px] font-bold leading-none">
        {locale === "ar" ? "EN" : "ع"}
      </span>
    </Button>
  );
}
