import { useState, useCallback, useRef } from "react";
import {
  Download,
  Loader2,
  Trash2,
  Settings2,
  Minimize,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";
import Button from "@ui/Button";
import Badge from "@ui/Badge";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import CanvasComparison from "./components/CanvasComparison";

// Preferences stored in Dexie
interface ImagePreferences {
  format: "webp" | "jpeg" | "png";
  quality: number;
}

const DEFAULT_PREFS: ImagePreferences = {
  format: "webp",
  quality: 80,
};

type PipelineState = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  format: "webp" | "jpeg" | "png";
  quality: number;
};

export default function ImageOptimizer() {
  const prefsRecord = useLiveQuery(() =>
    db.toolStates.get("tool:image-optimizer:preferences"),
  );
  const prefs: ImagePreferences = prefsRecord?.value || DEFAULT_PREFS;

  const updatePrefs = (newPrefs: Partial<ImagePreferences>) => {
    db.toolStates.put({
      key: "tool:image-optimizer:preferences",
      value: { ...prefs, ...newPrefs },
    });
  };

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 });

  // Local Resize State (Non-persistent)
  const [localWidth, setLocalWidth] = useState<number | undefined>(undefined);
  const [localHeight, setLocalHeight] = useState<number | undefined>(undefined);
  const [localMaintainRatio, setLocalMaintainRatio] = useState(true);

  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setPipeline(null);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () =>
      setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith("image/")) {
        handleFile(f);
      }
    },
    [handleFile],
  );

  const handleWidthChange = (val: string) => {
    const w = val ? Number(val) : undefined;
    setLocalWidth(w);
    if (
      w &&
      localMaintainRatio &&
      originalDimensions.h &&
      originalDimensions.w
    ) {
      setLocalHeight(
        Math.round(w * (originalDimensions.h / originalDimensions.w)),
      );
    }
  };

  const handleHeightChange = (val: string) => {
    const h = val ? Number(val) : undefined;
    setLocalHeight(h);
    if (
      h &&
      localMaintainRatio &&
      originalDimensions.h &&
      originalDimensions.w
    ) {
      setLocalWidth(
        Math.round(h * (originalDimensions.w / originalDimensions.h)),
      );
    }
  };

  const applyPreset = (scale: number) => {
    if (!originalDimensions.w || !originalDimensions.h) return;
    setLocalWidth(Math.round(originalDimensions.w * scale));
    setLocalHeight(Math.round(originalDimensions.h * scale));
  };

  const performCanvasOp = async (
    sourceUrl: string,
    targetW: number,
    targetH: number,
    mime: string,
    quality?: number,
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetW, targetH);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas export failed"));
          },
          mime,
          quality,
        );
      };
      img.onerror = reject;
      img.src = sourceUrl;
    });
  };

  const handleGenerate = async () => {
    if (!originalUrl) return;
    setIsProcessing(true);

    try {
      const targetW = localWidth || originalDimensions.w;
      const targetH = localHeight || originalDimensions.h;
      const mime =
        prefs.format === "png"
          ? "image/png"
          : prefs.format === "jpeg"
            ? "image/jpeg"
            : `image/${prefs.format}`;
      const quality = prefs.format === "png" ? undefined : prefs.quality / 100;

      // Single operation from original
      const blob = await performCanvasOp(
        originalUrl,
        targetW,
        targetH,
        mime,
        quality,
      );

      const url = URL.createObjectURL(blob);
      if (pipeline?.url) URL.revokeObjectURL(pipeline.url);

      setPipeline({
        blob,
        url,
        width: targetW,
        height: targetH,
        format: prefs.format,
        quality: prefs.quality,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = useCallback(() => {
    if (!pipeline?.blob || !file) return;

    const originalName =
      file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const a = document.createElement("a");
    a.href = pipeline.url;
    a.download = `${originalName}-pocketool.${pipeline.format}`;
    a.click();
  }, [pipeline, file]);

  const handleClear = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (pipeline?.url) URL.revokeObjectURL(pipeline.url);
    setFile(null);
    setOriginalUrl(null);
    setPipeline(null);
    setLocalWidth(undefined);
    setLocalHeight(undefined);
  }, [originalUrl, pipeline]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const savings =
    file && pipeline?.blob
      ? ((1 - pipeline.blob.size / file.size) * 100).toFixed(1)
      : null;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-var(--topbar-height)-3rem)]">
      {/* Sidebar */}
      {file && (
        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {/* Resolution Settings */}
            <div className="p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase text-text-secondary tracking-widest flex items-center gap-2">
                  <Minimize size={14} /> Redimensión
                </span>
              </div>

              <div className="flex gap-2 items-end mb-4">
                <div className="flex-1">
                  <label className="text-xs text-text-tertiary block mb-1">
                    Ancho (px)
                  </label>
                  <input
                    type="number"
                    value={localWidth || ""}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    placeholder="Original"
                    className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-md text-sm outline-none focus:border-accent"
                  />
                </div>
                <div className="flex flex-col items-center justify-center pb-1">
                  <button
                    onClick={() => setLocalMaintainRatio(!localMaintainRatio)}
                    className={[
                      "p-1.5 rounded-md hover:bg-surface-hover transition-colors",
                      localMaintainRatio ? "text-accent" : "text-text-tertiary",
                    ].join(" ")}
                    title={
                      localMaintainRatio
                        ? "Desbloquear proporción"
                        : "Bloquear proporción"
                    }
                  >
                    {localMaintainRatio ? (
                      <Lock size={14} />
                    ) : (
                      <Unlock size={14} />
                    )}
                  </button>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-text-tertiary block mb-1">
                    Alto (px)
                  </label>
                  <input
                    type="number"
                    value={localHeight || ""}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    placeholder="Original"
                    className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-md text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex gap-1">
                {[0.25, 0.5, 0.75].map((scale) => (
                  <button
                    key={scale}
                    onClick={() => applyPreset(scale)}
                    className="flex-1 px-2 py-1 text-xs font-medium rounded-md bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {scale * 100}%
                  </button>
                ))}
              </div>
            </div>

            {/* Compression Settings */}
            <div className="p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase text-text-secondary tracking-widest flex items-center gap-2">
                  <Settings2 size={14} /> Compresión
                </span>
              </div>

              <label className="text-xs text-text-tertiary block mb-1">
                Formato de Salida
              </label>
              <div className="flex gap-1 mb-4">
                {(["webp", "jpeg", "png"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => updatePrefs({ format: f })}
                    className={[
                      "px-2 py-1 text-xs font-medium rounded-md w-full",
                      prefs.format === f
                        ? "bg-accent text-white"
                        : "bg-surface-hover text-text-secondary",
                    ].join(" ")}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>

              {prefs.format !== "png" && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-text-tertiary">
                      Calidad
                    </label>
                    <span className="text-xs text-text-primary font-mono">
                      {prefs.quality}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={prefs.quality}
                    onChange={(e) =>
                      updatePrefs({ quality: Number(e.target.value) })
                    }
                    className="w-full accent-accent"
                  />
                </div>
              )}
            </div>

            {/* Main Action */}
            <div className="flex flex-col gap-2 mt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full py-6 text-base shadow-lg shadow-accent/20"
                onClick={handleGenerate}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <RefreshCw size={20} />
                )}
                Generar Optimización
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={handleDownload}
                  disabled={!pipeline?.url}
                >
                  <Download size={14} /> Descargar
                </Button>
                <Button variant="danger" size="md" onClick={handleClear}>
                  <Trash2 size={14} /> Limpiar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        className={[
          "flex-1 relative rounded-xl border border-border bg-surface-hover overflow-hidden flex flex-col min-h-[400px] transition-all duration-200",
          isDragging
            ? "ring-2 ring-accent ring-inset bg-accent-muted/10 scale-[0.99]"
            : "",
          !file ? "cursor-pointer hover:bg-surface" : "",
        ].join(" ")}
        onClick={() => !file && inputRef.current?.click()}
        onDrop={(e) => {
          setIsDragging(false);
          handleDrop(e);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
      >
        <CanvasComparison
          originalUrl={originalUrl}
          processedUrl={pipeline?.url || null}
        />

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {/* Status Overlay */}
        {file && (
          <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
            <div className="flex flex-col gap-2 pointer-events-auto">
              <Badge>Original: {formatSize(file.size)}</Badge>
              <span className="text-xs px-2 py-1 bg-surface/80 rounded-md shadow-sm border border-border w-fit font-mono backdrop-blur-md">
                {originalDimensions.w} x {originalDimensions.h} px
              </span>
            </div>

            {pipeline?.url && (
              <div className="flex flex-col gap-2 items-end pointer-events-auto">
                <div className="flex gap-2">
                  {savings && Number(savings) > 0 && (
                    <Badge variant="success">-{savings}%</Badge>
                  )}
                  <Badge variant="accent">
                    Optimizada: {formatSize(pipeline.blob.size)}
                  </Badge>
                </div>
                <span className="text-xs px-2 py-1 bg-surface/80 rounded-md shadow-sm border border-border w-fit font-mono backdrop-blur-md">
                  {pipeline.width} x {pipeline.height} px
                </span>
                <span className="text-xs text-accent mt-1 drop-shadow-md">
                  Pipeline: Resize ➔ Compress {pipeline.format.toUpperCase()} (
                  {pipeline.quality}%)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
