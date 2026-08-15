"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Truck,
  CalendarClock,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { shopApi, productsApi } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { PosTerminal } from "@/components/views/pos-terminal";
import { ProductManager } from "@/components/views/product-manager";
import { SalesHistory } from "@/components/views/sales-history";
import { ShopDetails } from "@/components/views/shop-details";
import { SettingsView } from "@/components/views/settings-view";
import { Dashboard } from "@/components/views/dashboard";
import { Suppliers } from "@/components/views/suppliers";
import { ExpiryTracking } from "@/components/views/expiry-tracking";
import { AdminDashboard } from "@/components/views/admin-dashboard";
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
    | "suppliers"
    | "expiryTracking"
    | "shopDetails"
    | "settings"
    | "adminDashboard";
  descKey:
    | "storeOverview"
    | "scanBillCheckout"
    | "manageInventory"
    | "pastBills"
    | "suppliersSubtitle"
    | "expiryTrackingSubtitle"
    | "businessInformation"
    | "appConfiguration"
    | "adminSubtitle";
  icon: typeof ScanLine;
  superAdminOnly?: boolean;
}

const NAV: NavItem[] = [
  { key: "dashboard", labelKey: "dashboard", descKey: "storeOverview", icon: LayoutDashboard },
  { key: "pos", labelKey: "posTerminal", descKey: "scanBillCheckout", icon: ScanLine },
  { key: "products", labelKey: "products", descKey: "manageInventory", icon: Package },
  { key: "sales", labelKey: "salesHistory", descKey: "pastBills", icon: ReceiptText },
  { key: "suppliers", labelKey: "suppliers", descKey: "suppliersSubtitle", icon: Truck },
  { key: "expiry", labelKey: "expiryTracking", descKey: "expiryTrackingSubtitle", icon: CalendarClock },
  { key: "shop", labelKey: "shopDetails", descKey: "businessInformation", icon: Store },
  { key: "settings", labelKey: "settings", descKey: "appConfiguration", icon: Settings },
  { key: "admin", labelKey: "adminDashboard", descKey: "adminSubtitle", icon: ShieldCheck, superAdminOnly: true },
];

function SidebarContent({
  view,
  onSelect,
  shopName,
  lowStockCount,
  isSuperAdmin,
  onLogout,
  userEmail,
}: {
  view: ViewKey;
  onSelect: (v: ViewKey) => void;
  shopName?: string;
  lowStockCount: number;
  isSuperAdmin: boolean;
  onLogout: () => void;
  userEmail?: string;
}) {
  const { t } = useLanguage();
  // Filter nav items: super admin sees only admin dashboard; store owners see everything except admin
  const visibleNav = NAV.filter((item) => {
    if (isSuperAdmin) return item.superAdminOnly;
    return !item.superAdminOnly;
  });
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
        {visibleNav.map((item) => {
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
              {item.superAdminOnly && (
                <span
                  className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  )}
                  title="SUPER_ADMIN"
                >
                  <ShieldCheck className="h-3 w-3" />
                </span>
              )}
              {active && !showStockBadge && !item.superAdminOnly && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-sidebar-accent/60 p-3">
          {isSuperAdmin ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {t("superAdmin")}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-sidebar-accent-foreground">
                {userEmail || "admin"}
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {t("activeStore")}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-sidebar-accent-foreground">
                {shopName || "—"}
              </p>
            </>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] text-sidebar-foreground/60">{t("live")}</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-sidebar-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-500"
              aria-label={t("logout")}
              title={t("logout")}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { t, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [view, setView] = useState<ViewKey>(isSuperAdmin ? "admin" : "dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());

  const handleLogout = () => {
    logout();
  };

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
    enabled: !isSuperAdmin, // super admin has no store
  });

  // Products query — used to compute the low-stock badge on the Products nav item
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
    enabled: !isSuperAdmin, // super admin has no products
  });
  const lowStockProducts = products.filter((p) => p.stock >= 0 && p.stock <= 5);
  const lowStockCount = lowStockProducts.length;
  const notifiedRef = useRef(false);

  // Low-stock alert toast on app load (fires once when products first load)
  useEffect(() => {
    if (isSuperAdmin || notifiedRef.current || products.length === 0) return;
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
  }, [products, lowStockCount, t, isSuperAdmin]);

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

  // The admin nav item is filtered out of the sidebar for non-super-admins
  // via the `superAdminOnly` flag, and `renderView` re-checks the role before
  // rendering the admin surface — so we don't need a setState-in-effect here.

  const current = useMemo(
    () => NAV.find((n) => n.key === view) ?? (isSuperAdmin ? NAV.find((n) => n.key === "admin")! : NAV[0]),
    [view, isSuperAdmin]
  );
  const CurrentIcon = current.icon;

  const select = (v: ViewKey) => {
    // Super admin can only navigate to admin dashboard
    if (isSuperAdmin && v !== "admin") return;
    setView(v);
    setMobileOpen(false);
  };

  const renderView = () => {
    // Super admin only sees the admin dashboard
    if (isSuperAdmin) {
      return <AdminDashboard />;
    }
    switch (view) {
      case "dashboard":
        return <Dashboard onNavigate={select} />;
      case "pos":
        return <PosTerminal />;
      case "products":
        return <ProductManager />;
      case "sales":
        return <SalesHistory />;
      case "suppliers":
        return <Suppliers />;
      case "expiry":
        return <ExpiryTracking />;
      case "shop":
        return <ShopDetails />;
      case "settings":
        return <SettingsView />;
      case "admin":
        return <Dashboard onNavigate={select} />;
      default:
        return <Dashboard onNavigate={select} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0">
        <SidebarContent view={view} onSelect={select} shopName={shop?.name} lowStockCount={lowStockCount} isSuperAdmin={isSuperAdmin} onLogout={handleLogout} userEmail={user?.email} />
      </aside>

      {/* Mobile sidebar — opens from the right in RTL, left in LTR */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={isRTL ? "right" : "left"} className="w-64 p-0">
          <SidebarContent view={view} onSelect={select} shopName={shop?.name} lowStockCount={lowStockCount} isSuperAdmin={isSuperAdmin} onLogout={handleLogout} userEmail={user?.email} />
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

            {/* Logout button in header */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
              onClick={handleLogout}
              aria-label={t("logout")}
              title={t("logout")}
            >
              <LogOut className="h-[18px] w-[18px]" />
            </Button>

            {/* Cart pill — hidden for super admin */}
            {!isSuperAdmin && (
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
            )}
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
              {isSuperAdmin ? t("superAdmin") : (shop?.name || t("noStoreConfigured"))}
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
