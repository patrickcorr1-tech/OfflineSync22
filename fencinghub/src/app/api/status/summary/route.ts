import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
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
  if (!profile || profile.role === "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date();
  const inSeven = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: expiringQuotes } = await admin
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .eq("archived", false)
    .not("expires_at", "is", null)
    .gte("expires_at", now.toISOString())
    .lte("expires_at", inSeven);

  const { count: overdueInbox } = await admin
    .from("inbox_messages")
    .select("id", { count: "exact", head: true })
    .lt("sla_due_at", now.toISOString())
    .neq("status", "closed");

  const { count: pendingApprovals } = await admin
    .from("approvals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return NextResponse.json({
    expiringQuotes: expiringQuotes || 0,
    overdueInbox: overdueInbox || 0,
    pendingApprovals: pendingApprovals || 0,
  });
}
