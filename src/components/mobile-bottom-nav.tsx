"use client";

import { useMemo } from "react";
import {
  ScanLine,
  Package,
  ReceiptText,
  Radio,
  Menu,
  ShoppingCart,
  LayoutDashboard,
} from "lucide-react";
import { useRoomSyncStore } from "@/lib/room-sync-store";
import { useCartStore } from "@/lib/cart-store";
import type { ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  currentView: ViewKey;
  onSelectView: (view: ViewKey) => void;
  onOpenMenu: () => void;
}

export function MobileBottomNav({
  currentView,
  onSelectView,
  onOpenMenu,
}: MobileBottomNavProps) {
  const { incomingOrders, isConnected, role } = useRoomSyncStore();
  const cart = useCartStore();

  const totalItems = useMemo(
    () => cart.items.reduce((s, it) => s + it.quantity, 0),
    [cart.items]
  );

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-lg md:hidden">
      <div className="grid grid-cols-5 h-16 items-center px-1 safe-area-bottom">
        {/* POS Button */}
        <button
          type="button"
          onClick={() => onSelectView("pos")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 transition-colors relative",
            currentView === "pos"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <ScanLine className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">نقطة البيع</span>
        </button>

        {/* Products */}
        <button
          type="button"
          onClick={() => onSelectView("products")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 transition-colors",
            currentView === "products"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-5 w-5" />
          <span className="text-[10px] leading-tight">المنتجات</span>
        </button>

        {/* Sales */}
        <button
          type="button"
          onClick={() => onSelectView("sales")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 transition-colors",
            currentView === "sales"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ReceiptText className="h-5 w-5" />
          <span className="text-[10px] leading-tight">المبيعات</span>
        </button>

        {/* Room Sync */}
        <button
          type="button"
          onClick={() => onSelectView("roomSync")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 transition-colors relative",
            currentView === "roomSync"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <Radio className="h-5 w-5" />
            {incomingOrders.length > 0 ? (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center animate-bounce">
                {incomingOrders.length}
              </span>
            ) : isConnected ? (
              <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-emerald-500" />
            ) : null}
          </div>
          <span className="text-[10px] leading-tight">ربط الغرفة</span>
        </button>

        {/* More Menu */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-1 py-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] leading-tight">المزيد</span>
        </button>
      </div>
    </nav>
  );
}
