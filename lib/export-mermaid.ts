/**
 * Shared helpers for exporting Mermaid diagrams (e.g. .mmd source download).
 */

/** Remove characters invalid in Windows / macOS file names. */
export function sanitizeFileBasename(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim();
  return cleaned || "diagram";
}

/**
 * Download Mermaid source as UTF-8 `.mmd`.
 * @returns false if there is no non-whitespace code to export.
 */
export function downloadMermaidCodeAsMmd(code: string, baseName: string): boolean {
  if (!code.trim()) return false;
  const filename = `${sanitizeFileBasename(baseName)}.mmd`;
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
