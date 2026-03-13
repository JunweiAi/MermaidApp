import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SharePreview } from "./SharePreview";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diagrams")
    .select("code, title")
    .eq("share_id", shareId)
    .eq("is_public", true)
    .single();
  if (error || !data) notFound();
  return <SharePreview code={data.code} title={data.title} />;
}
