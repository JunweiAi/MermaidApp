/**
 * If a pasted image data URL is very large, downscale + JPEG-compress so the JSON body
 * is less likely to hit proxy / server limits (still browser-only).
 */
export function compressImageDataUrlIfNeeded(
  dataUrl: string,
  /** Skip compression below this string length (~bytes of base64 payload) */
  maxLen = 1_800_000
): Promise<string> {
  if (typeof window === "undefined" || dataUrl.length <= maxLen) {
    return Promise.resolve(dataUrl);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 2048;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w < 1 || h < 1) {
          resolve(dataUrl);
          return;
        }
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL("image/jpeg", 0.88);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
