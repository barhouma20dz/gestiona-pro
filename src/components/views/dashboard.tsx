"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ScanLine,
  Plus,
  TrendingUp,
  Boxes,
  AlertTriangle,
  Receipt,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  BarChart3,
  Store,
  ShoppingCart,
  Trophy,
  PieChart,
  Clock,
} from "lucide-react";

import { productsApi, salesApi, shopApi } from "@/lib/api";
import type { ViewKey } from "@/lib/types";
import { formatMoney, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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

function stockBadgeFor(stock: number) {
  if (stock === 0) {
    return (
      <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/15">
        0 left
      </Badge>
    );
  }
  if (stock <= 5) {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">
        {stock} left
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
      {stock} left
    </Badge>
  );
}

/**
 * Mini sparkline — renders an inline SVG polyline of the last 7 days' revenue.
 * Each point's Y is proportional to the max value; zero points sit on the baseline.
 */
function RevenueSparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const width = 120;
  const height = 36;
  const pad = 3;
  const max = Math.max(...values, 1); // avoid divide-by-zero
  const innerH = height - pad * 2;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + innerH - (v / max) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = points.join(" ");

  // Area path (fill under the line)
  const areaPath =
    values.length > 0
      ? `M ${pad},${(pad + innerH).toFixed(1)} L ${path
          .replace(/ /g, " L ")} L ${(pad + (values.length - 1) * step).toFixed(
            1
          )},${(pad + innerH).toFixed(1)} Z`
      : "";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill="url(#sparkGrad)" />}
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const x = pad + i * step;
        const y = pad + innerH - (v / max) * innerH;
        const isLast = i === values.length - 1;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={isLast ? 2.5 : 0}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}

/* ---------- quick actions config ---------- */

interface QuickAction {
  title: string;
  subtitle: string;
  icon: typeof ScanLine;
  tint: string;
  view: ViewKey;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Start Billing",
    subtitle: "Open POS terminal",
    icon: ScanLine,
    tint: "bg-emerald-500/15 text-emerald-600",
    view: "pos",
  },
  {
    title: "Manage Products",
    subtitle: "Inventory & prices",
    icon: Package,
    tint: "bg-slate-500/15 text-slate-600",
    view: "products",
  },
  {
    title: "View Reports",
    subtitle: "Sales history & trends",
    icon: BarChart3,
    tint: "bg-amber-500/15 text-amber-600",
    view: "sales",
  },
  {
    title: "Shop Settings",
    subtitle: "Business profile & tax",
    icon: Store,
    tint: "bg-slate-500/15 text-slate-600",
    view: "shop",
  },
];

/* ---------- sub-components ---------- */

function LegendRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", color)} />
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <span className="text-[12px] font-semibold tabular-nums">{count}</span>
    </div>
  );
}

const PAYMENT_COLORS: Record<string, string> = {
  upi: "#10b981", // emerald-500
  card: "#f59e0b", // amber-500
  cash: "#64748b", // slate-500
};

function paymentColor(method: string): string {
  return PAYMENT_COLORS[method.toLowerCase()] ?? "#94a3b8";
}

/**
 * Donut chart — renders an SVG conic-gradient-like donut for payment breakdown.
 * Each segment is an SVG stroke-dasharray on a circle.
 */
function PaymentDonut({
  segments,
}: {
  segments: { method: string; percent: number }[];
}) {
  const size = 128;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Precompute cumulative offsets so we don't mutate during render.
  const segs = segments.reduce<
    { method: string; percent: number; dash: number; offset: number }[]
  >((acc, seg) => {
    const dash = (seg.percent / 100) * circumference;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    acc.push({ method: seg.method, percent: seg.percent, dash, offset });
    return acc;
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted"
      />
      {segs.map((seg, i) => (
        <circle
          key={`${seg.method}-${i}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={paymentColor(seg.method)}
          strokeWidth={stroke}
          strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
          strokeDashoffset={-seg.offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ))}
      {/* Center label */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-lg font-bold"
      >
        {segments.length}
      </text>
      <text
        x="50%"
        y="50%"
        dy="16"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-muted-foreground text-[9px] font-medium uppercase tracking-wider"
      >
        methods
      </text>
    </svg>
  );
}

function PaymentLegendRow({
  method,
  count,
  revenue,
  percent,
  currency,
}: {
  method: string;
  count: number;
  revenue: number;
  percent: number;
  currency: string;
}) {
  const color = paymentColor(method);
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-[12px] font-medium capitalize truncate">
          {method}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {percent.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {count}× {formatMoney(revenue, currency)}
        </span>
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

export function Dashboard({
  onNavigate,
}: {
  onNavigate: (view: ViewKey) => void;
}) {
  /* queries */
  const shopQuery = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  const statsQuery = useQuery({
    queryKey: ["salesStats"],
    queryFn: salesApi.stats,
  });
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });
  const salesQuery = useQuery({ queryKey: ["sales"], queryFn: salesApi.list });

  const shop = shopQuery.data;
  const currency = shop?.currency ?? "₹";
  const stats = statsQuery.data;
  const products = productsQuery.data ?? [];
  const sales = salesQuery.data ?? [];

  /* derived */
  const inventoryValue = useMemo(
    () => products.reduce((sum, p) => sum + p.price * p.stock, 0),
    [products]
  );
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock >= 1 && p.stock <= 5).length,
    [products]
  );
  const outOfStockCount = useMemo(
    () => products.filter((p) => p.stock === 0).length,
    [products]
  );
  const healthyCount = Math.max(
    0,
    products.length - lowStockCount - outOfStockCount
  );

  const topLowStock = useMemo(
    () => [...products].sort((a, b) => a.stock - b.stock).slice(0, 5),
    [products]
  );
  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);

  // 7-day revenue trend for the sparkline (oldest → newest, today is last)
  const revenueTrend = useMemo(() => {
    const days: number[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const total = sales
        .filter((s) => {
          const d = new Date(s.createdAt);
          return d >= day && d < next;
        })
        .reduce((sum, s) => sum + s.total, 0);
      days.push(total);
    }
    return days;
  }, [sales]);
  const weekTotal = revenueTrend.reduce((a, b) => a + b, 0);
  const prevDaysTotal = revenueTrend.slice(0, 6).reduce((a, b) => a + b, 0);
  const todayVsPrev =
    prevDaysTotal === 0
      ? null
      : ((revenueTrend[6] - prevDaysTotal / 6) / (prevDaysTotal / 6)) * 100;

  // Top selling products (by quantity sold across all sales)
  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { name: string; qty: number; revenue: number }
    >();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = map.get(item.productName) ?? {
          name: item.productName,
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.quantity;
        existing.revenue += item.total;
        map.set(item.productName, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales]);

  // Payment method breakdown (by revenue)
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    sales.forEach((sale) => {
      const key = sale.paymentMethod || "Cash";
      const existing = map.get(key) ?? { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += sale.total;
      map.set(key, existing);
    });
    const total = sales.length;
    return Array.from(map.entries()).map(([method, data]) => ({
      method,
      ...data,
      percent: total > 0 ? (data.count / total) * 100 : 0,
    }));
  }, [sales]);

  // Sales by hour (last 7 days, 24 buckets) for the heatmap
  const hourlyBuckets = useMemo(() => {
    const buckets = new Array(24).fill(0) as number[];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    sales.forEach((sale) => {
      const d = new Date(sale.createdAt);
      if (d >= cutoff) {
        buckets[d.getHours()] += sale.total;
      }
    });
    return buckets;
  }, [sales]);
  const maxHourly = Math.max(1, ...hourlyBuckets);
  const peakHour = hourlyBuckets.indexOf(Math.max(...hourlyBuckets));
  const totalHourly = hourlyBuckets.reduce((a, b) => a + b, 0);

  /* greeting */
  const now = new Date();
  const fullDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  /* KPI cards */
  const kpis: {
    label: string;
    value: string;
    icon: typeof TrendingUp;
    tint: string;
    subtitle: string;
    comparison?: boolean;
    clickable?: boolean;
    loading: boolean;
  }[] = [
    {
      label: "Today's Revenue",
      value: formatMoney(stats?.totalSales ?? 0, currency),
      icon: TrendingUp,
      tint: "bg-emerald-500/15 text-emerald-600",
      subtitle: `from ${stats?.transactionCount ?? 0} sales`,
      comparison: true,
      loading: statsQuery.isLoading,
    },
    {
      label: "Inventory Value",
      value: formatMoney(inventoryValue, currency),
      icon: Boxes,
      tint: "bg-amber-500/15 text-amber-600",
      subtitle: `${products.length} products`,
      loading: productsQuery.isLoading,
    },
    {
      label: "Low Stock Alerts",
      value: String(lowStockCount),
      icon: AlertTriangle,
      tint: "bg-orange-500/15 text-orange-600",
      subtitle: `${outOfStockCount} out of stock`,
      clickable: true,
      loading: productsQuery.isLoading,
    },
    {
      label: "Avg Ticket",
      value: formatMoney(stats?.avgTicket ?? 0, currency),
      icon: Receipt,
      tint: "bg-slate-500/15 text-slate-600",
      subtitle: "per transaction today",
      loading: statsQuery.isLoading,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {shopQuery.isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              shop?.name ?? "SwiftBill POS"
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{fullDate}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            onClick={() => onNavigate("pos")}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <ScanLine className="h-4 w-4" />
            New Sale
          </Button>
          <Button variant="outline" onClick={() => onNavigate("products")}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* 2. KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          const card = (
            <Card
              className={cn(
                "gap-0 p-4 transition-shadow hover:shadow-md sm:p-5",
                kpi.clickable && "cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  {kpi.loading ? (
                    <Skeleton className="mt-2 h-7 w-24" />
                  ) : (
                    <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
                      {kpi.value}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {kpi.subtitle}
                  </p>
                  {kpi.comparison && (
                    <div className="mt-2 flex items-center gap-2">
                      {todayVsPrev !== null ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                            todayVsPrev >= 0
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-red-500/10 text-red-600"
                          )}
                        >
                          {todayVsPrev >= 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {Math.abs(todayVsPrev).toFixed(0)}% vs avg
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <ArrowUpRight className="h-3 w-3" />
                          Today
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        7d: {formatMoney(weekTotal, currency)}
                      </span>
                    </div>
                  )}
                  {kpi.comparison && !salesQuery.isLoading && weekTotal > 0 && (
                    <div className="mt-2 text-emerald-600">
                      <RevenueSparkline values={revenueTrend} />
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full",
                    kpi.tint
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
            >
              {kpi.clickable ? (
                <button
                  type="button"
                  onClick={() => onNavigate("products")}
                  className="block w-full text-left"
                >
                  {card}
                </button>
              ) : (
                card
              )}
            </motion.div>
          );
        })}
      </div>

      {/* 3. Recent Sales + Inventory Health */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Recent Sales */}
        <Card className="gap-0 p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold">Recent Sales</h2>
              <p className="text-xs text-muted-foreground">Latest transactions</p>
            </div>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-emerald-600 hover:text-emerald-700"
              onClick={() => onNavigate("sales")}
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {salesQuery.isLoading ? (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between gap-4 px-4 py-3 sm:px-6",
                    i < 4 && "border-b"
                  )}
                >
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-12 rounded-md" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentSales.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-6">
              <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">No sales yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start your first sale to see activity here.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onNavigate("pos")}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <ScanLine className="h-4 w-4" />
                Start a sale
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {recentSales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[13px] font-medium">
                      {sale.receiptNo}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTime(sale.createdAt)} · {sale.itemCount} item
                      {sale.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {paymentBadge(sale.paymentMethod)}
                    <span className="font-bold tabular-nums">
                      {formatMoney(sale.total, currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Right: Inventory Health */}
        <Card className="gap-0 p-0 lg:col-span-1">
          <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold">Inventory Health</h2>
              <p className="text-xs text-muted-foreground">Stock overview</p>
            </div>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-emerald-600 hover:text-emerald-700"
              onClick={() => onNavigate("products")}
            >
              Manage
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {productsQuery.isLoading ? (
            <div className="space-y-4 px-4 py-4 sm:px-6">
              <Skeleton className="h-2.5 w-full rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-6">
              <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Boxes className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">No products yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add your first product to track inventory.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigate("products")}
              >
                <Plus className="h-4 w-4" />
                Add product
              </Button>
            </div>
          ) : (
            <div className="space-y-4 px-4 py-4 sm:px-6">
              {/* Stacked horizontal bar */}
              <div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${(outOfStockCount / products.length) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-amber-500"
                    style={{
                      width: `${(lowStockCount / products.length) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-emerald-500"
                    style={{
                      width: `${(healthyCount / products.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Legend rows */}
              <div className="space-y-2">
                <LegendRow
                  color="bg-red-500"
                  label="Out of stock"
                  count={outOfStockCount}
                />
                <LegendRow
                  color="bg-amber-500"
                  label="Low stock (1-5)"
                  count={lowStockCount}
                />
                <LegendRow
                  color="bg-emerald-500"
                  label="Healthy (>5)"
                  count={healthyCount}
                />
              </div>

              <Separator />

              {/* Top 5 low stock items */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Top 5 low stock
                </p>
                <ul className="space-y-2">
                  {topLowStock.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatMoney(p.price, currency)}
                        </p>
                      </div>
                      {stockBadgeFor(p.stock)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 3.5. Top Selling Products + Payment Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Selling Products */}
        <Card className="gap-0 p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold">Top Selling Products</h2>
              <p className="text-xs text-muted-foreground">
                Best sellers by quantity
              </p>
            </div>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>

          {salesQuery.isLoading ? (
            <div className="space-y-3 px-4 py-4 sm:px-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-6">
              <div className="grid size-12 place-items-center rounded-full bg-amber-500/10 text-amber-600">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">No sales data yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Top sellers will appear here once you make sales.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {topProducts.map((p, i) => {
                const maxQty = topProducts[0]?.qty || 1;
                const barWidth = (p.qty / maxQty) * 100;
                return (
                  <li
                    key={p.name}
                    className="flex items-center gap-3 px-4 py-3 sm:px-6"
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                        i === 0
                          ? "bg-amber-500 text-white"
                          : i === 1
                          ? "bg-slate-400 text-white"
                          : i === 2
                          ? "bg-amber-700/80 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {p.qty} sold
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-primary tabular-nums">
                          {formatMoney(p.revenue, currency)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Payment Method Breakdown */}
        <Card className="gap-0 p-0 lg:col-span-1">
          <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold">Payments</h2>
              <p className="text-xs text-muted-foreground">Method breakdown</p>
            </div>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </div>

          {salesQuery.isLoading ? (
            <div className="space-y-3 px-4 py-6 sm:px-6">
              <Skeleton className="mx-auto h-32 w-32 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : paymentBreakdown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-6">
              <div className="grid size-12 place-items-center rounded-full bg-slate-500/10 text-slate-500">
                <PieChart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">No payments yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Payment breakdown will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 px-4 py-5 sm:px-6">
              {/* Donut chart */}
              <div className="flex justify-center">
                <PaymentDonut
                  segments={paymentBreakdown.map((b) => ({
                    method: b.method,
                    percent: b.percent,
                  }))}
                />
              </div>
              {/* Legend */}
              <div className="space-y-2">
                {paymentBreakdown.map((b) => (
                  <PaymentLegendRow
                    key={b.method}
                    method={b.method}
                    count={b.count}
                    revenue={b.revenue}
                    percent={b.percent}
                    currency={currency}
                  />
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 3.75. Sales by Hour Heatmap */}
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold">Sales by Hour</h2>
            <p className="text-xs text-muted-foreground">
              Last 7 days · {formatMoney(totalHourly, currency)} total
              {peakHour > 0 && totalHourly > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-emerald-600">
                    Peak at {peakHour}:00
                  </span>
                </>
              )}
            </p>
          </div>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>

        {salesQuery.isLoading ? (
          <div className="px-4 py-8 sm:px-6">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : totalHourly === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-6">
            <div className="grid size-12 place-items-center rounded-full bg-slate-500/10 text-slate-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">No hourly data yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sales by hour will appear here as you make sales.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 sm:px-6">
            {/* Heatmap bars: 24 hours */}
            <div className="flex items-end gap-[3px] sm:gap-1" style={{ height: "120px" }}>
              {hourlyBuckets.map((value, hour) => {
                const pct = (value / maxHourly) * 100;
                const hasSales = value > 0;
                const isPeak = hour === peakHour && hasSales;
                return (
                  <div
                    key={hour}
                    className="group relative flex flex-1 flex-col items-center justify-end"
                    style={{ height: "100%" }}
                    title={`${hour}:00 — ${hour + 1}:00 · ${formatMoney(
                      value,
                      currency
                    )}`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-all",
                        isPeak
                          ? "bg-emerald-500"
                          : hasSales
                          ? "bg-emerald-500/40 hover:bg-emerald-500/60"
                          : "bg-muted"
                      )}
                      style={{ height: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {/* Hour labels */}
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>23h</span>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <motion.div
                key={qa.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
                whileHover={{ y: -2 }}
              >
                <button
                  type="button"
                  onClick={() => onNavigate(qa.view)}
                  className="block w-full text-left"
                >
                  <Card className="gap-0 p-5 transition-shadow hover:shadow-md">
                    <div
                      className={cn(
                        "grid size-10 place-items-center rounded-xl",
                        qa.tint
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-semibold">{qa.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {qa.subtitle}
                    </p>
                  </Card>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
