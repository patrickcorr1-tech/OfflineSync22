import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, companyName } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: staff } = await admin.from("profiles").select("id").in("role", ["admin", "sales"]);

  const subject = "New signup request";
  const body = `Signup request from ${email}${companyName ? ` (Company: ${companyName})` : ""}.`;

  if (staff?.length) {
    await admin.from("notifications").insert(
      staff.map((s: any) => ({
        user_id: s.id,
        type: "signup_request",
        payload: { title: subject, body },
      })),
    );

    await admin.from("inbox_messages").insert(
      staff.map((s: any) => ({
        channel: "system",
        from_name: "FencingHub",
        subject,
        body,
        status: "new",
        priority: "normal",
        assigned_to: null,
      })),
    );
  }

  return NextResponse.json({ ok: true });
}
