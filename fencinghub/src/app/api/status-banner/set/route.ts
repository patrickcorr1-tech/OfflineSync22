import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, level, active_to } = await req.json();
  if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

  const { data, error } = await supabase
    .from("status_banners")
    .insert({
      message,
      level: level || "info",
      active_to: active_to || null,
      created_by: user.user.id,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banner: data });
}
