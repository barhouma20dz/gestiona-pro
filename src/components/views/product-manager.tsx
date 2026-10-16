"use client";

import { useMemo, useRef, useState } from "react";
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
  ImagePlus,
  Camera,
  Calendar,
  Trash,
  Scale,
  Crop,
} from "lucide-react";

import { productsApi, shopApi } from "@/lib/api";
import type { Product, NewProduct } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { ImageCropperDialog } from "@/components/image-cropper-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BarcodeScannerDialog } from "@/components/barcode-scanner";
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

type StockBadgeKey =
  | "outOfStock"
  | "left"
  | "inStock"
  | "lowWithLeft"
  | "kg"
  | "inStockKg";

function stockBadge(
  stock: number,
  unitType: string,
  t: (k: StockBadgeKey) => string
) {
  const isKg = unitType === "kg";
  if (stock === 0) {
    return (
      <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/15">
        {t("outOfStock")}
      </Badge>
    );
  }
  if (stock <= 5) {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15">
        {t("lowWithLeft")}{" "}
        {isKg ? `${stock.toFixed(stock % 1 === 0 ? 0 : 3)} ${t("kg")}` : stock}{" "}
        {t("left")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
      {isKg
        ? `${stock.toFixed(stock % 1 === 0 ? 0 : 3)} ${t("inStockKg")}`
        : `${stock} ${t("inStock")}`}
    </Badge>
  );
}

function unitBadge(
  unitType: string,
  t: (k: "countUnit" | "kgUnit") => string
) {
  const isKg = unitType === "kg";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        isKg
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10"
      )}
    >
      {isKg ? t("kgUnit") : t("countUnit")}
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
  unitType: string; // "count" | "kg"
  category: string;
  expiryDate: string;
  expiryDate2: string;
  imageUrl: string;
}

const emptyForm: FormState = {
  name: "",
  barcode: "",
  price: "",
  costPrice: "0",
  stock: "0",
  unitType: "count",
  category: "General",
  expiryDate: "",
  expiryDate2: "",
  imageUrl: "",
};

function toForm(p: Product): FormState {
  return {
    name: p.name,
    barcode: p.barcode,
    price: String(p.price),
    costPrice: String(p.costPrice ?? 0),
    stock: String(p.stock),
    unitType: p.unitType === "kg" ? "kg" : "count",
    category: p.category,
    expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split("T")[0] : "",
    expiryDate2: p.expiryDate2 ? new Date(p.expiryDate2).toISOString().split("T")[0] : "",
    imageUrl: p.imageUrl ?? "",
  };
}

/* ---------- main component ---------- */

export function ProductManager() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });
  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const currency = shop?.currency ?? "دج";

  // Filter state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawCropperImage, setRawCropperImage] = useState<string | null>(null);

  // Convert uploaded/captured file and open the Interactive Image Cropper & Compressor
  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً (الحد الأقصى 30MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setRawCropperImage(result);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };
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
      toast.success(t("productCreated"));
      qc.invalidateQueries({ queryKey: ["products"] });
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || t("failedCreateProduct")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewProduct> }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      toast.success(t("productUpdated"));
      qc.invalidateQueries({ queryKey: ["products"] });
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || t("failedUpdateProduct")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      toast.success(t("productDeleted"));
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || t("failedDeleteProduct")),
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
      costPrice: String(p.costPrice ?? 0),
      stock: String(p.stock),
      unitType: p.unitType === "kg" ? "kg" : "count",
      category: p.category,
      expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split("T")[0] : "",
      expiryDate2: p.expiryDate2 ? new Date(p.expiryDate2).toISOString().split("T")[0] : "",
      imageUrl: p.imageUrl ?? "",
    });
    setFormErrors({});
    setFormOpen(true);
    toast.info(t("productDuplicated"), { duration: 2000 });
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = t("nameRequired");
    if (!form.barcode.trim()) errs.barcode = t("barcodeRequired");
    const price = Number(form.price);
    if (form.price === "" || Number.isNaN(price) || price < 0)
      errs.price = t("priceMin");
    const costPrice = Number(form.costPrice);
    if (form.costPrice === "" || Number.isNaN(costPrice) || costPrice < 0)
      errs.costPrice = t("costMin");
    const stock = Number(form.stock);
    if (form.stock === "" || Number.isNaN(stock) || stock < 0)
      errs.stock = t("stockMin");
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
      unitType: form.unitType === "kg" ? "kg" : "count",
      category: form.category.trim() || "General",
      expiryDate: form.expiryDate || null,
      expiryDate2: form.expiryDate2 || null,
      imageUrl: form.imageUrl || null,
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
      label: t("totalProducts"),
      value: String(stats.total),
      icon: Package,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("inventoryValue"),
      value: formatMoney(stats.totalValue, currency),
      icon: Wallet,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("potentialProfit"),
      value: formatMoney(stats.potentialProfit, currency),
      sub: `${stats.avgMargin.toFixed(1)}% ${t("margin")}`,
      icon: TrendingUp,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("lowOutStock"),
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
              {t("inventoryManagement")}
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {stats.total} {t("productsLabel")} · {formatMoney(stats.totalValue, currency)} {t("inventoryValue").toLowerCase()}
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="bg-card text-primary shadow-md hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
            {t("addProduct")}
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
            placeholder={t("searchByNameOrBarcode")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t("category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          {t("addProduct")}
        </Button>
      </div>

      {/* Products card */}
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <h2 className="text-sm font-semibold">
            {t("productsLabel")}{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </h2>
          {filtered.length > 0 && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {t("sortedByNewest")}
            </span>
          )}
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">{t("product")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead className="text-right">{t("priceLabel")}</TableHead>
                <TableHead>{t("unit")}</TableHead>
                <TableHead>{t("stock")}</TableHead>
                <TableHead className="pr-6 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("loadingProducts")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <EmptyState onAdd={openAdd} hasProducts={(products?.length ?? 0) > 0} t={t} />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow
                    key={p.id}
                    className="group transition-colors hover:bg-emerald-500/5"
                  >
                    <TableCell className="pl-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium transition-colors group-hover:text-primary">
                          {p.name}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {p.barcode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{categoryBadge(p.category)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(p.price, currency)}
                      {p.unitType === "kg" && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                          {t("perKg")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{unitBadge(p.unitType, t)}</TableCell>
                    <TableCell>{stockBadge(p.stock, p.unitType, t)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                          aria-label={`${t("edit")} ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => duplicateProduct(p)}
                          aria-label={`${t("duplicate")} ${p.name}`}
                          title={t("duplicateProduct")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`${t("delete")} ${p.name}`}
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
              {t("loadingProducts")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12">
              <EmptyState onAdd={openAdd} hasProducts={(products?.length ?? 0) > 0} t={t} />
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
                        {unitBadge(p.unitType, t)}
                        {stockBadge(p.stock, p.unitType, t)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums">
                        {formatMoney(p.price, currency)}
                        {p.unitType === "kg" && (
                          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                            {t("perKg")}
                          </span>
                        )}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                          aria-label={`${t("edit")} ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => duplicateProduct(p)}
                          aria-label={`${t("duplicate")} ${p.name}`}
                          title={t("duplicateProduct")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-red-600 dark:text-red-400"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`${t("delete")} ${p.name}`}
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
        <DialogContent className="sm:max-w-2xl max-h-[calc(100dvh-2.5rem)] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b shrink-0 text-start">
            <DialogTitle className="text-lg font-bold">{editing ? t("editProduct") : t("addProductTitle")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editing
                ? t("updateDetails")
                : t("fillDetails")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
              {/* Row 1: Name & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">{t("name")}</Label>
                  <Input
                    id="p-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Coca-Cola 750ml"
                    autoFocus
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-600 dark:text-red-400">{formErrors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-barcode">{t("barcode")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="p-barcode"
                      value={form.barcode}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, barcode: e.target.value }))
                      }
                      placeholder="e.g. 8901030867531"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 text-primary hover:text-primary"
                      onClick={() => setScannerOpen(true)}
                      aria-label={t("scanBarcode")}
                      title={t("scanBarcode")}
                    >
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ScanLine className="h-3 w-3" />
                    {t("tipUseScanner")}
                  </p>
                  {formErrors.barcode && (
                    <p className="text-xs text-red-600 dark:text-red-400">{formErrors.barcode}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Category & Unit type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-category">{t("category")}</Label>
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
                  <p className="text-[11px] text-muted-foreground">
                    {t("pickExistingOrNew")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>{t("unitType")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, unitType: "count" }))
                      }
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        form.unitType !== "kg"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-pressed={form.unitType !== "kg"}
                    >
                      <Package className="h-4 w-4" />
                      {t("byCount")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, unitType: "kg" }))
                      }
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        form.unitType === "kg"
                          ? "border-amber-500 bg-amber-500/15 text-amber-700"
                          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-pressed={form.unitType === "kg"}
                    >
                      <Scale className="h-4 w-4" />
                      {t("byWeight")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Prices & Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-price">
                    {form.unitType === "kg" ? t("pricePerKg") : t("sellingPrice")}
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {currency}
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
                    <p className="text-xs text-red-600 dark:text-red-400">{formErrors.price}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-cost">{t("costPrice")}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {currency}
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
                    <p className="text-xs text-red-600 dark:text-red-400">{formErrors.costPrice}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-stock">
                    {form.unitType === "kg" ? t("stockKg") : t("stock")}
                  </Label>
                  <Input
                    id="p-stock"
                    type="number"
                    min={0}
                    step={form.unitType === "kg" ? "0.001" : "1"}
                    inputMode={form.unitType === "kg" ? "decimal" : "numeric"}
                    value={form.stock}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, stock: e.target.value }))
                    }
                    className="tabular-nums"
                  />
                  {formErrors.stock && (
                    <p className="text-xs text-red-600 dark:text-red-400">{formErrors.stock}</p>
                  )}
                </div>
              </div>

              {/* Live profit margin indicator */}
              {Number(form.price) > 0 && Number(form.costPrice) >= 0 && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">{t("profitMargin")}:</span>
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
                            positive ? "text-emerald-600" : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {positive ? "+" : ""}
                          {formatMoney(profit, currency)} ({margin.toFixed(1)}%)
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

              {/* Row 4: Image & Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Product Image */}
                <div className="space-y-2">
                  <Label>{t("productImage")}</Label>
                  <div className="flex items-start gap-3">
                    {/* Preview */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      {form.imageUrl ? (
                        <>
                          <img
                            src={form.imageUrl}
                            alt={t("imagePreview")}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                            className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                            aria-label={t("removeImage")}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <ImagePlus className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    {/* Upload + Camera buttons */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 text-xs gap-1"
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                          {t("chooseFile")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => cameraInputRef.current?.click()}
                          className="h-8 text-xs gap-1"
                        >
                          <Camera className="h-3.5 w-3.5 text-emerald-600" />
                          {t("captureFromCamera")}
                        </Button>
                      </div>

                      {form.imageUrl && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRawCropperImage(form.imageUrl);
                            setCropperOpen(true);
                          }}
                          className="h-7 text-xs gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          <Crop className="h-3 w-3" />
                          تحديد وقص المنتج / تعديل الحجم
                        </Button>
                      )}

                      <p className="text-[10px] text-muted-foreground">
                        يتم فتح أداة تحديد وقص المنتج وضغط الحجم تلقائياً إلى بكسلات خفيفة وسريعة.
                      </p>
                    </div>
                    {/* Hidden file inputs */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {/* Product Image Cropper & Compressor Modal */}
                  <ImageCropperDialog
                    open={cropperOpen}
                    onOpenChange={setCropperOpen}
                    imageSrc={rawCropperImage}
                    onConfirm={(cropped) => {
                      setForm((f) => ({ ...f, imageUrl: cropped }));
                      toast.success("✓ تم تحديد وقص وضغط صورة المنتج بنجاح!");
                    }}
                  />
                </div>

                {/* Expiry Dates */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="p-expiry1" className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-amber-600" />
                      {t("expiryDate1")}
                    </Label>
                    <Input
                      id="p-expiry1"
                      type="date"
                      value={form.expiryDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, expiryDate: e.target.value }))
                      }
                      className="tabular-nums h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("expiryDateHint")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="p-expiry2" className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-amber-600" />
                      {t("expiryDate2")}
                    </Label>
                    <Input
                      id="p-expiry2"
                      type="date"
                      value={form.expiryDate2}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, expiryDate2: e.target.value }))
                      }
                      className="tabular-nums h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("expiryDate2Hint")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t bg-muted/30 shrink-0 gap-2 flex flex-row justify-end items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                <X className="h-4 w-4" />
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editing ? t("saveChanges") : t("addProduct")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode scanner dialog */}
      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={(code) => {
          setForm((f) => ({ ...f, barcode: code }));
          toast.success(t("barcodeScanned"));
          // Instant duplicate check — avoids a failed save later.
          const duplicate = (products ?? []).find(
            (p) =>
              p.barcode.toLowerCase() === code.toLowerCase() &&
              p.id !== editing?.id
          );
          if (duplicate) {
            toast.warning(t("barcodeAlreadyExists"), {
              description: `${t("product")}: ${duplicate.name}`,
              duration: 5000,
            });
          }
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteProduct")}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete")}{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              ? {t("deleteProductConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("cancel")}
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
              {t("delete")}
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
  t,
}: {
  onAdd: () => void;
  hasProducts: boolean;
  t: (k: "noProductsMatch" | "noProductsYet" | "tryAdjustingSearch" | "addFirstProductTrack" | "addFirstProduct") => string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <Package className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">
          {hasProducts ? t("noProductsMatch") : t("noProductsYet")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasProducts
            ? t("tryAdjustingSearch")
            : t("addFirstProductTrack")}
        </p>
      </div>
      {!hasProducts && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {t("addFirstProduct")}
        </Button>
      )}
    </div>
  );
}
