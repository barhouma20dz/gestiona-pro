"use client";

import { useMemo } from "react";
import {
  Boxes,
  AlertTriangle,
  Clock,
  Truck,
  Users,
  Wallet,
  TrendingUp,
  ScanLine,
  Plus,
  ArrowRight,
  Sparkles,
  ClipboardList,
  DollarSign,
  AlertOctagon,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Product,
  SupplierInvoice,
  Customer,
  CashSession,
  DailyFinancialReport,
  ViewKey,
} from "@/lib/types";

interface StoreManagementCenterProps {
  products: Product[];
  batchesStats?: {
    totalBatches: number;
    expiredCount: number;
    urgent3Count: number;
    near7Count: number;
    medium30Count: number;
    totalAtRiskValue: number;
  };
  supplierInvoices: SupplierInvoice[];
  customers: Customer[];
  cashSession: CashSession | null;
  dailyReport?: DailyFinancialReport;
  currency?: string;
  onNavigate: (view: ViewKey) => void;
  onOpenCashDrawer?: () => void;
  onOpenReorderModal: () => void;
  onOpenAssistantModal: () => void;
  isLoading?: boolean;
}

export function StoreManagementCenter({
  products,
  batchesStats,
  supplierInvoices,
  customers,
  cashSession,
  dailyReport,
  currency = "دج",
  onNavigate,
  onOpenCashDrawer,
  onOpenReorderModal,
  onOpenAssistantModal,
  isLoading = false,
}: StoreManagementCenterProps) {
  // 1. Stock calculations (using each product's minStock)
  const outOfStockProducts = useMemo(
    () => products.filter((p) => p.stock <= 0),
    [products]
  );
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= (p.minStock ?? 5)),
    [products]
  );
  const outOfStockCount = outOfStockProducts.length;
  const lowStockCount = lowStockProducts.length;

  // 2. Batches calculations
  const expiredCount = batchesStats?.expiredCount ?? 0;
  const near7Count = (batchesStats?.urgent3Count ?? 0) + (batchesStats?.near7Count ?? 0);
  const atRiskValue = batchesStats?.totalAtRiskValue ?? 0;

  // 3. Supplier invoices calculations
  const unpaidInvoices = useMemo(
    () => supplierInvoices.filter((inv) => inv.status !== "PAID"),
    [supplierInvoices]
  );
  const overdueInvoices = useMemo(() => {
    const now = new Date();
    return unpaidInvoices.filter(
      (inv) => inv.dueDate && new Date(inv.dueDate) < now
    );
  }, [unpaidInvoices]);

  const totalSupplierDebt = useMemo(
    () =>
      unpaidInvoices.reduce(
        (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
        0
      ),
    [unpaidInvoices]
  );

  // 4. Customer debts calculations
  const indebtedCustomers = useMemo(
    () => customers.filter((c) => (c.creditOutstanding ?? 0) > 0),
    [customers]
  );
  const totalCustomerDebt = useMemo(
    () =>
      indebtedCustomers.reduce(
        (sum, c) => sum + (c.creditOutstanding ?? 0),
        0
      ),
    [indebtedCustomers]
  );

  // 5. Cash session details
  const isShiftOpen = cashSession?.status === "OPEN";
  const cashierName = cashSession?.user?.name || "المسؤول";
  const currentCash = cashSession?.expectedCash ?? cashSession?.openingCash ?? 0;
  const openingCash = cashSession?.openingCash ?? 0;

  // 6. Today's financial snapshot from Daily Financial Report
  const currentDay = dailyReport?.currentDay;
  const netSales = currentDay?.netSales ?? 0;
  const grossProfit = currentDay?.grossProfit ?? 0;
  const grossProfitMargin = currentDay?.grossProfitMargin ?? 0;
  const totalExpenses = currentDay?.totalOperatingExpenses ?? 0;
  const netOperatingProfit = currentDay?.netOperatingProfit ?? 0;
  const netProfitMargin = currentDay?.netProfitMargin ?? 0;

  return (
    <Card className="p-5 sm:p-6 rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-b from-card via-card to-emerald-500/[0.02] shadow-sm space-y-6">
      {/* Top Header of the Command Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 font-bold">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">
                مركز إدارة المتجر (Store Command Hub)
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                مباشر ولحظي
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              لوحة المراقبة التشغيلية الشاملة 360° للمخزون، الصلاحيات، الفواتير، ديون الزبائن، والوردية
            </p>
          </div>
        </div>

        {/* AI Assistant and Smart Reorder quick buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={onOpenAssistantModal}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm gap-1.5 text-xs h-9"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>مساعد المتجر الذكي</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenReorderModal}
            className="border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 gap-1.5 text-xs h-9"
          >
            <Boxes className="h-3.5 w-3.5 text-amber-500" />
            <span>توصيات التوريد</span>
          </Button>
        </div>
      </div>

      {/* 6 Core Operational Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Card 1: تنبيهات المخزون والنفاد */}
        <Card
          onClick={() => onNavigate("products")}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5",
            outOfStockCount > 0
              ? "border-red-500/40 bg-red-500/[0.03]"
              : lowStockCount > 0
              ? "border-amber-500/40 bg-amber-500/[0.03]"
              : "border-border hover:border-primary/40"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className={cn("h-3.5 w-3.5", outOfStockCount > 0 ? "text-red-500" : "text-amber-500")} />
                تنبيهات المخزون
              </span>
              {isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tabular-nums text-foreground">
                    {outOfStockCount + lowStockCount}
                  </span>
                  <span className="text-xs text-muted-foreground">صنف يحتاج متابعة</span>
                </div>
              )}
            </div>
            {outOfStockCount > 0 ? (
              <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">
                {outOfStockCount} نفد تماماً
              </Badge>
            ) : lowStockCount > 0 ? (
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                {lowStockCount} منخفض
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                مكتمل
              </Badge>
            )}
          </div>

          <div className="mt-3 pt-3 border-t text-xs flex items-center justify-between text-muted-foreground">
            <span>الحد الأدنى: {lowStockCount} · نفد: {outOfStockCount}</span>
            <span className="text-primary font-medium flex items-center gap-0.5 text-[11px]">
              إدارة المخزون <ChevronLeft className="h-3 w-3" />
            </span>
          </div>
        </Card>

        {/* Card 2: صلاحية الدفعات والمنتجات */}
        <Card
          onClick={() => onNavigate("expiry")}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5",
            expiredCount > 0
              ? "border-rose-500/40 bg-rose-500/[0.03]"
              : near7Count > 0
              ? "border-orange-500/40 bg-orange-500/[0.03]"
              : "border-border hover:border-primary/40"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-orange-500" />
                صلاحية الدفعات
              </span>
              {isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tabular-nums text-foreground">
                    {expiredCount + near7Count}
                  </span>
                  <span className="text-xs text-muted-foreground">دفعة حرجة</span>
                </div>
              )}
            </div>
            {expiredCount > 0 ? (
              <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]">
                {expiredCount} منتهية!
              </Badge>
            ) : near7Count > 0 ? (
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                {near7Count} تنتهي خلال 7أيام
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                آمنة
              </Badge>
            )}
          </div>

          <div className="mt-3 pt-3 border-t text-xs flex items-center justify-between text-muted-foreground">
            <span>قيمة الخطر: {formatMoney(atRiskValue, currency)}</span>
            <span className="text-primary font-medium flex items-center gap-0.5 text-[11px]">
              جدول الدفعات <ChevronLeft className="h-3 w-3" />
            </span>
          </div>
        </Card>

        {/* Card 3: فواتير الموردين والمستحقات */}
        <Card
          onClick={() => onNavigate("suppliers")}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5",
            overdueInvoices.length > 0
              ? "border-red-500/40 bg-red-500/[0.03]"
              : unpaidInvoices.length > 0
              ? "border-amber-500/40 bg-amber-500/[0.03]"
              : "border-border hover:border-primary/40"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-amber-500" />
                فواتير الموردين
              </span>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <p className="text-xl font-bold tabular-nums text-foreground truncate">
                  {formatMoney(totalSupplierDebt, currency)}
                </p>
              )}
            </div>
            {overdueInvoices.length > 0 ? (
              <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">
                {overdueInvoices.length} متأخرة
              </Badge>
            ) : unpaidInvoices.length > 0 ? (
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                {unpaidInvoices.length} غير مسددة
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                مسددة بالكامل
              </Badge>
            )}
          </div>

          <div className="mt-3 pt-3 border-t text-xs flex items-center justify-between text-muted-foreground">
            <span>{unpaidInvoices.length} فواتير معلقة</span>
            <span className="text-primary font-medium flex items-center gap-0.5 text-[11px]">
              عرض الفواتير <ChevronLeft className="h-3 w-3" />
            </span>
          </div>
        </Card>

        {/* Card 4: ديون الزبائن والبيع بالآجل */}
        <Card
          onClick={() => onNavigate("customers")}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5",
            totalCustomerDebt > 0
              ? "border-purple-500/30 bg-purple-500/[0.02]"
              : "border-border hover:border-primary/40"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-purple-500" />
                ديون الزبائن (الآجل)
              </span>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <p className="text-xl font-bold tabular-nums text-foreground truncate">
                  {formatMoney(totalCustomerDebt, currency)}
                </p>
              )}
            </div>
            {indebtedCustomers.length > 0 ? (
              <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px]">
                {indebtedCustomers.length} زبائن مدينين
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                لا توجد ديون
              </Badge>
            )}
          </div>

          <div className="mt-3 pt-3 border-t text-xs flex items-center justify-between text-muted-foreground">
            <span>تحصيل ومتابعة الكشوفات</span>
            <span className="text-primary font-medium flex items-center gap-0.5 text-[11px]">
              سجل العملاء <ChevronLeft className="h-3 w-3" />
            </span>
          </div>
        </Card>

        {/* Card 5: حالة الوردية وصندوق الكاشير */}
        <Card
          onClick={() => onOpenCashDrawer?.()}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5",
            isShiftOpen
              ? "border-emerald-500/40 bg-emerald-500/[0.03]"
              : "border-border hover:border-primary/40"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                صندوق الكاشير
              </span>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <p className="text-xl font-bold tabular-nums text-foreground truncate">
                  {formatMoney(currentCash, currency)}
                </p>
              )}
            </div>
            {isShiftOpen ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                الوردية مفتوحة
              </Badge>
            ) : (
              <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30 text-[10px]">
                الوردية مغلقة
              </Badge>
            )}
          </div>

          <div className="mt-3 pt-3 border-t text-xs flex items-center justify-between text-muted-foreground">
            <span>المسؤول: {cashierName} · بدء: {formatMoney(openingCash, currency)}</span>
            <span className="text-primary font-medium flex items-center gap-0.5 text-[11px]">
              التحكم بالدرج <ChevronLeft className="h-3 w-3" />
            </span>
          </div>
        </Card>

        {/* Card 6: ملخص الأرباح والمالية لليوم */}
        <Card
          onClick={() => onNavigate("dailyReport")}
          className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/[0.02] transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                صافي ربح اليوم
              </span>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    "text-xl font-bold tabular-nums truncate",
                    netOperatingProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {formatMoney(netOperatingProfit, currency)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    ({netProfitMargin.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <Badge className="bg-teal-500/15 text-teal-600 border-teal-500/30 text-[10px]">
              مبيعات: {formatMoney(netSales, currency)}
            </Badge>
          </div>

          <div className="mt-3 pt-3 border-t text-xs flex items-center justify-between text-muted-foreground">
            <span>الربح الإجمالي: {formatMoney(grossProfit, currency)} · مصاريف: {formatMoney(totalExpenses, currency)}</span>
            <span className="text-primary font-medium flex items-center gap-0.5 text-[11px]">
              تقرير P&L <ChevronLeft className="h-3 w-3" />
            </span>
          </div>
        </Card>
      </div>

      {/* Quick Operational Actions Bar (شريط الإجراءات السريعة) */}
      <div className="pt-2 border-t flex items-center gap-2 overflow-x-auto scrollbar-none flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground ml-1">
          إجراءات سريعة:
        </span>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate("pos")}
          className="h-8 text-xs gap-1.5 bg-background hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
        >
          <ScanLine className="h-3.5 w-3.5 text-emerald-600" />
          <span>بيع جديد (POS)</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate("products")}
          className="h-8 text-xs gap-1.5 bg-background hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>إضافة منتج</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate("suppliers")}
          className="h-8 text-xs gap-1.5 bg-background hover:bg-muted"
        >
          <Truck className="h-3.5 w-3.5 text-amber-500" />
          <span>طلبية شراء</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate("expenses")}
          className="h-8 text-xs gap-1.5 bg-background hover:bg-muted"
        >
          <DollarSign className="h-3.5 w-3.5 text-rose-500" />
          <span>تسجيل مصاريف</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate("dailyReport")}
          className="h-8 text-xs gap-1.5 bg-background hover:bg-muted"
        >
          <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
          <span>تقرير الأرباح اليومي</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate("inventoryAudit")}
          className="h-8 text-xs gap-1.5 bg-background hover:bg-muted"
        >
          <ClipboardList className="h-3.5 w-3.5 text-primary" />
          <span>جرد المخزون</span>
        </Button>

        {onOpenCashDrawer && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenCashDrawer}
            className="h-8 text-xs gap-1.5 bg-background hover:bg-muted"
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
            <span>درج النقود</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
