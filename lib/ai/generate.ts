function extractContentFromStream(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
                const content = json.choices?.[0]?.delta?.content;
                if (typeof content === "string") {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // ignore parse errors for non-JSON lines
              }
            }
          }
        }
        if (buffer.trim()) {
          try {
            const json = JSON.parse(buffer.startsWith("data: ") ? buffer.slice(6) : buffer) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = json.choices?.[0]?.delta?.content;
            if (typeof content === "string") controller.enqueue(encoder.encode(content));
          } catch {
            // ignore
          }
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
}

export type ChatMessagePayload = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function streamChatCompletion(params: {
  endpoint: string;
  apiKey: string;
  model: string;
  /** Full message list including system as first item */
  messages: ChatMessagePayload[];
}): Promise<ReadableStream<Uint8Array>> {
  const { endpoint, apiKey, model, messages } = params;
  const url = endpoint.replace(/\/$/, "") + "/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return extractContentFromStream(res.body!);
}
