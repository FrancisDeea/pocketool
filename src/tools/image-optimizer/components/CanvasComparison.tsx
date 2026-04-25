import { useEffect, useRef, useState, useCallback } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { $theme } from '@/stores/theme';

interface Props {
  originalUrl: string | null;
  processedUrl: string | null;
}

export default function CanvasComparison({ originalUrl, processedUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [sliderPos, setSliderPos] = useState(0.5); // 0 to 1
  const theme = useStore($theme);

  // Interaction State
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Images 
  const origImgRef = useRef<HTMLImageElement | null>(null);
  const procImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!originalUrl) {
      origImgRef.current = null;
      return;
    }
    const img = new Image();
    img.src = originalUrl;
    img.onload = () => {
      origImgRef.current = img;
      setOffset({ x: 0, y: 0 });
      setScale(1); 
      render();
    };
  }, [originalUrl]);

  useEffect(() => {
    if (!processedUrl) {
      procImgRef.current = null;
      render();
      return;
    }
    const img = new Image();
    img.src = processedUrl;
    img.onload = () => {
      procImgRef.current = img;
      render();
    };
  }, [processedUrl]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw checkered background
    // We use semi-transparent overlays so it works in both light and dark modes
    const isDark = document.documentElement.dataset.theme?.includes('dark') ?? true;
    ctx.fillStyle = isDark ? '#141416' : '#f4f4f5';
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = isDark ? '#1c1c1f' : '#e4e4e7';
    const gridSize = 20;
    for (let x = 0; x < w; x += gridSize) {
      for (let y = 0; y < h; y += gridSize) {
        if ((Math.floor(x / gridSize) + Math.floor(y / gridSize)) % 2 === 0) {
          ctx.fillRect(x, y, gridSize, gridSize);
        }
      }
    }

    if (!origImgRef.current) return;

    const drawImage = (img: HTMLImageElement, isProcessed: boolean, clipX?: number) => {
      ctx.save();
      if (clipX !== undefined) {
        ctx.beginPath();
        ctx.rect(clipX, 0, w - clipX, h);
        ctx.clip();
      }

      // Force processed image to match original coordinates for perfect overlap/comparison
      const targetW = isProcessed && origImgRef.current ? origImgRef.current.naturalWidth : img.naturalWidth;
      const targetH = isProcessed && origImgRef.current ? origImgRef.current.naturalHeight : img.naturalHeight;

      const imgW = targetW * scale;
      const imgH = targetH * scale;
      const cx = (w - imgW) / 2 + offset.x;
      const cy = (h - imgH) / 2 + offset.y;

      ctx.imageSmoothingEnabled = scale < 3;
      ctx.drawImage(img, cx, cy, imgW, imgH);
      ctx.restore();
    };

    // Draw Original (Base Layer)
    drawImage(origImgRef.current, false);

    // Draw Processed (Top Layer, clipped by slider)
    const sliderPixelX = w * sliderPos;
    if (procImgRef.current) {
      drawImage(procImgRef.current, true, sliderPixelX);
    }

    // Draw Slider Line
    if (procImgRef.current) {
      ctx.beginPath();
      ctx.moveTo(sliderPixelX, 0);
      ctx.lineTo(sliderPixelX, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#818cf8'; // Accent color
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sliderPixelX, h / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#818cf8';
      ctx.fill();
    }
  }, [offset, scale, sliderPos, theme]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    window.addEventListener('resize', render);
    return () => window.removeEventListener('resize', render);
  }, [render]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    const sliderPixelX = rect.width * sliderPos;
    if (procImgRef.current && Math.abs(x - sliderPixelX) < 20) {
      setIsDraggingSlider(true);
      (e.target as Element).setPointerCapture(e.pointerId);
    } else {
      setIsDraggingCanvas(true);
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingSlider && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setSliderPos(Math.max(0, Math.min(1, x / rect.width)));
    } else if (isDraggingCanvas) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingSlider(false);
    setIsDraggingCanvas(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    // Only intercept if we are actively wheeling over the canvas 
    // preventDefault blocks native scrolling/zooming while interacting with this specific component
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = 0.05;
      const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
      setScale((s) => Math.max(0.1, Math.min(20, s * (1 + delta))));
    } else {
      e.preventDefault();
      setOffset((o) => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative cursor-crosshair rounded-xl overflow-hidden touch-none"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {!originalUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface/50 backdrop-blur-[2px] p-8 text-center animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-3xl bg-surface shadow-xl border border-border flex items-center justify-center relative group-hover:scale-110 transition-transform duration-300">
            <div className="absolute inset-0 rounded-3xl bg-accent/10 animate-pulse" />
            <Upload size={32} className="text-accent relative z-10" />
          </div>
          <div className="max-w-xs space-y-2">
            <h3 className="text-lg font-semibold text-text-primary">Optimiza tus imágenes</h3>
            <p className="text-sm text-text-tertiary leading-relaxed">
              Haz clic aquí o arrastra una imagen para empezar a optimizar localmente <br/> 
              <span className="text-xs font-mono mt-2 opacity-60">(WEBP, JPEG, PNG, AVIF)</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
