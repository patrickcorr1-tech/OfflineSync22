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
  if (!profile || profile.role === "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { approvalId, projectId, phone } = await req.json();
  if (!approvalId || !phone) {
    return NextResponse.json({ error: "Missing approvalId or phone" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: approval, error } = await admin
    .from("approvals")
    .select("id,type,project_id,approval_token,status")
    .eq("id", approvalId)
    .single();
  if (error || !approval)
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });

  const token = approval.approval_token || crypto.randomUUID();
  await admin
    .from("approvals")
    .update({
      approval_token: token,
      whatsapp_phone: phone,
      whatsapp_sent_at: new Date().toISOString(),
    })
    .eq("id", approvalId);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const link = `${appUrl}/approvals/${token}`;
  const text = `Approval needed: ${approval.type} for project ${projectId || approval.project_id}. Review and respond here: ${link}`;
  const waLink = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

  return NextResponse.json({ waLink, link });
}
