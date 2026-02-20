import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const { data } = await admin
    .from("status_banners")
    .select("id,message,level,active_from,active_to")
    .lte("active_from", now)
    .or(`active_to.is.null,active_to.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(1);

  return NextResponse.json({ banner: data?.[0] || null });
}
