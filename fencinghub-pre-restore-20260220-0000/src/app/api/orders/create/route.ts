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

  const { projectId, quoteId } = await req.json();
  if (!projectId || !quoteId) {
    return NextResponse.json({ error: "Missing projectId or quoteId" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Check access to project
  const { data: project } = await supabase
    .from("projects")
    .select("id,company_id")
    .eq("id", projectId)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const allowed =
    ["admin", "sales"].includes(profile.role) ||
    (profile.role === "customer" && profile.company_id === project.company_id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin
    .from("sales_orders")
    .insert({ project_id: projectId, quote_id: quoteId, created_by: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
