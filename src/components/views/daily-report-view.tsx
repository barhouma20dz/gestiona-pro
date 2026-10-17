"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  ShoppingCart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  RefreshCw,
  CreditCard,
  Building,
  Users,
  PieChart,
  HelpCircle,
  FileSpreadsheet,
  Trophy,
  Medal,
  Award,
  Sparkles,
  CheckCircle2,
  Target,
  UserCheck,
} from "lucide-react";

import { dailyReportApi, sellerReportsApi, shopApi } from "@/lib/api";
import type { SellerPerformanceReport } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DailyReportView() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [activeTab, setActiveTab] = useState<"finance" | "sellers">("finance");
  const [sellerPeriod, setSellerPeriod] = useState<"today" | "week" | "month" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const currency = shop?.currency ?? "دج";

  const {
    data: sellerReport,
    isLoading: isSellerLoading,
    refetch: refetchSellerReport,
    isRefetching: isSellerRefetching,
  } = useQuery({
    queryKey: ["sellerReport", sellerPeriod, customStartDate, customEndDate],
    queryFn: () =>
      sellerReportsApi.get({
        period: sellerPeriod,
        startDate: sellerPeriod === "custom" ? customStartDate : undefined,
        endDate: sellerPeriod === "custom" ? customEndDate : undefined,
      }),
  });

  const {
    data: report,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["dailyReport", selectedDate],
    queryFn: () => dailyReportApi.get(selectedDate),
  });

  const cur = report?.currentDay;
  const comp = report?.comparison;

  const setDateToToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const setDateToYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-300">
                التقرير المالي اليومي
              </span>
              <span className="text-xs text-slate-300">
                الأرباح والمصاريف والتدفقات النقدية
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              كشف الأرباح والمصاريف اليومي
            </h2>
            <p className="mt-0.5 text-xs text-slate-300 sm:text-sm">
              حساب دقيق لصافي المبيعات وتكلفة البضاعة (COGS) وهامش الربح والتدفق المالي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={setDateToToday}
              className={cn(
                "border-white/20 text-white hover:bg-white/10",
                selectedDate === new Date().toISOString().slice(0, 10) &&
                  "bg-white/20 font-bold"
              )}
            >
              اليوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={setDateToYesterday}
              className="border-white/20 text-white hover:bg-white/10"
            >
              الأمس
            </Button>
            <div className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-2 py-1">
              <Calendar className="h-4 w-4 text-indigo-300" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-7 w-36 border-0 bg-transparent p-0 text-xs text-white focus-visible:ring-0"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefetching && "animate-spin")}
              />
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500 shadow"
            >
              <Printer className="h-4 w-4" />
              طباعة التقرير
            </Button>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Button
          variant={activeTab === "finance" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("finance")}
          className={cn(
            "gap-2 text-xs font-bold",
            activeTab === "finance"
              ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Wallet className="h-4 w-4" />
          الكشف المالي اليومي والأرباح
        </Button>
        <Button
          variant={activeTab === "sellers" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("sellers")}
          className={cn(
            "gap-2 text-xs font-bold",
            activeTab === "sellers"
              ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Trophy className="h-4 w-4" />
          أداء البائعين والكادر
        </Button>
      </div>

      {activeTab === "sellers" ? (
        <SellerPerformanceSection
          currency={currency}
          sellerPeriod={sellerPeriod}
          setSellerPeriod={setSellerPeriod}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          report={sellerReport}
          isLoading={isSellerLoading}
          refetch={refetchSellerReport}
          isRefetching={isSellerRefetching}
        />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
            <p className="mt-2 text-sm text-muted-foreground">
              جارٍ احتساب المؤشرات المالية والتدفقات النقدية...
            </p>
          </div>
        </div>
      ) : cur ? (
        <>
          {/* Day-Over-Day Comparison Banner */}
          {comp && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card className="flex items-center justify-between border-border/60 bg-card p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                      comp.salesDiff >= 0
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    )}
                  >
                    {comp.salesDiff >= 0 ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      مقارنة المبيعات بالأمس
                    </p>
                    <p className="text-base font-bold">
                      {formatMoney(cur.netSales, currency)}{" "}
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          comp.salesDiff >= 0 ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        ({comp.salesDiff >= 0 ? "+" : ""}
                        {comp.salesPercentChange.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  أمس: {formatMoney(comp.prevDayNetSales, currency)}
                </div>
              </Card>

              <Card className="flex items-center justify-between border-border/60 bg-card p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                      comp.netProfitDiff >= 0
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    )}
                  >
                    {comp.netProfitDiff >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      مقارنة صافي الربح بالأمس
                    </p>
                    <p className="text-base font-bold">
                      {formatMoney(cur.netOperatingProfit, currency)}{" "}
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          comp.netProfitDiff >= 0 ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        ({comp.netProfitDiff >= 0 ? "+" : ""}
                        {formatMoney(comp.netProfitDiff, currency)})
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  أمس: {formatMoney(comp.prevDayNetProfit, currency)}
                </div>
              </Card>
            </div>
          )}

          {/* Core P&L Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Net Sales */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    صافي المبيعات (Net Sales)
                  </p>
                  <p className="mt-1 text-xl font-black text-foreground sm:text-2xl">
                    {formatMoney(cur.netSales, currency)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {cur.salesCount} عمليات بيع · خصومات:{" "}
                    {formatMoney(cur.totalDiscounts, currency)}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </div>
            </Card>

            {/* COGS */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    تكلفة البضاعة المباعة (COGS)
                  </p>
                  <p className="mt-1 text-xl font-black text-amber-600 dark:text-amber-400 sm:text-2xl">
                    {formatMoney(cur.cogs, currency)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    سعر الشراء والتكلفة المباشرة للسلع
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
            </Card>

            {/* Gross Profit */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    الربح الإجمالي (Gross Profit)
                  </p>
                  <p className="mt-1 text-xl font-black text-teal-600 dark:text-teal-400 sm:text-2xl">
                    {formatMoney(cur.grossProfit, currency)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground font-semibold">
                    هامش الربح: {cur.grossProfitMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </Card>

            {/* Net Operating Profit */}
            <Card className="p-4 sm:p-5 border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    صافي الربح التشغيلي (Net Profit)
                  </p>
                  <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-400 sm:text-2xl">
                    {formatMoney(cur.netOperatingProfit, currency)}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-600/90 font-medium">
                    بعد خصم المصاريف ({cur.netProfitMargin.toFixed(1)}%)
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Cash Flow Section (Crucial distinction from Profit & Loss) */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  حركة التدفق النقدي الفعلي في الصندوق (Cash Flow)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  السيولة النقدية الفعلية المقبوضة والخارجة من المحل خلال اليوم
                </p>
              </div>
              <Badge
                className={cn(
                  "font-bold text-sm px-3 py-1",
                  cur.cashFlow.netCashFlow >= 0
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-500/15 text-red-700 dark:text-red-400"
                )}
              >
                صافي التدفق: {formatMoney(cur.cashFlow.netCashFlow, currency)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Cash In */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <ArrowUpRight className="h-4 w-4" />
                    المقبوضات النقدية الداخلة (Cash In)
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    +{formatMoney(cur.cashFlow.totalCashIn, currency)}
                  </span>
                </div>
                <div className="divide-y text-xs">
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">
                      مبيعات نقدية مقبوضة
                    </span>
                    <span className="font-mono">
                      {formatMoney(cur.cashFlow.cashFromSales, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">
                      ديون زبائن مسددة نقداً
                    </span>
                    <span className="font-mono">
                      {formatMoney(cur.cashFlow.cashDebtCollected, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash Out */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <ArrowDownRight className="h-4 w-4" />
                    المدفوعات النقدية الخارجة (Cash Out)
                  </span>
                  <span className="font-bold text-rose-700 dark:text-rose-300">
                    -{formatMoney(cur.cashFlow.totalCashOut, currency)}
                  </span>
                </div>
                <div className="divide-y text-xs">
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">
                      مصاريف تشغيلية مدفوعة نقداً
                    </span>
                    <span className="font-mono">
                      {formatMoney(cur.cashFlow.cashExpenses, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">
                      تسديدات نقدية للموردين
                    </span>
                    <span className="font-mono">
                      {formatMoney(cur.cashFlow.cashSupplierPaid, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Detailed Tables: Payment Methods & Expenses breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Methods Breakdown */}
            <Card className="p-4 sm:p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-primary" />
                توزيع المبيعات حسب وسيلة الدفع
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">طريقة الدفع</TableHead>
                    <TableHead className="text-center">العمليات</TableHead>
                    <TableHead className="text-center">المبلغ الإجمالي</TableHead>
                    <TableHead className="text-center">النسبة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(cur.paymentBreakdown).map(([method, data]) => {
                    const methodLabels: Record<string, string> = {
                      Cash: "نقداً (درج النقود)",
                      BARIDIMOB: "بريدي موب (BaridiMob)",
                      CARD: "بطاقة بنكية / ذهبية",
                      CHEQUE: "شيك بنكي",
                      CREDIT: "بيع بالآجل (دين عميل)",
                    };
                    const pct =
                      cur.netSales > 0 ? (data.total / cur.netSales) * 100 : 0;
                    return (
                      <TableRow key={method}>
                        <TableCell className="text-start font-medium text-xs">
                          {methodLabels[method] || method}
                        </TableCell>
                        <TableCell className="text-center text-xs tabular-nums">
                          {data.count}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-xs tabular-nums">
                          {formatMoney(data.total, currency)}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-muted-foreground tabular-nums">
                          {pct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Operating Expenses Breakdown */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  المصاريف التشغيلية لليوم
                </h3>
                <span className="font-bold text-xs text-red-600 tabular-nums">
                  {formatMoney(cur.totalOperatingExpenses, currency)}
                </span>
              </div>
              {Object.keys(cur.expensesByCategory).length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  لم يتم تسجيل أي مصاريف تشغيلية في هذا اليوم.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">فئة المصروف</TableHead>
                      <TableHead className="text-center">المبلغ</TableHead>
                      <TableHead className="text-center">النسبة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(cur.expensesByCategory).map(([cat, amt]) => {
                      const pct =
                        cur.totalOperatingExpenses > 0
                          ? (amt / cur.totalOperatingExpenses) * 100
                          : 0;
                      return (
                        <TableRow key={cat}>
                          <TableCell className="text-start font-medium text-xs">
                            {cat}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-xs tabular-nums">
                            {formatMoney(amt, currency)}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono text-muted-foreground tabular-nums">
                            {pct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SellerPerformanceSection({
  currency,
  sellerPeriod,
  setSellerPeriod,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  report,
  isLoading,
  refetch,
  isRefetching,
}: {
  currency: string;
  sellerPeriod: "today" | "week" | "month" | "custom";
  setSellerPeriod: (p: "today" | "week" | "month" | "custom") => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  report?: SellerPerformanceReport;
  isLoading: boolean;
  refetch: () => void;
  isRefetching: boolean;
}) {
  const topSeller =
    report?.sellers && report.sellers.length > 0 && report.sellers[0].salesCount > 0
      ? report.sellers[0]
      : null;

  return (
    <div className="space-y-6">
      {/* Filter and Period Selection Bar */}
      <Card className="p-4 border-border/70 bg-card/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground ml-1">
              الفترة الزمنية:
            </span>
            <Button
              variant={sellerPeriod === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setSellerPeriod("today")}
              className={cn(
                "text-xs",
                sellerPeriod === "today" && "bg-emerald-600 text-white hover:bg-emerald-500"
              )}
            >
              اليوم
            </Button>
            <Button
              variant={sellerPeriod === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setSellerPeriod("week")}
              className={cn(
                "text-xs",
                sellerPeriod === "week" && "bg-emerald-600 text-white hover:bg-emerald-500"
              )}
            >
              آخر 7 أيام
            </Button>
            <Button
              variant={sellerPeriod === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setSellerPeriod("month")}
              className={cn(
                "text-xs",
                sellerPeriod === "month" && "bg-emerald-600 text-white hover:bg-emerald-500"
              )}
            >
              الشهر الحالي
            </Button>
            <Button
              variant={sellerPeriod === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setSellerPeriod("custom")}
              className={cn(
                "text-xs",
                sellerPeriod === "custom" && "bg-emerald-600 text-white hover:bg-emerald-500"
              )}
            >
              تاريخ مخصص
            </Button>

            {sellerPeriod === "custom" && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-xs text-muted-foreground">من:</span>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
                <span className="text-xs text-muted-foreground">إلى:</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={isRefetching}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
            <p className="mt-2 text-sm text-muted-foreground">
              جارٍ تحميل وتحليل أداء البائعين والمبيعات...
            </p>
          </div>
        </div>
      ) : !report ? null : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Net Revenue */}
            <Card className="p-4 border-border/80 bg-card/60">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">صافي مبيعات البائعين</p>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight mt-2 text-foreground">
                {formatMoney(report.summary.totalNetRevenue, currency)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                إجمالي الإيرادات بعد حسم الخصومات
              </p>
            </Card>

            {/* 2. Invoices Count */}
            <Card className="p-4 border-border/80 bg-card/60">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">عدد الفواتير الصادرة</p>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight mt-2 text-foreground">
                {report.summary.totalSalesCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                عملية بيع مسجلة في هذه الفترة
              </p>
            </Card>

            {/* 3. Gross Profit */}
            <Card className="p-4 border-border/80 bg-card/60">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">الربح الإجمالي المحقق</p>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight mt-2 text-emerald-600 dark:text-emerald-400">
                {formatMoney(report.summary.totalProfit, currency)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                هامش ربح إجمالي تقريبي للبضاعة
              </p>
            </Card>

            {/* 4. Top Performer */}
            <Card className="p-4 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-amber-500 flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  البائع الأعلى مبيعاً
                </p>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 py-0">
                  المركز الأول
                </Badge>
              </div>
              {topSeller ? (
                <>
                  <p className="text-lg font-black truncate mt-1.5 text-foreground">
                    {topSeller.sellerName}
                  </p>
                  <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(topSeller.netSales, currency)}{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      ({topSeller.salesCount} فاتورة)
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mt-3">لا توجد مبيعات في هذه الفترة</p>
              )}
            </Card>
          </div>

          {/* Detailed Performance Table */}
          <Card className="p-4 sm:p-5 border-border/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  جدول أداء وتصنيف البائعين
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تفصيل مبيعات كل بائع، الخصومات الممنوحة، متوسط الفاتورة، والربح المحقق
                </p>
              </div>
              <Badge variant="secondary" className="gap-1 text-xs">
                {report.sellers.length} بائعين مسجلين
              </Badge>
            </div>

            {report.sellers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                لم يتم العثور على أي بائعين مسجلين في هذا المتجر.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-16 text-center">الترتيب</TableHead>
                      <TableHead className="text-start">البائع</TableHead>
                      <TableHead className="text-center">عدد الفواتير</TableHead>
                      <TableHead className="text-center">إجمالي المبيعات</TableHead>
                      <TableHead className="text-center">الخصومات</TableHead>
                      <TableHead className="text-center">صافي المبيعات</TableHead>
                      <TableHead className="text-center">متوسط الفاتورة</TableHead>
                      <TableHead className="text-center">الربح المحقق</TableHead>
                      <TableHead className="text-center">هامش الربح</TableHead>
                      <TableHead className="text-center w-44">المساهمة في الإيراد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.sellers.map((seller, index) => {
                      const contribution =
                        report.summary.totalNetRevenue > 0
                          ? (seller.netSales / report.summary.totalNetRevenue) * 100
                          : 0;

                      return (
                        <TableRow key={seller.sellerId} className="transition-colors">
                          <TableCell className="text-center font-bold">
                            {index === 0 && seller.salesCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-500 border border-amber-500/30">
                                <Trophy className="h-3 w-3" />
                                #1
                              </span>
                            ) : index === 1 && seller.salesCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-400/20 px-2 py-0.5 text-xs font-bold text-slate-300 border border-slate-400/30">
                                <Medal className="h-3 w-3" />
                                #2
                              </span>
                            ) : index === 2 && seller.salesCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-700/20 px-2 py-0.5 text-xs font-bold text-amber-600 border border-amber-700/30">
                                <Award className="h-3 w-3" />
                                #3
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                #{index + 1}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-start">
                            <div className="font-semibold text-foreground text-sm">
                              {seller.sellerName}
                            </div>
                            {seller.username && (
                              <div className="text-[11px] text-muted-foreground font-mono">
                                @{seller.username}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium text-xs tabular-nums">
                            {seller.salesCount}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs tabular-nums">
                            {formatMoney(seller.totalGrossSales, currency)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-red-500 tabular-nums">
                            {seller.totalDiscounts > 0 ? `-${formatMoney(seller.totalDiscounts, currency)}` : "0.00"}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatMoney(seller.netSales, currency)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-muted-foreground tabular-nums">
                            {formatMoney(seller.averageTicket, currency)}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-xs tabular-nums">
                            {formatMoney(seller.grossProfit, currency)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[11px] font-mono",
                                  seller.profitMarginPercent > 20
                                    ? "border-emerald-500/30 text-emerald-500"
                                    : "border-border text-muted-foreground"
                                )}
                              >
                                {seller.profitMarginPercent.toFixed(1)}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="text-muted-foreground">{contribution.toFixed(1)}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, contribution))}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
