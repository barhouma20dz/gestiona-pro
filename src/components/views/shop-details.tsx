"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Save, Store, Info, Receipt } from "lucide-react";
import { toast } from "sonner";

import { shopApi } from "@/lib/api";
import { formatMoney, initialsOf } from "@/lib/format";
import type { Shop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const FOOTER_MAX = 80;

const CURRENCY_OPTIONS = ["دج", "$", "€", "£", "¥"];

interface FormState {
  name: string;
  addressLine1: string;
  addressLine2: string;
  phoneNumber: string;
  ripNumber: string;
  footerText: string;
  currency: string;
  taxRate: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  phoneNumber: "",
  ripNumber: "",
  footerText: "",
  currency: "دج",
  taxRate: 0,
};

function toForm(shop: Shop): FormState {
  return {
    name: shop.name ?? "",
    addressLine1: shop.addressLine1 ?? "",
    addressLine2: shop.addressLine2 ?? "",
    phoneNumber: shop.phoneNumber ?? "",
    ripNumber: shop.ripNumber ?? "",
    footerText: shop.footerText ?? "",
    currency: shop.currency || "دج",
    taxRate: shop.taxRate ?? 0,
  };
}

export function ShopDetails() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [syncedShopId, setSyncedShopId] = useState<string | null>(null);

  // Sync from server when the loaded shop changes (React-recommended pattern:
  // adjust state during render rather than in an effect).
  if (shop && shop.id !== syncedShopId) {
    setSyncedShopId(shop.id);
    setForm(toForm(shop));
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: (data: Partial<Shop>) => shopApi.update(data),
    onSuccess: () => {
      toast.success(t("shopDetailsSaved"));
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to save shop details";
      toast.error(msg);
    },
  });

  const canSave =
    form.name.trim().length > 0 && form.addressLine1.trim().length > 0;

  const handleSave = () => {
    if (!canSave) {
      toast.error(t("shopNameAddressRequired"));
      return;
    }
    const tax = Math.min(100, Math.max(0, Number(form.taxRate) || 0));
    mutation.mutate({
      name: form.name.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      phoneNumber: form.phoneNumber.trim(),
      ripNumber: form.ripNumber.trim(),
      footerText: form.footerText.slice(0, FOOTER_MAX),
      currency: form.currency || "دج",
      taxRate: tax,
    });
  };

  const footerCount = form.footerText.length;

  if (isLoading || !shop) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient page header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/20 text-2xl font-bold backdrop-blur">
            {initialsOf(shop?.name ?? "S")}
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
              {shop?.name ?? t("businessInfo")}
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {t("theseDetailsAppear")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                {t("shopProfile")}
              </CardTitle>
              <CardDescription>
                {t("updateReceiptDetails")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("shopName")} required>
                  <Input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="SwiftMart Grocery"
                  />
                </Field>

                <Field label={t("phoneNumber")}>
                  <Input
                    value={form.phoneNumber}
                    onChange={(e) => update("phoneNumber", e.target.value)}
                    placeholder="+91 98765 43210"
                    inputMode="tel"
                  />
                </Field>

                <Field label={t("addressLine1")} required>
                  <Input
                    value={form.addressLine1}
                    onChange={(e) => update("addressLine1", e.target.value)}
                    placeholder="123 Market Street"
                  />
                </Field>

                <Field label={t("addressLine2")}>
                  <Input
                    value={form.addressLine2}
                    onChange={(e) => update("addressLine2", e.target.value)}
                    placeholder="Near City Mall (optional)"
                  />
                </Field>

                <Field
                  label={t("upiId")}
                  hint={t("upiHint")}
                >
                  <Input
                    value={form.ripNumber}
                    onChange={(e) => update("ripNumber", e.target.value)}
                    placeholder="00799999 0000000000 00"
                  />
                </Field>

                <Field label={t("currencySymbol")}>
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.currency}
                      onChange={(e) => update("currency", e.target.value.slice(0, 3))}
                      className="w-20 text-center font-mono text-base"
                      maxLength={3}
                    />
                    <div className="flex flex-wrap gap-1">
                      {CURRENCY_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => update("currency", c)}
                          className={cn(
                            "grid h-8 min-w-8 place-items-center rounded-md border px-2 font-mono text-sm transition",
                            form.currency === c
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background hover:bg-accent"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </Field>

                <Field
                  label={t("taxRate")}
                  hint={t("taxRateHint")}
                >
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={Number.isFinite(form.taxRate) ? form.taxRate : 0}
                    onChange={(e) =>
                      update("taxRate", Number(e.target.value) || 0)
                    }
                    className="w-32"
                  />
                </Field>
              </div>

              <Field label={t("receiptFooter")}>
                <Textarea
                  value={form.footerText}
                  onChange={(e) =>
                    update("footerText", e.target.value.slice(0, FOOTER_MAX))
                  }
                  maxLength={FOOTER_MAX}
                  placeholder="Thank you, visit again!"
                  rows={2}
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {footerCount} / {FOOTER_MAX}
                </div>
              </Field>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!canSave || mutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("saveDetails")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live receipt preview */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="lg:sticky lg:top-4 lg:self-start"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Receipt className="h-4 w-4 text-primary" />
            {t("liveReceiptPreview")}
          </div>

          <ReceiptPreview form={form} t={t} />
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && (
        <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}

function ReceiptPreview({ form, t }: { form: FormState; t: (k: "shopName" | "ph" | "upi" | "subtotal" | "tax" | "totalLabel" | "thankYouFooter") => string }) {
  const cur = form.currency || "دج";
  const dummySubtotal = 120;
  const tax = useMemo(() => {
    const rate = Number.isFinite(form.taxRate) ? form.taxRate : 0;
    const t = (dummySubtotal * Math.max(0, Math.min(100, rate))) / 100;
    return Math.round(t * 100) / 100;
  }, [form.taxRate]);
  const total = dummySubtotal + tax;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-md">
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 font-mono text-[12px] leading-relaxed text-neutral-800">
        <div className="text-center">
          {form.name ? (
            <p className="text-[15px] font-bold uppercase tracking-tight">
              {form.name}
            </p>
          ) : (
            <p className="text-[15px] font-bold uppercase text-neutral-400">
              {t("shopName")}
            </p>
          )}
          {form.addressLine1 && <p>{form.addressLine1}</p>}
          {form.addressLine2 && <p>{form.addressLine2}</p>}
          {form.phoneNumber && <p>{t("ph")}: {form.phoneNumber}</p>}
          {form.ripNumber && <p className="text-[11px] text-neutral-500">{t("upi")}: {form.ripNumber}</p>}
        </div>

        <DashedDivider />

        <div className="space-y-1">
          <Row left="Coca-Cola 750ml" right={`x1  ${formatMoney(45, cur)}`} />
          <Row left="Amul Butter 500g" right={`x1  ${formatMoney(75, cur)}`} />
        </div>

        <DashedDivider />

        <div className="space-y-1">
          <Row left={t("subtotal")} right={formatMoney(dummySubtotal, cur)} />
          <Row
            left={`${t("tax")} (${form.taxRate || 0}%)`}
            right={formatMoney(tax, cur)}
          />
          <Row
            left={t("totalLabel")}
            right={formatMoney(total, cur)}
            bold
          />
        </div>

        <DashedDivider />

        <p className="text-center text-[11px] text-neutral-600">
          {form.footerText || t("thankYouFooter")}
        </p>

        <div className="mt-2 flex justify-center gap-[2px]">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="h-3 w-[2px] bg-neutral-900"
              aria-hidden
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-primary">
          <Store className="h-3 w-3" />
        </span>
        <span>{initialsOf(form.name || "Shop")}</span>
      </div>
    </div>
  );
}

function Row({
  left,
  right,
  bold,
}: {
  left: string;
  right: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={cn("truncate", bold && "font-bold")}>{left}</span>
      <span className={cn("whitespace-nowrap", bold && "font-bold")}>{right}</span>
    </div>
  );
}

function DashedDivider() {
  return (
    <div className="my-2 border-t border-dashed border-neutral-300" />
  );
}
