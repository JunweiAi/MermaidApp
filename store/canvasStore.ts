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
  setTheme: (theme: MermaidThemeKey) => void;
  setPanMode: (enabled: boolean) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  theme: "neo",
  panMode: false,
  setTheme: (theme) => set({ theme }),
  setPanMode: (panMode) => set({ panMode }),
}));

export const THEME_OPTIONS: { value: MermaidThemeKey; label: string }[] = [
  { value: "neo", label: "Neo" },
  { value: "neoDark", label: "Neo Dark" },
  { value: "redux", label: "Redux" },
  { value: "reduxDark", label: "Redux Dark" },
  { value: "reduxColor", label: "Redux Color" },
  { value: "reduxColorDark", label: "Redux Color Dark" },
];
