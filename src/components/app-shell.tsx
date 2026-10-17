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
  UserRound,
  LayoutGrid,
  ClipboardCheck,
  HandHeart,
  Radio,
  BarChart3,
  Landmark,
  Wallet,
} from "lucide-react";
import type { ViewKey, Shop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
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
import { Customers } from "@/components/views/customers";
import { RoomSyncView } from "@/components/views/room-sync-view";
import { DailyReportView } from "@/components/views/daily-report-view";
import { ExpensesView } from "@/components/views/expenses-view";
import { CashDrawerDialog } from "@/components/cash-drawer-dialog";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { CommandPalette } from "@/components/command-palette";
import { toast } from "sonner";

import {
  NAV_ITEMS_CATALOG,
  NAV_SECTIONS,
  parseSidebarConfig,
  type NavItemDef,
} from "@/lib/navigation";

type NavItem = NavItemDef;
const NAV = NAV_ITEMS_CATALOG;

function SidebarContent({
  view,
  onSelect,
  shop,
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
  shop?: Shop | null;
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

  // Parse custom sidebar ordering & visibility if configured
  const effectiveConfig = useMemo(() => {
    let rawConfig = shop?.sidebarConfig;
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("gestiona_user_sidebar_config");
        if (local) {
          rawConfig = local;
        }
      } catch {
        // ignore
      }
    }
    return parseSidebarConfig(rawConfig);
  }, [shop?.sidebarConfig]);

  // Group and sort nav items into sections
  const navSections = useMemo(() => {
    const itemConfigMap = new Map<string, { visible: boolean; order: number; sectionId?: string }>();
    effectiveConfig.items.forEach((it) => {
      itemConfigMap.set(it.id, it);
    });

    const sectionConfigMap = new Map<string, { visible: boolean; order: number }>();
    effectiveConfig.sections.forEach((s) => {
      sectionConfigMap.set(s.id, s);
    });

    // Security & Role check:
    const roleFiltered = NAV_ITEMS_CATALOG.filter((item) => {
      if (isSuperAdmin) return item.superAdminOnly;
      if (isStaff) return item.staffOnly || (!item.ownerOnly && !item.superAdminOnly);
      return item.ownerOnly || (!item.staffOnly && !item.superAdminOnly);
    });

    return NAV_SECTIONS.map((sec) => {
      const secCfg = sectionConfigMap.get(sec.id);
      const isSecVisible = secCfg ? secCfg.visible : true;
      const secOrder = secCfg ? secCfg.order : sec.order;

      // Filter items for this section
      const items = roleFiltered
        .filter((it) => {
          const cfg = itemConfigMap.get(it.key);
          const assignedSection = cfg?.sectionId || it.sectionId;
          return assignedSection === sec.id;
        })
        .filter((it) => {
          // Settings is always accessible for owner to prevent lock-out
          if (it.fixed || it.key === "settings") return true;
          if (!isSecVisible) return false;
          const cfg = itemConfigMap.get(it.key);
          return cfg ? cfg.visible : true;
        })
        .sort((a, b) => {
          const orderA = itemConfigMap.get(a.key)?.order ?? a.defaultOrder;
          const orderB = itemConfigMap.get(b.key)?.order ?? b.defaultOrder;
          return orderA - orderB;
        });

      return {
        ...sec,
        order: secOrder,
        visible: isSecVisible && items.length > 0,
        items,
      };
    })
      .filter((sec) => sec.visible && sec.items.length > 0)
      .sort((a, b) => a.order - b.order);
  }, [effectiveConfig, isSuperAdmin, isStaff]);

  // Determine primary display image (LOGO vs STORE_PHOTO)
  const displayImage = useMemo(() => {
    if (!shop) return null;
    if (shop.primaryDisplayImage === "STORE_PHOTO" && shop.storePhotoUrl) {
      return { url: shop.storePhotoUrl, isPhoto: true };
    }
    if (shop.logoUrl) {
      return { url: shop.logoUrl, isPhoto: false };
    }
    if (shop.storePhotoUrl) {
      return { url: shop.storePhotoUrl, isPhoto: true };
    }
    return null;
  }, [shop]);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
        {displayImage ? (
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-sidebar-border bg-black/20 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImage.url}
              alt={shop?.name || t("appName")}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30">
            {shop?.name ? shop.name.slice(0, 1).toUpperCase() : "S"}
          </div>
        )}
        <div className="leading-tight min-w-0">
          <p className="font-bold text-sm tracking-tight truncate">
            {shop?.name || t("appName")}
          </p>
          <p className="text-[11px] text-sidebar-foreground/60 truncate">
            {shop?.businessType || t("appTagline")}
          </p>
        </div>
      </div>

      {/* Nav with Section Groups */}
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto scrollbar-emerald">
        {navSections.map((sec) => (
          <div key={sec.id} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/45">
              {sec.titleAr}
            </p>
            {sec.items.map((item) => {
              const active = view === item.key;
              const Icon = item.icon;
              const showStockBadge = item.key === "products" && lowStockCount > 0;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      active
                        ? "text-primary-foreground"
                        : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                    )}
                  />
                  <span className="flex-1 text-start truncate">{t(item.labelKey)}</span>
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
          </div>
        ))}
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
  const [cashDrawerOpen, setCashDrawerOpen] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());

  // URL search params handling (e.g. mobile app direct room connection or view select)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get("view");
    const urlRoom = params.get("room");
    const urlPin = params.get("pin");
    const urlRole = params.get("role");
    const urlDevName = params.get("devName");

    if (urlView && NAV.some((n) => n.key === urlView)) {
      setView(urlView as ViewKey);
    } else if (urlRole === "cashier" || urlRole === "order_taker") {
      setView("pos");
    } else if (urlRole === "customer_display") {
      setView("roomSync");
    }

    if (urlRoom) {
      import("@/lib/room-sync-store").then(({ useRoomSyncStore }) => {
        const store = useRoomSyncStore.getState();
        if (urlRole) store.setRole(urlRole as any);
        if (urlDevName) store.setDeviceName(decodeURIComponent(urlDevName));
        void store.joinRoom(urlRoom, urlPin || undefined);
      });
    }
  }, []);

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
        return <Dashboard onNavigate={select} onOpenCashDrawer={() => setCashDrawerOpen(true)} />;
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
      case "customers":
        return <Customers />;
      case "inventoryAudit":
        return <InventoryAudit />;
      case "zakat":
        return <Zakat />;
      case "roomSync":
        return <RoomSyncView />;
      case "dailyReport":
        return <DailyReportView />;
      case "expenses":
        return <ExpensesView />;
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
        <SidebarContent view={view} onSelect={select} shop={shop} shopName={shop?.name} lowStockCount={lowStockCount} isSuperAdmin={isSuperAdmin} isStaff={isStaff} onLogout={handleLogout} userEmail={user?.email} subDaysRemaining={subDaysRemaining} subStatus={subStatus} />
      </aside>

      {/* Mobile sidebar — opens from the right in RTL, left in LTR */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={isRTL ? "right" : "left"} className="w-64 p-0">
          <SidebarContent view={view} onSelect={select} shop={shop} shopName={shop?.name} lowStockCount={lowStockCount} isSuperAdmin={isSuperAdmin} isStaff={isStaff} onLogout={handleLogout} userEmail={user?.email} subDaysRemaining={subDaysRemaining} subStatus={subStatus} />
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

          {/* Cash Drawer button */}
          {!isSuperAdmin && (
            <button
              onClick={() => setCashDrawerOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-500/20"
              title="إدارة درج النقود والورديات"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>درج النقود</span>
            </button>
          )}

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
        <main className="flex-1 overflow-y-auto scrollbar-emerald pb-24 md:pb-6">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{renderView()}</div>
        </main>

        {/* Status footer (visible on tablet & desktop) */}
        <footer className="hidden md:flex h-9 shrink-0 items-center justify-between border-t bg-card px-4 text-[11px] text-muted-foreground md:px-6">
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
            <span className="hidden md:inline font-mono">
              {formatDate(new Date())}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t("systemOperational")}
            </span>
          </div>
        </footer>

        {/* Mobile bottom navigation bar */}
        <MobileBottomNav
          currentView={view}
          onSelectView={select}
          onOpenMenu={() => setMobileOpen(true)}
        />
      </div>

      <CashDrawerDialog open={cashDrawerOpen} onOpenChange={setCashDrawerOpen} />
    </div>
  );
}
