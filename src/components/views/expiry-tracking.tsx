"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  AlertTriangle,
  CalendarX,
  Package,
  Loader2,
  RefreshCw,
  Truck,
  Plus,
  Layers,
  ShieldAlert,
  AlertOctagon,
  Calendar,
  CheckCircle2,
  Info,
} from "lucide-react";

import { expiryApi, shopApi, suppliersApi, batchesApi, productsApi } from "@/lib/api";
import type { ExpiryProduct, Product } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type T = (key: TranslationKey) => string;

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

export function ExpiryTracking() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  // Mode: "batches" (lot/batch level) or "products" (legacy direct product level)
  const [viewMode, setViewMode] = useState<"batches" | "products">("batches");
  // Batch urgency filter
  const [batchTab, setBatchTab] = useState<"all" | "expired" | "3days" | "7days" | "30days">("expired");
  // Legacy product tab
  const [prodTab, setProdTab] = useState<"expired" | "near">("expired");

  // New batch dialog
  const [addBatchOpen, setAddBatchOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchQty, setBatchQty] = useState("");
  const [batchCost, setBatchCost] = useState("");

  const { data: batchesData, isLoading: isLoadingBatches, refetch: refetchBatches, isFetching: isFetchingBatches } = useQuery({
    queryKey: ["batches", batchTab],
    queryFn: () => batchesApi.list(batchTab),
  });

  const { data: legacyData, isLoading: isLoadingLegacy, refetch: refetchLegacy, isFetching: isFetchingLegacy } = useQuery({
    queryKey: ["expiry"],
    queryFn: expiryApi.list,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
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

  // Map supplierId → supplier name
  const supplierNameById = useMemo(() => {
    const m = new Map<string, string>();
    suppliers.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [suppliers]);

  const addBatchMutation = useMutation({
    mutationFn: (data: {
      productId: string;
      batchNumber?: string;
      expiryDate: string;
      quantity: number;
      costPrice?: number;
    }) => batchesApi.createForProduct(data.productId, data),
    onSuccess: () => {
      toast.success("✓ تم تسجيل الدفعة وتاريخ انتهاء الصلاحية بنجاح");
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setAddBatchOpen(false);
      setSelectedProductId("");
      setBatchNumber("");
      setExpiryDate("");
      setBatchQty("");
      setBatchCost("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "فشل تسجيل الدفعة");
    },
  });

  const handleAddBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error("يرجى اختيار المنتج");
      return;
    }
    if (!expiryDate) {
      toast.error("يرجى تحديد تاريخ انتهاء الصلاحية");
      return;
    }
    const qty = parseFloat(batchQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("يرجى إدخال كمية صحيحة أكبر من صفر");
      return;
    }

    addBatchMutation.mutate({
      productId: selectedProductId,
      batchNumber: batchNumber.trim() || undefined,
      expiryDate,
      quantity: qty,
      costPrice: batchCost ? parseFloat(batchCost) : undefined,
    });
  };

  const bStats = batchesData?.stats ?? {
    totalBatches: 0,
    expiredCount: 0,
    urgent3Count: 0,
    near7Count: 0,
    medium30Count: 0,
    totalAtRiskValue: 0,
  };

  const expiredLegacy = legacyData?.expired ?? [];
  const nearLegacy = legacyData?.nearExpiry ?? [];

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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
                {t("expiryTracking")} وتتبع الدفعات
              </h2>
              <Badge className="bg-white/20 text-white border-white/30 text-[11px]">
                نظام الدفعات المتعددة
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              تتبع صلاحية المخزون حسب الدفعات (3، 7، 30 يوماً) وتقييم المخاطر المالية لمنع الخسائر
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setAddBatchOpen(true)}
              className="bg-white text-emerald-800 shadow-md hover:bg-emerald-50 gap-1.5 font-bold"
            >
              <Plus className="h-4 w-4" />
              تسجيل دفعة جديدة
            </Button>
            <Button
              onClick={() => {
                refetchBatches();
                refetchLegacy();
              }}
              disabled={isFetchingBatches || isFetchingLegacy}
              variant="outline"
              className="bg-black/20 text-white border-white/30 hover:bg-black/30"
            >
              {isFetchingBatches || isFetchingLegacy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Switcher: Batch Tracking vs Direct Product View */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "batches" ? "default" : "ghost"}
            className="text-xs h-8 gap-1.5"
            onClick={() => setViewMode("batches")}
          >
            <Layers className="h-3.5 w-3.5" />
            تتبع الدفعات وتواريخ الصلاحية
            <Badge className="bg-primary/20 text-primary-foreground text-[10px] px-1.5 py-0 h-4">
              {bStats.totalBatches}
            </Badge>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "products" ? "default" : "ghost"}
            className="text-xs h-8 gap-1.5"
            onClick={() => setViewMode("products")}
          >
            <Package className="h-3.5 w-3.5" />
            صلاحية المنتجات المباشرة
          </Button>
        </div>

        {viewMode === "batches" && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span>إجمالي القيمة المعرضة للخطر:</span>
            <b className="text-foreground text-sm font-bold tabular-nums">
              {formatMoney(bStats.totalAtRiskValue, currency)}
            </b>
          </div>
        )}
      </div>

      {viewMode === "batches" ? (
        /* ================= BATCHES VIEW ================= */
        <div className="space-y-6">
          {/* Batch Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 border-red-500/30 bg-red-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">منتهية الصلاحية</span>
                <CalendarX className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-2 tabular-nums">
                {bStats.expiredCount}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">يجب عزلها أو إتلافها</p>
            </Card>

            <Card className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">عاجلة (≤ 3 أيام)</span>
                <AlertOctagon className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
                {bStats.urgent3Count}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">أولوية بيع وتخفيض قصوى</p>
            </Card>

            <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">خلال أسبوع (≤ 7 أيام)</span>
                <CalendarClock className="h-4 w-4 text-yellow-600" />
              </div>
              <p className="text-2xl font-black text-yellow-700 dark:text-yellow-400 mt-2 tabular-nums">
                {bStats.near7Count}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">صرف الأقرب انتهاءً أولاً</p>
            </Card>

            <Card className="p-4 border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">خلال شهر (≤ 30 يوماً)</span>
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-2 tabular-nums">
                {bStats.medium30Count}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">متابعة معدل السحب</p>
            </Card>
          </div>

          {/* Filter Tabs */}
          <Tabs value={batchTab} onValueChange={(v) => setBatchTab(v as any)}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full sm:w-auto h-auto p-1">
              <TabsTrigger value="expired" className="text-xs py-1.5 gap-1 text-red-600 dark:text-red-400">
                <CalendarX className="h-3 w-3" />
                منتهية ({bStats.expiredCount})
              </TabsTrigger>
              <TabsTrigger value="3days" className="text-xs py-1.5 gap-1 text-amber-600 dark:text-amber-400">
                <AlertOctagon className="h-3 w-3" />
                ≤ 3 أيام ({bStats.urgent3Count})
              </TabsTrigger>
              <TabsTrigger value="7days" className="text-xs py-1.5 gap-1 text-yellow-600 dark:text-yellow-400">
                <CalendarClock className="h-3 w-3" />
                ≤ 7 أيام ({bStats.near7Count})
              </TabsTrigger>
              <TabsTrigger value="30days" className="text-xs py-1.5 gap-1 text-blue-600 dark:text-blue-400">
                <Calendar className="h-3 w-3" />
                ≤ 30 يوماً ({bStats.medium30Count})
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs py-1.5 gap-1">
                كل الدفعات ({bStats.totalBatches})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Batches Content */}
          {isLoadingBatches ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-xs">جاري تحليل دفعات المنتجات والصلاحية...</p>
            </div>
          ) : (batchesData?.batches ?? []).length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-bold text-foreground">لا توجد دفعات مطابقة لهذا الفلتر</p>
              <p className="text-xs mt-1">حالة المخزون والصلاحية ممتازة وفق المعيار المختار.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(batchesData?.batches ?? []).map((b, i) => {
                const isExp = b.urgency === "expired";
                const isUrgent3 = b.urgency === "urgent_3";
                const isNear7 = b.urgency === "near_7";

                const badgeBg = isExp
                  ? "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
                  : isUrgent3
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  : isNear7
                  ? "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/30"
                  : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";

                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  >
                    <Card className="p-0 overflow-hidden border shadow-sm">
                      <div className="p-4 border-b flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{b.product.name}</p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            {b.product.barcode}
                          </p>
                        </div>
                        <Badge className={cn("shrink-0 text-[11px] font-bold", badgeBg)}>
                          {isExp
                            ? `منتهية منذ ${Math.abs(b.diffDays)} يوم`
                            : b.diffDays === 0
                            ? "تنتهي اليوم!"
                            : `متبقي ${b.diffDays} يوم`}
                        </Badge>
                      </div>

                      <div className="p-4 space-y-2 text-xs bg-card">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">رقم الدفعة (Lot #):</span>
                          <span className="font-mono font-medium">{b.batchNumber || "عامة"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                          <span className="font-medium font-mono">
                            {formatDate(new Date(b.expiryDate).toISOString())}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">الكمية المتبقية بالدفعة:</span>
                          <Badge variant="outline" className="font-bold">
                            {b.quantity} {b.product.unitType === "kg" ? "كغ" : "قطعة"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between border-t pt-2">
                          <span className="text-muted-foreground font-medium">القيمة المالية المعرضة للخطر:</span>
                          <span className="font-bold text-sm text-foreground tabular-nums">
                            {formatMoney(b.stockValue, currency)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/30 border-t flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          سعر الوحدة: <b>{formatMoney(b.costPrice, currency)}</b>
                        </span>
                        {isExp && (
                          <Badge className="bg-red-500 text-white text-[10px]">
                            ممنوع بيعها
                          </Badge>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= LEGACY PRODUCT VIEW ================= */
        <div className="space-y-6">
          <Tabs value={prodTab} onValueChange={(v) => setProdTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="expired" className="gap-1.5 text-red-600">
                <CalendarX className="h-3.5 w-3.5" />
                {t("expired")} ({expiredLegacy.length})
              </TabsTrigger>
              <TabsTrigger value="near" className="gap-1.5 text-amber-600">
                <CalendarClock className="h-3.5 w-3.5" />
                {t("nearExpiry")} ({nearLegacy.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expired" className="mt-4">
              {isLoadingLegacy ? (
                <LoadingState t={t} />
              ) : expiredLegacy.length === 0 ? (
                <EmptyExpiryState variant="expired" t={t} />
              ) : (
                <ProductGrid
                  products={expiredLegacy}
                  variant="expired"
                  currency={currency}
                  supplierNameById={supplierNameById}
                  t={t}
                  onReorder={handleReorder}
                />
              )}
            </TabsContent>

            <TabsContent value="near" className="mt-4">
              {isLoadingLegacy ? (
                <LoadingState t={t} />
              ) : nearLegacy.length === 0 ? (
                <EmptyExpiryState variant="near" t={t} />
              ) : (
                <ProductGrid
                  products={nearLegacy}
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
      )}

      {/* Add New Batch Dialog */}
      <Dialog open={addBatchOpen} onOpenChange={setAddBatchOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              تسجيل دفعة جديدة لمنتج وتاريخ صلاحيتها
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              سجل استلام دفعة جديدة برقم لوت مستقل وتاريخ صلاحية محدد لمتابعة التواريخ بدقة.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddBatchSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs">اختر المنتج (إلزامي)</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر المنتج..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} ({p.barcode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">رقم الدفعة / اللوت (اختياري)</Label>
                <Input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="مثال: LOT-2026-A"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">تاريخ انتهاء الصلاحية</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">الكمية في هذه الدفعة</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="any"
                  value={batchQty}
                  onChange={(e) => setBatchQty(e.target.value)}
                  placeholder="مثال: 24"
                  className="h-9 text-xs tabular-nums"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">سعر التكلفة للوحدة (دج)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={batchCost}
                  onChange={(e) => setBatchCost(e.target.value)}
                  placeholder="سعر الشراء"
                  className="h-9 text-xs tabular-nums"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddBatchOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addBatchMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              >
                {addBatchMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                حفظ الدفعة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
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
                        ? "border-red-500/40 text-red-600 dark:text-red-400"
                        : isExpired
                          ? "border-red-500/40 text-red-600 dark:text-red-400"
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
