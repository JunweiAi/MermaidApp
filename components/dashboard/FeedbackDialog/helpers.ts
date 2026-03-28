export async function submitFeedback(content: string): Promise<{ error?: string }> {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: data.error ?? "提交失败，请稍后重试" };
  }
  return {};
}
