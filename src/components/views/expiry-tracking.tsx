"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarClock,
  AlertTriangle,
  CalendarX,
  Package,
  Loader2,
  RefreshCw,
  Truck,
} from "lucide-react";

import { expiryApi, shopApi, suppliersApi } from "@/lib/api";
import type { ExpiryProduct } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type T = (key: TranslationKey) => string;

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

export function ExpiryTracking() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"expired" | "near">("expired");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["expiry"],
    queryFn: expiryApi.list,
  });
  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: suppliersApi.list,
  });
  const currency = shop?.currency ?? "دج";

  // Map supplierId → supplier name for display
  const supplierNameById = useMemo(() => {
    const m = new Map<string, string>();
    suppliers.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [suppliers]);

  const expired = data?.expired ?? [];
  const nearExpiry = data?.nearExpiry ?? [];

  // Stats
  const stats = useMemo(() => {
    const expiredValue = expired.reduce(
      (sum, p) => sum + p.price * p.stock,
      0
    );
    const nearValue = nearExpiry.reduce(
      (sum, p) => sum + p.price * p.stock,
      0
    );
    return {
      expiredCount: expired.length,
      nearCount: nearExpiry.length,
      valueAtRisk: expiredValue + nearValue,
      expiredValue,
      nearValue,
    };
  }, [expired, nearExpiry]);

  const statCards = [
    {
      label: t("productsExpired"),
      value: String(stats.expiredCount),
      icon: CalendarX,
      tint: "bg-red-500/15 text-red-600",
    },
    {
      label: t("productsNearExpiry"),
      value: String(stats.nearCount),
      icon: CalendarClock,
      tint: "bg-amber-500/15 text-amber-600",
    },
    {
      label: t("totalValueAtRisk"),
      value: formatMoney(stats.valueAtRisk, currency),
      icon: AlertTriangle,
      tint: "bg-amber-500/15 text-amber-600",
    },
  ];

  const handleReorder = (p: ExpiryProduct) => {
    const supplierName = p.supplierId
      ? (supplierNameById.get(p.supplierId) ?? t("noSupplier"))
      : t("noSupplier");
    toast.info(`${t("reorderFromSupplier")}: ${p.name}`, {
      description: `${t("noSupplier")}: ${supplierName}`,
      duration: 4500,
    });
  };

  return (
    <div className="space-y-6">
      {/* Gradient page header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
              {t("expiryTracking")}
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {t("expiryTrackingSubtitle")}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
            >
              <Card className="gap-0 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                      {s.value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      s.tint
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "expired" | "near")}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="expired" className="gap-1.5">
            <CalendarX className="h-3.5 w-3.5 text-red-500" />
            {t("expired")} ({expired.length})
          </TabsTrigger>
          <TabsTrigger value="near" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
            {t("nearExpiry")} ({nearExpiry.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expired" className="mt-4">
          {isLoading ? (
            <LoadingState t={t} />
          ) : expired.length === 0 ? (
            <EmptyExpiryState
              variant="expired"
              t={t}
            />
          ) : (
            <ProductGrid
              products={expired}
              variant="expired"
              currency={currency}
              supplierNameById={supplierNameById}
              t={t}
              onReorder={handleReorder}
            />
          )}
        </TabsContent>

        <TabsContent value="near" className="mt-4">
          {isLoading ? (
            <LoadingState t={t} />
          ) : nearExpiry.length === 0 ? (
            <EmptyExpiryState variant="near" t={t} />
          ) : (
            <ProductGrid
              products={nearExpiry}
              variant="near"
              currency={currency}
              supplierNameById={supplierNameById}
              t={t}
              onReorder={handleReorder}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- helpers ---------- */

function LoadingState({ t }: { t: T }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {t("loadingExpiry")}
    </div>
  );
}

function EmptyExpiryState({
  variant,
  t,
}: {
  variant: "expired" | "near";
  t: T;
}) {
  const isExpired = variant === "expired";
  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-col items-center gap-3 py-12">
        <div
          className={cn(
            "grid size-12 place-items-center rounded-full",
            isExpired
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-emerald-500/10 text-emerald-600"
          )}
        >
          {isExpired ? (
            <CalendarX className="h-6 w-6" />
          ) : (
            <CalendarClock className="h-6 w-6" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {isExpired ? t("noExpiredProducts") : t("noNearExpiryProducts")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isExpired
              ? t("noExpiredProductsDesc")
              : t("noNearExpiryProductsDesc")}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ProductGrid({
  products,
  variant,
  currency,
  supplierNameById,
  t,
  onReorder,
}: {
  products: ExpiryProduct[];
  variant: "expired" | "near";
  currency: string;
  supplierNameById: Map<string, string>;
  t: T;
  onReorder: (p: ExpiryProduct) => void;
}) {
  const now = new Date();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p, i) => {
        const expiry = p.expiryDate ? new Date(p.expiryDate) : null;
        const days = expiry ? daysBetween(expiry, now) : 0;
        const isExpired = variant === "expired";
        const accent = isExpired
          ? "border-red-500/30 bg-red-500/5"
          : "border-amber-500/30 bg-amber-500/5";
        const badgeClass = isExpired
          ? "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400"
          : "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400";
        const supplierName = p.supplierId
          ? (supplierNameById.get(p.supplierId) ?? t("noSupplier"))
          : t("noSupplier");
        const stockValue = p.price * p.stock;
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
          >
            <Card className={cn("gap-0 overflow-hidden border p-0", accent)}>
              <div className="flex items-start gap-3 p-4">
                <div
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-xl",
                    isExpired
                      ? "bg-red-500/15 text-red-600"
                      : "bg-amber-500/15 text-amber-600"
                  )}
                >
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {p.barcode}
                      </p>
                    </div>
                    <Badge className={cn("shrink-0", badgeClass)}>
                      {isExpired
                        ? `${Math.abs(days)} ${t("daysPassed")}`
                        : `${days} ${t("daysRemaining")}`}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/50 px-4 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("expiryDate")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {expiry ? formatDate(expiry.toISOString()) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("stockRemaining")}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "tabular-nums",
                      p.stock === 0
                        ? "border-red-500/40 text-red-600"
                        : isExpired
                          ? "border-red-500/40 text-red-600"
                          : "border-amber-500/40 text-amber-600"
                    )}
                  >
                    {p.stock} {t("inStock")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("supplierName")}</span>
                  <span className="truncate font-medium">
                    {supplierName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("inventoryValue")}</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatMoney(stockValue, currency)}
                  </span>
                </div>
              </div>

              <div className="border-t border-border/50 p-3">
                <Button
                  onClick={() => onReorder(p)}
                  variant={isExpired ? "destructive" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={p.stock === 0 && isExpired}
                >
                  <Truck className="h-3.5 w-3.5" />
                  {t("reorder")}
                </Button>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
