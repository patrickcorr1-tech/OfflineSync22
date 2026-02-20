import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, channel, subject, body } = await req.json();
  if (!name || !body) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data, error } = await supabase
    .from("message_templates")
    .insert({
      name,
      channel: channel || "email",
      subject: subject || null,
      body,
      created_by: user.user.id,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
