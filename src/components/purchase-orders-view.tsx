"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  PackageCheck,
  Ban,
  Printer,
  ChevronDown,
  Calendar,
  Truck,
  FileText,
  Loader2,
  Trash2,
  AlertCircle,
  Layers,
} from "lucide-react";

import { purchaseOrdersApi, suppliersApi, productsApi, shopApi } from "@/lib/api";
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  NewPurchaseOrder,
  Supplier,
  Product,
} from "@/lib/types";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
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

const statusMeta: Record<
  PurchaseOrderStatus,
  { label: string; color: string; icon: any }
> = {
  DRAFT: {
    label: "مسودة",
    color: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
    icon: Clock,
  },
  SENT: {
    label: "مرسلة للمورد",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: Send,
  },
  PARTIAL: {
    label: "مستلمة جزئياً",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: Truck,
  },
  RECEIVED: {
    label: "مستلمة بالكامل",
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    icon: PackageCheck,
  },
  CANCELLED: {
    label: "ملغاة",
    color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    icon: Ban,
  },
};

interface ItemRow {
  productId?: string;
  productName: string;
  orderedQty: string;
  unitCost: string;
}

export function PurchaseOrdersView() {
  const qc = useQueryClient();

  const { data: shop } = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  const currency = shop?.currency ?? "دج";

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: suppliersApi.list,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [supplierFilter, setSupplierFilter] = useState<string>("ALL");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders", statusFilter, supplierFilter],
    queryFn: () =>
      purchaseOrdersApi.list({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        supplierId: supplierFilter !== "ALL" ? supplierFilter : undefined,
      }),
  });

  // Create Order Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { productId: "", productName: "", orderedQty: "1", unitCost: "0" },
  ]);

  // Receiving Dialog
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receiveInputs, setReceiveInputs] = useState<
    Record<
      string,
      {
        receivedQty: string;
        batchNumber: string;
        expiryDate: string;
      }
    >
  >({});
  const [createInvoiceOnReceive, setCreateInvoiceOnReceive] = useState(true);

  // Print Dialog
  const [printOrder, setPrintOrder] = useState<PurchaseOrder | null>(null);

  /* Derived stats */
  const stats = useMemo(() => {
    let draftCount = 0;
    let pendingCount = 0;
    let receivedCount = 0;
    let totalValue = 0;

    orders.forEach((o) => {
      totalValue += o.totalAmount;
      if (o.status === "DRAFT") draftCount++;
      else if (o.status === "SENT" || o.status === "PARTIAL") pendingCount++;
      else if (o.status === "RECEIVED") receivedCount++;
    });

    return {
      total: orders.length,
      draftCount,
      pendingCount,
      receivedCount,
      totalValue,
    };
  }, [orders]);

  /* Filtered orders */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.supplier?.name.toLowerCase().includes(q) ||
        o.notes.toLowerCase().includes(q)
    );
  }, [orders, search]);

  /* Mutations */
  const createMutation = useMutation({
    mutationFn: (data: NewPurchaseOrder) => purchaseOrdersApi.create(data),
    onSuccess: () => {
      toast.success("✓ تم إنشاء طلبية الشراء بنجاح وحفظها كمسودة");
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      setCreateOpen(false);
      resetCreateForm();
    },
    onError: (err: any) => toast.error(err?.message || "فشل إنشاء طلبية الشراء"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseOrderStatus }) =>
      purchaseOrdersApi.update(id, { status }),
    onSuccess: (_, vars) => {
      const msg =
        vars.status === "SENT"
          ? "✓ تم تأكيد إرسال الطلبية إلى المورد"
          : vars.status === "CANCELLED"
          ? "✓ تم إلغاء طلبية الشراء"
          : "✓ تم تحديث حالة الطلبية";
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => toast.error(err?.message || "فشل تحديث الحالة"),
  });

  const receiveMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        items: Array<{
          itemId: string;
          receivedQty: number;
          batchNumber?: string;
          expiryDate?: string;
        }>;
        createInvoice?: boolean;
      };
    }) => purchaseOrdersApi.receive(id, data),
    onSuccess: () => {
      toast.success("✓ تم تسجيل الاستلام وتحديث المخزون وقيد حركة الشراء بنجاح");
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["supplier-invoices"] });
      setReceivingOrder(null);
    },
    onError: (err: any) => toast.error(err?.message || "فشل تسجيل استلام الطلبية"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.delete(id),
    onSuccess: () => {
      toast.success("✓ تم حذف طلبية الشراء");
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => toast.error(err?.message || "فشل حذف طلبية الشراء"),
  });

  const resetCreateForm = () => {
    setSelectedSupplierId("");
    setOrderNo("");
    setExpectedDate("");
    setNotes("");
    setItems([{ productId: "", productName: "", orderedQty: "1", unitCost: "0" }]);
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      { productId: "", productName: "", orderedQty: "1", unitCost: "0" },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId: prod.id,
              productName: prod.name,
              unitCost: String(prod.costPrice || 0),
            }
          : item
      )
    );
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error("يرجى اختيار المورد");
      return;
    }

    const validItems = items
      .map((it) => ({
        productId: it.productId || null,
        productName: it.productName.trim(),
        orderedQty: parseFloat(it.orderedQty),
        unitCost: parseFloat(it.unitCost) || 0,
      }))
      .filter((it) => it.productName && !isNaN(it.orderedQty) && it.orderedQty > 0);

    if (validItems.length === 0) {
      toast.error("يرجى إضافة صنف واحد على الأقل مع كمية صحيحة");
      return;
    }

    createMutation.mutate({
      supplierId: selectedSupplierId,
      orderNo: orderNo.trim() || undefined,
      expectedDate: expectedDate || null,
      notes: notes.trim(),
      items: validItems,
    });
  };

  const openReceiveDialog = (order: PurchaseOrder) => {
    setReceivingOrder(order);
    const initialInputs: Record<
      string,
      { receivedQty: string; batchNumber: string; expiryDate: string }
    > = {};
    order.items.forEach((item) => {
      const remaining = Math.max(0, item.orderedQty - item.receivedQty);
      initialInputs[item.id] = {
        receivedQty: String(remaining),
        batchNumber: `LOT-${order.orderNo}`,
        expiryDate: "",
      };
    });
    setReceiveInputs(initialInputs);
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingOrder) return;

    const payloadItems = Object.entries(receiveInputs)
      .map(([itemId, val]) => ({
        itemId,
        receivedQty: parseFloat(val.receivedQty) || 0,
        batchNumber: val.batchNumber.trim() || undefined,
        expiryDate: val.expiryDate || undefined,
      }))
      .filter((i) => i.receivedQty > 0);

    if (payloadItems.length === 0) {
      toast.error("يرجى إدخال كمية مستلمة واحدة على الأقل أكبر من صفر");
      return;
    }

    receiveMutation.mutate({
      id: receivingOrder.id,
      data: {
        items: payloadItems,
        createInvoice: createInvoiceOnReceive,
      },
    });
  };

  const selectedSupplierObj = suppliers.find((s) => s.id === selectedSupplierId);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-slate-500/20 bg-slate-500/5">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>إجمالي الطلبيات</span>
            <ShoppingCart className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black mt-2 tabular-nums">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            القيمة: {formatMoney(stats.totalValue, currency)}
          </p>
        </Card>

        <Card className="p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-medium">
            <span>قيد التوريد (مرسلة)</span>
            <Truck className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-2 tabular-nums">
            {stats.pendingCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">بانتظار وصول الشحنة</p>
        </Card>

        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-medium">
            <span>مستلمة بالكامل</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-2 tabular-nums">
            {stats.receivedCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">تم إدخالها للمخزون</p>
        </Card>

        <Card className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-medium">
            <span>مسودات معلقة</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-2 tabular-nums">
            {stats.draftCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">جاهزة للمراجعة والإرسال</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث برقم الطلبية أو اسم المورد..."
              className="pr-9 text-xs h-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] text-xs h-9">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل الحالات</SelectItem>
              <SelectItem value="DRAFT">مسودة</SelectItem>
              <SelectItem value="SENT">مرسلة</SelectItem>
              <SelectItem value="PARTIAL">مستلمة جزئياً</SelectItem>
              <SelectItem value="RECEIVED">مستلمة بالكامل</SelectItem>
              <SelectItem value="CANCELLED">ملغاة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[150px] text-xs h-9">
              <SelectValue placeholder="المورد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل الموردين</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => {
            resetCreateForm();
            setCreateOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 font-bold"
        >
          <Plus className="h-4 w-4" />
          إنشاء طلبية شراء جديدة
        </Button>
      </div>

      {/* Orders Table */}
      <Card className="p-0 overflow-hidden border">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-xs">جاري تحميل طلبيات الشراء...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">لا توجد طلبيات شراء مطابقة</p>
            <p className="text-xs mt-1">ابدأ بإنشاء طلبية شراء لمتابعة استلام البضائع وفواتير الموردين بدقة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="text-xs">
                  <TableHead className="text-center">رقم الطلبية</TableHead>
                  <TableHead className="text-start">المورد</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">تاريخ الطلب</TableHead>
                  <TableHead className="text-center">الاستلام والتنفيذ</TableHead>
                  <TableHead className="text-center">الإجمالي</TableHead>
                  <TableHead className="text-center">الفاتورة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const meta = statusMeta[o.status] || {
                    label: o.status,
                    color: "bg-muted text-muted-foreground",
                    icon: Clock,
                  };
                  const Icon = meta.icon;

                  const totalOrdered = o.items.reduce((sum, i) => sum + i.orderedQty, 0);
                  const totalReceived = o.items.reduce((sum, i) => sum + i.receivedQty, 0);
                  const percent = totalOrdered > 0 ? Math.min(100, (totalReceived / totalOrdered) * 100) : 0;

                  return (
                    <TableRow key={o.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="text-center font-bold font-mono text-foreground">
                        {o.orderNo}
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex flex-col">
                          <span className="font-semibold">{o.supplier?.name}</span>
                          {o.supplier?.phone && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {o.supplier.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Badge className={cn("gap-1 py-0.5 text-[10px] font-medium border", meta.color)}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground text-[11px]">
                        {formatDate(new Date(o.orderDate).toISOString())}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1 w-28 mx-auto">
                          <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                            {totalReceived} / {totalOrdered} ({percent.toFixed(0)}%)
                          </span>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                percent >= 100
                                  ? "bg-emerald-500"
                                  : percent > 0
                                  ? "bg-amber-500"
                                  : "bg-slate-300 dark:bg-slate-700"
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold tabular-nums">
                        {formatMoney(o.totalAmount, currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        {o.invoice ? (
                          <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700">
                            {o.invoice.invoiceNo}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Receive button if not fully received or cancelled */}
                          {o.status !== "RECEIVED" && o.status !== "CANCELLED" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openReceiveDialog(o)}
                              className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                              title="تسجيل استلام البضائع"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              استلام
                            </Button>
                          )}

                          {/* Send button if DRAFT */}
                          {o.status === "DRAFT" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => updateStatusMutation.mutate({ id: o.id, status: "SENT" })}
                              className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-500/10"
                              title="تأكيد إرسال الطلبية للمورد"
                            >
                              <Send className="h-3.5 w-3.5" />
                              إرسال
                            </Button>
                          )}

                          {/* Print / View */}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setPrintOrder(o)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="عرض وطباعة الطلبية"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete if DRAFT or CANCELLED */}
                          {(o.status === "DRAFT" || o.status === "CANCELLED") && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(o.id)}
                              className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                              title="حذف الطلبية"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-5 border-b bg-muted/40">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              إنشاء طلبية شراء وتوريد جديدة (Purchase Order)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              يتم حفظ الطلبية كمسودة. لن يتم زيادة المخزون إلا عند تسجيل الاستلام الفعلي للبضاعة.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">المورد (إلزامي)</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="اختر المورد..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name} {s.leadTimeDays ? `(مدة التوريد: ${s.leadTimeDays} أيام)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSupplierObj && (
                  <p className="text-[11px] text-muted-foreground">
                    شروط الدفع: <b>{selectedSupplierObj.paymentTerms || "نقد عند الاستلام"}</b>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ الوصول المتوقع</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Items table */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">أصناف الطلبية والكميات المطلوبة</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddItemRow}
                  className="h-7 text-xs gap-1 border-dashed"
                >
                  <Plus className="h-3 w-3" />
                  إضافة صنف
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-card p-2 rounded-md border">
                    {/* Pick existing product */}
                    <div className="w-1/3">
                      <Select
                        value={row.productId}
                        onValueChange={(val) => handleProductSelect(idx, val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="اختر من المنتجات..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Or custom name */}
                    <Input
                      placeholder="اسم الصنف"
                      value={row.productName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, productName: val } : it))
                        );
                      }}
                      className="flex-1 h-8 text-xs"
                      required
                    />

                    {/* Qty */}
                    <Input
                      type="number"
                      min="0.1"
                      step="any"
                      placeholder="الكمية"
                      value={row.orderedQty}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, orderedQty: val } : it))
                        );
                      }}
                      className="w-20 h-8 text-xs tabular-nums text-center"
                      required
                    />

                    {/* Unit Cost */}
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="السعر"
                      value={row.unitCost}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, unitCost: val } : it))
                        );
                      }}
                      className="w-24 h-8 text-xs tabular-nums text-center"
                    />

                    {/* Remove */}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={items.length <= 1}
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Total estimation */}
              <div className="flex justify-end items-center gap-2 pt-2 text-xs">
                <span className="text-muted-foreground">الإجمالي التقديري:</span>
                <b className="text-sm font-bold text-foreground">
                  {formatMoney(
                    items.reduce(
                      (sum, it) =>
                        sum + (parseFloat(it.orderedQty) || 0) * (parseFloat(it.unitCost) || 0),
                      0
                    ),
                    currency
                  )}
                </b>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">ملاحظات أو شروط خاصة</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: التوصيل إلى المخزن الخلفي، الدفع بشيك بعد المعاينة..."
                className="h-9 text-xs"
              />
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              >
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                حفظ طلبية الشراء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receiving Dialog */}
      <Dialog open={Boolean(receivingOrder)} onOpenChange={(o) => !o && setReceivingOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-5 border-b bg-muted/40">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              تسجيل استلام بضاعة لطلبية رقم: {receivingOrder?.orderNo}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              أدخل الكميات المستلمة وتواريخ الصلاحية. سيتم زيادة رصيد المخزون وقيد حركة شراء في السجل تلقائياً.
            </DialogDescription>
          </DialogHeader>

          {receivingOrder && (
            <form onSubmit={handleReceiveSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="text-xs">
                      <TableHead className="text-start">الصنف</TableHead>
                      <TableHead className="text-center">المطلوب</TableHead>
                      <TableHead className="text-center">المستلم سابقاً</TableHead>
                      <TableHead className="text-center">الكمية المستلمة الآن</TableHead>
                      <TableHead className="text-center">رقم اللوت / الصلاحية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivingOrder.items.map((item) => {
                      const input = receiveInputs[item.id] || {
                        receivedQty: "0",
                        batchNumber: "",
                        expiryDate: "",
                      };

                      return (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell className="text-start font-semibold">{item.productName}</TableCell>
                          <TableCell className="text-center tabular-nums">{item.orderedQty}</TableCell>
                          <TableCell className="text-center tabular-nums text-muted-foreground">
                            {item.receivedQty}
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={input.receivedQty}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReceiveInputs((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], receivedQty: val },
                                }));
                              }}
                              className="w-20 h-8 text-xs text-center mx-auto tabular-nums font-bold"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-1">
                              <Input
                                placeholder="رقم اللوت"
                                value={input.batchNumber}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReceiveInputs((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], batchNumber: val },
                                  }));
                                }}
                                className="w-24 h-8 text-[11px]"
                              />
                              <Input
                                type="date"
                                value={input.expiryDate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReceiveInputs((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], expiryDate: val },
                                  }));
                                }}
                                className="w-32 h-8 text-[11px] font-mono"
                                title="تاريخ انتهاء الصلاحية"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <input
                  type="checkbox"
                  id="create-inv"
                  checked={createInvoiceOnReceive}
                  onChange={(e) => setCreateInvoiceOnReceive(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="create-inv" className="text-xs cursor-pointer select-none">
                  <b>توليد فاتورة مورد تلقائية</b> بمبلغ البضائع المستلمة وربطها بهذه الطلبية
                </label>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReceivingOrder(null)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={receiveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  {receiveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  تأكيد الاستلام وقيد المخزون
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Printable Purchase Order Dialog */}
      <Dialog open={Boolean(printOrder)} onOpenChange={(o) => !o && setPrintOrder(null)}>
        <DialogContent className="max-w-xl p-6" dir="rtl">
          {printOrder && (
            <div className="space-y-4">
              <div className="border-b pb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black">{shop?.name || "Gestiona Pro"}</h3>
                  <p className="text-xs text-muted-foreground">طلبية شراء وتوريد رسمية</p>
                  <p className="text-xs font-mono font-bold mt-1 text-emerald-600">
                    رقم الطلبية: {printOrder.orderNo}
                  </p>
                </div>
                <div className="text-left text-xs space-y-0.5">
                  <p>التاريخ: <b>{formatDate(new Date(printOrder.orderDate).toISOString())}</b></p>
                  {printOrder.expectedDate && (
                    <p>الوصول المتوقع: <b>{formatDate(new Date(printOrder.expectedDate).toISOString())}</b></p>
                  )}
                  <p>الحالة: <b>{statusMeta[printOrder.status]?.label}</b></p>
                </div>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                <p className="font-bold">بيانات المورد:</p>
                <p>الاسم: {printOrder.supplier?.name}</p>
                {printOrder.supplier?.phone && <p>الهاتف: {printOrder.supplier.phone}</p>}
                {printOrder.supplier?.paymentTerms && (
                  <p>شروط السداد: {printOrder.supplier.paymentTerms}</p>
                )}
              </div>

              <Table className="border text-xs">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-center">#</TableHead>
                    <TableHead className="text-start">الصنف</TableHead>
                    <TableHead className="text-center">الكمية المطلوبة</TableHead>
                    <TableHead className="text-center">سعر الوحدة</TableHead>
                    <TableHead className="text-center">المجموع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printOrder.items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                      <TableCell className="text-start font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center font-bold tabular-nums">
                        {item.orderedQty}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {formatMoney(item.unitCost, currency)}
                      </TableCell>
                      <TableCell className="text-center font-bold tabular-nums">
                        {formatMoney(item.total, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-2 flex justify-between items-center text-sm">
                <span className="font-bold">المجموع الإجمالي للطلبية:</span>
                <span className="font-black text-base text-emerald-600">
                  {formatMoney(printOrder.totalAmount, currency)}
                </span>
              </div>

              {printOrder.notes && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  <b>ملاحظات:</b> {printOrder.notes}
                </div>
              )}

              <DialogFooter className="pt-4 border-t gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={() => setPrintOrder(null)}>
                  إغلاق
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <Printer className="h-4 w-4" />
                  طباعة الطلبية
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
