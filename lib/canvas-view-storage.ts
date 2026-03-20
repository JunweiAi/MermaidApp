/**
 * Persist canvas zoom / pan per diagram (localStorage).
 * Used when leaving the editor and returning later.
 */

const STORAGE_PREFIX = "mermaidApp:canvasView:";

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;

export type CanvasViewSnapshot = {
  scale: number;
  translate: { x: number; y: number };
};

function isValidSnap(s: unknown): s is CanvasViewSnapshot {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  const sc = o.scale;
  const tr = o.translate;
  if (typeof sc !== "number" || !Number.isFinite(sc) || sc < MIN_SCALE || sc > MAX_SCALE) {
    return false;
  }
  if (!tr || typeof tr !== "object") return false;
  const tx = (tr as Record<string, unknown>).x;
  const ty = (tr as Record<string, unknown>).y;
  if (typeof tx !== "number" || typeof ty !== "number" || !Number.isFinite(tx) || !Number.isFinite(ty)) {
    return false;
  }
  return true;
}

export function loadCanvasView(diagramId: string): CanvasViewSnapshot | null {
  if (typeof window === "undefined" || !diagramId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + diagramId);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isValidSnap(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveCanvasView(diagramId: string, snap: CanvasViewSnapshot): void {
  if (typeof window === "undefined" || !diagramId) return;
  try {
    if (!isValidSnap(snap)) return;
    localStorage.setItem(STORAGE_PREFIX + diagramId, JSON.stringify(snap));
  } catch {
    // quota / private mode
  }
}
