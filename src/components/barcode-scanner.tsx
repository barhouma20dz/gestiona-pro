"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ScanLine,
  CameraOff,
  Check,
  X,
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
import { useLanguage } from "@/lib/language-context";
import { playScanBeep, vibrateScan } from "@/lib/scan-feedback";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onScan: (code: string) => void;
}

/**
 * Barcode scanner dialog with real camera barcode detection.
 * Uses @zxing/browser to detect barcodes (EAN-13, UPC, Code128, QR, etc).
 * Falls back to manual entry if camera is not available.
 */
export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
}: BarcodeScannerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [detectedCode, setDetectedCode] = useState<string | null>(null);

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

        // Speed fix: zxing's default delayBetweenScanAttempts is 500ms
        // (only 2 decode tries/second). 30ms → ~30 tries/second.
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 30,
          delayBetweenScanSuccess: 300,
        });

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          videoRef.current,
          (result, _err) => {
            if (!result || cancelled) return;
            const text = result.getText();
            if (!text) return;
            const now = Date.now();
            // Ignore the same code re-detected within 1.5s (staying in frame).
            if (text === lastCode && now - lastAt < 1500) return;
            lastCode = text;
            lastAt = now;

            // Instant feedback, then submit quickly (was 500ms).
            playScanBeep(true);
            vibrateScan(true);
            setDetectedCode(text);
            setTimeout(() => {
              if (!cancelled) {
                onScan(text);
                onOpenChange(false);
              }
            }, 150);
          }
        );

        controlsRef.current = controls;

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
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          {t("scanBarcode")}
        </DialogTitle>
        <DialogDescription>{t("cameraHint")}</DialogDescription>
      </DialogHeader>

      {/* Camera preview with live detection */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
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
              className="h-full w-full object-cover"
            />
            {/* Scan frame overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-24 w-3/4 max-w-[260px] rounded-md border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                <span className="absolute -left-1 -top-1 h-4 w-4 border-l-4 border-t-4 border-primary" />
                <span className="absolute -right-1 -top-1 h-4 w-4 border-r-4 border-t-4 border-primary" />
                <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-primary" />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-primary" />
                <motion.span
                  className="absolute inset-x-1 top-1/2 h-0.5 bg-primary"
                  initial={{ y: -40 }}
                  animate={{ y: 40 }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>

            {/* Detected code overlay */}
            {detectedCode && (
              <div className="absolute inset-x-0 bottom-0 bg-emerald-500/90 p-3 text-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="h-4 w-4 shrink-0" />
                    <span className="truncate font-mono text-sm font-bold">
                      {detectedCode}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={confirmDetected}
                    className="shrink-0 bg-card text-primary hover:bg-primary/10"
                  >
                    {t("confirm")}
                  </Button>
                </div>
              </div>
            )}

            {!cameraReady && !cameraError && !detectedCode && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">
                {t("startingCamera")}
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual fallback */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          {t("enterBarcodeManually")}
        </label>
        <div className="flex gap-2">
          <Input
            autoFocus={
              !!cameraError ||
              (typeof window !== "undefined" &&
                window.matchMedia("(pointer: fine)").matches)
            }
            value={manualCode}
            placeholder="e.g. 8901030867531"
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitManual();
            }}
            className="font-mono"
            inputMode="text"
            autoComplete="off"
          />
          <Button type="button" onClick={submitManual} disabled={!manualCode.trim()}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" />
          {t("close")}
        </Button>
      </DialogFooter>
    </>
  );
}
