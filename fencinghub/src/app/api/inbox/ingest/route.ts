import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channel, from_name, from_email, subject, body, project_id, company_id } =
    await req.json();
  if (!channel) return NextResponse.json({ error: "Missing channel" }, { status: 400 });

  const { data, error } = await supabase
    .from("inbox_messages")
    .insert({ channel, from_name, from_email, subject, body, project_id, company_id })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}
