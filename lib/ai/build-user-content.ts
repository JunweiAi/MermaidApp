import type { MultimodalContentPart } from "@/lib/ai/multimodal-types";

const MAX_IMAGES = 4;
const MAX_TEXT = 120_000;

const DEFAULT_IMAGE_ONLY =
  "Describe or convert this into a Mermaid diagram. Output only valid Mermaid code.";

/**
 * Build OpenAI-compatible user `content` from text + optional pasted images (data URLs).
 */
export function buildUserApiContent(
  text: string,
  imageUrls: string[]
): string | MultimodalContentPart[] {
  const imgs = imageUrls.filter((u) => u.startsWith("data:image/")).slice(0, MAX_IMAGES);
  if (imgs.length === 0) {
    return text.slice(0, MAX_TEXT);
  }
  const parts: MultimodalContentPart[] = [];
  const t = text.trim();
  if (t) {
    parts.push({ type: "text", text: t.slice(0, MAX_TEXT) });
  } else {
    parts.push({ type: "text", text: DEFAULT_IMAGE_ONLY });
  }
  for (const url of imgs) {
    parts.push({
      type: "image_url",
      image_url: { url, detail: "high" },
    });
  }
  if (parts.length === 1 && parts[0].type === "text") {
    return parts[0].text;
  }
  return parts;
}
