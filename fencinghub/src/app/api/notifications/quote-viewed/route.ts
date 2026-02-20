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

  const { quoteId, projectId } = await req.json();
  if (!quoteId || !projectId)
    return NextResponse.json({ error: "Missing quoteId/projectId" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: viewerProfile } = await admin
    .from("profiles")
    .select("full_name,email")
    .eq("id", user.id)
    .single();
  const { data: project } = await admin
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  await admin
    .from("quotes")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", quoteId)
    .is("viewed_at", null);

  await admin
    .from("quotes")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", quoteId)
    .is("viewed_at", null);

  const title = "Quote viewed";
  const body = `${viewerProfile?.full_name || viewerProfile?.email || "Customer"} opened a quote for ${project?.name || projectId}.`;

  const { data: staff } = await admin.from("profiles").select("id").in("role", ["admin", "sales"]);
  const staffIds = (staff || []).map((s: any) => s.id);

  for (const id of staffIds) {
    // Avoid duplicate notifications for same quote + viewer
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", id)
      .eq("type", "quote_viewed")
      .eq("payload->>quoteId", quoteId)
      .eq("payload->>viewerId", user.id)
      .limit(1);

    if (existing && existing.length > 0) continue;

    await admin.from("notifications").insert({
      user_id: id,
      type: "quote_viewed",
      payload: { title, body, quoteId, projectId, viewerId: user.id },
    });

    const { data: subs } = await admin
      .from("notifications")
      .select("payload")
      .eq("user_id", id)
      .eq("type", "push_subscription");

    if (subs) {
      for (const s of subs) {
        await sendPush(s.payload, { title, body });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
