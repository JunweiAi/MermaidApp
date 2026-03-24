"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  ScanSearch,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useCanvasStore, type MermaidThemeKey } from "@/store/canvasStore";
import { getMermaidInitConfig } from "@/lib/mermaid-theme-init";
import { applyReduxColorSequenceSvg } from "@/lib/mermaid-redux-color-svg";
import { loadCanvasView, saveCanvasView } from "@/lib/canvas-view-storage";
import { SvgManualEditor } from "@/components/canvas/svg-edit/SvgManualEditor";
import {
  cleanupAfterMermaidRender,
  isMermaidSyntaxErrorSvgString,
  sweepMermaidStrayRenderRoots,
} from "@/lib/mermaid-render-cleanup";
import { cn } from "@/lib/utils";

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;
const DEFAULT_SCALE = 1.5;

type ViewSnapshot = { scale: number; translate: { x: number; y: number } };

function snapshotsEqual(a: ViewSnapshot, b: ViewSnapshot) {
  return (
    a.scale === b.scale &&
    a.translate.x === b.translate.x &&
    a.translate.y === b.translate.y
  );
}

export interface DiagramCanvasProps {
  code: string;
  /** When set (e.g. diagram id), zoom/pan are restored from localStorage on enter and saved on leave. */
  persistViewKey?: string;
  theme?: string;
  className?: string;
  showGrid?: boolean;
  minHeight?: string;
  showToolbar?: boolean;
  toolbarRef?: React.RefObject<HTMLDivElement | null>;
}

export function DiagramCanvas({
  code,
  persistViewKey,
  theme: themeProp,
  className,
  showGrid = true,
  minHeight = "400px",
  showToolbar = false,
  toolbarRef,
}: DiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  /** When set, replaces Mermaid SVG for display (manual shapes). Cleared when code/theme changes. */
  const [manualSvg, setManualSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const renderIdRef = useRef(0);
  /** Ignore stale mermaid.render results when code/theme changes (avoids error overwriting success). */
  const renderSeqRef = useRef(0);
  const { theme: storeTheme, panMode, svgEditMode, setSvgEditMode } = useCanvasStore();
  const themeKey = (themeProp ?? storeTheme) as MermaidThemeKey;
  const isReduxColorTheme = themeKey === "reduxColor" || themeKey === "reduxColorDark";
  const [fullscreen, setFullscreen] = useState(false);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);
  scaleRef.current = scale;
  translateRef.current = translate;

  const viewHistoryRef = useRef<ViewSnapshot[]>([
    { scale: DEFAULT_SCALE, translate: { x: 0, y: 0 } },
  ]);
  const historyIndexRef = useRef(0);
  const panStartTranslateRef = useRef<{ x: number; y: number } | null>(null);
  const wheelCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setHistoryVersion] = useState(0);

  const isPanning = useRef(false);
  const startPan = useRef({ x: 0, y: 0 });
  const displaySvg = manualSvg ?? svg;

  const pushViewHistory = useCallback((snap: ViewSnapshot) => {
    const stack = viewHistoryRef.current;
    const idx = historyIndexRef.current;
    const cur = stack[idx];
    if (cur && snapshotsEqual(cur, snap)) return;
    viewHistoryRef.current = stack.slice(0, idx + 1).concat([snap]);
    historyIndexRef.current = viewHistoryRef.current.length - 1;
    setHistoryVersion((v) => v + 1);
  }, []);

  const applyHistoryIndex = useCallback((nextIndex: number) => {
    const stack = viewHistoryRef.current;
    if (nextIndex < 0 || nextIndex >= stack.length) return;
    historyIndexRef.current = nextIndex;
    const snap = stack[nextIndex];
    setScale(snap.scale);
    setTranslate({ ...snap.translate });
    setHistoryVersion((v) => v + 1);
  }, []);

  const undoView = useCallback(() => {
    const i = historyIndexRef.current;
    if (i <= 0) return;
    applyHistoryIndex(i - 1);
  }, [applyHistoryIndex]);

  const redoView = useCallback(() => {
    const stack = viewHistoryRef.current;
    const i = historyIndexRef.current;
    if (i >= stack.length - 1) return;
    applyHistoryIndex(i + 1);
  }, [applyHistoryIndex]);

  const scheduleWheelHistoryCommit = useCallback(() => {
    if (wheelCommitTimerRef.current) clearTimeout(wheelCommitTimerRef.current);
    wheelCommitTimerRef.current = setTimeout(() => {
      wheelCommitTimerRef.current = null;
      pushViewHistory({
        scale: scaleRef.current,
        translate: { ...translateRef.current },
      });
    }, 350);
  }, [pushViewHistory]);

  /** Restore zoom/pan from localStorage before paint (per diagram). */
  useLayoutEffect(() => {
    if (!persistViewKey) return;
    const snap = loadCanvasView(persistViewKey);
    if (!snap) return;
    scaleRef.current = snap.scale;
    translateRef.current = snap.translate;
    setScale(snap.scale);
    setTranslate({ ...snap.translate });
    viewHistoryRef.current = [snap];
    historyIndexRef.current = 0;
    setHistoryVersion((v) => v + 1);
  }, [persistViewKey]);

  /** Save zoom/pan when leaving the page or unmounting. */
  useEffect(() => {
    if (!persistViewKey) return;
    const key = persistViewKey;
    const persist = () => {
      saveCanvasView(key, {
        scale: scaleRef.current,
        translate: { ...translateRef.current },
      });
    };
    const onPageHide = () => persist();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      persist();
    };
  }, [persistViewKey]);

  useEffect(() => {
    mermaid.initialize(getMermaidInitConfig(themeKey));
    setInitialized(true);
  }, [themeKey]);

  /** Manual SVG overlay is invalid after source diagram or theme changes. */
  useEffect(() => {
    setManualSvg(null);
  }, [code, themeKey]);

  useEffect(() => {
    // 等待 mermaid 初始化完成再渲染
    if (!initialized) return;
    const seq = ++renderSeqRef.current;
    if (!code.trim()) {
      setSvg(null);
      setError(null);
      sweepMermaidStrayRenderRoots(svgHostRef.current);
      return;
    }
    /** Clear previous error as soon as code/theme changes so fixed syntax doesn’t keep showing stale message. */
    setError(null);
    sweepMermaidStrayRenderRoots(svgHostRef.current);
    const id = `canvas-${Date.now()}-${renderIdRef.current++}`;
    mermaid
      .render(id, code)
      .then(({ svg: result }) => {
        cleanupAfterMermaidRender(id, svgHostRef.current);
        if (seq !== renderSeqRef.current) return;
        /** Mermaid resolves with an “error diagram” SVG on parse failure — treat as error, not success. */
        if (isMermaidSyntaxErrorSvgString(result)) {
          setError("Syntax error in text");
          setSvg(null);
          return;
        }
        setSvg(result);
        setError(null);
      })
      .catch((err: Error) => {
        cleanupAfterMermaidRender(id, svgHostRef.current);
        if (seq !== renderSeqRef.current) return;
        setError(err.message ?? "Invalid Mermaid syntax");
        setSvg(null);
      });
  }, [code, themeKey, initialized]);

  useLayoutEffect(() => {
    if (!displaySvg || !isReduxColorTheme) return;
    applyReduxColorSequenceSvg(svgHostRef.current, {
      dark: themeKey === "reduxColorDark",
    });
  }, [displaySvg, isReduxColorTheme, themeKey]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) {
        document.exitFullscreen?.();
        setFullscreen(false);
      }
      if (e.key === "Escape" && svgEditMode) {
        setSvgEditMode(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, svgEditMode, setSvgEditMode]);

  /** Keep UI in sync when user exits fullscreen via browser UI / Esc */
  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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
    setScale((s) => {
      const ns = Math.min(MAX_SCALE, s + SCALE_STEP);
      queueMicrotask(() =>
        pushViewHistory({ scale: ns, translate: { ...translateRef.current } })
      );
      return ns;
    });
  }, [pushViewHistory]);
  const zoomOut = useCallback(() => {
    setScale((s) => {
      const ns = Math.max(MIN_SCALE, s - SCALE_STEP);
      queueMicrotask(() =>
        pushViewHistory({ scale: ns, translate: { ...translateRef.current } })
      );
      return ns;
    });
  }, [pushViewHistory]);
  const resetTransform = useCallback(() => {
    const snap = { scale: DEFAULT_SCALE, translate: { x: 0, y: 0 } };
    setScale(snap.scale);
    setTranslate(snap.translate);
    queueMicrotask(() => pushViewHistory(snap));
  }, [pushViewHistory]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
      setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s + delta)));
      scheduleWheelHistoryCommit();
    },
    [scheduleWheelHistoryCommit]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (svgEditMode || !panMode || e.button !== 0) return;
      e.preventDefault();
      isPanning.current = true;
      panStartTranslateRef.current = { ...translateRef.current };
      startPan.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [svgEditMode, panMode, translate.x, translate.y]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (svgEditMode || !panMode || !isPanning.current) return;
    e.preventDefault();
    setTranslate({
      x: e.clientX - startPan.current.x,
      y: e.clientY - startPan.current.y,
    });
  }, [svgEditMode, panMode]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (svgEditMode) return;
      if (e.button === 0) {
        if (isPanning.current && panStartTranslateRef.current) {
          const start = panStartTranslateRef.current;
          const end = translateRef.current;
          if (start.x !== end.x || start.y !== end.y) {
            pushViewHistory({
              scale: scaleRef.current,
              translate: { ...end },
            });
          }
          panStartTranslateRef.current = null;
        }
        isPanning.current = false;
      }
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    },
    [svgEditMode, pushViewHistory]
  );

  const gridClass = showGrid
    ? "bg-[length:24px_24px] bg-[image:linear-gradient(rgba(0,0,0,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.06)_1px,transparent_1px)]"
    : "";

  return (
    <div
      ref={toolbarRef ?? containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden",
        fullscreen && "bg-background",
        className
      )}
      style={{ minHeight }}
    >
      <div
        ref={scrollAreaRef}
        className={cn(
          "h-full w-full overflow-hidden select-none",
          panMode && !svgEditMode && "touch-none",
          gridClass
        )}
        onWheel={handleWheel}
        style={{
          cursor:
            svgEditMode ? "default" : panMode ? (isPanning.current ? "grabbing" : "grab") : "default",
        }}
      >
        <div
          className="flex min-h-full min-w-full select-none items-center justify-center p-8 [&_*]:select-none"
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
            <div className="relative">
              <div
                ref={svgHostRef}
                className={cn(
                  "[&_svg]:max-w-full [&_svg]:shadow-lg",
                  isReduxColorTheme && "mermaid-redux-color"
                )}
                dangerouslySetInnerHTML={{ __html: displaySvg ?? "" }}
              />
              <SvgManualEditor
                enabled={svgEditMode}
                svgHostRef={svgHostRef}
                svgContentKey={displaySvg}
                onSvgChange={setManualSvg}
              />
            </div>
          )}
        </div>
      </div>
      {showToolbar && (
        <CanvasToolbar
          onUndo={undoView}
          onRedo={redoView}
          canUndo={historyIndexRef.current > 0}
          canRedo={historyIndexRef.current < viewHistoryRef.current.length - 1}
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

function ToolbarDivider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-teal-200/70" aria-hidden />;
}

function CanvasToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoomIn,
  zoomOut,
  resetTransform,
  fullscreen,
  onFullscreenToggle,
}: {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
  fullscreen: boolean;
  onFullscreenToggle: () => void;
}) {
  const iconBtn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white/70 disabled:pointer-events-none disabled:opacity-35";

  return (
    <div
      className="absolute bottom-4 right-4 flex items-center gap-0.5 rounded-full border border-teal-100/90 bg-[#ecfdf5]/95 px-1.5 py-1 shadow-md backdrop-blur-sm"
      role="toolbar"
      aria-label="Canvas tools"
    >
      <div className="flex items-center gap-0.5 px-0.5">
        <button
          type="button"
          className={iconBtn}
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo view"
          title="Undo (view)"
        >
          <Undo2 className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo view"
          title="Redo (view)"
        >
          <Redo2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <ToolbarDivider />
      <div className="flex items-center gap-0.5 px-0.5">
        <button
          type="button"
          className={iconBtn}
          onClick={zoomOut}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={zoomIn}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={resetTransform}
          aria-label="Reset zoom and position"
          title="Fit / reset view"
        >
          <ScanSearch className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <ToolbarDivider />
      <div className="flex items-center px-0.5">
        <button
          type="button"
          className={iconBtn}
          onClick={onFullscreenToggle}
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? (
            <Minimize2 className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Maximize2 className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
