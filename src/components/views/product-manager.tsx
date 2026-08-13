"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Wallet,
  AlertTriangle,
  PackageX,
  Loader2,
  ScanLine,
  X,
  Copy,
  TrendingUp,
} from "lucide-react";

import { productsApi } from "@/lib/api";
import type { Product, NewProduct } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ---------- helpers ---------- */

function stockBadge(stock: number) {
  if (stock === 0) {
    return (
      <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/15">
        Out of stock
      </Badge>
    );
  }
  if (stock <= 5) {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">
        Low · {stock} left
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
      {stock} in stock
    </Badge>
  );
}

function categoryBadge(category: string) {
  return (
    <Badge variant="outline" className="font-medium">
      {category}
    </Badge>
  );
}

/* ---------- form state ---------- */

interface FormState {
  name: string;
  barcode: string;
  price: string;
  costPrice: string;
  stock: string;
  category: string;
}

const emptyForm: FormState = {
  name: "",
  barcode: "",
  price: "",
  costPrice: "0",
  stock: "0",
  category: "General",
};

function toForm(p: Product): FormState {
  return {
    name: p.name,
    barcode: p.barcode,
    price: String(p.price),
    costPrice: String(p.costPrice ?? 0),
    stock: String(p.stock),
    category: p.category,
  };
}

/* ---------- main component ---------- */

export function ProductManager() {
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });

  // Filter state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  /* Derived stats */
  const stats = useMemo(() => {
    const list = products ?? [];
    const totalValue = list.reduce((sum, p) => sum + p.price * p.stock, 0);
    const totalCost = list.reduce(
      (sum, p) => sum + (p.costPrice ?? 0) * p.stock,
      0
    );
    const potentialProfit = totalValue - totalCost;
    const avgMargin =
      totalValue > 0 ? (potentialProfit / totalValue) * 100 : 0;
    const lowStock = list.filter((p) => p.stock >= 1 && p.stock <= 5).length;
    const outStock = list.filter((p) => p.stock === 0).length;
    return {
      total: list.length,
      totalValue,
      totalCost,
      potentialProfit,
      avgMargin,
      lowStock,
      outStock,
    };
  }, [products]);

  /* Unique categories for filter + datalist */
  const categories = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach((p) => set.add(p.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  /* Filtered list */
  const filtered = useMemo(() => {
    const list = products ?? [];
    const q = search.trim().toLowerCase();
    return list
      .filter((p) => (category === "all" ? true : p.category === category))
      .filter((p) =>
        q === ""
          ? true
          : p.name.toLowerCase().includes(q) ||
            p.barcode.toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [products, search, category]);

  /* Mutations */
  const createMutation = useMutation({
    mutationFn: (data: NewProduct) => productsApi.create(data),
    onSuccess: () => {
      toast.success("Product created");
      qc.invalidateQueries({ queryKey: ["products"] });
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create product"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewProduct> }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      toast.success("Product updated");
      qc.invalidateQueries({ queryKey: ["products"] });
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update product"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete product"),
  });

  /* Form handlers */
  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm(toForm(p));
    setFormErrors({});
    setFormOpen(true);
  };

  const duplicateProduct = (p: Product) => {
    // Open the add form pre-filled with the product's data, barcode suffixed with "-COPY"
    setEditing(null);
    setForm({
      name: `${p.name} (Copy)`,
      barcode: `${p.barcode}-COPY`,
      price: String(p.price),
      stock: String(p.stock),
      category: p.category,
    });
    setFormErrors({});
    setFormOpen(true);
    toast.info("Product duplicated — review and save", { duration: 2000 });
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.barcode.trim()) errs.barcode = "Barcode is required";
    const price = Number(form.price);
    if (form.price === "" || Number.isNaN(price) || price < 0)
      errs.price = "Price must be 0 or more";
    const costPrice = Number(form.costPrice);
    if (form.costPrice === "" || Number.isNaN(costPrice) || costPrice < 0)
      errs.costPrice = "Cost must be 0 or more";
    const stock = Number(form.stock);
    if (form.stock === "" || Number.isNaN(stock) || stock < 0)
      errs.stock = "Stock must be 0 or more";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: NewProduct = {
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      stock: Number(form.stock),
      category: form.category.trim() || "General",
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  const statCards = [
    {
      label: "Total Products",
      value: String(stats.total),
      icon: Package,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: "Inventory Value",
      value: formatMoney(stats.totalValue, "₹"),
      icon: Wallet,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: "Potential Profit",
      value: formatMoney(stats.potentialProfit, "₹"),
      sub: `${stats.avgMargin.toFixed(1)}% avg margin`,
      icon: TrendingUp,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: "Low / Out of Stock",
      value: `${stats.lowStock} / ${stats.outStock}`,
      icon: AlertTriangle,
      tint: "bg-amber-500/15 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Gradient page header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
              Inventory Management
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {stats.total} products · {formatMoney(stats.totalValue, "₹")} stock value
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
            >
              <Card className="gap-0 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                      {s.value}
                    </p>
                    {s.sub && (
                      <p className="mt-0.5 text-[11px] font-medium text-emerald-600">
                        {s.sub}
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      s.tint
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Products card */}
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <h2 className="text-sm font-semibold">
            Products{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </h2>
          {filtered.length > 0 && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Sorted by newest
            </span>
          )}
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading products…
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <EmptyState onAdd={openAdd} hasProducts={(products?.length ?? 0) > 0} />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className="group">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {p.barcode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{categoryBadge(p.category)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(p.price, "₹")}
                    </TableCell>
                    <TableCell>{stockBadge(p.stock)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => duplicateProduct(p)}
                          aria-label={`Duplicate ${p.name}`}
                          title="Duplicate product"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="block md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading products…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12">
              <EmptyState onAdd={openAdd} hasProducts={(products?.length ?? 0) > 0} />
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((p) => (
                <li key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {p.barcode}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {categoryBadge(p.category)}
                        {stockBadge(p.stock)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums">
                        {formatMoney(p.price, "₹")}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => duplicateProduct(p)}
                          aria-label={`Duplicate ${p.name}`}
                          title="Duplicate product"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the details for this product."
                : "Fill in the details to add a new product to your inventory."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Coca-Cola 750ml"
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-barcode">Barcode</Label>
              <Input
                id="p-barcode"
                value={form.barcode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, barcode: e.target.value }))
                }
                placeholder="e.g. 8901030867531"
                className="font-mono"
              />
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ScanLine className="h-3 w-3" />
                Tip: use a USB barcode scanner or type the digits manually.
              </p>
              {formErrors.barcode && (
                <p className="text-xs text-red-600">{formErrors.barcode}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Selling Price</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="p-price"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    placeholder="0.00"
                    className="pl-7 tabular-nums"
                  />
                </div>
                {formErrors.price && (
                  <p className="text-xs text-red-600">{formErrors.price}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-cost">Cost Price</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="p-cost"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={form.costPrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, costPrice: e.target.value }))
                    }
                    placeholder="0.00"
                    className="pl-7 tabular-nums"
                  />
                </div>
                {formErrors.costPrice && (
                  <p className="text-xs text-red-600">{formErrors.costPrice}</p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label htmlFor="p-stock">Stock</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min={0}
                  step="1"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stock: e.target.value }))
                  }
                  className="tabular-nums"
                />
                {formErrors.stock && (
                  <p className="text-xs text-red-600">{formErrors.stock}</p>
                )}
              </div>
            </div>

            {/* Live profit margin indicator */}
            {Number(form.price) > 0 && Number(form.costPrice) >= 0 && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Profit margin:</span>
                {(() => {
                  const price = Number(form.price);
                  const cost = Number(form.costPrice);
                  const profit = price - cost;
                  const margin = price > 0 ? (profit / price) * 100 : 0;
                  const positive = profit >= 0;
                  return (
                    <>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          positive ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        {positive ? "+" : ""}
                        {formatMoney(profit, "₹")} ({margin.toFixed(1)}%)
                      </span>
                      <div className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            positive ? "bg-emerald-500" : "bg-red-500"
                          )}
                          style={{
                            width: `${Math.min(100, Math.max(0, Math.abs(margin)))}%`,
                          }}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="p-category">Category</Label>
              <Input
                id="p-category"
                list="category-list"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="General"
              />
              <datalist id="category-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Pick an existing category or type a new one.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editing ? "Save changes" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- empty state ---------- */

function EmptyState({
  onAdd,
  hasProducts,
}: {
  onAdd: () => void;
  hasProducts: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <Package className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">
          {hasProducts ? "No products match your filters" : "No products yet"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasProducts
            ? "Try adjusting your search or category."
            : "Add your first product to start selling."}
        </p>
      </div>
      {!hasProducts && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add your first product
        </Button>
      )}
    </div>
  );
}
