"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Mail,
  Loader2,
  BarChart3,
  Wallet,
  Receipt,
  TrendingUp,
  Users,
  KeyRound,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Power,
  Phone,
  History,
  CheckSquare,
  Square,
  Lock,
  UserCheck,
  UserX,
  Search,
  ShoppingCart,
  Package,
  Truck,
  Activity,
  AlertCircle,
  Award,
  Sparkles,
  CheckCheck,
  CreditCard,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { sellersApi, shopApi, auditLogsApi, commissionsApi } from "@/lib/api";
import type { Seller, NewSeller, SellerEarnings, AuditLogEntry, CommissionRule, SellerRewardRecord } from "@/lib/types";
import { formatMoney, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { toast } from "sonner";
import {
  PERMISSION_CATEGORIES,
  ALL_PERMISSIONS,
  parsePermissions,
} from "@/lib/permissions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AnimatedNumber } from "@/components/animated-number";

type T = (key: TranslationKey) => string;

/* ---------- helpers ---------- */

function initialsOf(name: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? parts[1][0] ?? "" : "";
  return (first + second).toUpperCase() || "U";
}

/* ---------- form state ---------- */

interface UserFormState {
  username: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  isActive: boolean;
  permissions: string[];
}

const emptyUserForm: UserFormState = {
  username: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  isActive: true,
  permissions: [
    "sales.view",
    "sales.create",
    "sales.view_own",
    "products.view",
    "products.view_stock",
  ],
};

function toUserForm(s: Seller): UserFormState {
  return {
    username: s.username ?? "",
    name: s.name ?? "",
    email: s.email ?? "",
    phone: s.phone ?? "",
    password: "",
    confirmPassword: "",
    isActive: s.isActive !== false,
    permissions: parsePermissions(s.permissions),
  };
}

/* ---------- main component ---------- */

export function SellerManagement() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"users" | "audit" | "commissions">("users");

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ["sellers"],
    queryFn: sellersApi.list,
  });

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const currency = shop?.currency ?? "دج";

  // Audit logs query
  const [auditFilter, setAuditFilter] = useState<string>("ALL");
  const { data: auditLogs = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ["audit-logs", auditFilter],
    queryFn: () =>
      auditLogsApi.list({
        limit: 100,
        action: auditFilter === "ALL" ? undefined : auditFilter,
      }),
    enabled: activeTab === "audit",
  });

  // Commissions & Rewards queries
  const { data: commissionRule, isLoading: isLoadingRule } = useQuery({
    queryKey: ["commissionRule"],
    queryFn: commissionsApi.getRule,
    enabled: activeTab === "commissions",
  });

  const {
    data: calculationData,
    isLoading: isLoadingCalc,
    refetch: refetchCalc,
    isRefetching: isRefetchingCalc,
  } = useQuery({
    queryKey: ["commissionsCalc"],
    queryFn: () => commissionsApi.calculate(),
    enabled: activeTab === "commissions",
  });

  const {
    data: rewardRecords = [],
    isLoading: isLoadingRewards,
    refetch: refetchRewards,
    isRefetching: isRefetchingRewards,
  } = useQuery({
    queryKey: ["commissionRecords"],
    queryFn: commissionsApi.listRewards,
    enabled: activeTab === "commissions",
  });

  const [ruleForm, setRuleForm] = useState<Partial<CommissionRule>>({});
  const [syncedRuleId, setSyncedRuleId] = useState<string | null>(null);

  if (commissionRule && commissionRule.id !== syncedRuleId) {
    setSyncedRuleId(commissionRule.id);
    setRuleForm({
      isEnabled: commissionRule.isEnabled ?? false,
      calculationBasis: commissionRule.calculationBasis ?? "NET_SALES",
      rewardType: commissionRule.rewardType ?? "PERCENTAGE",
      rateValue: commissionRule.rateValue ?? 5,
      period: commissionRule.period ?? "MONTHLY",
      minTarget: commissionRule.minTarget ?? 0,
      notes: commissionRule.notes ?? "",
    });
  }

  const saveRuleMutation = useMutation({
    mutationFn: (data: Partial<CommissionRule>) => commissionsApi.saveRule(data),
    onSuccess: () => {
      toast.success("تم حفظ إعدادات وقواعد المكافآت بنجاح");
      qc.invalidateQueries({ queryKey: ["commissionRule"] });
      qc.invalidateQueries({ queryKey: ["commissionsCalc"] });
    },
    onError: (e: Error) => toast.error(e.message || "فشل حفظ القواعد"),
  });

  const snapshotMutation = useMutation({
    mutationFn: (records: any[]) =>
      fetch("/api/commissions/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      }).then((res) => {
        if (!res.ok) throw new Error("فشل حفظ الكشف");
        return res.json();
      }),
    onSuccess: () => {
      toast.success("تم ترحيل وحفظ كشف المكافآت بنجاح في السجل");
      qc.invalidateQueries({ queryKey: ["commissionRecords"] });
      qc.invalidateQueries({ queryKey: ["commissionsCalc"] });
    },
    onError: (e: Error) => toast.error(e.message || "فشل حفظ الكشف"),
  });

  const approveRewardMutation = useMutation({
    mutationFn: ({ id, approvedAmount }: { id: string; approvedAmount?: number }) =>
      commissionsApi.approveReward(id, approvedAmount),
    onSuccess: () => {
      toast.success("تم اعتماد المكافأة بنجاح وأصبحت جاهزة للصرف");
      qc.invalidateQueries({ queryKey: ["commissionRecords"] });
    },
    onError: (e: Error) => toast.error(e.message || "فشل اعتماد المكافأة"),
  });

  const payRewardMutation = useMutation({
    mutationFn: ({ id, paymentMethod }: { id: string; paymentMethod: string }) =>
      commissionsApi.payReward(id, paymentMethod),
    onSuccess: () => {
      toast.success("تم تسجيل صرف المكافأة للموظف بنجاح وإدراجها في المصاريف التشغيلية");
      qc.invalidateQueries({ queryKey: ["commissionRecords"] });
      qc.invalidateQueries({ queryKey: ["dailyReport"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message || "فشل تسجيل الصرف"),
  });

  // User search
  const [userSearch, setUserSearch] = useState("");

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyUserForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Seller | null>(null);

  // Earnings dialog state
  const [earningsTarget, setEarningsTarget] = useState<Seller | null>(null);

  // Change password dialog
  const [pwdTarget, setPwdTarget] = useState<Seller | null>(null);
  const [pwdValue, setPwdValue] = useState("");
  const [confirmPwdValue, setConfirmPwdValue] = useState("");
  const [pwdError, setPwdError] = useState<string>("");

  // Phone pairing & role assignment dialog
  const [pairTarget, setPairTarget] = useState<Seller | null>(null);
  const [pairRole, setPairRole] = useState<"cashier" | "order_taker" | "monitor" | "customer_display">("order_taker");

  const getPairingUrl = (seller: Seller, role: string): string => {
    let origin = typeof window !== "undefined" ? window.location.origin : "http://192.168.100.64:3001";
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      origin = origin.replace("localhost", "192.168.100.64").replace("127.0.0.1", "192.168.100.64");
    }
    const viewParam = role === "owner" ? "dashboard" : "pos";
    return `${origin}/?view=${viewParam}&room=DZ-CLOSED-7788&pin=7788&role=${role}&devName=${encodeURIComponent(seller.name || "بائع")}&email=${encodeURIComponent(seller.email)}`;
  };

  /* Filtered sellers */
  const filteredSellers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.username && s.username.toLowerCase().includes(q)) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
    );
  }, [sellers, userSearch]);

  /* Derived stats */
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalSales = 0;
    let activeUsers = 0;
    sellers.forEach((s) => {
      totalRevenue += s.totalRevenue ?? 0;
      totalProfit += s.totalProfit ?? 0;
      totalSales += s.totalSales ?? 0;
      if (s.isActive !== false) activeUsers += 1;
    });
    return {
      totalSellers: sellers.length,
      activeUsers,
      disabledUsers: sellers.length - activeUsers,
      totalRevenue,
      totalProfit,
      totalSales,
    };
  }, [sellers]);

  /* Mutations */
  const createMutation = useMutation({
    mutationFn: (data: NewSeller) => sellersApi.create(data),
    onSuccess: () => {
      toast.success("تم إنشاء حساب المستخدم والصلاحيات بنجاح");
      qc.invalidateQueries({ queryKey: ["sellers"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "فشل إنشاء حساب المستخدم"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      sellersApi.update(id, data),
    onSuccess: () => {
      toast.success("تم تحديث بيانات المستخدم والصلاحيات بنجاح");
      qc.invalidateQueries({ queryKey: ["sellers"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "فشل تحديث المستخدم"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      sellersApi.update(id, { isActive }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.isActive ? "تم تفعيل الحساب بنجاح" : "تم تعطيل الحساب بنجاح"
      );
      qc.invalidateQueries({ queryKey: ["sellers"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (e: Error) => toast.error(e.message || "فشل تغيير حالة الحساب"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sellersApi.delete(id),
    onSuccess: () => {
      toast.success(t("sellerDeleted"));
      qc.invalidateQueries({ queryKey: ["sellers"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || t("failedDeleteSeller")),
  });

  const changePwdMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      sellersApi.changePassword(id, password),
    onSuccess: () => {
      toast.success(t("passwordChanged"));
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      setPwdTarget(null);
      setPwdValue("");
      setConfirmPwdValue("");
      setPwdError("");
    },
    onError: (e: Error) => toast.error(e.message || t("failedChangePassword")),
  });

  /* Form handlers */
  const openAdd = () => {
    setEditing(null);
    setForm(emptyUserForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (s: Seller) => {
    setEditing(s);
    setForm(toUserForm(s));
    setFormErrors({});
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.username.trim() && !form.email.trim()) {
      errs.username = "اسم المستخدم أو البريد الإلكتروني مطلوب";
    }
    if (form.username.trim() && form.username.trim().length < 3) {
      errs.username = "يجب أن يتكون اسم المستخدم من 3 أحرف على الأقل";
    }
    if (!editing) {
      if (!form.password) {
        errs.password = "كلمة المرور مطلوبة";
      } else if (form.password.length < 6) {
        errs.password = "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل";
      }
      if (form.password !== form.confirmPassword) {
        errs.confirmPassword = "كلمتا المرور غير متطابقتين";
      }
    } else {
      if (form.password) {
        if (form.password.length < 6) {
          errs.password = "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل";
        }
        if (form.password !== form.confirmPassword) {
          errs.confirmPassword = "كلمتا المرور غير متطابقتين";
        }
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editing) {
      const payload: any = {
        name: form.name.trim() || form.username.trim(),
        username: form.username.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        isActive: form.isActive,
        permissions: form.permissions,
      };
      if (form.password.trim()) {
        payload.password = form.password;
      }
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      const payload: NewSeller = {
        username: form.username.trim() || undefined,
        name: form.name.trim() || form.username.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password,
        isActive: form.isActive,
        permissions: form.permissions,
      };
      createMutation.mutate(payload);
    }
  };

  const submitChangePwd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdTarget) return;
    if (pwdValue.length < 6) {
      setPwdError("يجب أن تتكون كلمة المرور من 6 أحرف على الأقل");
      return;
    }
    if (pwdValue !== confirmPwdValue) {
      setPwdError("كلمتا المرور غير متطابقتين");
      return;
    }
    changePwdMutation.mutate({ id: pwdTarget.id, password: pwdValue });
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  /* Permission helpers inside form */
  const togglePermission = (key: string) => {
    setForm((f) => {
      const exists = f.permissions.includes(key);
      const next = exists
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key];
      return { ...f, permissions: next };
    });
  };

  const toggleCategoryPermissions = (categoryKey: string) => {
    const catPerms = ALL_PERMISSIONS.filter((p) => p.category === categoryKey).map(
      (p) => p.key
    );
    const allSelected = catPerms.every((k) => form.permissions.includes(k));

    setForm((f) => {
      let next: string[];
      if (allSelected) {
        next = f.permissions.filter((k) => !catPerms.includes(k));
      } else {
        next = Array.from(new Set([...f.permissions, ...catPerms]));
      }
      return { ...f, permissions: next };
    });
  };

  const selectAllPermissions = () => {
    setForm((f) => ({
      ...f,
      permissions: ALL_PERMISSIONS.map((p) => p.key),
    }));
  };

  const clearAllPermissions = () => {
    setForm((f) => ({
      ...f,
      permissions: [],
    }));
  };

  /* Category icon helper */
  const renderCategoryIcon = (catKey: string) => {
    switch (catKey) {
      case "sales":
        return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
      case "products":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "suppliers":
        return <Truck className="h-4 w-4 text-amber-500" />;
      case "finance":
        return <BarChart3 className="h-4 w-4 text-purple-500" />;
      case "admin":
        return <ShieldCheck className="h-4 w-4 text-rose-500" />;
      default:
        return <ShieldCheck className="h-4 w-4 text-primary" />;
    }
  };

  /* Stat cards */
  const statCards = [
    {
      label: "إجمالي المستخدمين",
      value: String(stats.totalSellers),
      sub: `${stats.activeUsers} نشط · ${stats.disabledUsers} معطل`,
      icon: Users,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: "الحسابات النشطة",
      value: String(stats.activeUsers),
      sub: "مسموح لهم بالدخول للنظام",
      icon: UserCheck,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("totalSales"),
      value: String(stats.totalSales),
      sub: "عمليات بيع عبر البائعين",
      icon: Receipt,
      tint: "bg-amber-500/15 text-amber-600",
    },
    {
      label: t("totalRevenue"),
      value: formatMoney(stats.totalRevenue, currency),
      sub: `${formatMoney(stats.totalProfit, currency)} أرباح محققة`,
      icon: Wallet,
      tint: "bg-emerald-500/15 text-emerald-600",
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
              المستخدمون والصلاحيات
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              إدارة حسابات البائعين، تحديد الصلاحيات المخصصة، وتدقيق العمليات الحساسة
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="bg-card text-primary shadow-md hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
            <span>إنشاء حساب مستخدم جديد</span>
          </Button>
        </div>
      </div>

      {/* Navigation tabs between Users & Audit Log */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("users")}
          className="gap-2 font-medium"
        >
          <Users className="h-4 w-4" />
          <span>المستخدمون والبائعون ({sellers.length})</span>
        </Button>
        <Button
          variant={activeTab === "audit" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("audit")}
          className="gap-2 font-medium"
        >
          <History className="h-4 w-4" />
          <span>سجل العمليات والتدقيق (Audit Logs)</span>
        </Button>
        <Button
          variant={activeTab === "commissions" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("commissions")}
          className="gap-2 font-medium"
        >
          <Award className="h-4 w-4 text-amber-500" />
          <span>المكافآت والحوافز (Commissions)</span>
        </Button>
      </div>

      {activeTab === "audit" ? (
        /* Audit Logs View */
        <Card className="gap-0 p-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600" />
                <span>سجل العمليات والتدقيق في المتجر</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                يسجل العمليات الحساسة (إنشاء وتعديل المستخدمين، تصوير الفواتير، تغيير الحالات)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={auditFilter === "ALL" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAuditFilter("ALL")}
              >
                الكل
              </Button>
              <Button
                variant={auditFilter === "USER_CREATE" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAuditFilter("USER_CREATE")}
              >
                إنشاء مستخدم
              </Button>
              <Button
                variant={auditFilter === "USER_UPDATE" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAuditFilter("USER_UPDATE")}
              >
                تعديل مستخدم
              </Button>
              <Button
                variant={auditFilter === "INVOICE_CREATE" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAuditFilter("INVOICE_CREATE")}
              >
                فواتير الموردين
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6 text-center">التاريخ والوقت</TableHead>
                  <TableHead className="text-start">المنفذ</TableHead>
                  <TableHead className="text-center">نوع العملية</TableHead>
                  <TableHead className="text-center">الهدف / الكيان</TableHead>
                  <TableHead className="pr-6 text-start">التفاصيل الكاملة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAudit ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>جاري تحميل سجل التدقيق...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                      لا توجد عمليات مسجلة حالياً
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/20">
                      <TableCell className="pl-6 py-3 text-center font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-start font-medium text-xs">
                        <span className="text-foreground">{log.userName}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                            {log.action}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {log.entity}
                      </TableCell>
                      <TableCell className="pr-6 text-start text-xs text-foreground">
                        {log.details || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : activeTab === "commissions" ? (
        /* Commissions & Rewards View */
        <CommissionsSection
          rule={ruleForm}
          onUpdateRule={setRuleForm}
          onSaveRule={() => saveRuleMutation.mutate(ruleForm)}
          isSavingRule={saveRuleMutation.isPending}
          calcData={calculationData}
          isLoadingCalc={isLoadingCalc}
          onSnapshot={(records) => snapshotMutation.mutate(records)}
          isSnapshotting={snapshotMutation.isPending}
          records={rewardRecords}
          isLoadingRecords={isLoadingRewards}
          onApprove={(id, approvedAmount) =>
            approveRewardMutation.mutate({ id, approvedAmount })
          }
          isApproving={approveRewardMutation.isPending}
          onPay={(id, paymentMethod) =>
            payRewardMutation.mutate({ id, paymentMethod })
          }
          isPaying={payRewardMutation.isPending}
          currency={currency}
        />
      ) : (
        /* Users & Permissions View */
        <>
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
                          "grid size-9 shrink-0 place-items-center rounded-xl",
                          s.tint
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

          {/* Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو اسم المستخدم أو الهاتف..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <p className="text-xs text-muted-foreground self-start sm:self-center">
              عرض {filteredSellers.length} من أصل {sellers.length} مستخدم
            </p>
          </div>

          {/* Sellers table card */}
          <Card className="gap-0 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
              <h2 className="text-sm font-semibold">
                حسابات البائعين والمستخدمين{" "}
                <span className="text-muted-foreground">({sellers.length})</span>
              </h2>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6 text-start">المستخدم / البائع</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">الصلاحيات الممنوحة</TableHead>
                    <TableHead className="text-center">{t("totalSales")}</TableHead>
                    <TableHead className="text-center">{t("totalRevenue")}</TableHead>
                    <TableHead className="pr-6 text-center">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("loading")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSellers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center">
                        <EmptySellers onAdd={openAdd} t={t} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSellers.map((s) => {
                      const perms = parsePermissions(s.permissions);
                      const isActive = s.isActive !== false;
                      return (
                        <TableRow
                          key={s.id}
                          className={cn(
                            "group transition-colors hover:bg-emerald-500/5",
                            !isActive && "opacity-60 bg-muted/20"
                          )}
                        >
                          <TableCell className="pl-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold text-xs",
                                  isActive
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : "bg-red-500/10 text-red-600"
                                )}
                              >
                                {initialsOf(s.name)}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold transition-colors group-hover:text-primary">
                                    {s.name || s.username || "—"}
                                  </span>
                                  {s.username && (
                                    <span className="text-xs font-mono text-muted-foreground">
                                      (@{s.username})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                  <span>{s.email}</span>
                                  {s.phone && (
                                    <>
                                      <span>·</span>
                                      <span className="font-mono">{s.phone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: s.id,
                                    isActive: !isActive,
                                  })
                                }
                                title={isActive ? "انقر لتعطيل الحساب" : "انقر لتفعيل الحساب"}
                                className="focus:outline-hidden"
                              >
                                {isActive ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 hover:bg-emerald-500/25 cursor-pointer">
                                    <UserCheck className="h-3 w-3" />
                                    <span>نشط</span>
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 gap-1 hover:bg-red-500/25 cursor-pointer">
                                    <UserX className="h-3 w-3" />
                                    <span>معطل</span>
                                  </Badge>
                                )}
                              </button>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-xs gap-1 border-border/80">
                                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                <span>{perms.length} من {ALL_PERMISSIONS.length} صلاحية</span>
                              </Badge>
                              {perms.includes("*") && (
                                <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px]">
                                  شامل
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Badge variant="secondary" className="tabular-nums">
                                {s.totalSales ?? 0}
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell className="text-center font-semibold tabular-nums">
                            {formatMoney(s.totalRevenue ?? 0, currency)}
                          </TableCell>

                          <TableCell className="pr-6 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={() => {
                                  setPairTarget(s);
                                  setPairRole("order_taker");
                                }}
                                aria-label={`ربط هاتف ${s.name ?? ""}`}
                                title="📱 ربط الهاتف وتحديد الدور (QR Code)"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                onClick={() => setEarningsTarget(s)}
                                aria-label={`${t("earnings")} ${s.name ?? ""}`}
                                title={t("earnings")}
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                onClick={() => {
                                  setPwdTarget(s);
                                  setPwdValue("");
                                  setConfirmPwdValue("");
                                  setPwdError("");
                                }}
                                aria-label={`${t("changePassword")} ${s.name ?? ""}`}
                                title={t("changePassword")}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted"
                                onClick={() => openEdit(s)}
                                aria-label={`${t("edit")} ${s.name ?? ""}`}
                                title="تعديل المستخدم والصلاحيات"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
                                onClick={() => setDeleteTarget(s)}
                                aria-label={`${t("delete")} ${s.name ?? ""}`}
                                title={t("delete")}
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
                  {t("loading")}
                </div>
              ) : filteredSellers.length === 0 ? (
                <div className="px-4 py-12">
                  <EmptySellers onAdd={openAdd} t={t} />
                </div>
              ) : (
                <ul className="divide-y">
                  {filteredSellers.map((s) => {
                    const perms = parsePermissions(s.permissions);
                    const isActive = s.isActive !== false;
                    return (
                      <li key={s.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-xs",
                                  isActive
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : "bg-red-500/10 text-red-600"
                                )}
                              >
                                {initialsOf(s.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{s.name || s.username || "—"}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {s.username ? `@${s.username}` : s.email}
                                </p>
                              </div>
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              {isActive ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                                  نشط
                                </Badge>
                              ) : (
                                <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[10px]">
                                  معطل
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px]">
                                {perms.length} صلاحية
                              </Badge>
                              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 tabular-nums text-[10px]">
                                {formatMoney(s.totalRevenue ?? 0, currency)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 border-emerald-500/30"
                                onClick={() => {
                                  setPairTarget(s);
                                  setPairRole("order_taker");
                                }}
                                title="ربط الهاتف"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(s)}
                                aria-label={t("edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-red-600 dark:text-red-400"
                                onClick={() => setDeleteTarget(s)}
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
        </>
      )}

      {/* Add/Edit User Dialog with Granular Permissions */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-emerald-600" />
              <span>{editing ? "تعديل حساب المستخدم والصلاحيات" : "إنشاء حساب بائع جديد"}</span>
            </DialogTitle>
            <DialogDescription>
              حدد بيانات الحساب، كلمة المرور، وحالة التفعيل ومجموعة الصلاحيات المخصصة
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            {/* Account Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="usr-username" className="text-xs font-bold">
                  اسم المستخدم (Username) *
                </Label>
                <Input
                  id="usr-username"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  placeholder="مثال: ahmed_pos"
                  className="font-mono"
                  autoFocus
                />
                {formErrors.username && (
                  <p className="text-xs text-red-500">{formErrors.username}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usr-name" className="text-xs font-bold">
                  الاسم الظاهر للبائع (اختياري)
                </Label>
                <Input
                  id="usr-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="مثال: أحمد بن علي"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usr-email" className="text-xs font-bold">
                  البريد الإلكتروني (اختياري)
                </Label>
                <Input
                  id="usr-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="ahmed@store.com"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usr-phone" className="text-xs font-bold">
                  رقم الهاتف (اختياري)
                </Label>
                <Input
                  id="usr-phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  placeholder="0555000000"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Active / Disabled Status Toggle */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground">
                  حالة الحساب
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {form.isActive
                    ? "الحساب نشط ويستطيع البائع تسجيل الدخول والعمل"
                    : "الحساب معطل وممنوع من تسجيل الدخول والوصول للنظام"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold", form.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                  {form.isActive ? "نشط" : "معطل"}
                </span>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Lock className="h-4 w-4 text-emerald-600" />
                <span>{editing ? "تغيير كلمة المرور (اختياري)" : "كلمة مرور الحساب *"}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="usr-password" className="text-xs">
                    {editing ? "كلمة المرور الجديدة" : "كلمة المرور"}
                  </Label>
                  <PasswordInput
                    id="usr-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="••••••"
                  />
                  {formErrors.password && (
                    <p className="text-xs text-red-500">{formErrors.password}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="usr-confirm-pwd" className="text-xs">
                    تأكيد كلمة المرور
                  </Label>
                  <PasswordInput
                    id="usr-confirm-pwd"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                    placeholder="••••••"
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-xs text-red-500">{formErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions Granular Selection */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>الصلاحيات المخصصة للبائع</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    حدد بدقة ما يستطيع البائع رؤيته أو استخدامه عبر شاشات المتجر
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2"
                    onClick={selectAllPermissions}
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={clearAllPermissions}
                  >
                    إلغاء التحديد
                  </Button>
                </div>
              </div>

              {/* Categorized Permissions Grid */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-emerald">
                {PERMISSION_CATEGORIES.map((cat) => {
                  const catPerms = ALL_PERMISSIONS.filter((p) => p.category === cat.key);
                  const selectedCount = catPerms.filter((p) =>
                    form.permissions.includes(p.key)
                  ).length;
                  const allCatSelected = selectedCount === catPerms.length;

                  return (
                    <div
                      key={cat.key}
                      className="rounded-xl border border-border/70 bg-card p-3 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          {renderCategoryIcon(cat.key)}
                          <span className="text-xs font-bold text-foreground">
                            {cat.label}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {selectedCount} / {catPerms.length}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                          onClick={() => toggleCategoryPermissions(cat.key)}
                        >
                          {allCatSelected ? "إلغاء المجموعة" : "تحديد المجموعة"}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catPerms.map((p) => {
                          const isChecked = form.permissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              className={cn(
                                "flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all",
                                isChecked
                                  ? "bg-emerald-500/10 border-emerald-500/40 text-foreground font-medium"
                                  : "bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/40"
                              )}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => togglePermission(p.key)}
                                className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-xs leading-tight text-foreground">
                                  {p.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                  {p.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? t("saveChanges") : "حفظ الحساب والصلاحيات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Earnings dialog */}
      <EarningsDialog
        seller={earningsTarget}
        onClose={() => setEarningsTarget(null)}
        currency={currency}
        t={t}
      />

      {/* Change password dialog */}
      <Dialog
        open={pwdTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPwdTarget(null);
            setPwdValue("");
            setConfirmPwdValue("");
            setPwdError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              <span>{t("changePassword")}</span>
            </DialogTitle>
            <DialogDescription>
              {pwdTarget?.name ? `${pwdTarget.name} (@${pwdTarget.username || pwdTarget.email})` : pwdTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitChangePwd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="seller-new-pwd" className="text-xs font-bold">
                {t("newPassword")} *
              </Label>
              <PasswordInput
                id="seller-new-pwd"
                value={pwdValue}
                onChange={(e) => setPwdValue(e.target.value)}
                placeholder="••••••"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seller-confirm-new-pwd" className="text-xs font-bold">
                تأكيد كلمة المرور الجديدة *
              </Label>
              <PasswordInput
                id="seller-confirm-new-pwd"
                value={confirmPwdValue}
                onChange={(e) => setConfirmPwdValue(e.target.value)}
                placeholder="••••••"
              />
            </div>
            {pwdError && (
              <p className="text-xs text-red-500 font-medium">{pwdError}</p>
            )}
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPwdTarget(null);
                  setPwdValue("");
                  setConfirmPwdValue("");
                  setPwdError("");
                }}
                disabled={changePwdMutation.isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={changePwdMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {changePwdMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("changePassword")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSeller")}</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف حساب المستخدم{" "}
              <span className="font-bold text-foreground">
                {deleteTarget?.name || deleteTarget?.username}
              </span>
              ؟ سيتم إلغاء ربطه مع الحفاظ على السجلات التاريخية للمبيعات دون فقدانها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pair Phone & Role Assignment Dialog */}
      <Dialog open={!!pairTarget} onOpenChange={(o) => { if (!o) setPairTarget(null); }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b text-start">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              <span>ربط الهاتف وتحديد الدور ({pairTarget?.name || "البائع"})</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              يحدد مدير المتجر دور هذا الهاتف مع حساب مخصص مشفر
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Account Info */}
            <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">{pairTarget?.name}</p>
                <p className="text-[11px] text-muted-foreground">{pairTarget?.email}</p>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                حساب مصرح به
              </Badge>
            </div>

            {/* Role Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                حدد دور الهاتف في المحل:
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "cashier",
                    name: "كاشير رئيسي",
                    desc: "بيع مباشر، دفع، طباعة",
                    icon: "💳",
                  },
                  {
                    id: "order_taker",
                    name: "بائع أخذ طلبات",
                    desc: "مسح السلع وإرسال للكاشير",
                    icon: "🛒",
                  },
                  {
                    id: "monitor",
                    name: "فاحص الأسعار",
                    desc: "مراقبة المخزون والأسعار",
                    icon: "📦",
                  },
                  {
                    id: "customer_display",
                    name: "شاشة الزبون",
                    desc: "عرض السلة أمام الزبون",
                    icon: "🖥️",
                  },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setPairRole(r.id as any)}
                    className={cn(
                      "p-2.5 rounded-xl border text-start transition-all flex flex-col justify-between",
                      pairRole === r.id
                        ? "border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30"
                        : "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-lg">{r.icon}</span>
                      {pairRole === r.id && (
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-foreground">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card shadow-xs">
              {pairTarget && (
                <div className="p-3 bg-white rounded-xl shadow-xs border">
                  <QRCodeSVG
                    value={getPairingUrl(pairTarget, pairRole)}
                    size={175}
                    level="M"
                  />
                </div>
              )}
              <p className="mt-2.5 text-xs font-bold text-foreground text-center">
                امسح هذا الرمز بكاميرا تطبيق الهاتف
              </p>
              <p className="text-[10px] text-muted-foreground text-center">
                يتم تكوين الهاتف فورياً بالدور والحساب المحدد
              </p>
            </div>

            {/* Copy link button */}
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs font-semibold gap-1.5 h-9"
              onClick={() => {
                if (pairTarget) {
                  navigator.clipboard.writeText(getPairingUrl(pairTarget, pairRole));
                  toast.success("تم نسخ رابط اقتران الهاتف بنجاح! 📋");
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              <span>نسخ رابط الاقتران المباشر</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Empty state ---------- */

function EmptySellers({ onAdd, t }: { onAdd: () => void; t: T }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <UserCog className="h-7 w-7" />
      </div>
      <div>
        <p className="font-medium">لا يوجد بائعون أو مستخدمون حالياً</p>
        <p className="text-sm text-muted-foreground">أضف أول حساب بائع وحدد صلاحياته للوصول للنظام</p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus className="h-4 w-4" />
        <span>إضافة أول مستخدم</span>
      </Button>
    </div>
  );
}

/* ---------- Earnings dialog ---------- */

function EarningsDialog({
  seller,
  onClose,
  currency,
  t,
}: {
  seller: Seller | null;
  onClose: () => void;
  currency: string;
  t: T;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["seller-earnings", seller?.id],
    queryFn: () => sellersApi.earnings(seller!.id),
    enabled: !!seller,
  });

  return (
    <Dialog
      open={seller !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            {t("sellerEarnings")}
          </DialogTitle>
          <DialogDescription>
            {seller?.name ? `${seller.name} (@${seller.username || seller.email})` : seller?.email}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <EarningsContent data={data} currency={currency} t={t} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EarningsContent({
  data,
  currency,
  t,
}: {
  data: SellerEarnings;
  currency: string;
  t: T;
}) {
  const kpis = [
    {
      label: t("dailyRevenue"),
      value: data.todayRevenue,
      count: data.todaySales,
      tint: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    {
      label: t("weeklyRevenue"),
      value: data.weekRevenue,
      count: data.weekSales,
      tint: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    {
      label: t("monthlyRevenue"),
      value: data.monthRevenue,
      count: data.monthSales,
      tint: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    {
      label: t("totalRevenue"),
      value: data.totalRevenue,
      count: data.totalSales,
      tint: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={cn("rounded-lg p-3", k.tint)}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {k.label}
            </p>
            <p className="mt-1 text-base font-bold tabular-nums">
              <AnimatedNumber
                value={k.value}
                decimals={2}
                prefix={currency}
              />
            </p>
            <p className="text-[10px] opacity-70">
              {k.count} {t("totalSales").toLowerCase()}
            </p>
          </div>
        ))}
      </div>

      <Separator />

      {/* Profit vs Revenue summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("totalRevenue")}
          </p>
          <p className="mt-1 text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoney(data.totalRevenue, currency)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("totalProfit")}
          </p>
          <p className="mt-1 text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoney(data.totalProfit, currency)}
          </p>
        </div>
      </div>

      {/* Daily series — simple SVG bar chart */}
      {data.dailySeries && data.dailySeries.length > 0 && (
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {t("last7DaysEarnings")}
          </p>
          <DailyBarChart data={data.dailySeries} currency={currency} />
        </div>
      )}
    </div>
  );
}

function DailyBarChart({
  data,
  currency,
}: {
  data: { date: string; revenue: number; profit: number }[];
  currency: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div className="flex items-end gap-1.5 h-32" role="img" aria-label="Last 7 days revenue">
      {data.map((d) => {
        const pct = Math.max(2, (d.revenue / max) * 100);
        const dateLabel = new Date(d.date).toLocaleDateString("ar-DZ-u-nu-latn", {
          weekday: "short",
        });
        return (
          <div
            key={d.date}
            className="flex flex-1 flex-col items-center justify-end gap-1"
            title={`${dateLabel}: ${formatMoney(d.revenue, currency)} · ${formatMoney(
              d.profit,
              currency
            )} profit`}
          >
            <div className="flex w-full flex-col justify-end h-24">
              <div
                className="w-full rounded-t bg-gradient-to-t from-emerald-600 to-teal-500"
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{dateLabel[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

function CommissionsSection({
  rule,
  onUpdateRule,
  onSaveRule,
  isSavingRule,
  calcData,
  isLoadingCalc,
  onSnapshot,
  isSnapshotting,
  records,
  isLoadingRecords,
  onApprove,
  isApproving,
  onPay,
  isPaying,
  currency,
}: {
  rule: Partial<CommissionRule>;
  onUpdateRule: React.Dispatch<React.SetStateAction<Partial<CommissionRule>>>;
  onSaveRule: () => void;
  isSavingRule: boolean;
  calcData?: { rule: CommissionRule; records: any[] };
  isLoadingCalc: boolean;
  onSnapshot: (records: any[]) => void;
  isSnapshotting: boolean;
  records: SellerRewardRecord[];
  isLoadingRecords: boolean;
  onApprove: (id: string, approvedAmount?: number) => void;
  isApproving: boolean;
  onPay: (id: string, paymentMethod: string) => void;
  isPaying: boolean;
  currency: string;
}) {
  return (
    <div className="space-y-6">
      {/* 1. Configuration Card */}
      <Card className="border-border/80 bg-card/60 shadow-sm p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">قواعد ونسب احتساب المكافآت والحوافز</h2>
              <p className="text-xs text-muted-foreground">
                تحديد شروط ونسب استحقاق عمولات طاقم البيع (النسب المئوية، المبالغ الثابتة، والحد الأدنى المستهدف)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={rule.isEnabled ?? false}
                onCheckedChange={(checked) => onUpdateRule((r) => ({ ...r, isEnabled: checked }))}
                id="commissions-enabled-switch"
              />
              <Label htmlFor="commissions-enabled-switch" className="text-xs font-semibold cursor-pointer">
                {rule.isEnabled ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    مفعل (نشط)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground border-muted">
                    معطل (افتراضي)
                  </Badge>
                )}
              </Label>
            </div>
          </div>
        </div>

        {/* Form controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Basis */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">أساس احتساب المكافأة</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "NET_SALES", label: "صافي المبيعات" },
                { id: "TOTAL_SALES", label: "إجمالي المبيعات" },
                { id: "GROSS_PROFIT", label: "الربح الإجمالي" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => onUpdateRule((r) => ({ ...r, calculationBasis: opt.id as CommissionRule["calculationBasis"] }))}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors",
                    (rule.calculationBasis ?? "NET_SALES") === opt.id
                      ? "border-primary bg-primary text-primary-foreground font-bold shadow-sm"
                      : "border-border bg-card/60 hover:bg-muted/50 text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reward Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">طبيعة المكافأة</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "PERCENTAGE", label: "نسبة مئوية (%)" },
                { id: "FIXED_AMOUNT", label: "مبلغ ثابت (دج)" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => onUpdateRule((r) => ({ ...r, rewardType: opt.id as CommissionRule["rewardType"] }))}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors",
                    (rule.rewardType ?? "PERCENTAGE") === opt.id
                      ? "border-primary bg-primary text-primary-foreground font-bold shadow-sm"
                      : "border-border bg-card/60 hover:bg-muted/50 text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rate value */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              {rule.rewardType === "FIXED_AMOUNT" ? `المبلغ المستحق (${currency})` : "نسبة المكافأة (%)"}
            </Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={rule.rateValue ?? 0}
              onChange={(e) => onUpdateRule((r) => ({ ...r, rateValue: Number(e.target.value) || 0 }))}
              className="h-9 text-xs font-mono font-bold"
            />
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">دورية الاحتساب</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "MONTHLY", label: "شهرياً" },
                { id: "WEEKLY", label: "أسبوعياً" },
                { id: "DAILY", label: "يومياً" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => onUpdateRule((r) => ({ ...r, period: opt.id as CommissionRule["period"] }))}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors",
                    (rule.period ?? "MONTHLY") === opt.id
                      ? "border-primary bg-primary text-primary-foreground font-bold shadow-sm"
                      : "border-border bg-card/60 hover:bg-muted/50 text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min Target */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs font-semibold">
              الحد الأدنى المستهدف للأداء قبل استحقاق المكافأة ({currency})
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="500"
                min="0"
                value={rule.minTarget ?? 0}
                onChange={(e) => onUpdateRule((r) => ({ ...r, minTarget: Number(e.target.value) || 0 }))}
                className="h-9 text-xs font-mono font-bold"
                placeholder="0 لعدم اشتراط حد أدنى"
              />
              <span className="text-[11px] text-muted-foreground shrink-0">
                (إذا حقق البائع مبيعات أقل من هذا الهدف فلن يستحق مكافأة)
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/50">
          <Button
            type="button"
            onClick={onSaveRule}
            disabled={isSavingRule}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
          >
            {isSavingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            حفظ إعدادات وقواعد المكافأة
          </Button>
        </div>
      </Card>

      {/* 2. Current Period Estimated Rewards Preview */}
      <Card className="border-border/80 bg-card/60 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>معاينة واحتساب مكافآت الفترة الحالية</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تقدير مباشر لمستحقات كل بائع بناءً على مبيعات الفترة الحالية والقواعد المحددة أعلاه
            </p>
          </div>

          {calcData?.records && calcData.records.length > 0 && (
            <Button
              type="button"
              onClick={() => onSnapshot(calcData.records)}
              disabled={isSnapshotting}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 text-xs shadow"
            >
              {isSnapshotting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              ترحيل واعتماد كشف الفترة في السجل
            </Button>
          )}
        </div>

        {isLoadingCalc ? (
          <div className="flex h-36 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !calcData?.records || calcData.records.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            لا يوجد بائعون مؤهلون أو لا توجد مبيعات في الفترة الحالية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">البائع</TableHead>
                  <TableHead className="text-center">الفواتير</TableHead>
                  <TableHead className="text-center">صافي المبيعات</TableHead>
                  <TableHead className="text-center">الربح الإجمالي</TableHead>
                  <TableHead className="text-center">حالة الهدف المستهدف</TableHead>
                  <TableHead className="text-center font-bold text-foreground">المكافأة المقدرة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calcData.records.map((r: any) => (
                  <TableRow key={r.sellerId}>
                    <TableCell className="text-start">
                      <div className="font-semibold text-xs text-foreground">{r.seller.name || "بائع"}</div>
                      {r.seller.username && (
                        <div className="text-[10px] text-muted-foreground font-mono">@{r.seller.username}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">{r.salesCount}</TableCell>
                    <TableCell className="text-center text-xs font-mono tabular-nums">{formatMoney(r.netSales, currency)}</TableCell>
                    <TableCell className="text-center text-xs font-mono tabular-nums">{formatMoney(r.grossProfit, currency)}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-[11px] text-muted-foreground">{r.notes}</span>
                    </TableCell>
                    <TableCell className="text-center font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatMoney(r.calculatedAmount, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* 3. Past Snapshots and Payout History */}
      <Card className="border-border/80 bg-card/60 shadow-sm p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            <span>سجل مستحقات المكافآت السابقة والدفعات</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            الكشوفات المؤرشفة مع إمكانية اعتماد المبالغ وتسجيل الصرف للموظفين
          </p>
        </div>

        {isLoadingRecords ? (
          <div className="flex h-36 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            لم يتم حفظ أو ترحيل أي كشوفات مكافآت سابقة بعد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">تاريخ الكشف</TableHead>
                  <TableHead className="text-start">البائع</TableHead>
                  <TableHead className="text-center">صافي المبيعات</TableHead>
                  <TableHead className="text-center">المبلغ المقدر</TableHead>
                  <TableHead className="text-center">المبلغ المعتمد</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات والصرف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-start">
                      <div className="font-semibold text-xs text-foreground">{r.seller?.name || "بائع"}</div>
                      {r.seller?.username && (
                        <div className="text-[10px] text-muted-foreground font-mono">@{r.seller.username}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono tabular-nums">{formatMoney(r.netSales, currency)}</TableCell>
                    <TableCell className="text-center text-xs font-mono tabular-nums">{formatMoney(r.calculatedAmount, currency)}</TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-foreground tabular-nums">
                      {formatMoney(r.approvedAmount || r.calculatedAmount, currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {r.status === "PAID" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                            تم الصرف
                          </Badge>
                        ) : r.status === "APPROVED" ? (
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px]">
                            معتمدة جاهزة للدفع
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                            بانتظار الاعتماد
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {r.status === "CALCULATED" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onApprove(r.id, r.calculatedAmount)}
                            disabled={isApproving}
                            className="h-7 text-xs gap-1 border-blue-500/40 text-blue-600 hover:bg-blue-50"
                          >
                            <CheckCheck className="h-3 w-3" />
                            اعتماد
                          </Button>
                        )}

                        {r.status === "APPROVED" && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onPay(r.id, "Cash")}
                              disabled={isPaying}
                              className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-50"
                            >
                              <Wallet className="h-3 w-3" />
                              صرف نقداً
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onPay(r.id, "BARIDIMOB")}
                              disabled={isPaying}
                              className="h-7 text-xs gap-1 border-purple-500/40 text-purple-600 hover:bg-purple-50"
                            >
                              <CreditCard className="h-3 w-3" />
                              بريدي موب
                            </Button>
                          </>
                        )}

                        {r.status === "PAID" && (
                          <span className="text-[11px] text-muted-foreground">
                            {r.paidAt ? formatDateTime(r.paidAt) : "تم الصرف"} ({r.paymentMethod || "نقداً"})
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
