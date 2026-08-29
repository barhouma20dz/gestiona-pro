"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Truck,
  Loader2,
  X,
  Eye,
  FileText,
  AlertTriangle,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Banknote,
  CheckCircle2,
  Clock,
} from "lucide-react";

import {
  suppliersApi,
  supplierInvoicesApi,
  supplierPaymentsApi,
  shopApi,
  productsApi,
} from "@/lib/api";
import type {
  Supplier,
  NewSupplier,
  SupplierInvoice,
  NewSupplierInvoice,
  NewSupplierInvoiceItem,
  Product,
  SupplierPayment,
  PaymentMethod,
} from "@/lib/types";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type T = (key: TranslationKey) => string;

/* ---------- helpers ---------- */

function statusBadge(status: SupplierInvoice["status"], t: T) {
  if (status === "PAID") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15 dark:text-emerald-400">
        {t("paid")}
      </Badge>
    );
  }
  if (status === "PARTIAL") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/15 dark:text-amber-400">
        {t("partial")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-700 border-red-500/30 hover:bg-red-500/15 dark:text-red-400">
      {t("unpaid")}
    </Badge>
  );
}

function PaymentMethodBadge({
  method,
  t,
}: {
  method: PaymentMethod;
  t: T;
}) {
  const map: Record<PaymentMethod, { key: TranslationKey; cls: string }> = {
    Cash: {
      key: "paymentMethodCash",
      cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15 dark:text-emerald-400",
    },
    Bank: {
      key: "paymentMethodBank",
      cls: "bg-teal-500/15 text-teal-700 border-teal-500/30 hover:bg-teal-500/15 dark:text-teal-400",
    },
    Cheque: {
      key: "paymentMethodCheque",
      cls: "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/15 dark:text-amber-400",
    },
    Other: {
      key: "paymentMethodOther",
      cls: "bg-slate-500/15 text-slate-700 border-slate-500/30 hover:bg-slate-500/15 dark:text-slate-300",
    },
  };
  const entry = map[method] ?? map.Other;
  return <Badge className={entry.cls}>{t(entry.key)}</Badge>;
}

/* ---------- supplier form state ---------- */

interface SupplierForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const emptySupplierForm: SupplierForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

function toSupplierForm(s: Supplier): SupplierForm {
  return {
    name: s.name,
    phone: s.phone,
    email: s.email,
    address: s.address,
    notes: s.notes,
  };
}

/* ---------- invoice item row ---------- */

interface InvoiceItemRow {
  id: string;
  productId: string | null;
  productName: string;
  quantity: string;
  unitPrice: string;
}

let itemCounter = 0;
function makeItemId(): string {
  itemCounter += 1;
  return `item-${Date.now()}-${itemCounter}`;
}

function makeEmptyItem(products: Product[]): InvoiceItemRow {
  const first = products[0];
  return {
    id: makeItemId(),
    productId: first ? first.id : null,
    productName: first ? first.name : "",
    quantity: "1",
    unitPrice: first ? String(first.costPrice ?? first.price) : "0",
  };
}

interface InvoiceForm {
  supplierId: string;
  invoiceNo: string;
  invoiceDate: string;
  items: InvoiceItemRow[];
  paidAmount: string;
  notes: string;
}

/* ---------- main component ---------- */

export function Suppliers() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: suppliersApi.list,
  });
  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });
  const currency = shop?.currency ?? "دج";

  // Filter state
  const [search, setSearch] = useState("");

  // Supplier dialog state
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm);
  const [supplierFormErrors, setSupplierFormErrors] = useState<Partial<Record<keyof SupplierForm, string>>>({});

  // Delete supplier state
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);

  // Invoice dialog state
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm | null>(null);
  const [invoiceFormErrors, setInvoiceFormErrors] = useState<Record<string, string>>({});

  // Invoices viewer dialog
  const [invoicesViewer, setInvoicesViewer] = useState<{
    // Lightweight supplier reference — only id/name are needed here
    supplier: Pick<Supplier, "id" | "name">;
    invoices: SupplierInvoice[];
    loading: boolean;
  } | null>(null);

  // Invoices viewer: search + filter within dialog
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<"ALL" | "PAID" | "PARTIAL" | "UNPAID">("ALL");

  // Payment dialog state (recording a payment for an invoice)
  const [paymentTarget, setPaymentTarget] = useState<SupplierInvoice | null>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<{
    amount: string;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    notes: string;
  }>({
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "Cash",
    notes: "",
  });

  // Payment history (collapsible per-invoice)
  const [paymentsByInvoice, setPaymentsByInvoice] = useState<
    Record<string, { payments: SupplierPayment[]; loading: boolean; open: boolean }>
  >({});

  // Delete payment state
  const [deletePaymentTarget, setDeletePaymentTarget] =
    useState<{ invoice: SupplierInvoice; payment: SupplierPayment } | null>(null);

  // Delete invoice state
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState<SupplierInvoice | null>(null);

  /* Derived stats */
  const stats = useMemo(() => {
    let totalOutstanding = 0;
    let totalPurchases = 0;
    let totalPaid = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    const allInvoices: SupplierInvoice[] = [];
    suppliers.forEach((s) => {
      (s.invoices ?? []).forEach((inv) => {
        totalPurchases += inv.totalAmount;
        totalPaid += inv.paidAmount;
        totalOutstanding += Math.max(0, inv.totalAmount - inv.paidAmount);
        if (inv.status === "PAID") paidCount += 1;
        else if (inv.status === "PARTIAL") partialCount += 1;
        else unpaidCount += 1;
        allInvoices.push(inv);
      });
    });
    return {
      total: suppliers.length,
      totalOutstanding,
      totalPurchases,
      totalPaid,
      totalInvoices: allInvoices.length,
      paidCount,
      partialCount,
      unpaidCount,
      allInvoices,
    };
  }, [suppliers]);

  /* Filtered list */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === "") return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  /* Filtered invoices within viewer */
  const filteredViewerInvoices = useMemo(() => {
    if (!invoicesViewer) return [];
    const q = invoiceSearch.trim().toLowerCase();
    return invoicesViewer.invoices.filter((inv) => {
      if (invoiceFilter !== "ALL" && inv.status !== invoiceFilter) return false;
      if (q !== "") {
        const supplierName = invoicesViewer.supplier.name.toLowerCase();
        if (
          !inv.invoiceNo.toLowerCase().includes(q) &&
          !supplierName.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [invoicesViewer, invoiceFilter, invoiceSearch]);

  /* Mutations — supplier */
  const createSupplierMutation = useMutation({
    mutationFn: (data: NewSupplier) => suppliersApi.create(data),
    onSuccess: () => {
      toast.success(t("supplierCreated"));
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setSupplierFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || t("failedCreateSupplier")),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewSupplier> }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      toast.success(t("supplierUpdated"));
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setSupplierFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || t("failedUpdateSupplier")),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      toast.success(t("supplierDeleted"));
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteSupplierTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || t("failedDeleteSupplier")),
  });

  /* Mutations — invoice */
  const createInvoiceMutation = useMutation({
    mutationFn: (data: NewSupplierInvoice) => supplierInvoicesApi.create(data),
    onSuccess: () => {
      toast.success(t("invoiceCreated"));
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["supplier-invoices"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setInvoiceFormOpen(false);
      setInvoiceForm(null);
    },
    onError: (e: Error) => toast.error(e.message || t("failedCreateInvoice")),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => supplierInvoicesApi.delete(id),
    onSuccess: () => {
      toast.success(t("invoiceDeleted"));
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["supplier-invoices"] });
      // If viewer is open, refresh the displayed list locally
      if (invoicesViewer) {
        setInvoicesViewer({
          ...invoicesViewer,
          invoices: invoicesViewer.invoices.filter((i) => i.id !== deleteInvoiceTarget?.id),
        });
      }
      setDeleteInvoiceTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || t("failedDeleteInvoice")),
  });

  /* Mutations — supplier payment */
  const createPaymentMutation = useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: typeof paymentForm }) =>
      supplierPaymentsApi.create(invoiceId, {
        amount: Number(data.amount),
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        notes: data.notes.trim(),
      }),
    onSuccess: async () => {
      toast.success(t("paymentCreated"));
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["supplier-invoices"] });
      setPaymentFormOpen(false);
      setPaymentTarget(null);
      // Refresh invoices viewer (to reflect new paidAmount/status)
      if (invoicesViewer) {
        try {
          const res = await suppliersApi.invoices(invoicesViewer.supplier.id);
          setInvoicesViewer({
            supplier: res.supplier,
            invoices: res.invoices,
            loading: false,
          });
        } catch {
          /* ignore */
        }
      }
      // Refresh payment history if open
      if (paymentTarget) {
        try {
          const list = await supplierPaymentsApi.list(paymentTarget.id);
          setPaymentsByInvoice((prev) => ({
            ...prev,
            [paymentTarget.id]: {
              payments: list,
              loading: false,
              open: prev[paymentTarget.id]?.open ?? true,
            },
          }));
        } catch {
          /* ignore */
        }
      }
    },
    onError: (e: Error) => toast.error(e.message || t("paymentCreated")),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: ({
      invoiceId,
      paymentId,
    }: {
      invoiceId: string;
      paymentId: string;
    }) => supplierPaymentsApi.delete(invoiceId, paymentId),
    onSuccess: async () => {
      toast.success(t("paymentDeleted"));
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["supplier-invoices"] });
      const target = deletePaymentTarget;
      setDeletePaymentTarget(null);
      // Refresh invoices viewer (paidAmount may have changed)
      if (invoicesViewer) {
        try {
          const res = await suppliersApi.invoices(invoicesViewer.supplier.id);
          setInvoicesViewer({
            supplier: res.supplier,
            invoices: res.invoices,
            loading: false,
          });
        } catch {
          /* ignore */
        }
      }
      // Refresh payment history for that invoice if it was open
      if (target) {
        try {
          const list = await supplierPaymentsApi.list(target.invoice.id);
          setPaymentsByInvoice((prev) => ({
            ...prev,
            [target.invoice.id]: {
              payments: list,
              loading: false,
              open: prev[target.invoice.id]?.open ?? true,
            },
          }));
        } catch {
          /* ignore */
        }
      }
    },
    onError: (e: Error) => toast.error(e.message || t("paymentDeleted")),
  });

  /* Payment dialog helpers */
  const openPaymentDialog = (inv: SupplierInvoice) => {
    setPaymentTarget(inv);
    const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
    setPaymentForm({
      amount: String(remaining > 0 ? remaining.toFixed(2) : "0"),
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "Cash",
      notes: "",
    });
    setPaymentFormOpen(true);
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("paymentAmount"));
      return;
    }
    const remaining = paymentTarget.totalAmount - paymentTarget.paidAmount;
    if (amount > remaining + 0.0001) {
      toast.error(t("cannotExceedRemaining"));
      return;
    }
    createPaymentMutation.mutate({
      invoiceId: paymentTarget.id,
      data: paymentForm,
    });
  };

  const togglePaymentsFor = async (inv: SupplierInvoice) => {
    setPaymentsByInvoice((prev) => {
      const cur = prev[inv.id];
      if (cur) {
        return {
          ...prev,
          [inv.id]: { ...cur, open: !cur.open },
        };
      }
      return {
        ...prev,
        [inv.id]: { payments: [], loading: true, open: true },
      };
    });
    try {
      const list = await supplierPaymentsApi.list(inv.id);
      setPaymentsByInvoice((prev) => ({
        ...prev,
        [inv.id]: { payments: list, loading: false, open: true },
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("paymentHistory"));
      setPaymentsByInvoice((prev) => ({
        ...prev,
        [inv.id]: { payments: [], loading: false, open: true },
      }));
    }
  };

  /* Form handlers — supplier */
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm(emptySupplierForm);
    setSupplierFormErrors({});
    setSupplierFormOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm(toSupplierForm(s));
    setSupplierFormErrors({});
    setSupplierFormOpen(true);
  };

  const validateSupplier = (): boolean => {
    const errs: Partial<Record<keyof SupplierForm, string>> = {};
    if (!supplierForm.name.trim()) errs.name = t("nameRequired");
    setSupplierFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSupplier()) return;
    const payload: NewSupplier = {
      name: supplierForm.name.trim(),
      phone: supplierForm.phone.trim(),
      email: supplierForm.email.trim(),
      address: supplierForm.address.trim(),
      notes: supplierForm.notes.trim(),
    };
    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data: payload });
    } else {
      createSupplierMutation.mutate(payload);
    }
  };

  const savingSupplier =
    createSupplierMutation.isPending || updateSupplierMutation.isPending;

  /* Form handlers — invoice */
  const openAddInvoice = (presetSupplierId?: string) => {
    if (suppliers.length === 0) {
      toast.error(t("noSuppliersYet"));
      return;
    }
    if (products.length === 0) {
      toast.error(t("noProductsYet"));
      return;
    }
    const supplierId = presetSupplierId ?? suppliers[0]?.id ?? "";
    const today = new Date().toISOString().slice(0, 10);
    setInvoiceForm({
      supplierId,
      invoiceNo: `PUR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`,
      invoiceDate: today,
      items: [makeEmptyItem(products)],
      paidAmount: "0",
      notes: "",
    });
    setInvoiceFormErrors({});
    setInvoiceFormOpen(true);
  };

  const validateInvoice = (): boolean => {
    if (!invoiceForm) return false;
    const errs: Record<string, string> = {};
    if (!invoiceForm.supplierId) errs.supplierId = t("selectSupplier");
    if (!invoiceForm.invoiceNo.trim()) errs.invoiceNo = t("invoiceNo");
    if (!invoiceForm.invoiceDate) errs.invoiceDate = t("invoiceDate");
    if (!invoiceForm.items.length) errs.items = t("noItemsYet");
    invoiceForm.items.forEach((it, idx) => {
      if (!it.productName.trim()) errs[`item-${idx}-name`] = t("nameRequired");
      const q = Number(it.quantity);
      if (!Number.isInteger(q) || q <= 0)
        errs[`item-${idx}-qty`] = t("stockMin");
      const up = Number(it.unitPrice);
      if (Number.isNaN(up) || up < 0)
        errs[`item-${idx}-price`] = t("priceMin");
    });
    setInvoiceFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm || !validateInvoice()) return;
    const items: NewSupplierInvoiceItem[] = invoiceForm.items.map((r) => ({
      productId: r.productId || null,
      productName: r.productName.trim(),
      quantity: Number(r.quantity),
      unitPrice: Number(r.unitPrice),
    }));
    const payload: NewSupplierInvoice = {
      supplierId: invoiceForm.supplierId,
      invoiceNo: invoiceForm.invoiceNo.trim(),
      invoiceDate: invoiceForm.invoiceDate,
      items,
      paidAmount: Number(invoiceForm.paidAmount) || 0,
      notes: invoiceForm.notes.trim(),
    };
    createInvoiceMutation.mutate(payload);
  };

  const savingInvoice = createInvoiceMutation.isPending;

  const invoiceTotal = useMemo(() => {
    if (!invoiceForm) return 0;
    return invoiceForm.items.reduce((sum, it) => {
      const qty = Number(it.quantity) || 0;
      const up = Number(it.unitPrice) || 0;
      return sum + qty * up;
    }, 0);
  }, [invoiceForm]);

  /* Invoices viewer */
  const openInvoicesViewer = async (s: Supplier) => {
    setInvoiceFilter("ALL");
    setInvoiceSearch("");
    setPaymentsByInvoice({});
    setInvoicesViewer({ supplier: s, invoices: s.invoices ?? [], loading: true });
    try {
      const res = await suppliersApi.invoices(s.id);
      setInvoicesViewer({ supplier: s, invoices: res.invoices, loading: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("failedCreateInvoice"));
      setInvoicesViewer({
        supplier: s,
        invoices: s.invoices ?? [],
        loading: false,
      });
    }
  };

  /* Stat cards — top of suppliers page */
  const statCards = [
    {
      label: t("totalInvoices"),
      value: String(stats.totalInvoices),
      sub: formatMoney(stats.totalPurchases, currency),
      icon: FileText,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("totalPaid"),
      value: formatMoney(stats.totalPaid, currency),
      sub: `${stats.paidCount} ${t("paidInvoices")}`,
      icon: CheckCircle2,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("totalRemaining"),
      value: formatMoney(stats.totalOutstanding, currency),
      sub: `${stats.partialCount + stats.unpaidCount} ${t("invoices")}`,
      icon: Clock,
      tint: "bg-amber-500/15 text-amber-600",
    },
    {
      label: t("partialInvoices"),
      value: String(stats.partialCount),
      sub: `${stats.unpaidCount} ${t("unpaidInvoices")}`,
      icon: Banknote,
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
              {t("suppliers")}
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {stats.total} {t("suppliers")} · {formatMoney(stats.totalPurchases, currency)}{" "}
              {t("totalPurchases").toLowerCase()}
            </p>
          </div>
          <Button
            onClick={openAddSupplier}
            className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4" />
            {t("addSupplier")}
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
                    <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl">
                      {s.value}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                      {s.sub}
                    </p>
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
            placeholder={t("searchSuppliers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => openAddInvoice()} className="w-full sm:w-auto">
          <FileText className="h-4 w-4" />
          {t("addInvoice")}
        </Button>
      </div>

      {/* Suppliers card */}
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <h2 className="text-sm font-semibold">
            {t("suppliers")}{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </h2>
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">{t("supplierName")}</TableHead>
                <TableHead>{t("supplierPhone")}</TableHead>
                <TableHead>{t("supplierEmail")}</TableHead>
                <TableHead className="text-right">{t("outstandingAmount")}</TableHead>
                <TableHead className="text-center">{t("invoiceCount")}</TableHead>
                <TableHead className="pr-6 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("loadingSuppliers")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <EmptySuppliers
                      onAdd={openAddSupplier}
                      hasSuppliers={suppliers.length > 0}
                      t={t}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => {
                  const outstanding = (s.invoices ?? []).reduce(
                    (sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount),
                    0
                  );
                  const invoiceCount = s.invoices?.length ?? 0;
                  return (
                    <TableRow
                      key={s.id}
                      className="group transition-colors hover:bg-emerald-500/5"
                    >
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium transition-colors group-hover:text-primary">
                              {s.name}
                            </span>
                            {s.address && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {s.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {s.phone || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{s.email || "—"}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {outstanding > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            {formatMoney(outstanding, currency)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatMoney(0, currency)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="tabular-nums">
                          {invoiceCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openInvoicesViewer(s)}
                            aria-label={`${t("viewInvoices")} ${s.name}`}
                            title={t("viewInvoices")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openAddInvoice(s.id)}
                            aria-label={`${t("addInvoice")} ${s.name}`}
                            title={t("addInvoice")}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditSupplier(s)}
                            aria-label={`${t("edit")} ${s.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                            onClick={() => setDeleteSupplierTarget(s)}
                            aria-label={`${t("delete")} ${s.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="block md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loadingSuppliers")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12">
              <EmptySuppliers
                onAdd={openAddSupplier}
                hasSuppliers={suppliers.length > 0}
                t={t}
              />
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((s) => {
                const outstanding = (s.invoices ?? []).reduce(
                  (sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount),
                  0
                );
                const invoiceCount = s.invoices?.length ?? 0;
                return (
                  <li key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{s.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {s.phone || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="tabular-nums">
                            {invoiceCount} {t("invoices")}
                          </Badge>
                          {outstanding > 0 ? (
                            <Badge className="bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400">
                              {formatMoney(outstanding, currency)} {t("outstanding").toLowerCase()}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
                              {t("paid")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openInvoicesViewer(s)}
                            aria-label={t("viewInvoices")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditSupplier(s)}
                            aria-label={t("edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => setDeleteSupplierTarget(s)}
                            aria-label={t("delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* Add/Edit Supplier dialog */}
      <Dialog open={supplierFormOpen} onOpenChange={setSupplierFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? t("editSupplier") : t("addSupplier")}
            </DialogTitle>
            <DialogDescription>
              {t("suppliersSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitSupplier} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">{t("supplierName")}</Label>
              <Input
                id="s-name"
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, name: e.target.value }))
                }
                autoFocus
              />
              {supplierFormErrors.name && (
                <p className="text-xs text-red-600">{supplierFormErrors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">{t("supplierPhone")}</Label>
                <Input
                  id="s-phone"
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">{t("supplierEmail")}</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) =>
                    setSupplierForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-address">{t("supplierAddress")}</Label>
              <Input
                id="s-address"
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-notes">{t("supplierNotes")}</Label>
              <Textarea
                id="s-notes"
                rows={3}
                value={supplierForm.notes}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSupplierFormOpen(false)}
                disabled={savingSupplier}
              >
                <X className="h-4 w-4" />
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={savingSupplier}>
                {savingSupplier ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingSupplier ? t("saveChanges") : t("addSupplier")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Invoice dialog */}
      <Dialog open={invoiceFormOpen} onOpenChange={setInvoiceFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("addInvoice")}</DialogTitle>
            <DialogDescription>
              {t("invoiceCreated")} · {t("stockRemaining")} ↑
            </DialogDescription>
          </DialogHeader>
          {invoiceForm && (
            <form onSubmit={submitInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("selectSupplier")}</Label>
                  <Select
                    value={invoiceForm.supplierId}
                    onValueChange={(v) =>
                      setInvoiceForm((f) => (f ? { ...f, supplierId: v } : f))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectSupplier")} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {invoiceFormErrors.supplierId && (
                    <p className="text-xs text-red-600">
                      {invoiceFormErrors.supplierId}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-no">{t("invoiceNo")}</Label>
                  <Input
                    id="inv-no"
                    value={invoiceForm.invoiceNo}
                    onChange={(e) =>
                      setInvoiceForm((f) =>
                        f ? { ...f, invoiceNo: e.target.value } : f
                      )
                    }
                    className="font-mono"
                  />
                  {invoiceFormErrors.invoiceNo && (
                    <p className="text-xs text-red-600">
                      {invoiceFormErrors.invoiceNo}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-date">{t("invoiceDate")}</Label>
                  <Input
                    id="inv-date"
                    type="date"
                    value={invoiceForm.invoiceDate}
                    onChange={(e) =>
                      setInvoiceForm((f) =>
                        f ? { ...f, invoiceDate: e.target.value } : f
                      )
                    }
                  />
                  {invoiceFormErrors.invoiceDate && (
                    <p className="text-xs text-red-600">
                      {invoiceFormErrors.invoiceDate}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-paid">{t("paidAmount")}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {currency}
                    </span>
                    <Input
                      id="inv-paid"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={invoiceForm.paidAmount}
                      onChange={(e) =>
                        setInvoiceForm((f) =>
                          f ? { ...f, paidAmount: e.target.value } : f
                        )
                      }
                      className="pl-7 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("invoiceItems")}</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setInvoiceForm((f) =>
                        f
                          ? { ...f, items: [...f.items, makeEmptyItem(products)] }
                          : f
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                    {t("addItem")}
                  </Button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-emerald">
                  {invoiceForm.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 rounded-lg border bg-muted/30 p-2"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <Select
                          value={item.productId ?? "__manual__"}
                          onValueChange={(v) => {
                            setInvoiceForm((f) => {
                              if (!f) return f;
                              const next = [...f.items];
                              if (v === "__manual__") {
                                next[idx] = {
                                  ...next[idx],
                                  productId: null,
                                  productName: "",
                                };
                              } else {
                                const p = products.find((pp) => pp.id === v);
                                next[idx] = {
                                  ...next[idx],
                                  productId: v,
                                  productName: p?.name ?? next[idx].productName,
                                  unitPrice: p
                                    ? String(p.costPrice ?? p.price)
                                    : next[idx].unitPrice,
                                };
                              }
                              return { ...f, items: next };
                            });
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t("selectProduct")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__manual__">
                              {t("manualItem")}
                            </SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-7 sm:col-span-3">
                        <Input
                          placeholder={t("itemNameField")}
                          value={item.productName}
                          onChange={(e) => {
                            const v = e.target.value;
                            setInvoiceForm((f) => {
                              if (!f) return f;
                              const next = [...f.items];
                              next[idx] = { ...next[idx], productName: v };
                              return { ...f, items: next };
                            });
                          }}
                          className="h-9"
                        />
                        {invoiceFormErrors[`item-${idx}-name`] && (
                          <p className="text-[10px] text-red-600">
                            {invoiceFormErrors[`item-${idx}-name`]}
                          </p>
                        )}
                      </div>
                      <div className="col-span-5 sm:col-span-2">
                        <Input
                          type="number"
                          min={1}
                          step="1"
                          inputMode="numeric"
                          placeholder={t("quantity")}
                          value={item.quantity}
                          onChange={(e) => {
                            const v = e.target.value;
                            setInvoiceForm((f) => {
                              if (!f) return f;
                              const next = [...f.items];
                              next[idx] = { ...next[idx], quantity: v };
                              return { ...f, items: next };
                            });
                          }}
                          className="h-9 tabular-nums"
                        />
                        {invoiceFormErrors[`item-${idx}-qty`] && (
                          <p className="text-[10px] text-red-600">
                            {invoiceFormErrors[`item-${idx}-qty`]}
                          </p>
                        )}
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          placeholder={t("unitPrice")}
                          value={item.unitPrice}
                          onChange={(e) => {
                            const v = e.target.value;
                            setInvoiceForm((f) => {
                              if (!f) return f;
                              const next = [...f.items];
                              next[idx] = { ...next[idx], unitPrice: v };
                              return { ...f, items: next };
                            });
                          }}
                          className="h-9 tabular-nums"
                        />
                        {invoiceFormErrors[`item-${idx}-price`] && (
                          <p className="text-[10px] text-red-600">
                            {invoiceFormErrors[`item-${idx}-price`]}
                          </p>
                        )}
                      </div>
                      <div className="col-span-1 flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-500/10"
                          onClick={() =>
                            setInvoiceForm((f) => {
                              if (!f) return f;
                              return {
                                ...f,
                                items: f.items.filter((_, i) => i !== idx),
                              };
                            })
                          }
                          aria-label={t("remove")}
                          disabled={invoiceForm.items.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {invoiceForm.items.length === 0 && (
                    <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                      {t("noItemsYet")}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="flex items-center justify-between rounded-lg border bg-emerald-500/5 px-3 py-2 text-sm">
                  <span className="font-medium text-muted-foreground">
                    {t("totalAmount")}
                  </span>
                  <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatMoney(invoiceTotal, currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-notes">{t("supplierNotes")}</Label>
                <Textarea
                  id="inv-notes"
                  rows={2}
                  value={invoiceForm.notes}
                  onChange={(e) =>
                    setInvoiceForm((f) =>
                      f ? { ...f, notes: e.target.value } : f
                    )
                  }
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInvoiceFormOpen(false)}
                  disabled={savingInvoice}
                >
                  <X className="h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={savingInvoice}>
                  {savingInvoice ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {t("addInvoice")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoices viewer dialog */}
      <Dialog
        open={invoicesViewer !== null}
        onOpenChange={(o) => !o && setInvoicesViewer(null)}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {invoicesViewer?.supplier.name} · {t("invoices")}
            </DialogTitle>
            <DialogDescription>{t("purchaseHistory")}</DialogDescription>
          </DialogHeader>

          {/* Filter + search row */}
          {(invoicesViewer?.invoices ?? []).length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-1.5">
                {(["ALL", "PAID", "PARTIAL", "UNPAID"] as const).map((f) => (
                  <Button
                    key={f}
                    type="button"
                    size="sm"
                    variant={invoiceFilter === f ? "default" : "outline"}
                    onClick={() => setInvoiceFilter(f)}
                    className={cn(
                      invoiceFilter === f &&
                        "bg-emerald-600 hover:bg-emerald-700"
                    )}
                  >
                    {f === "ALL"
                      ? t("allInvoices")
                      : f === "PAID"
                        ? t("paidInvoices")
                        : f === "PARTIAL"
                          ? t("partialInvoices")
                          : t("unpaidInvoices")}
                  </Button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("searchInvoice")}
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            {invoicesViewer?.loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loadingInvoices")}
              </div>
            ) : (invoicesViewer?.invoices ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                {t("noInvoicesYet")}
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    if (invoicesViewer) {
                      setInvoicesViewer(null);
                      openAddInvoice(invoicesViewer.supplier.id);
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {t("addFirstInvoice")}
                </Button>
              </div>
            ) : filteredViewerInvoices.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                {t("noInvoicesMatch")}
              </div>
            ) : (
              <ul className="divide-y rounded-lg border">
                {filteredViewerInvoices.map((inv) => {
                  const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
                  const payState = paymentsByInvoice[inv.id];
                  const isPaid = inv.status === "PAID";
                  return (
                    <li key={inv.id} className="p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-semibold">
                              {inv.invoiceNo}
                            </span>
                            {statusBadge(inv.status, t)}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(inv.invoiceDate)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {inv.items.length} {t("invoiceItemsCount")} ·{" "}
                            {formatMoney(inv.totalAmount, currency)}
                          </p>
                          {inv.paidAmount > 0 && (
                            <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                              {t("totalPaid")}: {formatMoney(inv.paidAmount, currency)}
                              {remaining > 0 && (
                                <span className="ms-2 text-amber-600 dark:text-amber-400">
                                  · {t("remainingAmount")}:{" "}
                                  {formatMoney(remaining, currency)}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold tabular-nums">
                            {formatMoney(inv.totalAmount, currency)}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                              onClick={() => openPaymentDialog(inv)}
                              disabled={isPaid}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              {t("recordPayment")}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => togglePaymentsFor(inv)}
                              aria-label={t("paymentHistory")}
                              title={t("paymentHistory")}
                            >
                              {payState?.open ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-red-600"
                              onClick={() => setDeleteInvoiceTarget(inv)}
                              aria-label={t("deleteInvoice")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Payment history collapsible */}
                      <Collapsible
                        open={payState?.open ?? false}
                        onOpenChange={() => togglePaymentsFor(inv)}
                        className="mt-2"
                      >
                        <CollapsibleContent className="space-y-2">
                          <div className="rounded-lg border bg-muted/30 p-2.5">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {t("paymentHistory")}
                            </p>
                            {payState?.loading ? (
                              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {t("loadingInvoices")}
                              </div>
                            ) : (payState?.payments ?? []).length === 0 ? (
                              <p className="py-3 text-center text-xs text-muted-foreground">
                                {t("noPaymentsYet")}
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-border/50">
                                      <TableHead className="h-8 text-[11px]">
                                        {t("paymentDate")}
                                      </TableHead>
                                      <TableHead className="h-8 text-[11px]">
                                        {t("paymentAmount")}
                                      </TableHead>
                                      <TableHead className="h-8 text-[11px]">
                                        {t("paymentMethod")}
                                      </TableHead>
                                      <TableHead className="h-8 text-[11px]">
                                        {t("paymentNotes")}
                                      </TableHead>
                                      <TableHead className="h-8 text-[11px]">
                                        {t("recordedBy")}
                                      </TableHead>
                                      <TableHead className="h-8 text-[11px] text-right">
                                        {t("actions")}
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {payState?.payments.map((pmt) => (
                                      <TableRow
                                        key={pmt.id}
                                        className="border-border/40"
                                      >
                                        <TableCell className="py-2 text-xs">
                                          {formatDate(pmt.paymentDate)}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs font-semibold tabular-nums">
                                          {formatMoney(pmt.amount, currency)}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs">
                                          <PaymentMethodBadge
                                            method={pmt.paymentMethod}
                                            t={t}
                                          />
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-muted-foreground">
                                          {pmt.notes || "—"}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-muted-foreground">
                                          {pmt.user?.name ??
                                            pmt.user?.email ??
                                            "—"}
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-red-600"
                                            onClick={() =>
                                              setDeletePaymentTarget({
                                                invoice: inv,
                                                payment: pmt,
                                              })
                                            }
                                            aria-label={t("delete")}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {invoicesViewer && invoicesViewer.invoices.length > 0 && (
            <DialogFooter>
              <Button
                onClick={() => {
                  const sid = invoicesViewer.supplier.id;
                  setInvoicesViewer(null);
                  openAddInvoice(sid);
                }}
              >
                <Plus className="h-4 w-4" />
                {t("addInvoice")}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Record payment dialog */}
      <Dialog open={paymentFormOpen} onOpenChange={setPaymentFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("recordPayment")}</DialogTitle>
            <DialogDescription>
              {paymentTarget?.invoiceNo} ·{" "}
              {paymentTarget
                ? formatMoney(paymentTarget.totalAmount, currency)
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitPayment} className="space-y-4">
            {paymentTarget && (
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">{t("totalAmount")}</p>
                  <p className="font-semibold tabular-nums">
                    {formatMoney(paymentTarget.totalAmount, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("paidAmount")}</p>
                  <p className="font-semibold tabular-nums">
                    {formatMoney(paymentTarget.paidAmount, currency)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">{t("remainingAmount")}</p>
                  <p className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {formatMoney(
                      Math.max(
                        0,
                        paymentTarget.totalAmount - paymentTarget.paidAmount
                      ),
                      currency
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="pmt-amount">{t("paymentAmount")}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currency}
                </span>
                <Input
                  id="pmt-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="pl-8 tabular-nums"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pmt-date">{t("paymentDate")}</Label>
                <Input
                  id="pmt-date"
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      paymentDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("paymentMethod")}</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(v) =>
                    setPaymentForm((f) => ({
                      ...f,
                      paymentMethod: v as PaymentMethod,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">
                      {t("paymentMethodCash")}
                    </SelectItem>
                    <SelectItem value="Bank">
                      {t("paymentMethodBank")}
                    </SelectItem>
                    <SelectItem value="Cheque">
                      {t("paymentMethodCheque")}
                    </SelectItem>
                    <SelectItem value="Other">
                      {t("paymentMethodOther")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pmt-notes">{t("paymentNotes")}</Label>
              <Textarea
                id="pmt-notes"
                rows={2}
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentFormOpen(false)}
                disabled={createPaymentMutation.isPending}
              >
                <X className="h-4 w-4" />
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createPaymentMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {createPaymentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {t("recordPayment")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete payment confirmation */}
      <AlertDialog
        open={deletePaymentTarget !== null}
        onOpenChange={(o) => !o && setDeletePaymentTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("paymentDeleted")} ·{" "}
              <span className="font-semibold">
                {deletePaymentTarget
                  ? formatMoney(deletePaymentTarget.payment.amount, currency)
                  : ""}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePaymentMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                if (deletePaymentTarget) {
                  deletePaymentMutation.mutate({
                    invoiceId: deletePaymentTarget.invoice.id,
                    paymentId: deletePaymentTarget.payment.id,
                  });
                }
              }}
              disabled={deletePaymentMutation.isPending}
            >
              {deletePaymentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete supplier confirmation */}
      <AlertDialog
        open={deleteSupplierTarget !== null}
        onOpenChange={(o) => !o && setDeleteSupplierTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSupplier")}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete")}{" "}
              <span className="font-semibold text-foreground">
                {deleteSupplierTarget?.name}
              </span>
              ? {t("deleteSupplierConfirm")}
              {(deleteSupplierTarget?.invoices?.length ?? 0) > 0 && (
                <span className="mt-2 block rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="me-1 inline h-3 w-3" />
                  {t("cannotDeleteSupplierWithInvoices")}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSupplierMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                if (deleteSupplierTarget) {
                  if ((deleteSupplierTarget.invoices?.length ?? 0) > 0) {
                    toast.error(t("cannotDeleteSupplierWithInvoices"));
                    return;
                  }
                  deleteSupplierMutation.mutate(deleteSupplierTarget.id);
                }
              }}
              disabled={
                deleteSupplierMutation.isPending ||
                ((deleteSupplierTarget?.invoices?.length ?? 0) > 0)
              }
            >
              {deleteSupplierMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete invoice confirmation */}
      <AlertDialog
        open={deleteInvoiceTarget !== null}
        onOpenChange={(o) => !o && setDeleteInvoiceTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteInvoice")}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete")}{" "}
              <span className="font-semibold text-foreground">
                {deleteInvoiceTarget?.invoiceNo}
              </span>
              ? {t("deleteInvoiceConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteInvoiceMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                if (deleteInvoiceTarget)
                  deleteInvoiceMutation.mutate(deleteInvoiceTarget.id);
              }}
              disabled={deleteInvoiceMutation.isPending}
            >
              {deleteInvoiceMutation.isPending ? (
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

function EmptySuppliers({
  onAdd,
  hasSuppliers,
  t,
}: {
  onAdd: () => void;
  hasSuppliers: boolean;
  t: T;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <Truck className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">
          {hasSuppliers ? t("noSuppliersMatch") : t("noSuppliersYet")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasSuppliers ? t("tryAdjustingSearch") : t("addFirstSupplierTrack")}
        </p>
      </div>
      {!hasSuppliers && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {t("addFirstSupplier")}
        </Button>
      )}
    </div>
  );
}
