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
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCircle,
  LayoutGrid,
  ClipboardCheck,
  HandHeart,
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
import { SellerManagement } from "@/components/views/seller-management";
import { SellerDashboard } from "@/components/views/seller-dashboard";
import { SellerSettings } from "@/components/views/seller-settings";
import { InventoryAudit } from "@/components/views/inventory-audit";
import { Zakat } from "@/components/views/zakat";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { CommandPalette } from "@/components/command-palette";
import { toast } from "sonner";

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
    | "adminDashboard"
    | "sellerManagement"
    | "sellerDashboard"
    | "sellerSettings"
    | "inventoryAudit"
    | "zakat";
  descKey:
    | "storeOverview"
    | "scanBillCheckout"
    | "manageInventory"
    | "pastBills"
    | "suppliersSubtitle"
    | "expiryTrackingSubtitle"
    | "businessInformation"
    | "appConfiguration"
    | "adminSubtitle"
    | "sellerManagementSubtitle"
    | "sellerDashboardSubtitle"
    | "sellerSettingsSubtitle"
    | "annualAuditDesc"
    | "zakatDesc";
  icon: typeof ScanLine;
  superAdminOnly?: boolean;
  ownerOnly?: boolean;
  staffOnly?: boolean;
}

const NAV: NavItem[] = [
  // Owner dashboard (owner only)
  { key: "dashboard", labelKey: "dashboard", descKey: "storeOverview", icon: LayoutDashboard, ownerOnly: true },
  // Seller dashboard (staff only)
  { key: "sellerDashboard", labelKey: "sellerDashboard", descKey: "sellerDashboardSubtitle", icon: LayoutGrid, staffOnly: true },
  // Shared store views
  { key: "pos", labelKey: "posTerminal", descKey: "scanBillCheckout", icon: ScanLine },
  { key: "products", labelKey: "products", descKey: "manageInventory", icon: Package },
  { key: "sales", labelKey: "salesHistory", descKey: "pastBills", icon: ReceiptText },
  { key: "suppliers", labelKey: "suppliers", descKey: "suppliersSubtitle", icon: Truck },
  { key: "expiry", labelKey: "expiryTracking", descKey: "expiryTrackingSubtitle", icon: CalendarClock },
  // Owner-only management views
  { key: "inventoryAudit", labelKey: "inventoryAudit", descKey: "annualAuditDesc", icon: ClipboardCheck, ownerOnly: true },
  { key: "zakat", labelKey: "zakat", descKey: "zakatDesc", icon: HandHeart, ownerOnly: true },
  { key: "sellerMgmt", labelKey: "sellerManagement", descKey: "sellerManagementSubtitle", icon: Users, ownerOnly: true },
  { key: "shop", labelKey: "shopDetails", descKey: "businessInformation", icon: Store, ownerOnly: true },
  { key: "settings", labelKey: "settings", descKey: "appConfiguration", icon: Settings, ownerOnly: true },
  // Staff-only settings
  { key: "sellerSettings", labelKey: "sellerSettings", descKey: "sellerSettingsSubtitle", icon: UserCircle, staffOnly: true },
  // Super admin
  { key: "admin", labelKey: "adminDashboard", descKey: "adminSubtitle", icon: ShieldCheck, superAdminOnly: true },
];

function SidebarContent({
  view,
  onSelect,
  shopName,
  lowStockCount,
  isSuperAdmin,
  isStaff,
  onLogout,
  userEmail,
  subDaysRemaining,
  subStatus,
}: {
  view: ViewKey;
  onSelect: (v: ViewKey) => void;
  shopName?: string;
  lowStockCount: number;
  isSuperAdmin: boolean;
  isStaff: boolean;
  onLogout: () => void;
  userEmail?: string;
  subDaysRemaining: number | null;
  subStatus: string;
}) {
  const { t } = useLanguage();
  // Filter nav items by role:
  // - super admin: only admin dashboard
  // - staff: staff-only + shared (no owner-only, no super-admin-only)
  // - owner: owner-only + shared (no staff-only, no super-admin-only)
  const visibleNav = NAV.filter((item) => {
    if (isSuperAdmin) return item.superAdminOnly;
    if (isStaff) return item.staffOnly || (!item.ownerOnly && !item.superAdminOnly);
    // owner
    return item.ownerOnly || (!item.staffOnly && !item.superAdminOnly);
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

      {/* Subscription status badge (store owners only — not staff, not super admin) */}
      {!isSuperAdmin && !isStaff && subDaysRemaining !== null && (
        <div className="px-3 pb-2">
          <button
            onClick={() => onSelect("settings")}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              subStatus === "EXPIRED" || subStatus === "SUSPENDED"
                ? "border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/15"
                : subDaysRemaining <= 3
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15"
            )}
            title={t("activateLicense")}
          >
            <div className="flex items-center gap-1.5">
              {subStatus === "TRIAL" && (
                <Clock className="h-3.5 w-3.5" />
              )}
              {subStatus === "ACTIVE" && (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {(subStatus === "EXPIRED" || subStatus === "SUSPENDED") && (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              <span>
                {subStatus === "TRIAL"
                  ? t("trialActive")
                  : subStatus === "ACTIVE"
                  ? t("activeLabel")
                  : t("expiredLabel")}
              </span>
            </div>
            <span className="font-bold tabular-nums">
              {subDaysRemaining > 0
                ? `${subDaysRemaining} ${t("days")}`
                : t("expiredLabel")}
            </span>
          </button>
        </div>
      )}

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
          ) : isStaff ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {t("roleStaff")}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-sidebar-accent-foreground">
                {userEmail || "—"}
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
  const isStaff = user?.role === "STAFF";
  const defaultView: ViewKey = isSuperAdmin
    ? "admin"
    : isStaff
    ? "sellerDashboard"
    : "dashboard";
  const [view, setView] = useState<ViewKey>(defaultView);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());

  // When the user role changes (e.g., right after login), ensure the view is valid
  useEffect(() => {
    setView((current) => {
      const item = NAV.find((n) => n.key === current);
      if (!item) return defaultView;
      if (isSuperAdmin && !item.superAdminOnly) return "admin";
      if (isStaff && (item.ownerOnly || item.superAdminOnly)) return "sellerDashboard";
      if (!isStaff && !isSuperAdmin && (item.staffOnly || item.superAdminOnly)) return "dashboard";
      return current;
    });
  }, [isStaff, isSuperAdmin, defaultView]);

  const handleLogout = () => {
    logout();
  };

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
    enabled: !isSuperAdmin, // super admin has no store
  });

  // Subscription query — for days remaining badge (owner only)
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () =>
      import("@/lib/api").then((m) =>
        m.subscriptionApi.get()
      ),
    enabled: !isSuperAdmin && !isStaff,
  });

  // Compute days remaining
  const subDaysRemaining = (() => {
    if (!subscription?.subscription) return null;
    const end = new Date(subscription.subscription.endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  })();
  const subStatus = subscription?.subscription?.status ?? "TRIAL";

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

  const current = useMemo(
    () => NAV.find((n) => n.key === view) ??
      (isSuperAdmin
        ? NAV.find((n) => n.key === "admin")!
        : isStaff
        ? NAV.find((n) => n.key === "sellerDashboard")!
        : NAV[0]),
    [view, isSuperAdmin, isStaff]
  );
  const CurrentIcon = current.icon;

  const select = (v: ViewKey) => {
    // Super admin can only navigate to admin dashboard
    if (isSuperAdmin && v !== "admin") return;
    // Staff cannot navigate to owner-only or super-admin-only views
    if (isStaff) {
      const item = NAV.find((n) => n.key === v);
      if (item && (item.ownerOnly || item.superAdminOnly)) return;
    }
    // Owners cannot navigate to staff-only views
    if (!isStaff && !isSuperAdmin) {
      const item = NAV.find((n) => n.key === v);
      if (item && item.staffOnly) return;
    }
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
      case "sellerDashboard":
        return <SellerDashboard onNavigate={select} />;
      case "sellerMgmt":
        return <SellerManagement />;
      case "sellerSettings":
        return <SellerSettings />;
      case "inventoryAudit":
        return <InventoryAudit />;
      case "zakat":
        return <Zakat />;
      default:
        return isStaff ? (
          <SellerDashboard onNavigate={select} />
        ) : (
          <Dashboard onNavigate={select} />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0">
        <SidebarContent view={view} onSelect={select} shopName={shop?.name} lowStockCount={lowStockCount} isSuperAdmin={isSuperAdmin} isStaff={isStaff} onLogout={handleLogout} userEmail={user?.email} subDaysRemaining={subDaysRemaining} subStatus={subStatus} />
      </aside>

      {/* Mobile sidebar — opens from the right in RTL, left in LTR */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={isRTL ? "right" : "left"} className="w-64 p-0">
          <SidebarContent view={view} onSelect={select} shopName={shop?.name} lowStockCount={lowStockCount} isSuperAdmin={isSuperAdmin} isStaff={isStaff} onLogout={handleLogout} userEmail={user?.email} subDaysRemaining={subDaysRemaining} subStatus={subStatus} />
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
              {isSuperAdmin
                ? t("superAdmin")
                : isStaff
                ? (user?.name || user?.email || t("roleStaff"))
                : (shop?.name || t("noStoreConfigured"))}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline">
              {new Date().toLocaleDateString("ar-DZ-u-nu-latn", {
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
