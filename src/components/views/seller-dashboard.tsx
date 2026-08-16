"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Receipt,
  Wallet,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  ScanLine,
  Package,
  ArrowLeft,
  ReceiptText,
  Loader2,
} from "lucide-react";

import { myEarningsApi, salesApi, shopApi } from "@/lib/api";
import type { Sale, ViewKey } from "@/lib/types";
import { formatMoney, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import type { TranslationKey } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnimatedNumber } from "@/components/animated-number";

type T = (key: TranslationKey) => string;

/* ---------- helpers ---------- */

function paymentBadge(method: string, t: T) {
  const m = method.toLowerCase();
  if (m === "upi") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
        {t("upi")}
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
  return (
    <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30 hover:bg-slate-500/15">
      {t("cash")}
    </Badge>
  );
}

/* ---------- main component ---------- */

export function SellerDashboard({
  onNavigate,
}: {
  onNavigate: (v: ViewKey) => void;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ["my-earnings"],
    queryFn: myEarningsApi.get,
  });
  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const currency = shop?.currency ?? "₹";

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["sales", "mine"],
    queryFn: () => salesApi.list(),
  });

  // Recent sales (top 8)
  const recentSales = useMemo(() => sales.slice(0, 8), [sales]);

  const helloName = user?.name || user?.email?.split("@")[0] || "";

  /* KPI cards */
  const kpis = [
    {
      label: t("dailyRevenue"),
      value: earnings?.todayRevenue ?? 0,
      count: earnings?.todaySales ?? 0,
      icon: CalendarDays,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("weeklyRevenue"),
      value: earnings?.weekRevenue ?? 0,
      count: earnings?.weekSales ?? 0,
      icon: CalendarRange,
      tint: "bg-amber-500/15 text-amber-600",
    },
    {
      label: t("monthlyRevenue"),
      value: earnings?.monthRevenue ?? 0,
      count: earnings?.monthSales ?? 0,
      icon: CalendarClock,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("totalSales"),
      value: earnings?.totalSales ?? 0,
      count: earnings?.totalSales ?? 0,
      icon: Receipt,
      tint: "bg-emerald-500/15 text-emerald-600",
      isCount: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Gradient hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-50/80">
              {t("sellerPanel")}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight drop-shadow-sm sm:text-3xl">
              {t("welcomeSeller")}, {helloName} 👋
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/80">
              {t("sellerDashboardSubtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onNavigate("pos")}
              className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"
            >
              <ScanLine className="h-4 w-4" />
              {t("startSelling")}
            </Button>
            <Button
              onClick={() => onNavigate("products")}
              variant="outline"
              className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Package className="h-4 w-4" />
              {t("viewProducts")}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
            >
              <Card className="gap-0 p-4 sm:p-5">
                {earningsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-7 w-3/4" />
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {k.label}
                      </p>
                      <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl tabular-nums">
                        {k.isCount ? (
                          <AnimatedNumber value={k.value} />
                        ) : (
                          <AnimatedNumber
                            value={k.value}
                            decimals={2}
                            prefix={currency}
                          />
                        )}
                      </p>
                      {!k.isCount && k.count > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {k.count} {t("totalSales").toLowerCase()}
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-xl",
                        k.tint
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Profit vs Revenue comparison + daily series */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Profit vs Revenue card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.25 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{t("revenueVsProfit")}</h3>
                <p className="text-xs text-muted-foreground">{t("allTime")}</p>
              </div>
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            {earningsLoading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <RevenueBar
                  label={t("totalRevenue")}
                  value={earnings?.totalRevenue ?? 0}
                  total={Math.max(
                    earnings?.totalRevenue ?? 0,
                    earnings?.totalProfit ?? 0,
                    1
                  )}
                  currency={currency}
                  colorClass="bg-emerald-500"
                />
                <RevenueBar
                  label={t("totalProfit")}
                  value={earnings?.totalProfit ?? 0}
                  total={Math.max(
                    earnings?.totalRevenue ?? 0,
                    earnings?.totalProfit ?? 0,
                    1
                  )}
                  currency={currency}
                  colorClass="bg-teal-500"
                />
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    {t("margin")}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {earnings && earnings.totalRevenue > 0
                      ? `${Math.round(
                          (earnings.totalProfit / earnings.totalRevenue) * 100
                        )}%`
                      : "0%"}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Last 7 days chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.25 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{t("last7DaysEarnings")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("revenueVsProfit")}
                </p>
              </div>
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            {earningsLoading ? (
              <div className="mt-4">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : earnings?.dailySeries && earnings.dailySeries.length > 0 ? (
              <DailyChart
                data={earnings.dailySeries}
                currency={currency}
                t={t}
              />
            ) : (
              <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
                <ReceiptText className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("noSellerSalesYet")}
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Recent sales table */}
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <h2 className="text-sm font-semibold">
            {t("recentSales")}{" "}
            <span className="text-muted-foreground">({sales.length})</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("sales")}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
          >
            {t("viewAll")}
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          </Button>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">{t("receiptNo")}</TableHead>
                <TableHead>{t("dateTime")}</TableHead>
                <TableHead className="text-center">{t("items")}</TableHead>
                <TableHead className="text-center">{t("payment")}</TableHead>
                <TableHead className="pr-6 text-right">{t("total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("loadingSales")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : recentSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <EmptySales t={t} onSell={() => onNavigate("pos")} />
                  </TableCell>
                </TableRow>
              ) : (
                recentSales.map((s) => (
                  <TableRow key={s.id} className="hover:bg-emerald-500/5">
                    <TableCell className="pl-6 py-3.5 font-mono text-xs">
                      {s.receiptNo}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="tabular-nums">
                        {s.itemCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {paymentBadge(s.paymentMethod, t)}
                    </TableCell>
                    <TableCell className="pr-6 text-right font-semibold tabular-nums">
                      {formatMoney(s.total, currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="block md:hidden">
          {salesLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loadingSales")}
            </div>
          ) : recentSales.length === 0 ? (
            <div className="px-4 py-12">
              <EmptySales t={t} onSell={() => onNavigate("pos")} />
            </div>
          ) : (
            <ul className="divide-y">
              {recentSales.map((s: Sale) => (
                <li key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">
                        {s.receiptNo}
                      </p>
                      <p className="truncate text-sm font-medium">
                        {formatMoney(s.total, currency)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(s.createdAt)} · {s.itemCount} {t("items")}
                      </p>
                    </div>
                    <div>{paymentBadge(s.paymentMethod, t)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Profit vs Revenue bar ---------- */

function RevenueBar({
  label,
  value,
  total,
  currency,
  colorClass,
}: {
  label: string;
  value: number;
  total: number;
  currency: string;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.max(2, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {formatMoney(value, currency)}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={cn("h-full rounded-full", colorClass)}
        />
      </div>
    </div>
  );
}

/* ---------- Daily chart ---------- */

function DailyChart({
  data,
  currency,
  t,
}: {
  data: { date: string; revenue: number; profit: number }[];
  currency: string;
  t: T;
}) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div className="mt-4">
      <div className="flex items-end gap-2 h-32">
        {data.map((d) => {
          const revPct = Math.max(2, (d.revenue / max) * 100);
          const profitPct =
            d.revenue > 0
              ? Math.max(2, (d.profit / d.revenue) * revPct)
              : 0;
          const dayLabel = new Date(d.date).toLocaleDateString("en-IN", {
            weekday: "short",
          });
          return (
            <div
              key={d.date}
              className="flex flex-1 flex-col items-center justify-end gap-1.5"
              title={`${dayLabel}: ${formatMoney(
                d.revenue,
                currency
              )} · ${formatMoney(d.profit, currency)} profit`}
            >
              <div className="relative flex w-full flex-col justify-end h-24">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-emerald-600 to-teal-500"
                  style={{ height: `${revPct}%` }}
                >
                  <div
                    className="w-full rounded-t-sm bg-emerald-800/40"
                    style={{ height: `${profitPct}%` }}
                  />
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground">
                {dayLabel[0]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {t("totalRevenue")}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-800/60" />
          {t("totalProfit")}
        </div>
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */

function EmptySales({ t, onSell }: { t: T; onSell: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <ReceiptText className="h-7 w-7" />
      </div>
      <div>
        <p className="font-medium">{t("noSellerSalesYet")}</p>
        <p className="text-sm text-muted-foreground">
          {t("noSellerSalesDesc")}
        </p>
      </div>
      <Button onClick={onSell} size="sm">
        <ScanLine className="h-4 w-4" />
        {t("startSelling")}
      </Button>
    </div>
  );
}
