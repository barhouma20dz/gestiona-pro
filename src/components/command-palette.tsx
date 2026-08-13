"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
  Moon,
  Sun,
  Plus,
  ShoppingCart,
  PackagePlus,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";
import { useTheme } from "next-themes";
import { productsApi, shopApi } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import { formatMoney, initialsOf, colorFromString } from "@/lib/format";

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

  // Products query for product search
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
    enabled: open, // only fetch when palette opens
  });

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
    enabled: open,
  });

  const addProduct = useCartStore((s) => s.addProduct);
  const currency = shop?.currency ?? "₹";

  const handleNavigate = (v: ViewKey) => {
    onNavigate(v);
    onOpenChange(false);
  };

  const toggleTheme = () => {
    const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";
    setTheme(isDark ? "light" : "dark");
    onOpenChange(false);
  };

  const handleAddProduct = (product: (typeof products)[number]) => {
    if (product.stock <= 0) {
      toast.error("Out of stock", { description: product.name });
      return;
    }
    addProduct(product);
    toast.success(`${product.name} added to cart`, { duration: 1500 });
    onOpenChange(false);
    onNavigate("pos");
  };

  // Show only products that are in stock, limited to 6 for performance
  const availableProducts = products.filter((p) => p.stock > 0).slice(0, 8);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search actions, pages, products…" />
      <CommandList className="max-h-[460px]">
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

        {availableProducts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Add Product to Cart">
              {availableProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.barcode} ${product.category}`}
                  onSelect={() => handleAddProduct(product)}
                  className="cursor-pointer"
                >
                  <span
                    className="mr-2 grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-bold text-foreground/70"
                    style={{ backgroundColor: colorFromString(product.name) }}
                  >
                    {initialsOf(product.name)}
                  </span>
                  <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {product.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {product.barcode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-primary tabular-nums">
                        {formatMoney(product.price, currency)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {product.stock} left
                      </span>
                      <PackagePlus className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

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
