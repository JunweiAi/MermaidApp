"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Square, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MANUAL_ATTR = "data-manual";
const MANUAL_ID_PREFIX = "mermaid-manual-";

function getTranslate(g: SVGGElement): { x: number; y: number } {
  const m = g.transform.baseVal.consolidate()?.matrix;
  if (m) return { x: m.e, y: m.f };
  return { x: 0, y: 0 };
}

function setTranslate(g: SVGGElement, x: number, y: number) {
  g.setAttribute("transform", `translate(${x},${y})`);
}

function findManualGroup(el: Element | null): SVGGElement | null {
  if (!el) return null;
  const g = el.closest(`[${MANUAL_ATTR}="true"]`);
  return g instanceof SVGGElement ? g : null;
}

function serializeSvgFromHost(host: HTMLDivElement): string {
  const svg = host.querySelector("svg");
  return svg ? svg.outerHTML : "";
}

function nextManualId(host: HTMLDivElement): string {
  const svgs = host.querySelectorAll(`[${MANUAL_ATTR}="true"]`);
  let max = 0;
  svgs.forEach((n) => {
    const id = n.getAttribute("id") ?? "";
    const m = id.match(new RegExp(`^${MANUAL_ID_PREFIX}(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `${MANUAL_ID_PREFIX}${max + 1}`;
}

export interface SvgManualEditorProps {
  enabled: boolean;
  svgHostRef: React.RefObject<HTMLDivElement | null>;
  /** Current displayed SVG string (Mermaid or manual overlay) — rebind when it changes */
  svgContentKey: string;
  onSvgChange: (svgOuterHtml: string) => void;
}

export function SvgManualEditor({
  enabled,
  svgHostRef,
  svgContentKey,
  onSvgChange,
}: SvgManualEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<{
    g: SVGGElement;
    startSvgX: number;
    startSvgY: number;
    startTx: number;
    startTy: number;
  } | null>(null);

  const commit = useCallback(() => {
    const host = svgHostRef.current;
    if (!host) return;
    onSvgChange(serializeSvgFromHost(host));
  }, [onSvgChange, svgHostRef]);

  const selectById = useCallback((id: string | null) => {
    setSelectedId(id);
    const host = svgHostRef.current;
    if (!host) return;
    host.querySelectorAll(`[${MANUAL_ATTR}="true"]`).forEach((n) => {
      if (!(n instanceof SVGGElement)) return;
      const shape = n.querySelector("rect, circle, ellipse, path, line, polyline, polygon, text");
      if (shape) {
        if (id && n.getAttribute("id") === id) {
          shape.setAttribute("stroke", "#3b82f6");
          shape.setAttribute("stroke-width", "2");
        } else {
          shape.removeAttribute("stroke");
          shape.removeAttribute("stroke-width");
        }
      }
    });
  }, [svgHostRef]);

  // Pointer: select + drag manual groups
  useEffect(() => {
    if (!enabled) {
      dragRef.current = null;
      return;
    }
    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!svg) return;

    const toSvgPoint = (clientX: number, clientY: number) => {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: clientX, y: clientY };
      return pt.matrixTransform(ctm.inverse());
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element;
      const g = findManualGroup(target);
      if (g) {
        e.stopPropagation();
        e.preventDefault();
        const id = g.getAttribute("id");
        selectById(id);
        const { x: tx, y: ty } = getTranslate(g);
        const p = toSvgPoint(e.clientX, e.clientY);
        dragRef.current = {
          g,
          startSvgX: p.x,
          startSvgY: p.y,
          startTx: tx,
          startTy: ty,
        };
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
      } else if (target === svg || target.closest("svg") === svg) {
        selectById(null);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.stopPropagation();
      const p = toSvgPoint(e.clientX, e.clientY);
      const dx = p.x - d.startSvgX;
      const dy = p.y - d.startSvgY;
      setTranslate(d.g, d.startTx + dx, d.startTy + dy);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragRef.current) {
        dragRef.current = null;
        commit();
      }
      try {
        (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointercancel", onPointerUp);

    return () => {
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerup", onPointerUp);
      svg.removeEventListener("pointercancel", onPointerUp);
    };
  }, [enabled, svgContentKey, commit, selectById, svgHostRef]);

  // Keyboard: Delete selected
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (!selectedId) return;
      e.preventDefault();
      const host = svgHostRef.current;
      if (!host) return;
      const g = host.querySelector(`#${CSS.escape(selectedId)}`);
      if (g?.getAttribute(MANUAL_ATTR) === "true") {
        g.remove();
        setSelectedId(null);
        commit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, selectedId, commit, svgHostRef]);

  const addRect = () => {
    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!svg) return;
    const id = nextManualId(host!);
    const vb = svg.viewBox.baseVal;
    const cx = vb.width ? vb.x + vb.width / 2 - 40 : 100;
    const cy = vb.height ? vb.y + vb.height / 2 - 25 : 100;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", id);
    g.setAttribute(MANUAL_ATTR, "true");
    g.setAttribute("transform", `translate(${cx},${cy})`);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "80");
    rect.setAttribute("height", "50");
    rect.setAttribute("rx", "4");
    rect.setAttribute("fill", "rgba(59,130,246,0.15)");
    rect.setAttribute("stroke", "#64748b");
    rect.setAttribute("stroke-width", "1");
    g.appendChild(rect);
    svg.appendChild(g);
    setSelectedId(id);
    selectById(id);
    commit();
  };

  const addCircle = () => {
    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!svg) return;
    const id = nextManualId(host!);
    const vb = svg.viewBox.baseVal;
    const cx = vb.width ? vb.x + vb.width / 2 : 120;
    const cy = vb.height ? vb.y + vb.height / 2 : 120;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", id);
    g.setAttribute(MANUAL_ATTR, "true");
    g.setAttribute("transform", `translate(${cx - 30},${cy - 30})`);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "30");
    circle.setAttribute("cy", "30");
    circle.setAttribute("r", "28");
    circle.setAttribute("fill", "rgba(34,197,94,0.15)");
    circle.setAttribute("stroke", "#64748b");
    circle.setAttribute("stroke-width", "1");
    g.appendChild(circle);
    svg.appendChild(g);
    setSelectedId(id);
    selectById(id);
    commit();
  };

  const addText = () => {
    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!svg) return;
    const id = nextManualId(host!);
    const vb = svg.viewBox.baseVal;
    const cx = vb.width ? vb.x + vb.width / 2 - 30 : 80;
    const cy = vb.height ? vb.y + vb.height / 2 : 100;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", id);
    g.setAttribute(MANUAL_ATTR, "true");
    g.setAttribute("transform", `translate(${cx},${cy})`);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "0");
    text.setAttribute("y", "0");
    text.setAttribute("font-size", "14");
    text.setAttribute("fill", "#334155");
    text.setAttribute("font-family", "system-ui, sans-serif");
    text.textContent = "Text";
    g.appendChild(text);
    svg.appendChild(g);
    setSelectedId(id);
    selectById(id);
    commit();
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const host = svgHostRef.current;
    if (!host) return;
    const g = host.querySelector(`#${CSS.escape(selectedId)}`);
    if (g?.getAttribute(MANUAL_ATTR) === "true") {
      g.remove();
      setSelectedId(null);
      commit();
    }
  };

  if (!enabled) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-3 top-3 z-20 flex flex-wrap items-center gap-1 rounded-md border bg-background/95 p-1 shadow-md backdrop-blur-sm",
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="px-2 text-xs text-muted-foreground">SVG 编辑</span>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2" onClick={addRect} title="添加矩形">
        <Square className="h-3.5 w-3.5" />
        矩形
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2" onClick={addCircle} title="添加圆形">
        <Circle className="h-3.5 w-3.5" />
        圆形
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2" onClick={addText} title="添加文字">
        <Type className="h-3.5 w-3.5" />
        文字
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2 text-destructive"
        disabled={!selectedId}
        onClick={deleteSelected}
        title="删除选中"
      >
        <Trash2 className="h-3.5 w-3.5" />
        删除
      </Button>
    </div>
  );
}
