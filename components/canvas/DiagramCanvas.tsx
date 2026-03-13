"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { useCanvasStore, getMermaidTheme } from "@/store/canvasStore";
import { cn } from "@/lib/utils";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
});

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;
const DEFAULT_SCALE = 1.5;

export interface DiagramCanvasProps {
  code: string;
  theme?: string;
  className?: string;
  showGrid?: boolean;
  minHeight?: string;
  showToolbar?: boolean;
  toolbarRef?: React.RefObject<HTMLDivElement | null>;
}

export function DiagramCanvas({
  code,
  theme: themeProp,
  className,
  showGrid = true,
  minHeight = "400px",
  showToolbar = false,
  toolbarRef,
}: DiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const renderIdRef = useRef(0);
  const { theme: storeTheme } = useCanvasStore();
  const themeKey = themeProp ?? storeTheme;
  const mermaidTheme = getMermaidTheme(
    themeKey as Parameters<typeof getMermaidTheme>[0]
  ) || "neutral";
  const [fullscreen, setFullscreen] = useState(false);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const startPan = useRef({ x: 0, y: 0 });
  const { panMode } = useCanvasStore();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme as "default" | "neutral" | "dark" | "forest" | "base",
      securityLevel: "loose",
    });
  }, [mermaidTheme]);

  useEffect(() => {
    if (!code.trim()) {
      setSvg(null);
      setError(null);
      return;
    }
    const id = `canvas-${Date.now()}-${renderIdRef.current++}`;
    mermaid
      .render(id, code)
      .then(({ svg: result }) => {
        setSvg(result);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message ?? "Invalid Mermaid syntax");
        setSvg(null);
      });
  }, [code, mermaidTheme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) {
        document.exitFullscreen?.();
        setFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  // 使用 passive: false 才能阻止 Ctrl+滚轮时浏览器的默认缩放
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  }, []);
  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
  }, []);
  const resetTransform = useCallback(() => {
    setScale(DEFAULT_SCALE);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s + delta)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!panMode || e.button !== 0) return;
    isPanning.current = true;
    startPan.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [panMode, translate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!panMode || !isPanning.current) return;
    setTranslate({
      x: e.clientX - startPan.current.x,
      y: e.clientY - startPan.current.y,
    });
  }, [panMode]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button === 0) isPanning.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  const gridClass = showGrid
    ? "bg-[length:24px_24px] bg-[image:linear-gradient(rgba(0,0,0,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.06)_1px,transparent_1px)]"
    : "";

  return (
    <div
      ref={toolbarRef ?? containerRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ minHeight }}
    >
      <div
        ref={scrollAreaRef}
        className={cn("h-full w-full overflow-hidden", gridClass)}
        onWheel={handleWheel}
        style={{ cursor: panMode ? (isPanning.current ? "grabbing" : "grab") : "default" }}
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center p-8"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {error && (
            <pre className="text-sm text-destructive">{error}</pre>
          )}
          {svg && !error && (
            <div
              className="[&_svg]:max-w-full [&_svg]:shadow-lg"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      </div>
      {showToolbar && (
        <CanvasToolbar
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resetTransform={resetTransform}
          fullscreen={fullscreen}
          onFullscreenToggle={() => {
            const el = (toolbarRef ?? containerRef).current;
            if (!el) return;
            if (fullscreen) {
              document.exitFullscreen?.();
              setFullscreen(false);
            } else {
              el.requestFullscreen?.();
              setFullscreen(true);
            }
          }}
        />
      )}
    </div>
  );
}

function CanvasToolbar({
  zoomIn,
  zoomOut,
  resetTransform,
  fullscreen,
  onFullscreenToggle,
}: {
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
  fullscreen: boolean;
  onFullscreenToggle: () => void;
}) {
  return (
    <div className="absolute bottom-4 right-4 flex gap-1 rounded-md border border-gray-200 bg-white/95 p-1 shadow-sm">
      <button
        type="button"
        className="rounded p-2 hover:bg-gray-100"
        onClick={zoomOut}
        aria-label="Zoom out"
      >
        <span className="text-sm font-medium">−</span>
      </button>
      <button
        type="button"
        className="rounded p-2 hover:bg-gray-100"
        onClick={zoomIn}
        aria-label="Zoom in"
      >
        <span className="text-sm font-medium">+</span>
      </button>
      <button
        type="button"
        className="rounded p-2 hover:bg-gray-100"
        onClick={resetTransform}
        aria-label="Fit"
      >
        <span className="text-xs">Fit</span>
      </button>
      <button
        type="button"
        className="rounded p-2 hover:bg-gray-100"
        onClick={onFullscreenToggle}
        aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        <span className="text-xs">{fullscreen ? "Exit" : "Full"}</span>
      </button>
    </div>
  );
}
