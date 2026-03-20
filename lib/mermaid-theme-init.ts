import { getMermaidTheme, type MermaidThemeKey } from "@/store/canvasStore";

/** Reference: sequence diagram — dark gray lines (#333), alt/note frames, readable text */
const REDUX_COLOR_THEME_VARIABLES: Record<string, string> = {
  darkMode: "false",
  background: "#ffffff",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "14px",
  primaryColor: "#DBEAFE",
  primaryTextColor: "#0f172a",
  primaryBorderColor: "#2563EB",
  secondaryColor: "#f1f5f9",
  secondaryBorderColor: "#64748b",
  secondaryTextColor: "#334155",
  tertiaryColor: "#f8fafc",
  tertiaryBorderColor: "#94a3b8",
  tertiaryTextColor: "#334155",
  lineColor: "#333333",
  textColor: "#333333",
  mainBkg: "#DBEAFE",
  actorBkg: "#DBEAFE",
  actorBorder: "#2563EB",
  actorTextColor: "#0f172a",
  actorLineColor: "#333333",
  signalColor: "#333333",
  signalTextColor: "#333333",
  labelBoxBkgColor: "#ffffff",
  labelBoxBorderColor: "#4A4A4A",
  labelTextColor: "#333333",
  loopTextColor: "#333333",
  noteBkgColor: "#ffffff",
  noteTextColor: "#333333",
  noteBorderColor: "#9ca3af",
  activationBkgColor: "#f1f5f9",
  activationBorderColor: "#475569",
  sequenceNumberColor: "#ffffff",
};

const REDUX_COLOR_DARK_THEME_VARIABLES: Record<string, string> = {
  ...REDUX_COLOR_THEME_VARIABLES,
  darkMode: "true",
  background: "#0f172a",
  primaryTextColor: "#f1f5f9",
  textColor: "#e2e8f0",
  signalTextColor: "#e2e8f0",
  actorTextColor: "#f8fafc",
  labelTextColor: "#e2e8f0",
  loopTextColor: "#e2e8f0",
  noteTextColor: "#e2e8f0",
  noteBkgColor: "#1e293b",
  labelBoxBkgColor: "#1e293b",
  lineColor: "#cbd5e1",
  signalColor: "#cbd5e1",
  actorLineColor: "#cbd5e1",
  labelBoxBorderColor: "#94a3b8",
  noteBorderColor: "#64748b",
};

export type MermaidInitConfig = {
  startOnLoad: false;
  securityLevel: "loose";
  theme: "default" | "neutral" | "dark" | "forest" | "base";
  themeVariables?: Record<string, string>;
};

export function getMermaidInitConfig(themeKey: MermaidThemeKey): MermaidInitConfig {
  if (themeKey === "reduxColor") {
    return {
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      themeVariables: REDUX_COLOR_THEME_VARIABLES,
    };
  }
  if (themeKey === "reduxColorDark") {
    return {
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      themeVariables: REDUX_COLOR_DARK_THEME_VARIABLES,
    };
  }
  return {
    startOnLoad: false,
    securityLevel: "loose",
    theme: getMermaidTheme(themeKey) as MermaidInitConfig["theme"],
  };
}
