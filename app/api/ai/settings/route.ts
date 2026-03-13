import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data } = await supabase
    .from("ai_settings")
    .select("api_endpoint, model")
    .eq("user_id", user.id)
    .single();
  return NextResponse.json({
    apiEndpoint: data?.api_endpoint ?? "",
    model: data?.model ?? "gpt-4o-mini",
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const api_endpoint = (body.api_endpoint as string) ?? "";
  const api_key_encrypted = (body.api_key as string) ?? "";
  const model = (body.model as string) ?? "gpt-4o-mini";
  const { error } = await supabase.from("ai_settings").upsert(
    {
      user_id: user.id,
      api_endpoint: api_endpoint || null,
      api_key_encrypted: api_key_encrypted || null,
      model: model || null,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
