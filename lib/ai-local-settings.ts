/**
 * AI settings stored only in the browser, keyed by Supabase user id.
 * API keys never leave the device except when calling your own /api/ai/generate.
 */

export type AiLocalSettingsV1 = {
  apiEndpoint: string;
  apiKey: string;
  model: string;
};

const VERSION = "v1";

export function getAiLocalStorageKey(userId: string): string {
  return `mermaidapp:ai:${VERSION}:${userId}`;
}

export function loadAiLocalSettings(userId: string): AiLocalSettingsV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getAiLocalStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AiLocalSettingsV1>;
    return {
      apiEndpoint: typeof parsed.apiEndpoint === "string" ? parsed.apiEndpoint : "",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" ? parsed.model : "gpt-4o-mini",
    };
  } catch {
    return null;
  }
}

export function saveAiLocalSettings(userId: string, data: AiLocalSettingsV1): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getAiLocalStorageKey(userId), JSON.stringify(data));
}

export function clearAiLocalSettings(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getAiLocalStorageKey(userId));
}
