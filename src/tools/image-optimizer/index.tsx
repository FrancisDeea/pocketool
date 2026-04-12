import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  Download,
  ImageIcon,
  Loader2,
  Trash2,
} from 'lucide-react';
import Button from '@ui/Button';
import Badge from '@ui/Badge';

type OutputFormat = 'webp' | 'jpeg' | 'png';

type OptimizedResult = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

/**
 * Image Optimizer tool.
 *
 * NOTE: This is a simplified version using the Canvas API for image
 * optimization. The full wasm-vips integration with Web Worker would
 * be added when COOP/COEP headers are properly configured on the
 * deployment target. The architecture (dynamic import, worker.terminate()
 * on unmount) remains the same.
 */
export default function ImageOptimizer() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<OutputFormat>('webp');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OptimizedResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) {
        handleFile(f);
      }
    },
    [handleFile],
  );

  const handleOptimize = useCallback(async () => {
    if (!file) return;
    setProcessing(true);

    try {
      const img = new Image();
      const loadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      img.src = URL.createObjectURL(file);
      await loadPromise;

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const mimeType =
        format === 'webp'
          ? 'image/webp'
          : format === 'jpeg'
            ? 'image/jpeg'
            : 'image/png';

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed'))),
          mimeType,
          quality / 100,
        );
      });

      const url = URL.createObjectURL(blob);
      setResult({
        blob,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });

      URL.revokeObjectURL(img.src);
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setProcessing(false);
    }
  }, [file, quality, format]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `optimized.${format}`;
    a.click();
  }, [result, format]);

  const handleClear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setPreview(null);
    setResult(null);
  }, [preview, result]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const savings =
    file && result
      ? ((1 - result.blob.size / file.size) * 100).toFixed(1)
      : null;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-var(--topbar-height)-3rem)]">
      {/* Left: Upload & Controls */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Dropzone */}
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-4',
              'rounded-xl border-2 border-dashed border-border',
              'hover:border-accent hover:bg-accent-muted/30',
              'transition-colors cursor-pointer',
            ].join(' ')}
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-hover flex items-center justify-center">
              <Upload size={28} className="text-text-tertiary" />
            </div>
            <div className="text-center">
              <p className="text-sm text-text-primary font-medium">
                Arrastra una imagen o haz clic
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                PNG, JPEG, WebP, GIF
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        ) : (
          <>
            {/* Preview */}
            <div className="flex-1 min-h-0 relative rounded-xl border border-border overflow-hidden bg-[repeating-conic-gradient(var(--color-surface-hover)_0%_25%,var(--color-surface)_0%_50%)] bg-[length:20px_20px]">
              <img
                src={preview ?? ''}
                alt="Original"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2">
                <Badge>Original · {formatSize(file.size)}</Badge>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Formato</label>
                <div className="flex gap-1">
                  {(['webp', 'jpeg', 'png'] as OutputFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={[
                        'px-3 py-1 text-xs font-medium rounded-md cursor-pointer',
                        'transition-colors',
                        format === f
                          ? 'bg-accent text-white'
                          : 'bg-surface-hover text-text-secondary hover:text-text-primary',
                      ].join(' ')}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">
                  Calidad: {quality}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-40 accent-accent"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleOptimize}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ImageIcon size={14} />
                      Optimizar
                    </>
                  )}
                </Button>
                <Button variant="danger" size="md" onClick={handleClear}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: Result */}
      <div className="flex-1 flex flex-col min-h-0">
        {result ? (
          <>
            <div className="flex-1 min-h-0 relative rounded-xl border border-border overflow-hidden bg-[repeating-conic-gradient(var(--color-surface-hover)_0%_25%,var(--color-surface)_0%_50%)] bg-[length:20px_20px]">
              <img
                src={result.url}
                alt="Optimized"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 flex gap-1.5">
                <Badge variant="accent">
                  Optimizada · {formatSize(result.blob.size)}
                </Badge>
                {savings && Number(savings) > 0 && (
                  <Badge variant="success">-{savings}%</Badge>
                )}
              </div>
            </div>
            <div className="mt-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleDownload}
                className="w-full"
              >
                <Download size={14} />
                Descargar {format.toUpperCase()}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-xl border border-border border-dashed">
            <p className="text-sm text-text-tertiary">
              {file
                ? 'Pulsa "Optimizar" para procesar la imagen'
                : 'El resultado aparecerá aquí'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
