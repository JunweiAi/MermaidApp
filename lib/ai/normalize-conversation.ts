import type { ChatMessagePayload, MultimodalContentPart } from "@/lib/ai/multimodal-types";

const MAX_STR = 120_000;
const MAX_DATA_URL_LENGTH = 6_000_000;
const MAX_PARTS_PER_USER_MESSAGE = 24;

export function normalizeUserContent(
  content: unknown
):
  | { ok: true; value: string | MultimodalContentPart[] }
  | { ok: false; error: string } {
  if (typeof content === "string") {
    return { ok: true, value: content.slice(0, MAX_STR) };
  }
  if (!Array.isArray(content)) {
    return { ok: false, error: "user content must be string or array" };
  }
  const parts: MultimodalContentPart[] = [];
  for (const p of content) {
    if (!p || typeof p !== "object") {
      return { ok: false, error: "invalid content part" };
    }
    const o = p as { type?: string; text?: string; image_url?: { url?: string } };
    if (o.type === "text" && typeof o.text === "string") {
      parts.push({ type: "text", text: o.text.slice(0, MAX_STR) });
    } else if (o.type === "image_url" && o.image_url && typeof o.image_url.url === "string") {
      const url = o.image_url.url;
      if (!url.startsWith("data:image/")) {
        return { ok: false, error: "only data:image/* URLs are allowed" };
      }
      if (url.length > MAX_DATA_URL_LENGTH) {
        return { ok: false, error: "image payload too large" };
      }
      const d = (o.image_url as { detail?: string }).detail;
      const detail =
        d === "low" || d === "high" || d === "auto" ? d : ("high" as const);
      parts.push({ type: "image_url", image_url: { url, detail } });
    } else {
      return { ok: false, error: "invalid multimodal part" };
    }
    if (parts.length > MAX_PARTS_PER_USER_MESSAGE) {
      return { ok: false, error: "too many content parts" };
    }
  }
  if (parts.length === 0) {
    return { ok: false, error: "empty content parts" };
  }
  return { ok: true, value: parts };
}

/**
 * Validates client conversation (no system message) into API-ready payloads.
 */
export function normalizeClientConversation(
  raw: unknown
): { ok: true; messages: ChatMessagePayload[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "conversation must be an array" };
  }
  const out: ChatMessagePayload[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") {
      return { ok: false, error: "invalid message" };
    }
    const role = (m as { role?: string }).role;
    if (role === "assistant") {
      const c = (m as { content?: unknown }).content;
      if (typeof c !== "string") {
        return { ok: false, error: "assistant content must be a string" };
      }
      out.push({ role: "assistant", content: c.slice(0, MAX_STR) });
      continue;
    }
    if (role === "user") {
      const c = (m as { content?: unknown }).content;
      const n = normalizeUserContent(c);
      if (!n.ok) return { ok: false, error: n.error };
      out.push({ role: "user", content: n.value });
      continue;
    }
    return { ok: false, error: "invalid message role" };
  }
  return { ok: true, messages: out };
}
