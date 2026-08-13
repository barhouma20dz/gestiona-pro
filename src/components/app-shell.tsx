"use client";

import { useState } from "react";
import {
  ScanLine,
  Package,
  ReceiptText,
  Store,
  Settings,
  ShoppingCart,
  Menu,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { shopApi } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import { PosTerminal } from "@/components/views/pos-terminal";
import { ProductManager } from "@/components/views/product-manager";
import { SalesHistory } from "@/components/views/sales-history";
import { ShopDetails } from "@/components/views/shop-details";
import { SettingsView } from "@/components/views/settings-view";

const NAV: { key: ViewKey; label: string; icon: typeof ScanLine; desc: string }[] =
  [
    { key: "pos", label: "POS Terminal", icon: ScanLine, desc: "Scan & bill" },
    { key: "products", label: "Products", icon: Package, desc: "Manage inventory" },
    { key: "sales", label: "Sales History", icon: ReceiptText, desc: "Past bills" },
    { key: "shop", label: "Shop Details", icon: Store, desc: "Business info" },
    { key: "settings", label: "Settings", icon: Settings, desc: "App config" },
  ];

function SidebarContent({
  view,
  onSelect,
  shopName,
}: {
  view: ViewKey;
  onSelect: (v: ViewKey) => void;
  shopName?: string;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30">
          S
        </div>
        <div className="leading-tight">
          <p className="font-bold text-base tracking-tight">SwiftBill</p>
          <p className="text-[11px] text-sidebar-foreground/60">POS System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-emerald">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Menu
        </p>
        {NAV.map((item) => {
          const active = view === item.key;
          const Icon = item.icon;
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
              <span className="flex-1 text-left">{item.label}</span>
              {active && (
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
            Active Store
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-sidebar-accent-foreground">
            {shopName || "—"}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] text-sidebar-foreground/60">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const [view, setView] = useState<ViewKey>("pos");
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });

  const current = NAV.find((n) => n.key === view)!;
  const CurrentIcon = current.icon;

  const renderView = () => {
    switch (view) {
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

  const select = (v: ViewKey) => {
    setView(v);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0">
        <SidebarContent view={view} onSelect={select} shopName={shop?.name} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent view={view} onSelect={select} shopName={shop?.name} />
        </SheetContent>
      </Sheet>

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
                {current.label}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {current.desc}
              </p>
            </div>
          </div>

          {/* Cart pill */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setView("pos")}
              className="relative flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-accent"
            >
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow">
                  {cartCount}
                </span>
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
            <span className="font-medium text-foreground/70">SwiftBill POS</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {shop?.name || "No store configured"}
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
              System operational
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
