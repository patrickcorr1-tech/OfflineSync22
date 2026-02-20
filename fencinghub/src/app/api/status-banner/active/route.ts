import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("status_banners")
    .select("message, level, active_from, active_to")
    .lte("active_from", new Date().toISOString())
    .or(`active_to.is.null,active_to.gte.${new Date().toISOString()}`)
    .order("active_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ banner: data || null });
}
