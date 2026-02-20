import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { sendPush } from "@/lib/notify";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, type, title, body, audience = "admins", push = false } = await req.json();
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: project } = await admin
    .from("projects")
    .select("company_id")
    .eq("id", projectId)
    .single();

  const { data: staff } = await admin.from("profiles").select("id").in("role", ["admin", "sales"]);
  const { data: customers } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", project?.company_id || "")
    .eq("role", "customer");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const link = `${appUrl}/projects/${projectId}`;
  const payload = { title, body, projectId, link };

  let targets: string[] = [];
  if (audience === "admins") targets = (staff || []).map((s: any) => s.id);
  if (audience === "customers") targets = (customers || []).map((c: any) => c.id);
  if (audience === "both")
    targets = [...(staff || []).map((s: any) => s.id), ...(customers || []).map((c: any) => c.id)];
  targets = Array.from(new Set(targets.filter(Boolean)));

  if (targets.length) {
    await admin
      .from("notifications")
      .insert(targets.map((id) => ({ user_id: id, type: type || "project_update", payload })));
  }

  if (push && targets.length) {
    for (const userId of targets) {
      const { data: subs } = await admin
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
  }

  return NextResponse.json({ ok: true, targets: targets.length });
}
