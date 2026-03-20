import { create } from "zustand";

export type MermaidThemeKey =
  | "neo"
  | "neoDark"
  | "redux"
  | "reduxDark"
  | "reduxColor"
  | "reduxColorDark";

const MERMAID_THEME_MAP: Record<MermaidThemeKey, string> = {
  neo: "neutral",
  neoDark: "dark",
  redux: "default",
  reduxDark: "dark",
  reduxColor: "default",
  reduxColorDark: "dark",
};

export function getMermaidTheme(key: MermaidThemeKey): string {
  return MERMAID_THEME_MAP[key] ?? "neutral";
}

interface CanvasState {
  theme: MermaidThemeKey;
  panMode: boolean;
  /** When true, canvas supports selecting/dragging/deleting manual SVG shapes (not canvas pan). */
  svgEditMode: boolean;
  setTheme: (theme: MermaidThemeKey) => void;
  setPanMode: (enabled: boolean) => void;
  setSvgEditMode: (enabled: boolean) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  theme: "redux",
  panMode: false,
  svgEditMode: false,
  setTheme: (theme) => set({ theme }),
  setPanMode: (panMode) =>
    set((s) => ({
      panMode,
      svgEditMode: panMode ? false : s.svgEditMode,
    })),
  setSvgEditMode: (svgEditMode) =>
    set((s) => ({
      svgEditMode,
      // Avoid pan + edit fighting over pointer events
      panMode: svgEditMode ? false : s.panMode,
    })),
}));

export const THEME_OPTIONS: { value: MermaidThemeKey; label: string }[] = [
  { value: "neo", label: "Neo" },
  { value: "neoDark", label: "Neo Dark" },
  { value: "redux", label: "Redux" },
  { value: "reduxDark", label: "Redux Dark" },
  { value: "reduxColor", label: "Redux Color" },
  { value: "reduxColorDark", label: "Redux Color Dark" },
];
