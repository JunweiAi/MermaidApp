/**
 * Redux Color sequence: only **adjacent** participants use different fill/stroke;
 * every other participant repeats (A, B, A, B, …) so non-adjacent can match.
 * Mermaid themeVariables stay default; we override rects after render.
 */

const ADJACENT_PAIR_A = { fill: "#DBEAFE", stroke: "#2563EB" };
const ADJACENT_PAIR_B = { fill: "#FCE7F3", stroke: "#DB2777" };

function alternatingStyle(index: number) {
  return index % 2 === 0 ? ADJACENT_PAIR_A : ADJACENT_PAIR_B;
}

const LINE_STROKE_LIGHT = "#333333";
const LINE_STROKE_DARK = "#cbd5e1";

export function applyReduxColorSequenceSvg(
  root: HTMLElement | null,
  options?: { dark?: boolean }
) {
  if (!root) return;
  const lineStroke = options?.dark ? LINE_STROKE_DARK : LINE_STROKE_LIGHT;

  root.querySelectorAll<SVGRectElement>("rect.actor-top").forEach((rect, i) => {
    const c = alternatingStyle(i);
    rect.setAttribute("fill", c.fill);
    rect.setAttribute("stroke", c.stroke);
  });

  root.querySelectorAll<SVGRectElement>("rect.actor-bottom").forEach((rect, i) => {
    const c = alternatingStyle(i);
    rect.setAttribute("fill", c.fill);
    rect.setAttribute("stroke", c.stroke);
  });

  root.querySelectorAll<SVGLineElement>("line.actor-line").forEach((line) => {
    line.setAttribute("stroke", lineStroke);
    line.setAttribute("stroke-width", "1");
  });
}
