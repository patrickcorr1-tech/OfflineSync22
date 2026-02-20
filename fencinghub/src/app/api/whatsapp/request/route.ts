import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, full_name, email")
    .eq("id", user.user.id)
    .single();
  if (!profile?.company_id) return NextResponse.json({ error: "Missing company" }, { status: 400 });

  const { error } = await supabase.from("approvals").insert({
    project_id: null,
    type: "whatsapp_group",
    status: "pending",
    submitted_by: user.user.id,
    comment: `${profile.full_name || profile.email || "Customer"} requested WhatsApp group access.`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
