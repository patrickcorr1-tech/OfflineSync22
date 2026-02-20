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

  const { companyName } = await req.json();
  const name = (companyName || "").trim();
  if (!name) return NextResponse.json({ error: "Missing company name" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: existing } = await admin.from("companies").select("id").eq("name", name).single();
  let companyId = existing?.id;

  if (!companyId) {
    const { data: created, error: createErr } = await admin
      .from("companies")
      .insert({ name })
      .select("id")
      .single();
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
    companyId = created?.id;
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, email: user.email, role: "customer", company_id: companyId });
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, companyId });
}
