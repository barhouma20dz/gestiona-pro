"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  Phone,
  MapPin,
  Star,
  Wallet,
  Banknote,
  History,
  TrendingUp,
  FileText,
} from "lucide-react";

import { StatementDialog } from "@/components/statement-dialog";

import { customersApi } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { formatMoney, formatDate } from "@/lib/format";
import { paymentLabelKey } from "@/lib/payment";
import { cn } from "@/lib/utils";
import type { Customer } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ---------- Customer form ---------- */

interface FormState {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

const emptyForm: FormState = { name: "", phone: "", address: "", notes: "" };

function CustomerFormDialog({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Customer | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  // Reset the form each time the dialog opens (create vs edit)
  const key = editing?.id ?? "new";
  if (open && initializedFor !== key) {
    setInitializedFor(key);
    setForm(
      editing
        ? {
            name: editing.name,
            phone: editing.phone,
            address: editing.address,
            notes: editing.notes,
          }
        : emptyForm
    );
  }
  if (!open && initializedFor !== null) setInitializedFor(null);

  const save = useMutation({
    mutationFn: () =>
      editing
        ? customersApi.update(editing.id, form)
        : customersApi.create(form),
    onSuccess: () => {
      toast.success(t(editing ? "customerUpdated" : "customerCreated"));
      qc.invalidateQueries({ queryKey: ["customers"] });
      onClose();
    },
    onError: (e: Error) =>
      toast.error(t("failedCreateCustomer"), { description: e.message }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editCustomer") : t("addCustomer")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("customersSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">{t("customerName")} *</Label>
              <Input
                id="cust-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">{t("customerPhone")}</Label>
              <Input
                id="cust-phone"
                dir="ltr"
                placeholder="0555 00 00 00"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-address">{t("customerAddress")}</Label>
              <Input
                id="cust-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-notes">{t("customerNotes")}</Label>
              <Textarea
                id="cust-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "…" : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Debt payment dialog ---------- */

function PaymentDialog({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const paymentsQuery = useQuery({
    queryKey: ["customer-payments", customer?.id],
    queryFn: () => customersApi.payments(customer!.id),
    enabled: historyOpen && !!customer,
  });

  const record = useMutation({
    mutationFn: () =>
      customersApi.addPayment(customer!.id, {
        amount: Number(amount),
        paymentMethod: method,
        notes,
      }),
    onSuccess: () => {
      toast.success(t("paymentRecorded"));
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer-payments", customer?.id] });
      setAmount("");
      setNotes("");
    },
    onError: (e: Error) =>
      toast.error(t("failedRecordPayment"), { description: e.message }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!customer || !Number.isFinite(value) || value <= 0) return;
    record.mutate();
  };

  const maxPay = customer?.creditOutstanding ?? 0;

  return (
    <Dialog
      open={!!customer}
      onOpenChange={(v) => {
        if (!v) {
          setHistoryOpen(false);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("payDebt")} — {customer?.name}
          </DialogTitle>
          <DialogDescription>
            {t("remainingDebt")}: {""}
            <span className="font-bold text-destructive">
              {formatMoney(maxPay)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="debt-amount">{t("paymentAmount")} (دج) *</Label>
            <div className="flex gap-2">
              <Input
                id="debt-amount"
                dir="ltr"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(maxPay)}
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(String(maxPay))}
                disabled={maxPay <= 0}
              >
                {t("total")}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("paymentMethod")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger dir="auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Cash", "BARIDIMOB", "CARD", "CHEQUE"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(paymentLabelKey(m))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="debt-notes">{t("paymentNotes")}</Label>
            <Input
              id="debt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              <History className="h-4 w-4" />
              {t("customerPaymentHistory")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("close")}
              </Button>
              <Button type="submit" disabled={record.isPending}>
                {record.isPending ? "…" : t("payDebt")}
              </Button>
            </div>
          </DialogFooter>
        </form>

        {historyOpen && (
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
            {paymentsQuery.isLoading ? (
              <p className="text-center text-xs text-muted-foreground">…</p>
            ) : (paymentsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                {t("noCustomerPayments")}
              </p>
            ) : (
              paymentsQuery.data!.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-muted-foreground">
                    {formatDate(p.paymentDate)} ·{" "}
                    {t(paymentLabelKey(p.paymentMethod))}
                    {p.user?.name ? ` · ${p.user.name}` : ""}
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatMoney(p.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Main view ---------- */

export function Customers() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [payTarget, setPayTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [statementTarget, setStatementTarget] = useState<Customer | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: customersApi.list,
  });

  const del = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      toast.success(t("customerDeleted"));
      qc.invalidateQueries({ queryKey: ["customers"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) =>
      toast.error(t("failedDeleteCustomer"), { description: e.message }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers ?? [];
    return (customers ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, search]);

  const stats = useMemo(() => {
    const list = customers ?? [];
    const totalDebt = list.reduce((s, c) => s + c.creditOutstanding, 0);
    const debtors = list.filter((c) => c.creditOutstanding > 0).length;
    const topPoints = list.reduce((m, c) => Math.max(m, c.loyaltyPoints), 0);
    return { totalDebt, debtors, topPoints };
  }, [customers]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{t("customersTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("customersSubtitle")}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {t("addCustomer")}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t("debtorCustomers")}
            </p>
            <p className="text-lg font-bold tabular-nums">
              {stats.debtors}
              <span className="ms-2 text-sm font-medium text-destructive">
                {formatMoney(stats.totalDebt)}
              </span>
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("customers")}</p>
            <p className="text-lg font-bold tabular-nums">
              {customers?.length ?? 0}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t("topLoyaltyCustomers")}
            </p>
            <p className="text-lg font-bold tabular-nums">{stats.topPoints}</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchCustomer")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">…</Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Users className="h-7 w-7" />
          </div>
          <p className="font-semibold">
            {search ? t("noResultsFound") : t("noCustomersYet")}
          </p>
          {!search && (
            <>
              <p className="text-sm text-muted-foreground">
                {t("noCustomersDesc")}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t("addFirstCustomer")}
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((c) => {
            const hasDebt = c.creditOutstanding > 0;
            return (
              <Card key={c.id} className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold",
                        hasDebt
                          ? "bg-destructive/10 text-destructive"
                          : "bg-emerald-500/10 text-emerald-600"
                      )}
                    >
                      {c.name.trim().charAt(0) || "؟"}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-semibold">{c.name}</p>
                      {c.phone && (
                        <p
                          dir="ltr"
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </p>
                      )}
                      {c.address && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{c.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                      aria-label={t("editCustomer")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(c)}
                      aria-label={t("deleteCustomer")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      {t("totalSpent")}
                    </p>
                    <p className="text-sm font-bold tabular-nums">
                      {formatMoney(c.totalSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      {t("purchasesCount")}
                    </p>
                    <p className="text-sm font-bold tabular-nums">
                      {c.salesCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      {t("loyaltyPoints")}
                    </p>
                    <p className="flex items-center justify-center gap-1 text-sm font-bold tabular-nums text-amber-600">
                      <Star className="h-3.5 w-3.5" />
                      {c.loyaltyPoints}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  {hasDebt ? (
                    <Badge
                      variant="outline"
                      className="border-destructive/30 bg-destructive/10 text-destructive"
                    >
                      {t("creditOutstanding")}:{" "}
                      {formatMoney(c.creditOutstanding)}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                    >
                      {t("debtFree")}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    {c.lastSaleAt && (
                      <span className="hidden text-[11px] text-muted-foreground sm:inline">
                        {t("lastPurchase")}: {formatDate(c.lastSaleAt)}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatementTarget(c)}
                      className="gap-1 text-xs"
                      title="كشف حساب تفصيلي"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      كشف حساب
                    </Button>
                    {hasDebt && (
                      <Button size="sm" onClick={() => setPayTarget(c)}>
                        <Banknote className="h-4 w-4" />
                        {t("payDebt")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CustomerFormDialog
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
      />
      <PaymentDialog
        customer={payTarget}
        onClose={() => setPayTarget(null)}
      />
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCustomer")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCustomerConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && del.mutate(deleteTarget.id)}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Statement of Account Dialog */}
      <StatementDialog
        type="customer"
        targetId={statementTarget?.id ?? null}
        targetName={statementTarget?.name}
        open={!!statementTarget}
        onOpenChange={(op) => !op && setStatementTarget(null)}
      />
    </div>
  );
}
