/**
 * Rasterize an in-DOM SVG to PNG. Mermaid often sets width/height to 100% or
 * fixed sizes that do not match the full content bbox; loading that SVG as an
 * image uses those intrinsic dimensions, so canvas size and bitmap diverge and
 * the PNG looks cropped. We clone the root SVG, set explicit pixel dimensions
 * and a viewBox that matches getBBox() (+ padding), then draw at 0,0.
 */

import { sanitizeFileBasename } from "@/lib/export-mermaid";

const MAX_CANVAS_DIM = 16384;

function stripLayoutFromRootStyle(style: string): string {
  return style
    .replace(/max-width\s*:\s*[^;]+;?/gi, "")
    .replace(/\bwidth\s*:\s*[^;]+;?/gi, "")
    .replace(/\bheight\s*:\s*[^;]+;?/gi, "")
    .replace(/;\s*;/g, ";")
    .replace(/^\s*;\s*|\s*;\s*$/g, "")
    .trim();
}

export async function svgElementToPngBlob(
  svg: SVGSVGElement,
  options?: { padding?: number }
): Promise<Blob | null> {
  const padding = options?.padding ?? 20;
  const bbox = svg.getBBox();
  if (
    !Number.isFinite(bbox.width) ||
    !Number.isFinite(bbox.height) ||
    bbox.width <= 0 ||
    bbox.height <= 0
  ) {
    return null;
  }

  const vbX = bbox.x - padding;
  const vbY = bbox.y - padding;
  const vbW = bbox.width + padding * 2;
  const vbH = bbox.height + padding * 2;

  let outW = Math.ceil(vbW);
  let outH = Math.ceil(vbH);
  const maxSide = Math.max(outW, outH);
  if (maxSide > MAX_CANVAS_DIM) {
    const s = MAX_CANVAS_DIM / maxSide;
    outW = Math.max(1, Math.floor(outW * s));
    outH = Math.max(1, Math.floor(outH * s));
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  clone.setAttribute("width", String(outW));
  clone.setAttribute("height", String(outH));
  clone.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  clone.setAttribute("preserveAspectRatio", "xMinYMin meet");

  const style = clone.getAttribute("style");
  if (style) {
    const cleaned = stripLayoutFromRootStyle(style);
    if (cleaned) clone.setAttribute("style", cleaned);
    else clone.removeAttribute("style");
  }

  const svgData = new XMLSerializer().serializeToString(clone);
  const dataUrl =
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, 0, 0, outW, outH);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function downloadSvgElementAsPng(
  svg: SVGSVGElement | null | undefined,
  fileBaseName: string,
  options?: { padding?: number }
): Promise<boolean> {
  if (!svg) return false;
  const blob = await svgElementToPngBlob(svg, options);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFileBasename(fileBaseName)}.png`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
