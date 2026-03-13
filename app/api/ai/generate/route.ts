import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { streamChatCompletion } from "@/lib/ai/generate";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("api_endpoint, api_key_encrypted, model")
    .eq("user_id", user.id)
    .single();
  if (!settings?.api_endpoint || !settings?.api_key_encrypted) {
    return NextResponse.json(
      { error: "Configure API endpoint and key in AI Settings first" },
      { status: 400 }
    );
  }
  const body = await request.json().catch(() => ({}));
  const prompt = (body.prompt as string) || "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  try {
    const stream = await streamChatCompletion({
      endpoint: settings.api_endpoint,
      apiKey: settings.api_key_encrypted,
      model: settings.model || "gpt-4o-mini",
      prompt,
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
