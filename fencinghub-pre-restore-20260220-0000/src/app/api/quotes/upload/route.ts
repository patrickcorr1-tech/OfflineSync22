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

  const form = await req.formData();
  const projectId = form.get("projectId")?.toString();
  const file = form.get("file") as File | null;
  if (!projectId || !file)
    return NextResponse.json({ error: "Missing projectId or file" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const project = await admin.from("projects").select("name").eq("id", projectId).single();
  const projectName = project.data?.name || "Project";
  const date = new Date().toISOString().slice(0, 10);
  const safeProject = projectName.replace(/[^a-z0-9-_]+/gi, "-");
  const originalName = (file.name || "quote.pdf").replace(/\.[^/.]+$/, "");
  const safeOriginal = originalName.replace(/[^a-z0-9-_]+/gi, "-");
  const path = `My Quotes/${safeProject}-${safeOriginal}-${date}.pdf`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from("quotes")
    .upload(path, Buffer.from(arrayBuffer), { contentType: "application/pdf", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { error: insErr } = await admin.from("quotes").insert({
    project_id: projectId,
    file_path: path,
    status: "sent",
    sent_at: new Date().toISOString(),
    created_by: user.id,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
}
