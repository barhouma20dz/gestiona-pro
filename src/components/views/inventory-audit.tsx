"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  Printer,
  ArrowRight,
  ArrowLeft,
  Save,
  Package,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { inventoryAuditApi, shopApi } from "@/lib/api";
import type {
  InventoryAudit,
  InventoryAuditItem,
  InventoryAuditStats,
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
import { Textarea } from "@/components/ui/textarea";
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

type StatusBadgeProps = {
  status: InventoryAudit["status"];
  t: (k: TranslationKey) => string;
};

function StatusBadge({ status, t }: StatusBadgeProps) {
  if (status === "APPROVED") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15 dark:text-emerald-400">
        <CheckCircle2 className="me-1 h-3 w-3" />
        {t("auditStatusApproved")}
      </Badge>
    );
  }
  if (status === "COMPLETED") {
    return (
      <Badge className="bg-slate-500/15 text-slate-700 border-slate-500/30 hover:bg-slate-500/15 dark:text-slate-300">
        {t("auditCompleted")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/15 dark:text-amber-400">
      {t("auditDraft")}
    </Badge>
  );
}

export function InventoryAudit() {
  const { t, isRTL } = useLanguage();
  const qc = useQueryClient();

  const { data: shop } = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  const currency = shop?.currency ?? "دج";

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["inventory-audits"],
    queryFn: inventoryAuditApi.list,
  });

  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createYear, setCreateYear] = useState<number>(
    new Date().getFullYear()
  );
  const [createNotes, setCreateNotes] = useState("");
  const [approveTarget, setApproveTarget] = useState<InventoryAudit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryAudit | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: { year: number; notes?: string }) =>
      inventoryAuditApi.create({ year: data.year, notes: data.notes }),
    onSuccess: () => {
      toast.success(t("auditCreated"));
      qc.invalidateQueries({ queryKey: ["inventory-audits"] });
      setCreateOpen(false);
      setCreateNotes("");
    },
    onError: (e: Error) => toast.error(e.message || t("auditCreated")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryAuditApi.delete(id),
    onSuccess: () => {
      toast.success(t("auditDeleted"));
      qc.invalidateQueries({ queryKey: ["inventory-audits"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || t("auditDeleted")),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => inventoryAuditApi.approve(id),
    onSuccess: () => {
      toast.success(t("auditApproved"));
      qc.invalidateQueries({ queryKey: ["inventory-audits"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setApproveTarget(null);
      // refresh detail too
      if (selectedAuditId) {
        qc.invalidateQueries({
          queryKey: ["inventory-audit", selectedAuditId],
        });
      }
    },
    onError: (e: Error) => toast.error(e.message || t("auditApproved")),
  });

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isInteger(createYear) || createYear < 2000 || createYear > 2100) {
      toast.error(t("auditYear"));
      return;
    }
    createMutation.mutate({ year: createYear, notes: createNotes.trim() });
  };

  return (
    <div className="space-y-6">
      {/* Gradient page header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-6 print:hidden">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
              {t("annualAudit")}
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {t("annualAuditDesc")}
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-card text-primary shadow-md hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
            {t("createAudit")}
          </Button>
        </div>
      </div>

      {/* Body — either list view or detail view */}
      <AnimatePresence mode="wait">
        {selectedAuditId ? (
          <motion.div
            key={`detail-${selectedAuditId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <AuditDetail
              key={selectedAuditId}
              auditId={selectedAuditId}
              onBack={() => setSelectedAuditId(null)}
              onApprove={(a) => setApproveTarget(a)}
              onDelete={(a) => setDeleteTarget(a)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="gap-0 p-0">
              <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 print:hidden">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                  {t("inventoryAudit")}{" "}
                  <span className="text-muted-foreground">({audits.length})</span>
                </h2>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : audits.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                  <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("noAuditsYet")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("noAuditsDesc")}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    {t("createFirstAudit")}
                  </Button>
                </div>
              ) : (
                <ul className="divide-y">
                  {audits.map((a) => (
                    <li
                      key={a.id}
                      className="group flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-emerald-500/5 sm:p-5"
                    >
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 text-start"
                        onClick={() => setSelectedAuditId(a.id)}
                      >
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                          {a.year}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">
                              {t("inventoryAudit")} {a.year}
                            </span>
                            <StatusBadge status={a.status} t={t} />
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t("auditDate")}: {formatDate(a.auditDate)} ·{" "}
                            {a.items.length} {t("auditItems")}
                          </p>
                          {a.notes && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                              {a.notes}
                            </p>
                          )}
                          {a.status === "APPROVED" && a.approvedAt && (
                            <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                              {t("approvedAt")}: {formatDateTime(a.approvedAt)}
                            </p>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedAuditId(a.id)}
                          aria-label={t("view")}
                        >
                          {isRTL ? (
                            <ArrowLeft className="h-4 w-4" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </Button>
                        {a.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                            onClick={() => setDeleteTarget(a)}
                            aria-label={t("delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create audit dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createAudit")}</DialogTitle>
            <DialogDescription>{t("annualAuditDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="audit-year">{t("auditYear")}</Label>
              <Input
                id="audit-year"
                type="number"
                min={2000}
                max={2100}
                value={createYear}
                onChange={(e) => setCreateYear(Number(e.target.value))}
                className="tabular-nums"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audit-notes">{t("auditNotesPlaceholder")}</Label>
              <Textarea
                id="audit-notes"
                rows={3}
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                <X className="h-4 w-4" />
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("createAudit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve confirmation */}
      <AlertDialog
        open={approveTarget !== null}
        onOpenChange={(o) => !o && setApproveTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("approveAudit")}?</AlertDialogTitle>
            <AlertDialogDescription>{t("approveConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={(e) => {
                e.preventDefault();
                if (approveTarget) approveMutation.mutate(approveTarget.id);
              }}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("approveAudit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete")} ·{" "}
              <span className="font-semibold">
                {t("inventoryAudit")} {deleteTarget?.year}
              </span>
              ?
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

/* ---------- Audit detail view ---------- */

interface AuditDetailProps {
  auditId: string;
  onBack: () => void;
  onApprove: (audit: InventoryAudit) => void;
  onDelete: (audit: InventoryAudit) => void;
}

function AuditDetail({ auditId, onBack, onApprove }: AuditDetailProps) {
  const { t, isRTL } = useLanguage();
  const qc = useQueryClient();

  const { data: shop } = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  const currency = shop?.currency ?? "دج";

  const { data: audit, isLoading } = useQuery({
    queryKey: ["inventory-audit", auditId],
    queryFn: () => inventoryAuditApi.get(auditId),
    enabled: !!auditId,
  });

  const { data: stats } = useQuery({
    queryKey: ["inventory-audit-stats", auditId],
    queryFn: () => inventoryAuditApi.stats(auditId),
    enabled: !!auditId,
  });

  const [itemDraft, setItemDraft] = useState<Record<string, string>>({});

  // Note: this component is re-mounted via `key={auditId}` from the parent,
  // so itemDraft naturally resets when switching audits — no sync effect needed.

  const updateItemsMutation = useMutation({
    mutationFn: (items: { id: string; countedStock: number }[]) =>
      inventoryAuditApi.updateItems(auditId, items),
    onSuccess: () => {
      toast.success(t("countedStockUpdated"));
      qc.invalidateQueries({ queryKey: ["inventory-audit", auditId] });
      qc.invalidateQueries({ queryKey: ["inventory-audit-stats", auditId] });
      qc.invalidateQueries({ queryKey: ["inventory-audits"] });
    },
    onError: (e: Error) => toast.error(e.message || t("countedStockUpdated")),
  });

  const markCompletedMutation = useMutation({
    mutationFn: () =>
      inventoryAuditApi.update(auditId, { status: "COMPLETED" }),
    onSuccess: () => {
      toast.success(t("auditUpdated"));
      qc.invalidateQueries({ queryKey: ["inventory-audit", auditId] });
      qc.invalidateQueries({ queryKey: ["inventory-audits"] });
    },
    onError: (e: Error) => toast.error(e.message || t("auditUpdated")),
  });

  // Live stats from draft (guarded against null audit since hooks must run unconditionally)
  const liveStats = useMemo(() => {
    if (!audit) {
      return {
        matched: 0,
        shortage: 0,
        surplus: 0,
        shortageValue: 0,
        surplusValue: 0,
      };
    }
    let matched = 0,
      shortage = 0,
      surplus = 0,
      shortageValue = 0,
      surplusValue = 0;
    for (const it of audit.items) {
      const raw = itemDraft[it.id];
      const counted = raw === undefined ? it.countedStock : Number(raw);
      const diff = counted - it.systemStock;
      const diffValue = diff * it.costPrice;
      if (diff === 0) matched += 1;
      else if (diff < 0) {
        shortage += 1;
        shortageValue += Math.abs(diffValue);
      } else {
        surplus += 1;
        surplusValue += diffValue;
      }
    }
    return { matched, shortage, surplus, shortageValue, surplusValue };
  }, [audit, itemDraft]);

  if (isLoading || !audit) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </Card>
    );
  }

  const isApproved = audit.status === "APPROVED";
  const isCompleted = audit.status === "COMPLETED";

  const handleSave = () => {
    const items = audit.items
      .map((it) => {
        const raw = itemDraft[it.id];
        const v = raw === undefined ? it.countedStock : Number(raw);
        if (!Number.isFinite(v) || v < 0) return null;
        return { id: it.id, countedStock: v };
      })
      .filter((x): x is { id: string; countedStock: number } => x !== null);
    if (items.length === 0) {
      toast.error(t("saveCounted"));
      return;
    }
    updateItemsMutation.mutate(items);
  };

  const displayStats: InventoryAuditStats | null = stats ?? null;
  const s = displayStats ?? {
    totalProducts: audit.items.length,
    matchedCount: liveStats.matched,
    shortageCount: liveStats.shortage,
    surplusCount: liveStats.surplus,
    shortageValue: liveStats.shortageValue,
    surplusValue: liveStats.surplusValue,
  };

  const statsCards = [
    {
      label: t("totalProducts"),
      value: String(s.totalProducts),
      icon: Package,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("matchedProducts"),
      value: String(s.matchedCount),
      icon: CheckCircle,
      tint: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    },
    {
      label: t("shortageProducts"),
      value: `${s.shortageCount} · ${formatMoney(s.shortageValue, currency)}`,
      icon: TrendingDown,
      tint: "bg-red-500/15 text-red-600 dark:text-red-400",
    },
    {
      label: t("surplusProducts"),
      value: `${s.surplusCount} · ${formatMoney(s.surplusValue, currency)}`,
      icon: TrendingUp,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Detail header */}
      <Card className="gap-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onBack}
              aria-label={t("backToAudits")}
            >
              {isRTL ? (
                <ArrowRight className="h-4 w-4" />
              ) : (
                <ArrowLeft className="h-4 w-4" />
              )}
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold sm:text-lg">
                  {t("inventoryAudit")} {audit.year}
                </h2>
                <StatusBadge status={audit.status} t={t} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("auditDate")}: {formatDate(audit.auditDate)} ·{" "}
                {audit.items.length} {t("auditItems")}
              </p>
              {audit.approver && audit.approvedAt && (
                <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  {t("auditApprover")}: {audit.approver.name ?? audit.approver.email} ·{" "}
                  {formatDateTime(audit.approvedAt)}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              {t("printAudit")}
            </Button>
            {!isApproved && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={updateItemsMutation.isPending}
                >
                  {updateItemsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("saveCounted")}
                </Button>
                {!isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markCompletedMutation.mutate()}
                    disabled={markCompletedMutation.isPending}
                  >
                    {markCompletedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {t("auditCompleted")}
                  </Button>
                )}
                {isCompleted && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onApprove(audit)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t("approveAudit")}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statsCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <Card className="gap-0 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {c.label}
                    </p>
                    <p className="mt-1 text-base font-bold tracking-tight sm:text-lg">
                      {c.value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg",
                      c.tint
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Items table */}
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <h3 className="text-sm font-semibold">{t("auditItems")}</h3>
          <span className="text-xs text-muted-foreground">
            {audit.items.length} {t("auditItems")}
          </span>
        </div>
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">{t("name")}</TableHead>
                <TableHead>{t("barcode")}</TableHead>
                <TableHead className="text-center">{t("unit")}</TableHead>
                <TableHead className="text-right">{t("systemStock")}</TableHead>
                <TableHead className="text-right">{t("countedStock")}</TableHead>
                <TableHead className="text-right">{t("difference")}</TableHead>
                <TableHead className="text-right">{t("costPrice")}</TableHead>
                <TableHead className="pr-6 text-right">{t("differenceValue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.items.map((it) => (
                <AuditItemRow
                  key={it.id}
                  item={it}
                  currency={currency}
                  draft={itemDraft[it.id]}
                  readOnly={isApproved}
                  onChange={(v) =>
                    setItemDraft((d) => ({ ...d, [it.id]: v }))
                  }
                  t={t}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile list */}
        <ul className="block divide-y md:hidden">
          {audit.items.map((it) => (
            <AuditItemCard
              key={it.id}
              item={it}
              currency={currency}
              draft={itemDraft[it.id]}
              readOnly={isApproved}
              onChange={(v) => setItemDraft((d) => ({ ...d, [it.id]: v }))}
              t={t}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------- Audit item row (desktop) ---------- */

interface AuditItemRowProps {
  item: InventoryAuditItem;
  currency: string;
  draft: string | undefined;
  readOnly: boolean;
  onChange: (value: string) => void;
  t: (k: TranslationKey) => string;
}

function AuditItemRow({ item, currency, draft, readOnly, onChange, t }: AuditItemRowProps) {
  const isKg = item.unitType === "kg";
  const unitSuffix = isKg ? t("unitKg") : t("unitCount");
  const draftValue = draft === undefined ? item.countedStock : Number(draft);
  const liveDiff =
    (Number.isFinite(draftValue) ? draftValue : item.countedStock) - item.systemStock;
  const liveDiffValue = liveDiff * item.costPrice;
  const diffTone =
    liveDiff === 0
      ? "text-slate-500 dark:text-slate-400"
      : liveDiff < 0
        ? "text-red-600 dark:text-red-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <TableRow className="transition-colors hover:bg-emerald-500/5">
      <TableCell className="pl-6 py-2.5">
        <span className="font-medium">{item.productName}</span>
      </TableCell>
      <TableCell className="font-mono text-xs">{item.barcode || "—"}</TableCell>
      <TableCell className="text-center text-xs">{unitSuffix}</TableCell>
      <TableCell className="text-right tabular-nums">
        {item.systemStock} {isKg ? t("unitKg") : ""}
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min={0}
          step={isKg ? 0.001 : 1}
          inputMode={isKg ? "decimal" : "numeric"}
          value={draft === undefined ? item.countedStock : draft}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
          className="h-8 w-24 text-end tabular-nums"
        />
      </TableCell>
      <TableCell className={cn("text-right tabular-nums font-medium", diffTone)}>
        {liveDiff > 0 ? "+" : ""}
        {liveDiff.toFixed(isKg ? 3 : 0)} {isKg ? t("unitKg") : ""}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatMoney(item.costPrice, currency)}
      </TableCell>
      <TableCell className={cn("pr-6 text-right tabular-nums font-semibold", diffTone)}>
        {liveDiffValue > 0 ? "+" : ""}
        {formatMoney(liveDiffValue, currency)}
      </TableCell>
    </TableRow>
  );
}

/* ---------- Audit item card (mobile) ---------- */

function AuditItemCard({ item, currency, draft, readOnly, onChange, t }: AuditItemRowProps) {
  const isKg = item.unitType === "kg";
  const unitSuffix = isKg ? t("unitKg") : t("unitCount");
  const draftValue = draft === undefined ? item.countedStock : Number(draft);
  const liveDiff =
    (Number.isFinite(draftValue) ? draftValue : item.countedStock) - item.systemStock;
  const liveDiffValue = liveDiff * item.costPrice;
  const diffTone =
    liveDiff === 0
      ? "text-slate-500 dark:text-slate-400"
      : liveDiff < 0
        ? "text-red-600 dark:text-red-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <li className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{item.productName}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {item.barcode || "—"} · {unitSuffix}
          </p>
        </div>
        <Input
          type="number"
          min={0}
          step={isKg ? 0.001 : 1}
          inputMode={isKg ? "decimal" : "numeric"}
          value={draft === undefined ? item.countedStock : draft}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
          className="h-8 w-24 text-end tabular-nums"
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <p className="text-muted-foreground">{t("systemStock")}</p>
          <p className="tabular-nums font-medium">
            {item.systemStock} {isKg ? t("unitKg") : ""}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("difference")}</p>
          <p className={cn("tabular-nums font-medium", diffTone)}>
            {liveDiff > 0 ? "+" : ""}
            {liveDiff.toFixed(isKg ? 3 : 0)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("differenceValue")}</p>
          <p className={cn("tabular-nums font-medium", diffTone)}>
            {liveDiffValue > 0 ? "+" : ""}
            {formatMoney(liveDiffValue, currency)}
          </p>
        </div>
      </div>
    </li>
  );
}
