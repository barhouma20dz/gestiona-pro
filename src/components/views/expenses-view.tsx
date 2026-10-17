"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Calendar,
  Building,
  DollarSign,
  CreditCard,
  FileText,
  AlertCircle,
  Receipt,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { expensesApi, shopApi } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Expense, NewExpense } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const CATEGORY_LABELS: Record<string, string> = {
  RENT: "إيجار المحل",
  UTILITIES: "كهرباء ومياه وإنترنت",
  SALARIES: "رواتب وأجور العمال",
  TRANSPORT: "نقل وتوصيل وشحن",
  MAINTENANCE: "صيانة وتصليح وتجهيزات",
  MARKETING: "إعلانات ودعاية",
  PACKAGING: "أكياس ومواد تغليف",
  OTHER: "مصاريف تشغيلية أخرى",
};

export function ExpensesView() {
  const qc = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const [form, setForm] = useState<NewExpense>({
    category: "OTHER",
    categoryLabel: "مصاريف أخرى",
    amount: 0,
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "Cash",
    paidTo: "",
    notes: "",
  });

  const { data: shop } = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  const currency = shop?.currency ?? "دج";

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", categoryFilter, methodFilter],
    queryFn: () =>
      expensesApi.list({
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        paymentMethod: methodFilter !== "ALL" ? methodFilter : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dailyReport"] });
      qc.invalidateQueries({ queryKey: ["cashSessions"] });
      toast.success("تم تسجيل المصروف بنجاح");
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "فشل تسجيل المصروف"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewExpense> }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dailyReport"] });
      toast.success("تم تحديث المصروف بنجاح");
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "فشل تحديث المصروف"),
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dailyReport"] });
      toast.success("تم حذف المصروف بنجاح");
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.message || "فشل حذف المصروف"),
  });

  const openAdd = () => {
    setEditingExpense(null);
    setForm({
      category: "OTHER",
      categoryLabel: "مصاريف تشغيلية أخرى",
      amount: 0,
      expenseDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "Cash",
      paidTo: "",
      notes: "",
    });
    setFormOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditingExpense(e);
    setForm({
      category: e.category,
      categoryLabel: e.categoryLabel,
      amount: e.amount,
      expenseDate: e.expenseDate.slice(0, 10),
      paymentMethod: e.paymentMethod,
      paidTo: e.paidTo || "",
      notes: e.notes || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filteredExpenses = (data?.expenses ?? []).filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.categoryLabel.toLowerCase().includes(q) ||
      (e.paidTo && e.paidTo.toLowerCase().includes(q)) ||
      (e.notes && e.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-rose-900 via-rose-950 to-slate-900 p-5 text-white shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300">
                المصاريف والنفقات
              </span>
              <span className="text-xs text-rose-200/80">
                التسيير المالي والتشغيلي
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              إدارة المصاريف التشغيلية
            </h2>
            <p className="mt-0.5 text-xs text-rose-200/80 sm:text-sm">
              تسجيل وتصنيف نفقات المحل (إيجار، كهرباء، رواتب، صيانة، نقل)
            </p>
          </div>

          <Button
            onClick={openAdd}
            className="gap-2 bg-rose-600 text-white hover:bg-rose-500 shadow-md"
          >
            <Plus className="h-4 w-4" />
            تسجيل مصروف جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground">
            إجمالي المصاريف المسجلة
          </p>
          <p className="mt-1 text-xl font-black text-rose-600 dark:text-rose-400 sm:text-2xl">
            {formatMoney(data?.totalAmount ?? 0, currency)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {data?.count ?? 0} عملية صرف
          </p>
        </Card>

        {Object.entries(data?.byCategory ?? {})
          .slice(0, 3)
          .map(([cat, info]) => (
            <Card key={cat} className="p-4 sm:p-5">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {info.label}
              </p>
              <p className="mt-1 text-lg font-bold sm:text-xl font-mono">
                {formatMoney(info.total, currency)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {info.count} فواتير مسجلة
              </p>
            </Card>
          ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في المصاريف، اسم المستلم، أو الملاحظات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="الفئة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الفئات</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="طريقة الدفع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل طرق الدفع</SelectItem>
            <SelectItem value="Cash">نقداً</SelectItem>
            <SelectItem value="Bank">تحويل بنكي</SelectItem>
            <SelectItem value="Baridimob">بريدي موب</SelectItem>
            <SelectItem value="Cheque">شيك</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">التاريخ</TableHead>
              <TableHead className="text-center">الفئة</TableHead>
              <TableHead className="text-start">المستلم / الجهة</TableHead>
              <TableHead className="text-center">طريقة الدفع</TableHead>
              <TableHead className="text-center">المبلغ</TableHead>
              <TableHead className="text-start">ملاحظات</TableHead>
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground text-sm"
                >
                  لا توجد مصاريف مطابقة لخيارات البحث.
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="text-center text-xs font-mono">
                    {formatDate(exp.expenseDate)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {exp.categoryLabel}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-start text-xs font-medium">
                    {exp.paidTo || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Badge
                        className={cn(
                          "text-[10px]",
                          exp.paymentMethod === "Cash"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                        )}
                      >
                        {exp.paymentMethod === "Cash"
                          ? "نقداً (الدرج)"
                          : exp.paymentMethod}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatMoney(exp.amount, currency)}
                  </TableCell>
                  <TableCell className="text-start text-xs text-muted-foreground max-w-xs truncate">
                    {exp.notes || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(exp)}
                        aria-label="تعديل المصروف"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                        onClick={() => setDeleteTarget(exp)}
                        aria-label="حذف المصروف"
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
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "تعديل المصروف" : "تسجيل مصروف جديد"}
            </DialogTitle>
            <DialogDescription>
              تسجيل نفقة تشغيلية لحساب صافي الربح والتدفق النقدي بدقة
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>فئة المصروف</Label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    category: val,
                    categoryLabel: CATEGORY_LABELS[val] || val,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>المبلغ ({currency})</Label>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: Number(e.target.value) }))
                  }
                  className="font-mono text-base font-bold"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>تاريخ الصرف</Label>
                <Input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expenseDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>طريقة الدفع</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, paymentMethod: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">نقداً من الدرج</SelectItem>
                    <SelectItem value="Bank">تحويل بنكي</SelectItem>
                    <SelectItem value="Baridimob">بريدي موب</SelectItem>
                    <SelectItem value="Cheque">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>المستلم / الجهة</Label>
                <Input
                  placeholder="اسم الشخص أو الشركة"
                  value={form.paidTo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paidTo: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات إضافية</Label>
              <Textarea
                rows={2}
                placeholder="تفاصيل إضافية عن المصروف..."
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                {editingExpense ? "حفظ التعديل" : "تسجيل المصروف"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(op) => !op && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف هذا المصروف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المصروف بقيمة{" "}
              {deleteTarget ? formatMoney(deleteTarget.amount, currency) : ""}?
              سيتم تحديث التقارير المالية وصافي الأرباح فوراً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
