import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { token, status, comment } = await req.json();
  if (!token || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: approval } = await admin
    .from("approvals")
    .select("id,project_id,type")
    .eq("approval_token", token)
    .single();
  if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });

  await admin
    .from("approvals")
    .update({ status, comment: comment || null, approved_via: "whatsapp" })
    .eq("id", approval.id);

  const { data: staff } = await admin.from("profiles").select("id").in("role", ["admin", "sales"]);
  if (staff?.length) {
    const payload = {
      title: `Approval ${status}`,
      body: `Customer ${status} approval: ${approval.type}`,
      projectId: approval.project_id,
    };

    await admin.from("notifications").insert(
      staff.map((s: any) => ({
        user_id: s.id,
        type: "approval_response",
        payload,
      })),
    );

    await admin.from("inbox_messages").insert(
      staff.map((s: any) => ({
        channel: "system",
        from_name: "FencingHub",
        subject: payload.title,
        body: payload.body,
        status: "new",
        priority: "normal",
        project_id: approval.project_id,
        assigned_to: null,
      })),
    );
  }

  return NextResponse.json({ ok: true });
}
