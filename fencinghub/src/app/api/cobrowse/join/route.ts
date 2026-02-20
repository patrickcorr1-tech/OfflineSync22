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

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "sales", "contractor"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("cobrowse_sessions")
    .select("id, code, expires_at, allow_control, status")
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .in("status", ["pending", "active"])
    .single();

  if (error || !data) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  await admin
    .from("cobrowse_sessions")
    .update({ status: "active", started_at: new Date().toISOString(), joined_by: user.id })
    .eq("id", data.id);

  return NextResponse.json({ session: data });
}
