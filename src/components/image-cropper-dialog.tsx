"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Maximize2,
  Square,
  Sparkles,
  Sliders,
  FileImage,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onConfirm: (croppedDataUrl: string) => void;
  title?: string;
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  onConfirm,
  title = "تحديد وقص المنتج وتعديل الحجم",
}: ImageCropperDialogProps) {
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [quality, setQuality] = useState<number>(85); // 85% WebP/JPEG quality
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "free">("1:1");
  const [estimatedSizeKb, setEstimatedSizeKb] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Crop selection coordinates (percentage 0 to 100 within image)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragBoxStart, setDragBoxStart] = useState<{ x: number; y: number }>({ x: 10, y: 10 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Reset controls when a new image is loaded
  useEffect(() => {
    if (open) {
      setRotation(0);
      setZoom(1);
      setQuality(85);
      setAspectRatio("1:1");
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    }
  }, [open, imageSrc]);

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Generate cropped and compressed image preview
  const generatePreview = useCallback(() => {
    if (!imgRef.current || !imgRef.current.complete || !open) return;

    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Standard POS card dimension: 500x500 max
    const targetSize = 500;
    canvas.width = targetSize;
    canvas.height = aspectRatio === "1:1" ? targetSize : Math.round(targetSize * (cropBox.height / cropBox.width));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Create an in-memory canvas to handle rotation first
    const rotCanvas = document.createElement("canvas");
    const rotCtx = rotCanvas.getContext("2d");
    if (!rotCtx) return;

    const isRotated90or270 = rotation === 90 || rotation === 270;
    rotCanvas.width = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
    rotCanvas.height = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

    rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    rotCtx.rotate((rotation * Math.PI) / 180);
    rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    // Compute crop coordinates in rotated image pixels
    const cropX = (cropBox.x / 100) * rotCanvas.width;
    const cropY = (cropBox.y / 100) * rotCanvas.height;
    const cropW = (cropBox.width / 100) * rotCanvas.width;
    const cropH = (cropBox.height / 100) * rotCanvas.height;

    // Draw the cropped portion scaled down to targetSize
    ctx.drawImage(
      rotCanvas,
      Math.max(0, cropX),
      Math.max(0, cropY),
      Math.min(rotCanvas.width, cropW),
      Math.min(rotCanvas.height, cropH),
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Check size in WebP or JPEG
    try {
      const dataUrl = canvas.toDataURL("image/webp", quality / 100);
      // Rough base64 byte calculation
      const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
      const byteLength = (base64Length * 3) / 4;
      setEstimatedSizeKb(Math.round(byteLength / 1024));
    } catch {
      const dataUrl = canvas.toDataURL("image/jpeg", quality / 100);
      const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
      setEstimatedSizeKb(Math.round(((base64Length * 3) / 4) / 1024));
    }
  }, [cropBox, rotation, quality, aspectRatio, open]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  // Handle Box Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragBoxStart({ x: cropBox.x, y: cropBox.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

    const newX = Math.max(0, Math.min(100 - cropBox.width, dragBoxStart.x + deltaXPercent));
    const newY = Math.max(0, Math.min(100 - cropBox.height, dragBoxStart.y + deltaYPercent));

    setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Adjust crop size with slider or handles
  const handleCropSizeChange = (val: number) => {
    const size = Math.max(20, Math.min(100, val));
    const height = aspectRatio === "1:1" ? size : Math.round(size * 0.75);
    setCropBox((prev) => ({
      x: Math.min(prev.x, 100 - size),
      y: Math.min(prev.y, 100 - height),
      width: size,
      height,
    }));
  };

  // Final confirmation
  const handleConfirmCrop = () => {
    if (!imgRef.current) return;
    setIsProcessing(true);

    try {
      const img = imgRef.current;
      const targetWidth = 500;
      const targetHeight = aspectRatio === "1:1" ? 500 : Math.round(500 * (cropBox.height / cropBox.width));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // In-memory rotated canvas
      const rotCanvas = document.createElement("canvas");
      const rotCtx = rotCanvas.getContext("2d");
      if (!rotCtx) return;

      const isRotated = rotation === 90 || rotation === 270;
      rotCanvas.width = isRotated ? img.naturalHeight : img.naturalWidth;
      rotCanvas.height = isRotated ? img.naturalWidth : img.naturalHeight;

      rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rotCtx.rotate((rotation * Math.PI) / 180);
      rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const cropX = (cropBox.x / 100) * rotCanvas.width;
      const cropY = (cropBox.y / 100) * rotCanvas.height;
      const cropW = (cropBox.width / 100) * rotCanvas.width;
      const cropH = (cropBox.height / 100) * rotCanvas.height;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, targetWidth, targetHeight);

      // Convert to compressed WebP (fallback to JPEG)
      let finalDataUrl: string;
      try {
        finalDataUrl = canvas.toDataURL("image/webp", quality / 100);
      } catch {
        finalDataUrl = canvas.toDataURL("image/jpeg", quality / 100);
      }

      onConfirm(finalDataUrl);
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl" dir="rtl">
        <DialogHeader className="p-4 pb-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crop className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-white">{title}</DialogTitle>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-xs">
              {estimatedSizeKb > 0 ? `${estimatedSizeKb} KB` : "جاري المعاينة"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Main Crop Viewport */}
          <div
            ref={containerRef}
            className="relative h-[280px] sm:h-[320px] w-full select-none overflow-hidden rounded-xl border-2 border-dashed border-emerald-500/30 bg-slate-900 flex items-center justify-center touch-none"
          >
            {/* Displayed Image */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="قص المنتج"
              onLoad={generatePreview}
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transition: "transform 0.15s ease-out",
                maxHeight: "100%",
                maxWidth: "100%",
                objectFit: "contain",
              }}
              className="pointer-events-none select-none"
            />

            {/* Dark Overlay around Crop Box */}
            <div
              className="absolute pointer-events-none inset-0 bg-black/60"
              style={{
                clipPath: `polygon(
                  0% 0%, 0% 100%, 
                  ${cropBox.x}% 100%, 
                  ${cropBox.x}% ${cropBox.y}%, 
                  ${cropBox.x + cropBox.width}% ${cropBox.y}%, 
                  ${cropBox.x + cropBox.width}% ${cropBox.y + cropBox.height}%, 
                  ${cropBox.x}% ${cropBox.y + cropBox.height}%, 
                  ${cropBox.x}% 100%, 
                  100% 100%, 100% 0%
                )`,
              }}
            />

            {/* Draggable Crop Box Frame */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
              className="absolute cursor-move border-2 border-emerald-400 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(255,255,255,0.4)] rounded-md flex flex-col justify-between p-1"
            >
              <div className="flex justify-between items-center text-[10px] text-white font-mono bg-black/70 px-1.5 py-0.5 rounded w-fit backdrop-blur-sm">
                <span>تحديد المنتج فقط</span>
              </div>
              {/* Corner indicators */}
              <div className="flex justify-between w-full">
                <span className="w-2.5 h-2.5 border-b-2 border-r-2 border-white" />
                <span className="w-2.5 h-2.5 border-b-2 border-l-2 border-white" />
              </div>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-y py-2.5">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="h-8 gap-1 text-xs"
                title="تدوير 90 درجة"
              >
                <RotateCw className="h-3.5 w-3.5" />
                تدوير
              </Button>
              <Button
                type="button"
                variant={aspectRatio === "1:1" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setAspectRatio("1:1");
                  setCropBox((prev) => ({ ...prev, height: prev.width }));
                }}
                className={`h-8 gap-1 text-xs ${aspectRatio === "1:1" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <Square className="h-3.5 w-3.5" />
                مربع (1:1)
              </Button>
              <Button
                type="button"
                variant={aspectRatio === "free" ? "default" : "outline"}
                size="sm"
                onClick={() => setAspectRatio("free")}
                className={`h-8 gap-1 text-xs ${aspectRatio === "free" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                حر
              </Button>
            </div>

            {/* Estimated Size Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">الحجم بعد الضغط:</span>
              <Badge
                variant="outline"
                className={`font-mono text-xs ${
                  estimatedSizeKb < 60
                    ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                    : estimatedSizeKb < 150
                    ? "border-amber-500 text-amber-600 bg-amber-50"
                    : "border-red-500 text-red-600"
                }`}
              >
                {estimatedSizeKb} KB {estimatedSizeKb < 60 && "✓ خفيف ومثالي"}
              </Badge>
            </div>
          </div>

          {/* Adjusters (Crop Box Size & Compression Quality) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Crop Box Size Slider */}
            <div className="space-y-1.5 rounded-lg border p-2.5 bg-muted/20">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="font-medium">حجم إطار التحديد:</span>
                <span className="font-mono">{cropBox.width}%</span>
              </div>
              <Slider
                value={[cropBox.width]}
                min={25}
                max={100}
                step={1}
                onValueChange={(val) => handleCropSizeChange(val[0])}
                className="py-1"
              />
              <span className="text-[10px] text-muted-foreground">
                قم بسحب الإطار في الصورة لتحديد المنتج فقط وعزل الخلفية
              </span>
            </div>

            {/* Compression Quality Slider */}
            <div className="space-y-1.5 rounded-lg border p-2.5 bg-muted/20">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="font-medium">مستوى الضغط والجودة:</span>
                <span className="font-mono">{quality}%</span>
              </div>
              <Slider
                value={[quality]}
                min={40}
                max={95}
                step={5}
                onValueChange={(val) => setQuality(val[0])}
                className="py-1"
              />
              <span className="text-[10px] text-muted-foreground">
                يقلل حجم الصورة تلقائياً من ميغابايت إلى كيلوبايت خفيفة وسريعة التحميل
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 pt-2 border-t bg-muted/30 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground"
          >
            <X className="h-4 w-4 ml-1" />
            إلغاء
          </Button>

          <Button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isProcessing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-5 font-bold"
          >
            <Check className="h-4 w-4" />
            تأكيد واستخدام الصورة ({estimatedSizeKb} KB)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
