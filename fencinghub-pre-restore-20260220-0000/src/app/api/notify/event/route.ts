import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { sendPush } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId, projectId, title, body } = await req.json();

  let recipients: string[] = [];

  if (targetUserId) {
    recipients = [targetUserId];
  } else if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("company_id")
      .eq("id", projectId)
      .single();
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("contractor_id")
      .eq("project_id", projectId);
    const { data: customerUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_id", project?.company_id || "");
    const { data: staff } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "sales"]);

    recipients = Array.from(
      new Set(
        [
          ...(assignments || []).map((a: any) => a.contractor_id),
          ...(customerUsers || []).map((u: any) => u.id),
          ...(staff || []).map((u: any) => u.id),
        ].filter(Boolean),
      ),
    );
  }

  for (const userId of recipients) {
    const { data: subs } = await supabase
      .from("notifications")
      .select("payload")
      .eq("user_id", userId)
      .eq("type", "push_subscription");
    if (subs) {
      for (const s of subs) {
        await sendPush(s.payload, { title, body });
      }
    }
  }

  return NextResponse.json({ ok: true, recipients: recipients.length });
}
