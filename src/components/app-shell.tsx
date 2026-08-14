"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ScanLine,
  Package,
  ReceiptText,
  Store,
  Settings,
  ShoppingCart,
  Menu,
  Command as CommandIcon,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { shopApi, productsApi } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { PosTerminal } from "@/components/views/pos-terminal";
import { ProductManager } from "@/components/views/product-manager";
import { SalesHistory } from "@/components/views/sales-history";
import { ShopDetails } from "@/components/views/shop-details";
import { SettingsView } from "@/components/views/settings-view";
import { Dashboard } from "@/components/views/dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { CommandPalette } from "@/components/command-palette";

interface NavItem {
  key: ViewKey;
  labelKey:
    | "dashboard"
    | "posTerminal"
    | "products"
    | "salesHistory"
    | "shopDetails"
    | "settings";
  descKey:
    | "storeOverview"
    | "scanBillCheckout"
    | "manageInventory"
    | "pastBills"
    | "businessInformation"
    | "appConfiguration";
  icon: typeof ScanLine;
}

const NAV: NavItem[] = [
  { key: "dashboard", labelKey: "dashboard", descKey: "storeOverview", icon: LayoutDashboard },
  { key: "pos", labelKey: "posTerminal", descKey: "scanBillCheckout", icon: ScanLine },
  { key: "products", labelKey: "products", descKey: "manageInventory", icon: Package },
  { key: "sales", labelKey: "salesHistory", descKey: "pastBills", icon: ReceiptText },
  { key: "shop", labelKey: "shopDetails", descKey: "businessInformation", icon: Store },
  { key: "settings", labelKey: "settings", descKey: "appConfiguration", icon: Settings },
];

function SidebarContent({
  view,
  onSelect,
  shopName,
  lowStockCount,
}: {
  view: ViewKey;
  onSelect: (v: ViewKey) => void;
  shopName?: string;
  lowStockCount: number;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30">
          S
        </div>
        <div className="leading-tight">
          <p className="font-bold text-base tracking-tight">{t("appName")}</p>
          <p className="text-[11px] text-sidebar-foreground/60">{t("appTagline")}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-emerald">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          {t("menu")}
        </p>
        {NAV.map((item) => {
          const active = view === item.key;
          const Icon = item.icon;
          // Show low-stock badge on Products nav item
          const showStockBadge = item.key === "products" && lowStockCount > 0;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                )}
              />
              <span className="flex-1 text-left">{t(item.labelKey)}</span>
              {showStockBadge && (
                <span
                  className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-amber-500 text-white"
                  )}
                  title={`${lowStockCount} ${t("needRestocking")}`}
                >
                  {lowStockCount}
                </span>
              )}
              {active && !showStockBadge && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Shop card */}
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-sidebar-accent/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {t("activeStore")}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-sidebar-accent-foreground">
            {shopName || "—"}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] text-sidebar-foreground/60">{t("live")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { t, isRTL } = useLanguage();
  const [view, setView] = useState<ViewKey>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });

  // Products query — used to compute the low-stock badge on the Products nav item
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });
  const lowStockProducts = products.filter((p) => p.stock >= 0 && p.stock <= 5);
  const lowStockCount = lowStockProducts.length;
  const notifiedRef = useRef(false);

  // Low-stock alert toast on app load (fires once when products first load)
  useEffect(() => {
    if (notifiedRef.current || products.length === 0) return;
    notifiedRef.current = true;
    if (lowStockCount > 0) {
      const outOfStock = products.filter((p) => p.stock === 0).length;
      const lowOnly = lowStockCount - outOfStock;
      toast.warning(`${lowStockCount} ${t("productsNeedAttention")}`, {
        description:
          (outOfStock > 0 ? `${outOfStock} ${t("outOfStockWord")}` : "") +
          (outOfStock > 0 && lowOnly > 0 ? " · " : "") +
          (lowOnly > 0 ? `${lowOnly} ${t("lowStockWord")}` : ""),
        duration: 6000,
        action: {
          label: t("view"),
          onClick: () => setView("products"),
        },
      });
    }
  }, [products, lowStockCount, t]);

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const current = NAV.find((n) => n.key === view)!;
  const CurrentIcon = current.icon;

  const select = (v: ViewKey) => {
    setView(v);
    setMobileOpen(false);
  };

  const renderView = () => {
    switch (view) {
      case "dashboard":
        return <Dashboard onNavigate={select} />;
      case "pos":
        return <PosTerminal />;
      case "products":
        return <ProductManager />;
      case "sales":
        return <SalesHistory />;
      case "shop":
        return <ShopDetails />;
      case "settings":
        return <SettingsView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0">
        <SidebarContent view={view} onSelect={select} shopName={shop?.name} lowStockCount={lowStockCount} />
      </aside>

      {/* Mobile sidebar — opens from the right in RTL, left in LTR */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={isRTL ? "right" : "left"} className="w-64 p-0">
          <SidebarContent view={view} onSelect={select} shopName={shop?.name} lowStockCount={lowStockCount} />
        </SheetContent>
      </Sheet>

      {/* Command palette */}
      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onNavigate={select}
      />

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label={t("openNavMenu")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <CurrentIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight">
                {t(current.labelKey)}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {t(current.descKey)}
              </p>
            </div>
          </div>

          {/* Search trigger (Cmd+K) */}
          <button
            onClick={() => setCmdOpen(true)}
            className="ml-auto hidden sm:flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted"
          >
            <CommandIcon className="h-4 w-4" />
            <span className="text-xs">{t("search")}…</span>
            <kbd className="ml-2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
            <ThemeToggle />
            <LanguageToggle />

            {/* Cart pill */}
            <button
              onClick={() => setView("pos")}
              className="relative flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-accent"
              aria-label={`${t("cart")}${cartCount > 0 ? ` (${cartCount} ${t("items")})` : ""}`}
            >
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">{t("cart")}</span>
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.3, 1], opacity: 1 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>
          </div>
        </header>

        {/* View content */}
        <main className="flex-1 overflow-y-auto scrollbar-emerald">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{renderView()}</div>
        </main>

        {/* Status footer (always pinned) */}
        <footer className="flex h-9 shrink-0 items-center justify-between border-t bg-card px-4 text-[11px] text-muted-foreground md:px-6">
          <div className="flex items-center gap-3">
            <span className="font-medium text-foreground/70">{t("appName")} POS</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {shop?.name || t("noStoreConfigured")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t("systemOperational")}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
