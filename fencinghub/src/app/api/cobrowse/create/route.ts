import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, quoteId } = await req.json();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let code = generateCode();
  for (let i = 0; i < 5; i += 1) {
    const { data: existing } = await admin
      .from("cobrowse_sessions")
      .select("id")
      .eq("code", code)
      .gt("expires_at", new Date().toISOString())
      .in("status", ["pending", "active"]);
    if (!existing || existing.length === 0) break;
    code = generateCode();
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("cobrowse_sessions")
    .insert({
      code,
      project_id: projectId || null,
      quote_id: quoteId || null,
      created_by: user.id,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id, code, expires_at, allow_control, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("support_audit_logs").insert({
    user_id: user.id,
    action: "cobrowse_create",
    context: { sessionId: data.id, projectId, quoteId },
  });

  return NextResponse.json({ session: data });
}
