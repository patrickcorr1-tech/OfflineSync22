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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "sales"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    quoteId,
    pinned,
    archived,
    internal_notes,
    status,
    sent_at,
    viewed_at,
    responded_at,
    response_comment,
    expires_at,
    response_due_at,
  } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const patch: Record<string, any> = {};
  if (typeof pinned === "boolean") patch.pinned = pinned;
  if (typeof archived === "boolean") patch.archived = archived;
  if (typeof internal_notes === "string") patch.internal_notes = internal_notes;
  if (typeof status === "string") patch.status = status;
  if (sent_at) patch.sent_at = sent_at;
  if (viewed_at) patch.viewed_at = viewed_at;
  if (responded_at) patch.responded_at = responded_at;
  if (response_comment !== undefined) patch.response_comment = response_comment;
  if (expires_at !== undefined) patch.expires_at = expires_at;
  if (response_due_at !== undefined) patch.response_due_at = response_due_at;

  const { error } = await admin.from("quotes").update(patch).eq("id", quoteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
