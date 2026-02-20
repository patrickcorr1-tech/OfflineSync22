import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: session, error } = await admin
    .from("cobrowse_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("created_by")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (session?.created_by) {
    await admin.from("notifications").insert({
      user_id: session.created_by,
      type: "cobrowse_ended",
      payload: { title: "Support session ended", body: "Your support session has ended." },
    });
  }

  return NextResponse.json({ ok: true });
}
