import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company_id, link, approval_id } = await req.json();
  if (!company_id || !link)
    return NextResponse.json({ error: "Missing company/link" }, { status: 400 });

  await supabase.from("companies").update({ whatsapp_group_link: link }).eq("id", company_id);

  if (approval_id) {
    await supabase
      .from("approvals")
      .update({
        status: "approved",
        decided_by: user.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", approval_id);
  }

  return NextResponse.json({ ok: true });
}
