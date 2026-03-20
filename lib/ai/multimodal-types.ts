/**
 * OpenAI-compatible chat message parts (vision / multimodal user messages).
 */

/** `detail` helps OCR/diagrams; OpenAI recommends `high` for screenshots with small text. */
export type MultimodalContentPart =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: { url: string; detail?: "auto" | "low" | "high" };
    };

export type ChatMessagePayload =
  | { role: "system"; content: string }
  | { role: "user"; content: string | MultimodalContentPart[] }
  | { role: "assistant"; content: string };
