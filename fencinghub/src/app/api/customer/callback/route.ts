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

  const { phone, notes } = await req.json();
  if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, full_name, email")
    .eq("id", user.id)
    .single();
  if (!profile?.company_id) return NextResponse.json({ error: "Missing company" }, { status: 400 });

  const { error } = await supabase.from("customer_callback_requests").insert({
    company_id: profile.company_id,
    requested_by: user.id,
    phone,
    notes: notes || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: staff } = await admin.from("profiles").select("id").in("role", ["admin", "sales"]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const payload = {
    title: "Callback requested",
    body: `${profile.full_name || profile.email || "Customer"} requested a call back. Phone: ${phone}`,
    link: `${appUrl}/admin/customers`,
  };

  if (staff?.length) {
    await admin.from("notifications").insert(
      staff.map((s: any) => ({
        user_id: s.id,
        type: "callback_request",
        payload,
      })),
    );
  }

  return NextResponse.json({ ok: true });
}
