"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ScanLine,
  Package,
  ReceiptText,
  Store,
  Settings,
  Search,
  Moon,
  Sun,
  Plus,
  ShoppingCart,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";
import { useTheme } from "next-themes";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onNavigate: (v: ViewKey) => void;
}

const NAV_ITEMS: {
  key: ViewKey;
  label: string;
  icon: typeof ScanLine;
  desc: string;
  keywords: string;
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    desc: "Store overview & KPIs",
    keywords: "home overview stats",
  },
  {
    key: "pos",
    label: "POS Terminal",
    icon: ScanLine,
    desc: "Scan & bill checkout",
    keywords: "scan bill cart checkout sale",
  },
  {
    key: "products",
    label: "Products",
    icon: Package,
    desc: "Manage inventory",
    keywords: "inventory stock items catalog",
  },
  {
    key: "sales",
    label: "Sales History",
    icon: ReceiptText,
    desc: "Past bills & receipts",
    keywords: "receipts transactions history reports",
  },
  {
    key: "shop",
    label: "Shop Details",
    icon: Store,
    desc: "Business information",
    keywords: "store business address settings",
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    desc: "App configuration",
    keywords: "config tax printer preferences",
  },
];

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: CommandPaletteProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [productQuery, setProductQuery] = useState("");

  // Cmd+K / Ctrl+K listener is in the parent (app-shell) to avoid duplicate mounts.
  // But we also allow closing on Escape (handled by CommandDialog automatically).

  const handleNavigate = (v: ViewKey) => {
    onNavigate(v);
    onOpenChange(false);
  };

  const toggleTheme = () => {
    const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";
    setTheme(isDark ? "light" : "dark");
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search actions, pages…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => handleNavigate("pos")}
            className="cursor-pointer"
          >
            <ShoppingCart className="mr-2 h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium">New Sale</span>
              <span className="text-xs text-muted-foreground">
                Go to POS terminal
              </span>
            </div>
          </CommandItem>
          <CommandItem
            onSelect={() => handleNavigate("products")}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium">Add Product</span>
              <span className="text-xs text-muted-foreground">
                Open product manager
              </span>
            </div>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.key}
                value={`${item.label} ${item.keywords}`}
                onSelect={() => handleNavigate(item.key)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-1 items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.desc}
                    </span>
                  </div>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Preferences">
          <CommandItem onSelect={toggleTheme} className="cursor-pointer">
            {resolvedTheme === "dark" ? (
              <Sun className="mr-2 h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="mr-2 h-4 w-4 text-violet-500" />
            )}
            <div className="flex flex-col">
              <span className="font-medium">
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
              </span>
              <span className="text-xs text-muted-foreground">
                Toggle color theme
              </span>
            </div>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// Re-export for convenience if needed elsewhere
export { NAV_ITEMS as COMMAND_NAV_ITEMS };
