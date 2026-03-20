/**
 * Mermaid 11: syntax errors are rendered via the internal "error" diagram and
 * `mermaid.render()` may still **resolve** with an SVG string containing the bomb + text.
 * Temporary DOM nodes (by render id) may also be left on `document` and stack at the bottom.
 * @see mermaid errorRenderer (error-text / Syntax error in text)
 */

const ERROR_MARKERS = [
  "Syntax error in text",
  'class="error-text"',
  'class="error-icon"',
] as const;

export function isMermaidSyntaxErrorSvgString(svg: string): boolean {
  if (!svg) return false;
  return ERROR_MARKERS.some((m) => svg.includes(m));
}

/** Remove the container Mermaid created for this render id (often left on `document.body`). */
export function removeMermaidRenderNodeById(
  renderId: string,
  svgHost: HTMLElement | null,
): void {
  const el = document.getElementById(renderId);
  if (el && (!svgHost || !svgHost.contains(el))) {
    el.remove();
  }
}

/**
 * Remove stray render roots (`canvas-*` / `mermaid-*` ids) that are not inside our React SVG host.
 * Safe: real diagram SVG is injected via innerHTML of `svgHost`, not separate top-level ids with these prefixes.
 */
export function sweepMermaidStrayRenderRoots(svgHost: HTMLElement | null): void {
  const prefixes = ["canvas-", "mermaid-"];
  for (const p of prefixes) {
    document.querySelectorAll(`[id^="${p}"]`).forEach((node) => {
      if (svgHost && svgHost.contains(node)) return;
      node.remove();
    });
  }
}

export function cleanupAfterMermaidRender(
  renderId: string,
  svgHost: HTMLElement | null,
): void {
  removeMermaidRenderNodeById(renderId, svgHost);
  sweepMermaidStrayRenderRoots(svgHost);
}
