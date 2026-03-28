import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("diagrams")
    .select("id, title, code, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ diagrams: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 校验：用户图表数量是否已达上限 50
  const { count, error: countError } = await supabase
    .from("diagrams")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  const MAX_DIAGRAMS = 50;
  if ((count ?? 0) >= MAX_DIAGRAMS) {
    return NextResponse.json(
      { error: `已达最大图表数量限制（${MAX_DIAGRAMS} 个）` },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string) || "Untitled";
  const code = (body.code as string) || "";
  const { data, error } = await supabase
    .from("diagrams")
    .insert({ user_id: user.id, title, code })
    .select("id, title, code, share_id, updated_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
