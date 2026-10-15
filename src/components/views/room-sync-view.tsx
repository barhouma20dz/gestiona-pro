"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredToken } from "@/lib/auth-context";
import {
  Wifi,
  Globe,
  Smartphone,
  Laptop,
  CheckCircle2,
  Copy,
  Users,
  Send,
  ShoppingBag,
  Bell,
  ArrowRight,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Radio,
  Tv,
  Eye,
  Check,
  AlertTriangle,
  Download,
  Info,
} from "lucide-react";
import { useRoomSyncStore, type DeviceRole } from "@/lib/room-sync-store";
import { useCartStore, isKgProduct } from "@/lib/cart-store";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export function RoomSyncView() {
  const {
    deviceId,
    deviceName,
    setDeviceName,
    role,
    setRole,
    currentRoomId,
    currentRoomName,
    roomPin,
    isConnected,
    connectedDevices,
    incomingOrders,
    dismissOrder,
    joinRoom,
    leaveRoom,
    syncWithServer,
  } = useRoomSyncStore();

  const cart = useCartStore();

  const [networkInfo, setNetworkInfo] = useState<{
    localUrl: string;
    primaryIp: string;
    port: number;
    allAddresses: { ip: string; interface: string; url: string }[];
  } | null>(null);

  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [inputRoomId, setInputRoomId] = useState(currentRoomId || "DZ-STORE-1");
  const [inputPin, setInputPin] = useState(roomPin || "7788");
  const [editingDeviceName, setEditingDeviceName] = useState(deviceName);
  const [activeTab, setActiveTab] = useState<"local" | "cloud" | "apk" | "orders">("local");

  // Fetch local Wi-Fi info
  useEffect(() => {
    async function loadNetwork() {
      try {
        const token = getStoredToken();
        const res = await fetch("/api/network-info", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success) {
          setNetworkInfo(data);
        }
      } catch (err) {
        console.error("Failed to load network info", err);
      } finally {
        setIsLoadingNetwork(false);
      }
    }
    loadNetwork();
  }, []);

  // Polling loop
  useEffect(() => {
    syncWithServer();
    const interval = setInterval(() => {
      syncWithServer();
    }, 2500);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  // Derived join URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : (networkInfo?.localUrl || "");
  const joinUrl = `${networkInfo?.localUrl || baseUrl}/?room=${encodeURIComponent(
    currentRoomId || "DZ-STORE-1"
  )}&pin=${encodeURIComponent(roomPin || "7788")}`;

  const copyToClipboard = (text: string, type: "link" | "pin") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success("تم نسخ رابط الاتصال!");
    } else {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
      toast.success("تم نسخ رمز الغرفة PIN!");
    }
  };

  const handleJoin = async () => {
    const ok = await joinRoom(inputRoomId.trim(), inputPin.trim());
    if (ok) {
      toast.success(`تم الاتصال بالغرفة: ${inputRoomId}`);
    } else {
      toast.error("فشل الاتصال بالغرفة، تحقق من الرمز");
    }
  };

  const handleSaveDeviceName = () => {
    if (editingDeviceName.trim()) {
      setDeviceName(editingDeviceName.trim());
      toast.success("تم تحديث اسم الجهاز");
    }
  };

  const handleLoadOrderToCart = (order: typeof incomingOrders[0]) => {
    cart.clearCart();
    order.items.forEach((item) => {
      // kg products: the quantity itself is the weight; count products: add piece by piece
      if (isKgProduct(item.product)) {
        cart.addWeightedProduct(item.product, item.quantity);
      } else {
        const intQty = Math.max(0, Math.floor(item.quantity));
        for (let i = 0; i < intQty; i++) {
          cart.addProduct(item.product);
        }
      }
    });
    dismissOrder(order.orderId);
    toast.success(`تم تحميل طلب ${order.senderName} (${order.items.length} أصناف) إلى سلة الكاشير!`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-2">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-200" />
              <span>نظام الغرف والربط اللاسلكي المتعدد (Multi-Device Room Sync)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              ربط الهواتف والأجهزة بنقطة البيع
            </h1>
            <p className="mt-1 text-sm text-emerald-100 max-w-xl">
              استخدم هاتفك أو جهاز لوحي لإرسال الطلبات، مسح الباركود بالكاميرا، أو تحويل الهاتف إلى شاشة عرض للزبائن فوراً عبر الواي فاي أو عن بعد.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-black/25 px-4 py-2.5 backdrop-blur-md border border-white/10 w-full sm:w-auto">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div className="text-right">
                <p className="text-[11px] text-white/70">الغرفة النشطة</p>
                <p className="text-sm font-bold text-white font-mono">{currentRoomId}</p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => syncWithServer()}
              className="bg-white/20 hover:bg-white/30 text-white border-0 w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 ml-1.5" />
              تحديث الاتصال
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side Controls & Right Side Connection Modes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Device Profile & Roles (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Device Profile Card */}
          <Card className="p-5 border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                إعدادات هذا الجهاز
              </h2>
              <Badge variant="outline" className="text-xs font-mono">
                ID: {deviceId.slice(-6)}
              </Badge>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                اسم الجهاز (كما يظهر للآخرين في المتجر):
              </label>
              <div className="flex gap-2">
                <Input
                  value={editingDeviceName}
                  onChange={(e) => setEditingDeviceName(e.target.value)}
                  placeholder="مثال: هاتف البائع أحمد"
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSaveDeviceName}>
                  حفظ
                </Button>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-muted-foreground block">
                دور هذا الجهاز في الغرفة:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: "cashier" as DeviceRole,
                    title: "الكاشير الرئيسي",
                    desc: "استقبال الطلبات وإصدار الفواتير",
                    icon: Laptop,
                    color: "border-primary bg-primary/5 text-primary",
                  },
                  {
                    id: "order_taker" as DeviceRole,
                    title: "نادل / بائع متجول",
                    desc: "أخذ الطلبات ومسح الباركود بالهاتف",
                    icon: ShoppingBag,
                    color: "border-emerald-600 bg-emerald-500/10 text-emerald-700",
                  },
                  {
                    id: "customer_display" as DeviceRole,
                    title: "شاشة الزبون",
                    desc: "عرض السلة المباشرة للزبون",
                    icon: Tv,
                    color: "border-cyan-600 bg-cyan-500/10 text-cyan-700",
                  },
                  {
                    id: "monitor" as DeviceRole,
                    title: "مراقب المبيعات",
                    desc: "متابعة المبيعات الحية بدون بيع",
                    icon: Eye,
                    color: "border-amber-600 bg-amber-500/10 text-amber-700",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = role === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setRole(item.id);
                        toast.success(`تم تعيين الدور إلى: ${item.title}`);
                      }}
                      className={`text-right p-3 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? `${item.color} font-semibold ring-2 ring-primary/40 shadow-xs`
                          : "border-border bg-card hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4" />
                        <span className="font-bold">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Code & Join/Leave */}
            <div className="rounded-xl bg-muted/50 p-3.5 space-y-3 border text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">بيانات الغرفة الحالية</span>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "متصل بالشبكة" : "غير متصل"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-[10px] block">رمز الغرفة (Room ID):</span>
                  <Input
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value)}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">رمز PIN الحماية:</span>
                  <Input
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value)}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleJoin} className="flex-1">
                  تبديل / دخول الغرفة
                </Button>
                {isConnected && (
                  <Button size="sm" variant="outline" onClick={leaveRoom}>
                    خروج
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Connected Devices List */}
          <Card className="p-5 border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                الأجهزة المتصلة الآن ({connectedDevices.length})
              </h3>
              <span className="text-[11px] text-muted-foreground">تحديث مباشر</span>
            </div>

            {connectedDevices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                لا توجد أجهزة أخرى متصلة حالياً. امسح الباركود من الهاتف للاتصال!
              </p>
            ) : (
              <div className="space-y-2">
                {connectedDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          {dev.name}
                          {dev.id === deviceId && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              جهازك الحالي
                            </Badge>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          ID: {dev.id.slice(-6)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {dev.role === "cashier"
                        ? "كاشير"
                        : dev.role === "order_taker"
                        ? "نادل / بائع"
                        : dev.role === "customer_display"
                        ? "شاشة الزبون"
                        : "مراقب"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Connection Methods Tabs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Tabs
            defaultValue="local"
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/60">
              <TabsTrigger value="local" className="text-xs py-2 gap-1.5">
                <Wifi className="h-3.5 w-3.5" />
                <span>واي فاي محلي</span>
              </TabsTrigger>
              <TabsTrigger value="cloud" className="text-xs py-2 gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                <span>غرفة عن بعد</span>
              </TabsTrigger>
              <TabsTrigger value="apk" className="text-xs py-2 gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                <span>نسخة الهاتف APK</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs py-2 gap-1.5 relative">
                <Bell className="h-3.5 w-3.5" />
                <span>طلبات الهواتف</span>
                {incomingOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold rounded-full size-4 text-[10px] flex items-center justify-center">
                    {incomingOrders.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Local Wi-Fi Connection */}
            <TabsContent value="local" className="mt-4 space-y-4">
              <Card className="p-6 border-border shadow-sm space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Wifi className="h-5 w-5 text-emerald-600" />
                      الاتصال عبر شبكة الواي فاي المحلية (سريع ومباشر)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      لا يتطلب إنترنت خارجي! يكفي اتصال الهاتف والكمبيوتر بنفس راوتر المحل.
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                    موصى به للمتاجر
                  </Badge>
                </div>

                {isLoadingNetwork ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    جاري فحص كارت الشبكة والـ IP المحلي...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* QR Code Container */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border shadow-inner">
                      <QRCodeSVG
                        value={joinUrl}
                        size={180}
                        level="M"
                        includeMargin={true}
                        className="rounded-lg"
                      />
                      <span className="text-[11px] text-gray-500 mt-2 font-medium">
                        امسح بكاميرا الهاتف للدخول فوراً
                      </span>
                    </div>

                    {/* Details and Links */}
                    <div className="md:col-span-7 space-y-4">
                      <div>
                        <span className="text-xs font-semibold text-foreground block mb-1">
                          عنوان IP المحلي لنقطة البيع:
                        </span>
                        <div className="flex items-center gap-2 bg-muted/60 p-2.5 rounded-xl border font-mono text-xs font-bold text-primary break-all">
                          <span>{networkInfo?.localUrl || baseUrl}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-foreground block mb-1">
                          رابط الانضمام المباشر للغرفة:
                        </span>
                        <div className="flex items-center gap-2 bg-muted/60 p-2.5 rounded-xl border text-xs break-all">
                          <span className="text-muted-foreground truncate">{joinUrl}</span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyToClipboard(joinUrl, "link")}
                            className="shrink-0 h-8"
                          >
                            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedLink ? "تم النسخ" : "نسخ"}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5">
                          <Info className="h-4 w-4 text-blue-600" />
                          كيف يعمل؟
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          1. افتح كاميرا هاتفك وامسح رمز QR أعلاه.
                          <br />
                          2. سيفتح التطبيق في متصفح الهاتف فوراً.
                          <br />
                          3. يمكنك إضافة المنتجات ومسح الباركود بالكاميرا وإرسال الطلبات إلى الكاشير مباشرة!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Tab 2: Remote Cloud Room */}
            <TabsContent value="cloud" className="mt-4 space-y-4">
              <Card className="p-6 border-border shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Globe className="h-5 w-5 text-cyan-600" />
                    الاتصال عن بعد عبر رمز الغرفة السحابية (4G / 5G / الإنترنت)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    يتيح لك مراقبة المتجر من المنزل أو إرسال طلبات من خارج المحل باستخدام شبكة الهاتف المحمول.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border bg-muted/40 text-center space-y-1">
                    <span className="text-xs text-muted-foreground">معرّف الغرفة (Room ID)</span>
                    <p className="text-2xl font-black font-mono tracking-wider text-primary">
                      {currentRoomId}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border bg-muted/40 text-center space-y-1">
                    <span className="text-xs text-muted-foreground">رمز الدخول السري (PIN)</span>
                    <p className="text-2xl font-black font-mono tracking-wider text-emerald-600">
                      {roomPin}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(roomPin, "pin")}
                    className="text-xs"
                  >
                    {copiedPin ? <Check className="h-4 w-4 text-emerald-600 ml-1.5" /> : <Copy className="h-4 w-4 ml-1.5" />}
                    نسخ رمز PIN
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(joinUrl, "link")}
                    className="text-xs"
                  >
                    <Share2Icon className="h-4 w-4 ml-1.5" />
                    مشاركة رابط الغرفة
                  </Button>
                </div>

                <div className="rounded-xl border p-4 bg-muted/20 text-xs space-y-2">
                  <h4 className="font-bold flex items-center gap-2 text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    أمان الغرفة وحماية المبيعات
                  </h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    لا يمكن لأي جهاز إرسال طلبات أو الاطلاع على المبيعات إلا بعد إدخال رمز PIN الصحيح. يمكنك تغيير الرمز في أي وقت من إعدادات الغرفة على اليمين.
                  </p>
                </div>
              </Card>
            </TabsContent>

            {/* Tab 3: Mobile APK & PWA */}
            <TabsContent value="apk" className="mt-4 space-y-4">
              <Card className="p-6 border-border shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    تطبيق الهاتف الذكي (APK & PWA Standalone)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    طريقتان لتشغيل Gestiona Pro كتطبيق أصلي على أي هاتف أندرويد أو آيفون.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PWA Direct Install */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      1
                    </div>
                    <h4 className="font-bold text-sm">التثبيت المباشر بنقرة واحدة (PWA)</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      يعمل كتطبيق أندرويد كامل بملء الشاشة وبدون شريط المتصفح:
                    </p>
                    <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                      <li>افتح الرابط على هاتفك في متصفح Google Chrome</li>
                      <li>اضغط على النقاط الثلاث ⋮ في أعلى المتصفح</li>
                      <li>اختر <b>«تثبيت التطبيق» (Install App)</b> أو «إضافة إلى الشاشة الرئيسية»</li>
                      <li>سيظهر تطبيق Gestiona Pro بأيقونته الرسمية على شاشة هاتفك فوراً!</li>
                    </ul>
                  </div>

                  {/* Flutter / Android APK */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      2
                    </div>
                    <h4 className="font-bold text-sm">حزمة الأندرويد الرسمية (ملف APK)</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      ملف APK أصلي لنظام Android مخصص للربط بنقطة البيع:
                    </p>
                    <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                      <li>تشغيل دائم في الخلفية واستقبال التنبيهات الصوتية</li>
                      <li>استخدام سريع لكاميرا الهاتف لمسح باركود السلع بسرعة فائقة</li>
                      <li>حفظ تلقائي لعنوان IP والغرفة بدون إعادة إدخالهما</li>
                    </ul>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs font-semibold gap-1.5 mt-2"
                      onClick={() => {
                        toast.success("تم تجهيز مشروع Flutter APK الخاص بنقطة البيع!");
                      }}
                    >
                      <Download className="h-4 w-4 text-primary" />
                      تعليمات وحزمة بناء ملف APK
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tab 4: Incoming Mobile Orders Queue */}
            <TabsContent value="orders" className="mt-4 space-y-4">
              <Card className="p-6 border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Bell className="h-5 w-5 text-rose-500" />
                      قائمة الطلبات الواردة من الهواتف ({incomingOrders.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      الطلبات المرسلة من البائعين المتجولين أو النوادل لتحميلها لسلة الكاشير
                    </p>
                  </div>
                  {incomingOrders.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => useRoomSyncStore.getState().clearIncomingOrders()}
                      className="text-xs text-muted-foreground"
                    >
                      مسح الكل
                    </Button>
                  )}
                </div>

                {incomingOrders.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-medium text-foreground">لا توجد طلبات معلقة حالياً</p>
                    <p className="text-[11px] text-muted-foreground">
                      عندما يقوم بائع بأخذ طلب من هاتفه والضغط على «إرسال للكاشير»، سيظهر هنا مع تنبيه صوتي فوري!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomingOrders.map((ord) => (
                      <div
                        key={ord.orderId}
                        className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-foreground">
                              {ord.senderName}
                            </span>
                            {ord.tableName && (
                              <Badge variant="outline" className="mr-2 text-xs">
                                {ord.tableName}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground mr-2 font-mono">
                              {new Date(ord.createdAt).toLocaleTimeString("ar-DZ")}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-primary">
                            {formatMoney(ord.total, "دج")}
                          </span>
                        </div>

                        {/* Items preview */}
                        <div className="text-xs text-muted-foreground space-y-1 bg-white dark:bg-card p-2.5 rounded-lg border">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>
                                {it.product.name} × {it.quantity}
                              </span>
                              <span>{formatMoney(it.product.price * it.quantity, "دج")}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => dismissOrder(ord.orderId)}
                            className="text-xs"
                          >
                            تجاهل
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleLoadOrderToCart(ord)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" />
                            تحميل إلى سلة الكاشير للمحاسبة
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Share2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}
