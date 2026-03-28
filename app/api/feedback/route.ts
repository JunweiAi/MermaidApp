import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const content = (body.content as string)?.trim();

  if (!content || content.length < 5) {
    return NextResponse.json({ error: "反馈内容不能少于 5 个字符" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "反馈内容不能超过 2000 个字符" }, { status: 400 });
  }

  const userEmail = user.email ?? "未登录用户";
  const { error } = await resend.emails.send({
    from: "MermaidApp <onboarding@resend.dev>",
    to: "aijunwei19910322@126.com",
    subject: `【用户反馈】来自 ${userEmail}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">收到一条用户反馈</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 80px;">用户邮箱</td>
            <td style="padding: 8px 0; color: #333;">${userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; vertical-align: top;">反馈内容</td>
            <td style="padding: 8px 0; color: #333; white-space: pre-wrap;">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
          </tr>
        </table>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          此邮件由 MermaidApp 自动发送 · ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
        </p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
