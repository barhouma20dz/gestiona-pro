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
} from "lucide-react";

import { salesApi, shopApi } from "@/lib/api";
import type { Sale } from "@/lib/types";
import { formatMoney, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
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

/* ---------- helpers ---------- */

function paymentBadge(method: string) {
  const m = method.toLowerCase();
  if (m === "upi") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
        UPI
      </Badge>
    );
  }
  if (m === "card") {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">
        Card
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30 hover:bg-slate-500/15">
      Cash
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
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
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
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptSize, setReceiptSize] = useState<"80mm" | "58mm">("80mm");
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

  const saleDetailQuery = useQuery({
    queryKey: ["sale", selectedId],
    queryFn: () => salesApi.get(selectedId as string),
    enabled: !!selectedId && receiptOpen,
  });

  const allSales = salesQuery.data ?? [];
  const stats = statsQuery.data;
  const shop = shopQuery.data;
  const currency = shop?.currency ?? "₹";

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

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["sales"] });
    qc.invalidateQueries({ queryKey: ["salesStats"] });
    toast.success("Sales refreshed");
  };

  const exportSalesCsv = () => {
    if (sales.length === 0) {
      toast.error("No sales to export");
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
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swiftbill-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sales.length} sales to CSV`);
  };

  const openReceipt = (saleId: string) => {
    setSelectedId(saleId);
    setReceiptOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const statCards = [
    {
      label: "Today's Revenue",
      value: formatMoney(stats?.totalSales ?? 0, currency),
      icon: TrendingUp,
      tint: "bg-emerald-500/15 text-emerald-600",
      big: true,
    },
    {
      label: "Transactions",
      value: String(stats?.transactionCount ?? 0),
      icon: Receipt,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: "Items Sold",
      value: String(stats?.itemsSold ?? 0),
      icon: Package,
      tint: "bg-amber-500/15 text-amber-600",
    },
    {
      label: "Avg Ticket",
      value: formatMoney(stats?.avgTicket ?? 0, currency),
      icon: Calculator,
      tint: "bg-slate-500/15 text-slate-600",
    },
  ];

  return (
    <div className="space-y-6">
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
              <Card className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {s.label}
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-bold tracking-tight",
                        s.big ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                      )}
                    >
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

      {/* 7-day revenue chart */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Last 7 days</h3>
            <p className="text-xs text-muted-foreground">
              Revenue trend · {formatMoney(chartTotal, currency)} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportSalesCsv}
              disabled={sales.length === 0}
              title="Export filtered sales to CSV"
            >
              <Download className="h-4 w-4" />
              Export
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
              Refresh
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

      {/* Sales table */}
      <Card className="gap-0 p-0">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">
                Sales{" "}
                <span className="text-muted-foreground">
                  ({sales.length}
                  {sales.length !== allSales.length &&
                    ` of ${allSales.length}`}
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
                Clear filters
              </Button>
            )}
          </div>
          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Period:
              </span>
              {(
                [
                  ["all", "All"],
                  ["today", "Today"],
                  ["7d", "7 days"],
                  ["30d", "30 days"],
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
                Payment:
              </span>
              {(
                [
                  ["all", "All"],
                  ["cash", "Cash"],
                  ["upi", "UPI"],
                  ["card", "Card"],
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
                <TableHead className="pl-6">Receipt No</TableHead>
                <TableHead>Date / Time</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading sales…
                    </div>
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6">
                      <span className="font-mono text-[13px] font-medium">
                        {s.receiptNo}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.itemCount}
                    </TableCell>
                    <TableCell>{paymentBadge(s.paymentMethod)}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatMoney(s.total, currency)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReceipt(s.id)}
                      >
                        <Eye className="h-4 w-4" />
                        View
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
              Loading sales…
            </div>
          ) : sales.length === 0 ? (
            <div className="px-4 py-12">
              <EmptyState />
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
                        {paymentBadge(s.paymentMethod)}
                        <span className="text-xs text-muted-foreground">
                          {s.itemCount} item{s.itemCount === 1 ? "" : "s"}
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
                        View
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
            <DialogTitle className="text-base">Receipt</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-white scrollbar-emerald">
            {saleDetailQuery.isLoading || !shop ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading receipt…
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
                Could not load receipt.
              </div>
            )}
          </div>

          {/* Size toggle */}
          <div className="no-print flex items-center justify-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Paper:
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
              Close
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!saleDetailQuery.data || !shop}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- empty state ---------- */

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <ReceiptText className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">No sales recorded yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete your first sale from the POS Terminal.
        </p>
      </div>
    </div>
  );
}
