"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Info,
  KeyRound,
  LayoutGrid,
  Loader2,
  MoveVertical,
  Printer,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { productsApi, shopApi, subscriptionApi, uploadApi } from "@/lib/api";
import type { Product, Shop, SubscriptionInfo } from "@/lib/types";
import { ReceiptCustomizer } from "@/components/receipt-customizer";
import { initialsOf } from "@/lib/format";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AUTOPRINT_KEY = "swiftbill_autoprint";
const APP_VERSION = "v1.0.0";
const DEVELOPER_NAME = "FlashNet20DZ";
const DEVELOPER_PHONE = "0664451250";

import {
  NAV_ITEMS_CATALOG,
  NAV_SECTIONS,
  getDefaultSidebarConfig,
  parseSidebarConfig,
  serializeSidebarConfig,
  type FullSidebarConfig,
  type SidebarItemConfig,
  type SidebarSectionConfig,
  type NavItemDef,
} from "@/lib/navigation";

const cardMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

// --- localStorage-backed autoPrint subscription (React-canonical pattern) ---
const emptySubscribe = (): (() => void) => () => {};
function readAutoPrintSnapshot(): boolean {
  try {
    return window.localStorage.getItem(AUTOPRINT_KEY) === "true";
  } catch {
    return false;
  }
}
function subscribeAutoPrint(cb: () => void): () => void {
  if (typeof window === "undefined") return emptySubscribe();
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function SettingsView() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: subscriptionApi.get,
  });
  const [licenseKey, setLicenseKey] = useState("");

  const activateMutation = useMutation({
    mutationFn: (key: string) => subscriptionApi.activate(key),
    onSuccess: () => {
      toast.success(t("licenseActivated"));
      setLicenseKey("");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : t("failedActivateLicense");
      toast.error(msg);
    },
  });

  const handleActivate = () => {
    const key = licenseKey.trim().toUpperCase();
    if (!key) {
      toast.error(t("enterLicenseKey"));
      return;
    }
    activateMutation.mutate(key);
  };

  const autoPrint = useSyncExternalStore(
    subscribeAutoPrint,
    readAutoPrintSnapshot,
    () => false
  );

  const [taxValue, setTaxValue] = useState(0);
  const [currencyValue, setCurrencyValue] = useState("دج");
  const [syncedShopId, setSyncedShopId] = useState<string | null>(null);

  // Store Branding & Appearance
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [storePhotoUrl, setStorePhotoUrl] = useState<string | null>(null);
  const [primaryDisplayImage, setPrimaryDisplayImage] = useState<"LOGO" | "STORE_PHOTO">("LOGO");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Sidebar Customization (Full System)
  const [sidebarConfig, setSidebarConfig] = useState<FullSidebarConfig>(getDefaultSidebarConfig());
  const [sidebarScope, setSidebarScope] = useState<"STORE" | "USER">("STORE");

  // Sync state from server when the loaded shop changes.
  if (shop && shop.id !== syncedShopId) {
    setSyncedShopId(shop.id);
    setTaxValue(Math.min(20, Math.max(0, shop.taxRate ?? 0)));
    setCurrencyValue(shop.currency ?? "دج");
    setLogoUrl(shop.logoUrl ?? null);
    setStorePhotoUrl(shop.storePhotoUrl ?? null);
    setPrimaryDisplayImage(shop.primaryDisplayImage ?? "LOGO");

    let initialConfig = shop.sidebarConfig;
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("gestiona_user_sidebar_config");
        if (local) {
          initialConfig = local;
          setSidebarScope("USER");
        }
      } catch {}
    }
    setSidebarConfig(parseSidebarConfig(initialConfig));
  }

  const brandingMutation = useMutation({
    mutationFn: (data: {
      logoUrl: string | null;
      storePhotoUrl: string | null;
      primaryDisplayImage: "LOGO" | "STORE_PHOTO";
    }) => shopApi.update(data),
    onSuccess: () => {
      toast.success("تم حفظ هوية المتجر ومظهره بنجاح");
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
      void queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "فشل حفظ هوية المتجر";
      toast.error(msg);
    },
  });

  const brandingDirty =
    (shop?.logoUrl ?? null) !== logoUrl ||
    (shop?.storePhotoUrl ?? null) !== storePhotoUrl ||
    (shop?.primaryDisplayImage ?? "LOGO") !== primaryDisplayImage;

  const handleSaveBranding = () => {
    brandingMutation.mutate({
      logoUrl,
      storePhotoUrl,
      primaryDisplayImage,
    });
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const res = await uploadApi.upload(file, "branding");
      setLogoUrl(res.url);
      toast.success("تم رفع شعار المتجر بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل رفع الشعار");
    } finally {
      setUploadingLogo(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleUploadStorePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const res = await uploadApi.upload(file, "store");
      setStorePhotoUrl(res.url);
      toast.success("تم رفع صورة واجهة المحل بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل رفع صورة الواجهة");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const sidebarMutation = useMutation({
    mutationFn: (config: string) => shopApi.update({ sidebarConfig: config }),
    onSuccess: () => {
      toast.success("تم حفظ تخصيص القائمة الجانبية بنجاح");
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
      void queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "فشل حفظ تخصيص القائمة";
      toast.error(msg);
    },
  });

  const moveSidebarItem = (itemId: string, direction: "up" | "down") => {
    setSidebarConfig((prev) => {
      const targetItem = prev.items.find((it) => it.id === itemId);
      if (!targetItem) return prev;
      const targetSectionId = targetItem.sectionId;

      const sectionItems = prev.items
        .filter((it) => it.sectionId === targetSectionId)
        .sort((a, b) => a.order - b.order);

      const currentIndex = sectionItems.findIndex((it) => it.id === itemId);
      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= sectionItems.length) return prev;

      const neighbor = sectionItems[newIndex];
      const oldOrder = targetItem.order;
      const neighborOrder = neighbor.order;

      const updatedItems = prev.items.map((it) => {
        if (it.id === targetItem.id) return { ...it, order: neighborOrder };
        if (it.id === neighbor.id) return { ...it, order: oldOrder };
        return it;
      });

      return { ...prev, items: updatedItems };
    });
  };

  const toggleSidebarVisibility = (id: string) => {
    setSidebarConfig((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id === id && it.id !== "settings"
          ? { ...it, visible: !it.visible }
          : it
      ),
    }));
  };

  const toggleSectionVisibility = (sectionId: string) => {
    setSidebarConfig((prev) => {
      const section = prev.sections.find((s) => s.id === sectionId);
      const nextVisible = section ? !section.visible : false;

      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, visible: nextVisible } : s
        ),
        items: prev.items.map((it) =>
          it.sectionId === sectionId && it.id !== "settings"
            ? { ...it, visible: nextVisible }
            : it
        ),
      };
    });
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setSidebarConfig((prev) => {
      const sortedSections = [...prev.sections].sort((a, b) => a.order - b.order);
      const idx = sortedSections.findIndex((s) => s.id === sectionId);
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sortedSections.length) return prev;

      const currentSec = sortedSections[idx];
      const targetSec = sortedSections[targetIdx];

      const oldOrder = currentSec.order;
      const targetOrder = targetSec.order;

      return {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id === currentSec.id) return { ...s, order: targetOrder };
          if (s.id === targetSec.id) return { ...s, order: oldOrder };
          return s;
        }),
      };
    });
  };

  const handleShowAllSidebar = () => {
    setSidebarConfig((prev) => ({
      sections: prev.sections.map((s) => ({ ...s, visible: true })),
      items: prev.items.map((it) => ({ ...it, visible: true })),
    }));
    toast.success("تم إظهار كافة الأقسام والشاشات. اضغط حفظ لتطبيق التغييرات.");
  };

  const handleResetSidebar = () => {
    setSidebarConfig(getDefaultSidebarConfig());
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("gestiona_user_sidebar_config");
      } catch {}
    }
    toast.info("تمت استعادة الترتيب الافتراضي لكافة الشاشات. اضغط حفظ للتأكيد.");
  };

  const handleSaveSidebar = () => {
    const serialized = serializeSidebarConfig(sidebarConfig);
    if (sidebarScope === "USER") {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("gestiona_user_sidebar_config", serialized);
        } catch {}
      }
      toast.success("تم حفظ تخصيص القائمة لهذا الجهاز بنجاح");
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
    } else {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("gestiona_user_sidebar_config");
        } catch {}
      }
      sidebarMutation.mutate(serialized);
    }
  };

  const taxMutation = useMutation({
    mutationFn: (rate: number) => shopApi.update({ taxRate: rate }),
    onSuccess: () => {
      toast.success(t("taxRateUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : t("failedUpdateTax");
      toast.error(msg);
    },
  });

  const handleSaveTax = () => {
    const rate = Math.min(100, Math.max(0, taxValue));
    taxMutation.mutate(rate);
  };

  const currencyMutation = useMutation({
    mutationFn: (currency: string) => shopApi.update({ currency }),
    onSuccess: () => {
      toast.success(t("currencyUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : t("failedUpdateTax");
      toast.error(msg);
    },
  });

  const handleSaveCurrency = () => {
    currencyMutation.mutate(currencyValue);
  };

  const handleAutoPrintChange = (checked: boolean) => {
    try {
      window.localStorage.setItem(AUTOPRINT_KEY, checked ? "true" : "false");
      // Manually fire a storage event so this tab also re-renders.
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: AUTOPRINT_KEY,
          newValue: checked ? "true" : "false",
        })
      );
      toast.success(
        checked
          ? t("autoprintEnabled")
          : t("autoprintDisabled")
      );
    } catch {
      toast.error(t("couldNotSavePref"));
    }
  };

  const handlePrintTest = () => {
    // Use setTimeout so React commits the print node before printing.
    window.setTimeout(() => window.print(), 50);
  };

  if (isLoading || !shop) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  const taxDirty = Number(shop.taxRate ?? 0) !== taxValue;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">{t("settings")}</h2>
      </div>

      {/* 0. Subscription */}
      <SubscriptionCard
        subscription={subscription}
        loading={subLoading}
        licenseKey={licenseKey}
        onLicenseKeyChange={setLicenseKey}
        onActivate={handleActivate}
        activating={activateMutation.isPending}
        t={t}
      />

      {/* 1. App Profile */}
      <motion.div {...cardMotion} transition={{ duration: 0.25 }}>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-center sm:gap-6">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-md shadow-primary/30">
              {initialsOf(shop.name)}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-base font-bold uppercase tracking-tight">
                {shop.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Gestiona Pro {APP_VERSION}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge variant="secondary" className="gap-1">
                  <Store className="h-3 w-3" />
                  {shop.currency || "دج"} · {t("tax")} {shop.taxRate ?? 0}%
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Info className="h-3 w-3" />
                  {t("editInShopDetails")}
                </Badge>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-not-allowed opacity-60"
                  disabled
                >
                  {t("editShop")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("goToShopDetails")}
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>
      </motion.div>

      {/* 1.5. Store Branding & Appearance */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.03 }}
      >
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                <div>
                  <CardTitle className="text-lg">هوية المتجر ومظهره</CardTitle>
                  <CardDescription>
                    تخصيص شعار المتجر، صورة واجهة المحل، واختيار الصورة الرئيسية في القائمة الجانبية ورأس الفواتير
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                مظهر المحل
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visual media grids (Logo & Storefront Photo) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Logo */}
              <div className="flex flex-col rounded-xl border border-border/80 bg-card/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">شعار المتجر (Logo)</Label>
                  </div>
                  {logoUrl && (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      تم التحديد
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  يظهر في رأس الفواتير الحرارية، فواتير A4، وفي أعلى القائمة الجانبية.
                </p>

                <div className="flex items-center justify-center h-32 w-full rounded-lg border-2 border-dashed border-border/80 bg-muted/20 overflow-hidden relative">
                  {uploadingLogo ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">جاري رفع الشعار...</span>
                    </div>
                  ) : logoUrl ? (
                    <div className="relative group h-full w-full flex items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="شعار المتجر"
                        className="max-h-full max-w-full object-contain drop-shadow"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground text-center p-3">
                      <ImageIcon className="h-8 w-8 stroke-1 text-muted-foreground/60" />
                      <span className="text-xs">لم يتم رفع شعار بعد</span>
                      <span className="text-[10px] text-muted-foreground/80">PNG, JPG, WebP أو SVG</span>
                    </div>
                  )}
                </div>

                {/* Logo Action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="inline-flex cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleUploadLogo}
                      disabled={uploadingLogo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 pointer-events-none text-xs"
                      disabled={uploadingLogo}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {logoUrl ? "استبدال الشعار" : "رفع الشعار"}
                    </Button>
                  </label>

                  <label className="inline-flex cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleUploadLogo}
                      disabled={uploadingLogo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 pointer-events-none text-xs"
                      disabled={uploadingLogo}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      كاميرا
                    </Button>
                  </label>

                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl(null)}
                      className="text-destructive hover:bg-destructive/10 text-xs gap-1 mr-auto"
                      disabled={uploadingLogo}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  )}
                </div>
              </div>

              {/* Box 2: Storefront Photo */}
              <div className="flex flex-col rounded-xl border border-border/80 bg-card/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-emerald-500" />
                    <Label className="text-sm font-semibold">صورة واجهة المحل (Storefront)</Label>
                  </div>
                  {storePhotoUrl && (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      تم التحديد
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  صورة حقيقية لواجهة محلك التجاري تعطي هوية مميزة في الشريط الجانبي.
                </p>

                <div className="flex items-center justify-center h-32 w-full rounded-lg border-2 border-dashed border-border/80 bg-muted/20 overflow-hidden relative">
                  {uploadingPhoto ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">جاري رفع صورة الواجهة...</span>
                    </div>
                  ) : storePhotoUrl ? (
                    <div className="relative group h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={storePhotoUrl}
                        alt="واجهة المحل"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground text-center p-3">
                      <Store className="h-8 w-8 stroke-1 text-muted-foreground/60" />
                      <span className="text-xs">لم يتم التقاط صورة الواجهة بعد</span>
                      <span className="text-[10px] text-muted-foreground/80">صورة أفقية واضحة للمحل</span>
                    </div>
                  )}
                </div>

                {/* Photo Action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="inline-flex cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleUploadStorePhoto}
                      disabled={uploadingPhoto}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 pointer-events-none text-xs"
                      disabled={uploadingPhoto}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {storePhotoUrl ? "استبدال الصورة" : "رفع الصورة"}
                    </Button>
                  </label>

                  <label className="inline-flex cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleUploadStorePhoto}
                      disabled={uploadingPhoto}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 pointer-events-none text-xs"
                      disabled={uploadingPhoto}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      كاميرا الواجهة
                    </Button>
                  </label>

                  {storePhotoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStorePhotoUrl(null)}
                      className="text-destructive hover:bg-destructive/10 text-xs gap-1 mr-auto"
                      disabled={uploadingPhoto}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Primary Display Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">الصورة الأساسية المعروضة في الشريط الجانبي</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrimaryDisplayImage("LOGO")}
                  className={
                    "flex items-start gap-3 rounded-xl border p-3.5 text-right transition-all " +
                    (primaryDisplayImage === "LOGO"
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/70 bg-card/50 hover:bg-muted/40")
                  }
                >
                  <div
                    className={
                      "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border " +
                      (primaryDisplayImage === "LOGO"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground")
                    }
                  >
                    {primaryDisplayImage === "LOGO" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span>شعار المتجر (Logo)</span>
                      <Badge variant="outline" className="text-[10px] py-0">الافتراضي</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      عرض شعار المتجر الرسمي بدقة عالية (موصى به للعلامات التجارية).
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrimaryDisplayImage("STORE_PHOTO")}
                  className={
                    "flex items-start gap-3 rounded-xl border p-3.5 text-right transition-all " +
                    (primaryDisplayImage === "STORE_PHOTO"
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/70 bg-card/50 hover:bg-muted/40")
                  }
                >
                  <div
                    className={
                      "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border " +
                      (primaryDisplayImage === "STORE_PHOTO"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground")
                    }
                  >
                    {primaryDisplayImage === "STORE_PHOTO" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span>صورة واجهة المحل (Storefront Photo)</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      عرض صورة حقيقية من واجهة محلك تضفي طابعاً واقعياً دافئاً.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Live Sidebar Preview Banner */}
            <div className="rounded-xl border border-border/80 bg-black/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80">معاينة حية لرأس الشريط الجانبي:</span>
                <span className="text-[11px] text-emerald-500 font-medium">محدث في الوقت الفعلي</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/80 p-3 max-w-sm">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-black/30 flex items-center justify-center">
                  {(primaryDisplayImage === "STORE_PHOTO" && storePhotoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={storePhotoUrl} alt="Store" className="h-full w-full object-cover" />
                  ) : (logoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-1" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-primary/20 text-primary font-bold text-lg">
                      {initialsOf(shop.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
                  <p className="text-[11px] text-muted-foreground">Gestiona Pro · متجر نشط</p>
                </div>
              </div>
            </div>

            {/* Save Branding Button */}
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                onClick={handleSaveBranding}
                disabled={!brandingDirty || brandingMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              >
                {brandingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ هوية ومظهر المتجر
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 1.6. Sidebar Customization (Comprehensive) */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.04 }}
      >
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-emerald-500" />
                <div>
                  <CardTitle className="text-lg">تخصيص القائمة الجانبية بالكامل</CardTitle>
                  <CardDescription>
                    إعادة ترتيب جميع الشاشات والأقسام وإظهارها أو إخفاؤها بنقرة واحدة وفق متطلبات نشاطك
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  {sidebarConfig.items.filter((i) => i.visible).length} من {NAV_ITEMS_CATALOG.length} شاشة مفعّلة
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Notice / Security Info */}
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <span>
                ملاحظة: تظهر الشاشات للمستخدمين والكادر وفق مصفوفة صلاحياتهم الأمنية، وشاشة الإعدادات تظل متاحة دائماً لمدير المتجر لضمان عدم فقدان الوصول.
              </span>
            </div>

            {/* Toolbar: Scope & Bulk Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">نطاق التخصيص:</span>
                <div className="flex rounded-lg border border-border/80 bg-background/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSidebarScope("STORE")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                      sidebarScope === "STORE"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    افتراضي للمتجر (كافة الأجهزة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarScope("USER")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                      sidebarScope === "USER"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    خاص بهذا الجهاز فقط
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleShowAllSidebar}
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Eye className="h-3.5 w-3.5" />
                  إظهار كافة العناصر
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetSidebar}
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  استعادة الافتراضي
                </Button>
              </div>
            </div>

            {/* Main Editor: Sections & Items list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Reordering & Toggles */}
              <div className="lg:col-span-2 space-y-4">
                {[...sidebarConfig.sections]
                  .sort((a, b) => a.order - b.order)
                  .map((sec, secIdx, arr) => {
                    const secDef = NAV_SECTIONS.find((s) => s.id === sec.id);
                    const secItems = sidebarConfig.items
                      .filter((it) => it.sectionId === sec.id)
                      .sort((a, b) => a.order - b.order);

                    const isFirstSec = secIdx === 0;
                    const isLastSec = secIdx === arr.length - 1;

                    return (
                      <div
                        key={sec.id}
                        className={cn(
                          "rounded-xl border transition-all overflow-hidden",
                          sec.visible
                            ? "border-border/80 bg-card/60"
                            : "border-border/40 bg-muted/10 opacity-70"
                        )}
                      >
                        {/* Section Header */}
                        <div className="flex items-center justify-between gap-3 bg-muted/40 px-3.5 py-2.5 border-b border-border/50">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                              {secIdx + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">
                                {secDef?.titleAr || sec.id}
                              </h4>
                              <p className="text-[10px] text-muted-foreground">
                                {secDef?.titleEn} · {secItems.length} شاشات
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Reorder section */}
                            <div className="flex items-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                disabled={isFirstSec}
                                onClick={() => moveSection(sec.id, "up")}
                                title="تحريك القسم لأعلى"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                disabled={isLastSec}
                                onClick={() => moveSection(sec.id, "down")}
                                title="تحريك القسم لأسفل"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>

                            <Separator orientation="vertical" className="h-4" />

                            {/* Section Visibility Switch */}
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={sec.visible}
                                onCheckedChange={() => toggleSectionVisibility(sec.id)}
                                id={`sec-toggle-${sec.id}`}
                              />
                              <Label
                                htmlFor={`sec-toggle-${sec.id}`}
                                className="text-xs cursor-pointer text-muted-foreground min-w-[2.5rem]"
                              >
                                {sec.visible ? "مفعّل" : "معطّل"}
                              </Label>
                            </div>
                          </div>
                        </div>

                        {/* Section Items */}
                        <div className="p-2 space-y-1.5 divide-y divide-border/25">
                          {secItems.map((item, itemIdx) => {
                            const itemDef = NAV_ITEMS_CATALOG.find((d) => d.key === item.id);
                            if (!itemDef) return null;
                            const Icon = itemDef.icon;
                            const isFirstItem = itemIdx === 0;
                            const isLastItem = itemIdx === secItems.length - 1;

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "flex items-center justify-between gap-3 p-2 rounded-lg transition-colors pt-2 first:pt-2",
                                  item.visible
                                    ? "bg-card/70 hover:bg-card/90"
                                    : "bg-muted/20 opacity-60"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-foreground truncate">
                                        {itemDef.labelAr}
                                      </span>
                                      {itemDef.fixed && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] py-0 px-1 border-muted text-muted-foreground"
                                        >
                                          مثبت
                                        </Badge>
                                      )}
                                      {itemDef.superAdminOnly && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] py-0 px-1 border-emerald-500/30 text-emerald-500"
                                        >
                                          سوبر أدمن
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {itemDef.labelEn}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Up / Down Buttons */}
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                      disabled={isFirstItem}
                                      onClick={() => moveSidebarItem(item.id, "up")}
                                      title="نقل لأعلى"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                      disabled={isLastItem}
                                      onClick={() => moveSidebarItem(item.id, "down")}
                                      title="نقل لأسفل"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                  </div>

                                  <Separator orientation="vertical" className="h-4" />

                                  {/* Item Visibility Switch */}
                                  {itemDef.fixed ? (
                                    <span className="text-[11px] text-muted-foreground px-2">
                                      دائم
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <Switch
                                        checked={item.visible}
                                        onCheckedChange={() => toggleSidebarVisibility(item.id)}
                                        id={`item-toggle-${item.id}`}
                                      />
                                      <Label
                                        htmlFor={`item-toggle-${item.id}`}
                                        className="text-[11px] cursor-pointer text-muted-foreground min-w-[2.5rem]"
                                      >
                                        {item.visible ? "ظاهر" : "مخفي"}
                                      </Label>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Right Col: Live Sidebar Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    معاينة حية للقائمة الجانبية
                  </h4>
                  <Badge variant="outline" className="text-[10px]">
                    مباشر
                  </Badge>
                </div>

                <div className="rounded-xl border border-sidebar-border bg-sidebar p-3 text-sidebar-foreground shadow-md space-y-3 max-h-[520px] overflow-y-auto scrollbar-emerald">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-sidebar-border">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                      {initialsOf(shop.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{shop.name}</p>
                      <p className="text-[10px] text-sidebar-foreground/60 truncate">{shop.businessType}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {[...sidebarConfig.sections]
                      .sort((a, b) => a.order - b.order)
                      .filter((s) => s.visible)
                      .map((sec) => {
                        const secDef = NAV_SECTIONS.find((s) => s.id === sec.id);
                        const items = sidebarConfig.items
                          .filter((it) => it.sectionId === sec.id && it.visible)
                          .sort((a, b) => a.order - b.order);

                        if (items.length === 0) return null;

                        return (
                          <div key={sec.id} className="space-y-1">
                            <p className="px-2 text-[9px] font-bold text-sidebar-foreground/45 uppercase tracking-wider">
                              {secDef?.titleAr}
                            </p>
                            {items.map((it) => {
                              const itemDef = NAV_ITEMS_CATALOG.find((d) => d.key === it.id);
                              if (!itemDef) return null;
                              const Icon = itemDef.icon;
                              return (
                                <div
                                  key={it.id}
                                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/75 bg-sidebar-accent/30"
                                >
                                  <Icon className="h-3.5 w-3.5 text-sidebar-foreground/60 shrink-0" />
                                  <span className="truncate">{itemDef.labelAr}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions for Sidebar */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetSidebar}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                استعادة الترتيب الافتراضي
              </Button>

              <Button
                type="button"
                onClick={handleSaveSidebar}
                disabled={sidebarMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              >
                {sidebarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ تخصيص القائمة الجانبية
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Quick Tax Config */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              {t("quickTaxConfig")}
            </CardTitle>
            <CardDescription>
              {t("taxAppliedTo")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("current")}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {shop.taxRate ?? 0}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("adjustingTo")}
                </p>
                <p className="text-2xl font-bold">{taxValue}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <Slider
                min={0}
                max={20}
                step={0.5}
                value={[taxValue]}
                onValueChange={(v) => setTaxValue(v[0] ?? 0)}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveTax}
                disabled={!taxDirty || taxMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {taxMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("saveTaxRate")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2.5. Currency Config */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.075 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              {t("currencyConfig")}
            </CardTitle>
            <CardDescription>
              {t("currencyConfigDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("currentCurrency")}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {shop.currency ?? "دج"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("selectCurrency")}
                </p>
                <p className="text-2xl font-bold">{currencyValue}</p>
              </div>
            </div>

            {/* Currency quick-pick chips */}
            <div className="flex flex-wrap gap-2">
              {["دج", "$", "€", "£", "¥", "د.ج", "ر.س", "د.إ", "ج.م", "د.ك", "د.ل", "د.ت"].map(
                (cur) => (
                  <button
                    key={cur}
                    onClick={() => setCurrencyValue(cur)}
                    className={
                      "min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-bold transition-all " +
                      (currencyValue === cur
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-accent hover:border-primary/40")
                    }
                  >
                    {cur}
                  </button>
                )
              )}
            </div>

            {/* Custom currency input */}
            <div className="space-y-1.5">
              <Label htmlFor="custom-currency">{t("currencySymbol")}</Label>
              <input
                id="custom-currency"
                type="text"
                maxLength={5}
                value={currencyValue}
                onChange={(e) => setCurrencyValue(e.target.value)}
                className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="دج"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveCurrency}
                disabled={
                  !shop ||
                  (shop.currency ?? "دج") === currencyValue ||
                  currencyMutation.isPending
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {currencyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("saveCurrency")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2.5 Receipt Customization (إعدادات الإيصال المخصص) */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.08 }}
      >
        <ReceiptCustomizer shop={shop} />
      </motion.div>

      {/* 3. Printer & Receipts */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-primary" />
              {t("printerReceipts")}
            </CardTitle>
            <CardDescription>
              {t("printWebNote")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label className="text-sm font-medium">
                  {t("printTestReceipt")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("openBrowserPrint")}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handlePrintTest}
                className="self-start sm:self-auto"
              >
                <Printer className="h-4 w-4" />
                {t("printTest")}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <Label className="text-sm font-medium">
                  {t("autoPrintAfterSale")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("savedLocally")}
                </p>
              </div>
              <Switch checked={autoPrint} onCheckedChange={handleAutoPrintChange} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. Data Management (danger zone) */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.15 }}
      >
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              {t("dataManagement")}
            </CardTitle>
            <CardDescription>
              {t("destructiveActions")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <Label className="text-sm font-medium">
                    {t("clearSalesHistory")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("permanentDelete")}
                  </p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex w-full sm:w-auto">
                    <Button
                      variant="destructive"
                      disabled
                      className="w-full cursor-not-allowed opacity-60 sm:w-auto"
                    >
                      {t("clearSales")}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t("adminOnly")}</TooltipContent>
              </Tooltip>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <Label className="text-sm font-medium">
                    {t("exportProducts")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("downloadCsv")}
                  </p>
                </div>
              </div>
              <ExportProductsButton t={t} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 5. About */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("about")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <span className="text-muted-foreground">{t("app")}</span>
              <span className="sm:col-span-2 font-medium">{t("appName")}</span>

              <span className="text-muted-foreground">{t("version")}</span>
              <span className="sm:col-span-2 font-medium">{APP_VERSION}</span>

              <span className="text-muted-foreground">{t("developer")}</span>
              <span className="sm:col-span-2 font-medium">{DEVELOPER_NAME}</span>

              <span className="text-muted-foreground">{t("phone")}</span>
              <span className="sm:col-span-2 font-medium" dir="ltr">{DEVELOPER_PHONE}</span>

              <span className="text-muted-foreground">{t("stack")}</span>
              <span className="sm:col-span-2 font-medium">
                Next.js, Prisma, Tailwind CSS
              </span>

              <span className="text-muted-foreground">{t("docs")}</span>
              <span className="sm:col-span-2 font-medium text-primary">
                {t("viewUserGuide")}
              </span>
            </div>
            <Separator />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("aboutDesc")}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Hidden print template for test receipts */}
      <div className="print-receipt hidden" aria-hidden>
        <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.4 }}>
          <p style={{ textAlign: "center", fontWeight: 700, fontSize: 14 }}>
            {shop.name?.toUpperCase() || "GESTIONA PRO"}
          </p>
          {shop.addressLine1 && (
            <p style={{ textAlign: "center" }}>{shop.addressLine1}</p>
          )}
          {shop.addressLine2 && (
            <p style={{ textAlign: "center" }}>{shop.addressLine2}</p>
          )}
          {shop.phoneNumber && (
            <p style={{ textAlign: "center" }}>Ph: {shop.phoneNumber}</p>
          )}
          <p style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <p>This is a test print from Gestiona Pro.</p>
          <p style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <p style={{ textAlign: "center" }}>
            {shop.footerText || "Thank you, visit again!"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Subscription card ---------- */

function SubscriptionCard({
  subscription,
  loading,
  licenseKey,
  onLicenseKeyChange,
  onActivate,
  activating,
  t,
}: {
  subscription: SubscriptionInfo | undefined;
  loading: boolean;
  licenseKey: string;
  onLicenseKeyChange: (v: string) => void;
  onActivate: () => void;
  activating: boolean;
  t: (k: TranslationKey) => string;
}) {
  const sub = subscription?.subscription;
  const status = sub?.status ?? "NONE";
  const plan = sub?.plan ?? "MONTHLY";
  const daysRemaining = subscription?.daysRemaining ?? 0;
  const endDate = sub?.endDate;
  const startDate = sub?.startDate;

  // Total duration of the current plan in days, used for the progress bar.
  // Heuristic: MONTHLY=30, QUARTERLY=90, YEARLY=365 (falls back to a 30-day window).
  const totalDays = plan === "MONTHLY" ? 30 : plan === "QUARTERLY" ? 90 : 365;
  const progress = Math.min(100, Math.max(0, (daysRemaining / totalDays) * 100));

  const planLabel = (p: string) => {
    if (p === "MONTHLY") return t("planMonthly");
    if (p === "QUARTERLY") return t("planQuarterly");
    return t("planYearly");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            {t("subscription")}
          </CardTitle>
          <CardDescription>{t("subscriptionStatus")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !sub ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 px-3 py-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t("subscriptionNone")}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Status badge + plan */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {status === "ACTIVE" && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("subscriptionActive")}
                    </Badge>
                  )}
                  {status === "TRIAL" && (
                    <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400 gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {t("trialActive")}
                    </Badge>
                  )}
                  {status === "EXPIRED" && (
                    <Badge className="bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400 gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("subscriptionExpired")}
                    </Badge>
                  )}
                  {status === "SUSPENDED" && (
                    <Badge className="bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400 gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {t("storeStatusSuspended")}
                    </Badge>
                  )}
                  <Badge variant="outline">{planLabel(plan)}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {t("daysLeft")}
                  </p>
                  <p
                    className={
                      "text-2xl font-bold tabular-nums " +
                      (status === "EXPIRED"
                        ? "text-red-600 dark:text-red-400"
                        : status === "TRIAL"
                          ? "text-amber-600"
                          : "text-emerald-600")
                    }
                  >
                    {daysRemaining}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      "h-full rounded-full transition-all " +
                      (status === "EXPIRED"
                        ? "bg-red-500"
                        : status === "TRIAL"
                          ? "bg-amber-500"
                          : "bg-emerald-500")
                    }
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {startDate
                      ? `${t("subscriptionStart")}: ${formatDate(startDate)}`
                      : ""}
                  </span>
                  <span>
                    {endDate
                      ? `${t("subscriptionEnd")}: ${formatDate(endDate)}`
                      : ""}
                  </span>
                </div>
              </div>

              {/* Status-specific message */}
              {status === "ACTIVE" && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  {t("subscriptionActiveDesc")}
                </div>
              )}
              {status === "TRIAL" && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t("trialWarning")}
                </div>
              )}
              {status === "EXPIRED" && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t("expiredWarning")}
                </div>
              )}
            </>
          )}

          <Separator />

          {/* License key activation */}
          <div className="space-y-2">
            <Label htmlFor="license-key" className="text-sm font-medium">
              {t("activateLicense")}
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="license-key"
                value={licenseKey}
                onChange={(e) => onLicenseKeyChange(e.target.value)}
                placeholder={t("licenseKeyPlaceholder")}
                className="font-mono uppercase sm:flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onActivate();
                  }
                }}
              />
              <Button
                onClick={onActivate}
                disabled={activating}
                className="shrink-0"
              >
                {activating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {activating ? t("activating") : t("activate")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("contactSuperAdmin")}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ExportProductsButton({ t }: { t: (k: "exportedProducts" | "failedExport" | "exportCsv") => string }) {
  const [busy, setBusy] = useState(false);

  const handleExport = useCallback(async () => {
    setBusy(true);
    try {
      const products = await productsApi.list();
      const csv = toCsv(products);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `gestiona-products-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${t("exportedProducts")} (${products.length})`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("failedExport");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [t]);

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={busy}
      className="self-start sm:self-auto"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {t("exportCsv")}
    </Button>
  );
}

function toCsv(products: Product[]): string {
  const headers = [
    "id",
    "name",
    "barcode",
    "category",
    "price",
    "stock",
    "createdAt",
    "updatedAt",
  ];
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = products.map((p) =>
    [
      p.id,
      p.name,
      p.barcode,
      p.category,
      p.price,
      p.stock,
      p.createdAt,
      p.updatedAt,
    ]
      .map(escape)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}
