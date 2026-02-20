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

  const { sessionId, allowControl, bugReport, recordingConsent } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin
    .from("cobrowse_sessions")
    .update({
      consented_at: new Date().toISOString(),
      allow_control: !!allowControl,
      bug_reported: !!bugReport,
      recording_consent: !!recordingConsent,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
