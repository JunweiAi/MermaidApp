import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { streamChatCompletion, type ChatMessagePayload } from "@/lib/ai/generate";
import { MERMAID_AI_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";

const MAX_CONVERSATION_MESSAGES = 40; // user+assistant pairs, excluding system
const MAX_MESSAGE_CHARS = 120_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const prompt = (body.prompt as string) || "";
  const rawConversation = body.conversation as
    | Array<{ role: string; content: string }>
    | undefined;

  let conversation: ChatMessagePayload[];

  if (Array.isArray(rawConversation) && rawConversation.length > 0) {
    const trimmed = rawConversation
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content.slice(0, MAX_MESSAGE_CHARS),
      }))
      .slice(-MAX_CONVERSATION_MESSAGES);

    if (trimmed.length === 0) {
      return NextResponse.json({ error: "conversation is empty" }, { status: 400 });
    }
    const last = trimmed[trimmed.length - 1];
    if (last.role !== "user") {
      return NextResponse.json(
        { error: "last message in conversation must be from user" },
        { status: 400 }
      );
    }
    conversation = [
      { role: "system", content: MERMAID_AI_SYSTEM_PROMPT },
      ...trimmed,
    ];
  } else if (prompt.trim()) {
    conversation = [
      { role: "system", content: MERMAID_AI_SYSTEM_PROMPT },
      { role: "user", content: prompt.trim() },
    ];
  } else {
    return NextResponse.json(
      { error: "prompt or non-empty conversation is required" },
      { status: 400 }
    );
  }

  const bodyEndpoint = (body.api_endpoint as string) || "";
  const bodyKey = (body.api_key as string) || "";
  const bodyModel = (body.model as string) || "";

  let endpoint = bodyEndpoint;
  let apiKey = bodyKey;
  let model = bodyModel || "gpt-4o-mini";

  if (!endpoint || !apiKey) {
    const { data: settings } = await supabase
      .from("ai_settings")
      .select("api_endpoint, api_key_encrypted, model")
      .eq("user_id", user.id)
      .single();
    if (!endpoint) endpoint = settings?.api_endpoint ?? "";
    if (!apiKey) apiKey = settings?.api_key_encrypted ?? "";
    if (!bodyModel) model = settings?.model || "gpt-4o-mini";
  }

  if (!endpoint || !apiKey) {
    return NextResponse.json(
      { error: "Configure API endpoint and key in AI Settings first" },
      { status: 400 }
    );
  }

  try {
    const stream = await streamChatCompletion({
      endpoint,
      apiKey,
      model: model || "gpt-4o-mini",
      messages: conversation,
    });
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 502 }
    );
  }
}
