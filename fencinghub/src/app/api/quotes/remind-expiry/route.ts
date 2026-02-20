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

  const { quoteId } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: quote } = await admin
    .from("quotes")
    .select("id,project_id,expires_at,projects(name,company_id)")
    .eq("id", quoteId)
    .single();
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const { data: customers } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", quote.projects?.company_id || "")
    .eq("role", "customer");

  const title = "Quote expiring soon";
  const body = `Your quote for ${quote.projects?.name || "your project"} is expiring soon.`;
  const payload = {
    title,
    body,
    quoteId,
    projectId: quote.project_id,
  };

  if (customers?.length) {
    await admin.from("notifications").insert(
      customers.map((c: any) => ({
        user_id: c.id,
        type: "quote_expiring",
        payload,
      })),
    );
  }

  await admin
    .from("quotes")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("id", quoteId);

  return NextResponse.json({ ok: true });
}
