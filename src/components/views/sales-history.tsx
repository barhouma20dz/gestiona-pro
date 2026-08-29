"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Receipt,
  Package,
  Calculator,
  RefreshCw,
  Eye,
  Printer,
  X,
  Loader2,
  ReceiptText,
  Download,
  Wallet,
  Percent,
  Share2,
  ScanLine,
} from "lucide-react";

import { salesApi, shopApi, productsApi } from "@/lib/api";
import { paymentLabelKey } from "@/lib/payment";
import type { Sale } from "@/lib/types";
import { formatMoney, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Receipt as ReceiptComponent } from "@/components/receipt";
import { AnimatedNumber } from "@/components/animated-number";
import { BarcodeScannerDialog } from "@/components/barcode-scanner";

/* ---------- helpers ---------- */

function paymentBadge(
  method: string,
  t: (k: "upi" | "card" | "cash" | "baridimob" | "cheque") => string
) {
  const m = method.toLowerCase();
  if (m === "upi" || m === "baridimob") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
        {t("baridimob")}
      </Badge>
    );
  }
  if (m === "card") {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">
        {t("card")}
      </Badge>
    );
  }
  if (m === "cheque") {
    return (
      <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 hover:bg-violet-500/15">
        {t("cheque")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30 hover:bg-slate-500/15">
      {t("cash")}
    </Badge>
  );
}

/**
 * Build a 7-day revenue series (oldest → newest) from a sales list.
 * Each entry: { label, key, total }.
 */
function build7DaySeries(sales: Sale[]) {
  const days: { date: Date; label: string; total: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      date: d,
      label: d.toLocaleDateString("ar-DZ-u-nu-latn", { weekday: "short" }),
      total: 0,
    });
  }

  for (const s of sales) {
    const t = new Date(s.createdAt);
    t.setHours(0, 0, 0, 0);
    const idx = days.findIndex((d) => d.date.getTime() === t.getTime());
    if (idx >= 0) days[idx].total += s.total;
  }
  return days;
}

/* ---------- main component ---------- */

export function SalesHistory() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptSize, setReceiptSize] = useState<"80mm" | "58mm">("80mm");
  const [receiptScannerOpen, setReceiptScannerOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d">(
    "all"
  );
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: salesApi.list,
  });
  const statsQuery = useQuery({
    queryKey: ["salesStats"],
    queryFn: salesApi.stats,
  });
  const shopQuery = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });

  const saleDetailQuery = useQuery({
    queryKey: ["sale", selectedId],
    queryFn: () => salesApi.get(selectedId as string),
    enabled: !!selectedId && receiptOpen,
  });

  const allSales = salesQuery.data ?? [];
  const stats = statsQuery.data;
  const shop = shopQuery.data;
  const currency = shop?.currency ?? "دج";
  const products = productsQuery.data ?? [];

  // Apply date + payment filters
  const sales = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const start7d = new Date(now);
    start7d.setDate(start7d.getDate() - 6);
    start7d.setHours(0, 0, 0, 0);
    const start30d = new Date(now);
    start30d.setDate(start30d.getDate() - 29);
    start30d.setHours(0, 0, 0, 0);

    return allSales.filter((s) => {
      const d = new Date(s.createdAt);
      let dateMatch = true;
      if (dateFilter === "today") dateMatch = d >= startToday && d <= now;
      else if (dateFilter === "7d") dateMatch = d >= start7d && d <= now;
      else if (dateFilter === "30d") dateMatch = d >= start30d && d <= now;
      const payMatch =
        paymentFilter === "all" ||
        s.paymentMethod.toLowerCase() === paymentFilter.toLowerCase();
      return dateMatch && payMatch;
    });
  }, [allSales, dateFilter, paymentFilter]);

  const series = useMemo(() => build7DaySeries(sales), [sales]);
  const maxDay = Math.max(1, ...series.map((d) => d.total));
  const chartTotal = series.reduce((sum, d) => sum + d.total, 0);

  // Profit computation: match sale items to product cost prices by name
  const profitSummary = useMemo(() => {
    const costMap = new Map<string, number>();
    products.forEach((p) => costMap.set(p.name, p.costPrice ?? 0));
    let revenue = 0;
    let cost = 0;
    let discountTotal = 0;
    sales.forEach((sale) => {
      revenue += sale.subtotal;
      discountTotal += sale.discount;
      sale.items.forEach((item) => {
        const unitCost = costMap.get(item.productName) ?? 0;
        cost += unitCost * item.quantity;
      });
    });
    const profit = revenue - cost - discountTotal;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cost, profit, margin, discountTotal };
  }, [sales, products]);

  // Tax summary: total tax collected + taxable amount + effective rate
  const taxSummary = useMemo(() => {
    let taxable = 0;
    let taxCollected = 0;
    sales.forEach((sale) => {
      taxable += Math.max(0, sale.subtotal - sale.discount);
      taxCollected += sale.taxAmount;
    });
    const effectiveRate = taxable > 0 ? (taxCollected / taxable) * 100 : 0;
    return { taxable, taxCollected, effectiveRate };
  }, [sales]);

  // Category breakdown: revenue + profit by product category
  const categoryBreakdown = useMemo(() => {
    const costMap = new Map<string, number>();
    const catMap = new Map<string, string>();
    products.forEach((p) => {
      costMap.set(p.name, p.costPrice ?? 0);
      catMap.set(p.name, p.category);
    });
    const agg = new Map<
      string,
      { revenue: number; cost: number; qty: number }
    >();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const cat = catMap.get(item.productName) ?? "Uncategorized";
        const unitCost = costMap.get(item.productName) ?? 0;
        const existing = agg.get(cat) ?? { revenue: 0, cost: 0, qty: 0 };
        existing.revenue += item.total;
        existing.cost += unitCost * item.quantity;
        existing.qty += item.quantity;
        agg.set(cat, existing);
      });
    });
    return Array.from(agg.entries())
      .map(([category, data]) => ({
        category,
        ...data,
        profit: data.revenue - data.cost,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales, products]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["sales"] });
    qc.invalidateQueries({ queryKey: ["salesStats"] });
    toast.success(t("salesRefreshed"));
  };

  const exportSalesCsv = () => {
    if (sales.length === 0) {
      toast.error(t("noSalesToExport"));
      return;
    }
    const headers = [
      "Receipt No",
      "Date/Time",
      "Items",
      "Payment Method",
      "Subtotal",
      "Discount",
      "Tax",
      "Total",
    ];
    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = sales.map((s) =>
      [
        s.receiptNo,
        formatDateTime(s.createdAt),
        s.itemCount,
        s.paymentMethod,
        s.subtotal.toFixed(2),
        s.discount.toFixed(2),
        s.taxAmount.toFixed(2),
        s.total.toFixed(2),
      ]
        .map(escape)
        .join(",")
    );
    const csv = [headers.join("|"), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swiftbill-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${sales.length} ${t("exportedSales")}`);
  };

  const openReceipt = (saleId: string) => {
    setSelectedId(saleId);
    setReceiptOpen(true);
  };

  // Handle receipt QR scan — parse swiftbill://receipt/{id} and look up the sale
  const handleReceiptScan = (scannedValue: string) => {
    // Try to parse the QR data: swiftbill://receipt/{id}?no=...&total=...
    let saleId: string | null = null;

    // Match swiftbill://receipt/{id}
    const match = scannedValue.match(/receipt\/([^?]+)/);
    if (match) {
      saleId = match[1];
    }

    // If not a QR URL, try to match by receipt number directly
    if (!saleId) {
      const byReceiptNo = allSales.find(
        (s) => s.receiptNo === scannedValue.trim()
      );
      if (byReceiptNo) {
        saleId = byReceiptNo.id;
      }
    }

    if (saleId) {
      // Verify the sale exists
      const sale = allSales.find((s) => s.id === saleId);
      if (sale) {
        openReceipt(saleId);
        toast.success(`${t("receipt")}: ${sale.receiptNo}`);
      } else {
        // Sale not in current filter — try fetching by ID
        salesApi.get(saleId).then(() => {
          openReceipt(saleId);
          toast.success(`${t("receipt")}: ${saleId.slice(-8)}`);
        }).catch(() => {
          toast.error(t("receiptNotFound"));
        });
      }
    } else {
      toast.error(t("receiptNotFound"));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareReceipt = async () => {
    if (!saleDetailQuery.data || !shop) return;
    const sale = saleDetailQuery.data;
    const lines = [
      shop.name,
      `${shop.addressLine1} ${shop.addressLine2}`.trim(),
      shop.phoneNumber ? `Ph: ${shop.phoneNumber}` : "",
      "",
      `Receipt: ${sale.receiptNo}`,
      `Date: ${formatDateTime(sale.createdAt)}`,
      `Payment: ${sale.paymentMethod}`,
      "",
      ...sale.items.map(
        (it) =>
          `${it.productName} x${it.quantity} = ${formatMoney(
            it.total,
            currency
          )}`
      ),
      "",
      `Subtotal: ${formatMoney(sale.subtotal, currency)}`,
      sale.discount > 0
        ? `Discount: -${formatMoney(sale.discount, currency)}`
        : "",
      sale.taxAmount > 0
        ? `Tax: ${formatMoney(sale.taxAmount, currency)}`
        : "",
      `TOTAL: ${formatMoney(sale.total, currency)}`,
      "",
      shop.footerText,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${t("receipt")} ${sale.receiptNo}`,
          text: lines,
        });
      } else {
        await navigator.clipboard.writeText(lines);
        toast.success(t("receiptCopied"));
      }
    } catch {
      // User cancelled share or clipboard failed — try clipboard fallback
      try {
        await navigator.clipboard.writeText(lines);
        toast.success(t("receiptCopied"));
      } catch {
        toast.error(t("couldNotShare"));
      }
    }
  };

  const statCards = [
    {
      label: t("todaysRevenue"),
      value: formatMoney(stats?.totalSales ?? 0, currency),
      numericValue: stats?.totalSales ?? 0,
      decimals: 2,
      prefix: currency,
      icon: TrendingUp,
      tint: "bg-emerald-500/15 text-emerald-600",
      big: true,
    },
    {
      label: t("transactions"),
      value: String(stats?.transactionCount ?? 0),
      numericValue: stats?.transactionCount ?? 0,
      decimals: 0,
      prefix: undefined,
      icon: Receipt,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("itemsSold"),
      value: String(stats?.itemsSold ?? 0),
      numericValue: stats?.itemsSold ?? 0,
      decimals: 0,
      prefix: undefined,
      icon: Package,
      tint: "bg-amber-500/15 text-amber-600",
    },
    {
      label: t("avgTicket"),
      value: formatMoney(stats?.avgTicket ?? 0, currency),
      numericValue: stats?.avgTicket ?? 0,
      decimals: 2,
      prefix: currency,
      icon: Calculator,
      tint: "bg-slate-500/15 text-slate-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Gradient page header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
              {t("salesAnalytics")}
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {t("trackRevenueProfit")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptScannerOpen(true)}
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              title={t("scanReceiptDesc")}
            >
              <ScanLine className="h-4 w-4" />
              {t("scanReceiptQR")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportSalesCsv}
              disabled={sales.length === 0}
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Download className="h-4 w-4" />
              {t("export")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={salesQuery.isFetching || statsQuery.isFetching}
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (salesQuery.isFetching || statsQuery.isFetching) &&
                    "animate-spin"
                )}
              />
              {t("refresh")}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
            >
              <Card className="p-4 sm:p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {s.label}
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-bold tracking-tight tabular-nums",
                        s.big ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                      )}
                    >
                      {statsQuery.isLoading ? (
                        "—"
                      ) : (
                        <AnimatedNumber
                          value={s.numericValue}
                          decimals={s.decimals}
                          prefix={s.prefix}
                        />
                      )}
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

      {/* 7-day revenue chart */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{t("last7Days")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("revenueTrend")} · {formatMoney(chartTotal, currency)} {t("total")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportSalesCsv}
              disabled={sales.length === 0}
              title={t("export")}
            >
              <Download className="h-4 w-4" />
              {t("export")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={salesQuery.isFetching || statsQuery.isFetching}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (salesQuery.isFetching || statsQuery.isFetching) && "animate-spin"
                )}
              />
              {t("refresh")}
            </Button>
          </div>
        </div>
        <div className="mt-5 flex h-32 items-end justify-between gap-2 sm:gap-3">
          {series.map((d) => {
            const pct = (d.total / maxDay) * 100;
            const isToday = d.date.getTime() === series[series.length - 1].date.getTime();
            return (
              <div
                key={d.date.toISOString()}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="flex h-24 w-full items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-[2.5rem] rounded-t-md transition-all",
                      isToday
                        ? "bg-emerald-500"
                        : "bg-emerald-500/35 hover:bg-emerald-500/55"
                    )}
                    style={{ height: `${Math.max(4, pct)}%` }}
                    title={formatMoney(d.total, currency)}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Profit summary (reflects current filters) */}
      {sales.length > 0 && (
        <Card className="gap-0 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{t("profitSummary")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("basedOn")} {sales.length} {t("filteredSales")}
              </p>
            </div>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Revenue */}
            <div className="rounded-lg border bg-emerald-500/5 p-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("revenue")}
                </p>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-600 sm:text-xl">
                {formatMoney(profitSummary.revenue, currency)}
              </p>
            </div>
            {/* Cost */}
            <div className="rounded-lg border bg-slate-500/5 p-3">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-slate-600" />
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("cost")}
                </p>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-600 sm:text-xl">
                {formatMoney(profitSummary.cost, currency)}
              </p>
            </div>
            {/* Discount */}
            <div className="rounded-lg border bg-amber-500/5 p-3">
              <div className="flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("discounts")}
                </p>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-amber-600 sm:text-xl">
                {formatMoney(profitSummary.discountTotal, currency)}
              </p>
            </div>
            {/* Net Profit */}
            <div
              className={cn(
                "rounded-lg border p-3",
                profitSummary.profit >= 0
                  ? "bg-emerald-500/10"
                  : "bg-red-500/10"
              )}
            >
              <div className="flex items-center gap-1.5">
                <Calculator
                  className={cn(
                    "h-3.5 w-3.5",
                    profitSummary.profit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  )}
                />
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("netProfit")}
                </p>
              </div>
              <p
                className={cn(
                  "mt-1 text-lg font-bold tabular-nums sm:text-xl",
                  profitSummary.profit >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                )}
              >
                {profitSummary.profit >= 0 ? "+" : ""}
                {formatMoney(profitSummary.profit, currency)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                {profitSummary.margin.toFixed(1)}% {t("margin")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tax + Category breakdown (two-column) */}
      {sales.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Tax Summary */}
          <Card className="gap-0 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{t("taxSummary")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("taxCollectedFrom")} {sales.length} {t("sales")}
                </p>
              </div>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("taxableAmount")}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoney(taxSummary.taxable, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("taxCollected")}
                </span>
                <span className="text-sm font-semibold tabular-nums text-amber-600">
                  {formatMoney(taxSummary.taxCollected, currency)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("effectiveTaxRate")}
                </span>
                <span className="text-base font-bold tabular-nums text-amber-600">
                  {taxSummary.effectiveRate.toFixed(2)}%
                </span>
              </div>
              {/* Tax rate bar */}
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-amber-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(2, taxSummary.effectiveRate * 5)
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {taxSummary.effectiveRate < 0.01
                  ? t("noTaxConfigured")
                  : `${taxSummary.effectiveRate.toFixed(
                      2
                    )}% ${t("avgApplied")}`}
              </p>
            </div>
          </Card>

          {/* Category Breakdown */}
          <Card className="gap-0 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  {t("categoryBreakdown")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("revenueProfitByCategory")}
                </p>
              </div>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            {categoryBreakdown.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t("noCategoryData")}
              </p>
            ) : (
              <div className="space-y-2.5">
                {categoryBreakdown.map((cat) => {
                  const maxRev = categoryBreakdown[0]?.revenue || 1;
                  const barWidth = (cat.revenue / maxRev) * 100;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">
                          {cat.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {cat.qty} {t("sold")}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-emerald-600">
                            {formatMoney(cat.revenue, currency)}
                          </span>
                        </div>
                      </div>
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="bg-emerald-500"
                          style={{ width: `${Math.max(2, barWidth)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Sales table */}
      <Card className="gap-0 p-0">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">
                {t("sales")}{" "}
                <span className="text-muted-foreground">
                  ({sales.length}
                  {sales.length !== allSales.length &&
                    ` ${t("of")} ${allSales.length}`}
                  )
                </span>
              </h2>
            </div>
            {(dateFilter !== "all" || paymentFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => {
                  setDateFilter("all");
                  setPaymentFilter("all");
                }}
              >
                <X className="h-3 w-3" />
                {t("clearFilters")}
              </Button>
            )}
          </div>
          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("period")}:
              </span>
              {(
                [
                  ["all", t("all")],
                  ["today", t("today_")],
                  ["7d", t("days7")],
                  ["30d", t("days30")],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDateFilter(val)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    dateFilter === val
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("payment")}:
              </span>
              {(
                [
                  ["all", t("all")],
                  ["cash", t("cash")],
                  ["upi", t("upi")],
                  ["card", t("card")],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPaymentFilter(val)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    paymentFilter === val
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">{t("receiptNo")}</TableHead>
                <TableHead>{t("dateTime")}</TableHead>
                <TableHead className="text-right">{t("items")}</TableHead>
                <TableHead>{t("payment")}</TableHead>
                <TableHead className="text-right">{t("total")}</TableHead>
                <TableHead className="pr-6 text-right">{t("action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("loadingSales")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <EmptyState t={t} />
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((s) => (
                  <TableRow
                    key={s.id}
                    className="group transition-colors hover:bg-emerald-500/5"
                  >
                    <TableCell className="pl-6 py-3.5">
                      <span className="font-mono text-[13px] font-medium transition-colors group-hover:text-primary">
                        {s.receiptNo}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                    <TableCell className="py-3.5 text-right tabular-nums">
                      {s.itemCount}
                    </TableCell>
                    <TableCell className="py-3.5">{paymentBadge(s.paymentMethod, t)}</TableCell>
                    <TableCell className="py-3.5 text-right font-bold tabular-nums transition-colors group-hover:text-primary">
                      {formatMoney(s.total, currency)}
                    </TableCell>
                    <TableCell className="pr-6 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReceipt(s.id)}
                        className="transition-all group-hover:border-primary/40 group-hover:text-primary"
                      >
                        <Eye className="h-4 w-4" />
                        {t("view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="block md:hidden">
          {salesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loadingSales")}
            </div>
          ) : sales.length === 0 ? (
            <div className="px-4 py-12">
              <EmptyState t={t} />
            </div>
          ) : (
            <ul className="divide-y">
              {sales.map((s) => (
                <li key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-medium">
                        {s.receiptNo}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(s.createdAt)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {paymentBadge(s.paymentMethod, t)}
                        <span className="text-xs text-muted-foreground">
                          {s.itemCount} {t("items")}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold tabular-nums">
                        {formatMoney(s.total, currency)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReceipt(s.id)}
                      >
                        <Eye className="h-4 w-4" />
                        {t("view")}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Receipt dialog */}
      <Dialog
        open={receiptOpen}
        onOpenChange={(o) => {
          setReceiptOpen(o);
          if (!o) {
            // small delay to let the modal close cleanly
            setTimeout(() => setSelectedId(null), 200);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="no-print sm:max-w-[360px] p-4"
        >
          <DialogHeader className="text-center">
            <DialogTitle className="text-base">{t("receipt")}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-white scrollbar-emerald">
            {saleDetailQuery.isLoading || !shop ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loadingReceipt")}
              </div>
            ) : saleDetailQuery.data && shop ? (
              <ReceiptComponent
                shop={shop}
                sale={saleDetailQuery.data}
                size={receiptSize}
                className="bg-white"
              />
            ) : (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {t("couldNotLoadReceipt")}
              </div>
            )}
          </div>

          {/* Size toggle */}
          <div className="no-print flex items-center justify-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("paper")}:
            </span>
            {(["80mm", "58mm"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setReceiptSize(s)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  receiptSize === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <DialogFooter className="gap-2 no-print sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setReceiptOpen(false)}
              disabled={saleDetailQuery.isLoading}
            >
              <X className="h-4 w-4" />
              {t("close")}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleShareReceipt}
                disabled={!saleDetailQuery.data || !shop}
                title={t("share")}
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("share")}</span>
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!saleDetailQuery.data || !shop}
              >
                <Printer className="h-4 w-4" />
                {t("print")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt QR scanner dialog */}
      <BarcodeScannerDialog
        open={receiptScannerOpen}
        onOpenChange={setReceiptScannerOpen}
        onScan={handleReceiptScan}
      />
    </div>
  );
}

/* ---------- empty state ---------- */

function EmptyState({ t }: { t: (k: "noSalesRecorded" | "completeFirstSale") => string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <ReceiptText className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{t("noSalesRecorded")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("completeFirstSale")}
        </p>
      </div>
    </div>
  );
}
