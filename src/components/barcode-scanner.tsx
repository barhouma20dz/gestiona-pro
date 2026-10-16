"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ScanLine,
  CameraOff,
  Check,
  X,
  Zap,
  ZoomIn,
  Sparkles,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { playScanBeep, vibrateScan } from "@/lib/scan-feedback";
import { cn } from "@/lib/utils";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onScan: (code: string) => void;
}

/**
 * Barcode scanner dialog with real camera barcode detection.
 * Upgraded with multi-size detection (small, medium, wide barcodes),
 * optical/digital zoom (1x, 1.5x, 2x, 2.5x, 3x), torch/flash toggle,
 * and high-frequency decoding loop (15ms).
 */
export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
}: BarcodeScannerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <ScannerBody onScan={onScan} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function ScannerBody({
  onScan,
  onOpenChange,
}: {
  onScan: (code: string) => void;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [detectedCode, setDetectedCode] = useState<string | null>(null);

  // Smart size mode & zoom
  const [barcodeSize, setBarcodeSize] = useState<"small" | "medium" | "large">("medium");
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasTorchCapability, setHasTorchCapability] = useState<boolean>(false);
  const [hasZoomCapability, setHasZoomCapability] = useState<boolean>(false);

  // Apply hardware zoom & torch if available
  const applyCameraZoom = async (level: number) => {
    setZoomLevel(level);
    const track = videoTrackRef.current;
    if (track && hasZoomCapability) {
      try {
        await track.applyConstraints({
          advanced: [{ zoom: level } as any],
        });
      } catch {
        // Fallback to CSS video zoom
      }
    }
  };

  const toggleTorch = async () => {
    const track = videoTrackRef.current;
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setIsTorchOn(nextTorch);
    } catch {
      // ignore
    }
  };

  const handleSizeChange = (size: "small" | "medium" | "large") => {
    setBarcodeSize(size);
    if (size === "small") {
      applyCameraZoom(2.2);
    } else if (size === "medium") {
      applyCameraZoom(1.3);
    } else {
      applyCameraZoom(1.0);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let lastCode = "";
    let lastAt = 0;

    async function startCamera() {
      try {
        // Dynamic import to avoid SSR issues
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");

        if (!videoRef.current) return;

        // Restrict to retail formats → faster + fewer misreads.
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        // Ultra fast decoding loop: 15ms attempts
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 15,
          delayBetweenScanSuccess: 250,
        });

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: "environment",
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              // @ts-ignore
              focusMode: "continuous",
            },
            audio: false,
          },
          videoRef.current,
          (result, _err) => {
            if (!result || cancelled) return;
            const text = result.getText();
            if (!text) return;
            const now = Date.now();
            // Ignore the same code re-detected within 1.2s (staying in frame).
            if (text === lastCode && now - lastAt < 1200) return;
            lastCode = text;
            lastAt = now;

            // Instant feedback
            playScanBeep(true);
            vibrateScan(true);
            setDetectedCode(text);
            setTimeout(() => {
              if (!cancelled) {
                onScan(text);
                onOpenChange(false);
              }
            }, 120);
          }
        );

        controlsRef.current = controls;

        // Check hardware track capabilities (Zoom, Torch)
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          if (track) {
            videoTrackRef.current = track;
            const capabilities = (track.getCapabilities ? (track.getCapabilities() as any) : {}) || {};
            if (capabilities.zoom) setHasZoomCapability(true);
            if (capabilities.torch) setHasTorchCapability(true);
          }
        }

        if (!cancelled) setCameraReady(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Unable to access camera.";
        setCameraError(message);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {
          // ignore
        }
        controlsRef.current = null;
      }
      if (videoTrackRef.current) {
        try {
          videoTrackRef.current.stop();
        } catch {
          // ignore
        }
        videoTrackRef.current = null;
      }
    };
  }, [onScan, onOpenChange]);

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    playScanBeep(true);
    vibrateScan(true);
    onScan(code);
    setManualCode("");
    onOpenChange(false);
  };

  const confirmDetected = () => {
    if (detectedCode) {
      onScan(detectedCode);
      onOpenChange(false);
    }
  };

  return (
    <div className="flex flex-col">
      <DialogHeader className="p-4 pb-2 border-b">
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <ScanLine className="h-5 w-5 text-emerald-600" />
            <span>قارئ الباركود الذكي الفائق</span>
          </DialogTitle>
          {hasTorchCapability && (
            <Button
              type="button"
              variant={isTorchOn ? "default" : "outline"}
              size="sm"
              onClick={toggleTorch}
              className={cn(
                "h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-full",
                isTorchOn
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "text-muted-foreground"
              )}
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>{isTorchOn ? "الكشاف شغال" : "تشغيل الكشاف"}</span>
            </Button>
          )}
        </div>
        <DialogDescription className="text-xs">
          يتعرف بذكاء على جميع أحجام الباركود (الصغيرة، المتوسطة، والكبيرة)
        </DialogDescription>
      </DialogHeader>

      {/* Barcode Size Selection Presets */}
      <div className="bg-muted/40 border-b px-4 py-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-muted-foreground shrink-0">
          نوع وحجم الباركود:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSizeChange("small")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
              barcodeSize === "small"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-card border text-muted-foreground hover:text-foreground"
            )}
            title="مناسب للسلع الصغيرة (علكة، شوكولاتة، علب بهارات)"
          >
            <Sparkles className="h-3 w-3" />
            <span>صغير (زووم 2x)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSizeChange("medium")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
              barcodeSize === "medium"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-card border text-muted-foreground hover:text-foreground"
            )}
            title="الباركود القياسي للسلع العادية"
          >
            <span>قياسي (1.3x)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSizeChange("large")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
              barcodeSize === "large"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-card border text-muted-foreground hover:text-foreground"
            )}
            title="مناسب للكراتين والباركود الطويل والعريض"
          >
            <Maximize2 className="h-3 w-3" />
            <span>عريض / كرتون</span>
          </button>
        </div>
      </div>

      {/* Camera preview viewport */}
      <div className="relative aspect-video w-full overflow-hidden bg-black select-none">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <CameraOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {t("cameraNotAvailable")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("manualBarcodeHint")}
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease-out",
              }}
              className="h-full w-full object-cover"
            />

            {/* Custom Scan Framing Overlay tailored to selected size */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={cn(
                  "relative rounded-xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-all duration-200",
                  barcodeSize === "small" && "h-20 w-48 max-w-[200px]",
                  barcodeSize === "medium" && "h-24 w-3/4 max-w-[270px]",
                  barcodeSize === "large" && "h-32 w-[85%] max-w-[340px]"
                )}
              >
                {/* 4 Corner Markers */}
                <span className="absolute -left-1 -top-1 h-4 w-4 border-l-4 border-t-4 border-emerald-400 rounded-tl" />
                <span className="absolute -right-1 -top-1 h-4 w-4 border-r-4 border-t-4 border-emerald-400 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                {/* Laser animation */}
                <motion.span
                  className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399]"
                  initial={{ y: -36 }}
                  animate={{ y: 36 }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>

            {/* Zoom Chips Overlay */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/65 backdrop-blur-md px-2 py-1 rounded-full border border-white/20">
              <ZoomIn className="h-3 w-3 text-white/80 ml-0.5" />
              {[1.0, 1.5, 2.0, 2.5, 3.0].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => applyCameraZoom(z)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold transition-all",
                    Math.abs(zoomLevel - z) < 0.15
                      ? "bg-emerald-500 text-white"
                      : "text-white/80 hover:text-white"
                  )}
                >
                  {z}x
                </button>
              ))}
            </div>

            {/* Detected code overlay */}
            {detectedCode && (
              <div className="absolute inset-x-0 bottom-0 bg-emerald-600/95 p-3 text-white backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="h-5 w-5 shrink-0 text-white" />
                    <span className="truncate font-mono text-base font-extrabold tracking-wider">
                      {detectedCode}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={confirmDetected}
                    className="shrink-0 bg-white text-emerald-800 hover:bg-white/90 font-bold"
                  >
                    {t("confirm")}
                  </Button>
                </div>
              </div>
            )}

            {!cameraReady && !cameraError && !detectedCode && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80 bg-black/50">
                جارٍ تشغيل الكاميرا وتحسين العدسة…
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual Input Footer */}
      <div className="p-4 bg-card border-t space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">
          أو أدخل كود السلعة يدوياً:
        </label>
        <div className="flex gap-2">
          <Input
            value={manualCode}
            placeholder="مثلاً: 6130123456789"
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitManual();
            }}
            className="font-mono text-sm"
          />
          <Button
            type="button"
            onClick={submitManual}
            disabled={!manualCode.trim()}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            تأكيد الكود
          </Button>
        </div>
      </div>
    </div>
  );
}
