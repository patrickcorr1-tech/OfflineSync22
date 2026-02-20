import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project_id, title, description } = await req.json();
  if (!project_id || !title) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id,full_name,email")
    .eq("id", user.id)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("id,name,company_id")
    .eq("id", project_id)
    .single();

  if (!project || !profile?.company_id || project.company_id !== profile.company_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: snag, error } = await supabase
    .from("snags")
    .insert({
      project_id,
      title,
      description: description || null,
      status: "open",
      is_internal: false,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !snag)
    return NextResponse.json({ error: error?.message || "Create failed" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const link = `${appUrl}/projects/${project_id}`;

  await supabase.from("activities").insert({
    project_id,
    user_id: user.id,
    type: "customer_snag",
    payload: { title, description, link },
  });

  const to = process.env.RILEY_TO || "";
  if (to) {
    await supabase.from("email_events").insert({
      to_email: to,
      subject: `New snag report — ${project.name || project_id}`,
      body: `A customer reported a snag.\n\nProject: ${project.name || project_id}\nTitle: ${title}\nDescription: ${description || ""}\n\nView: ${link}`,
      metadata: { projectId: project_id, snagId: snag.id, link },
    });
  }

  await fetch(`${appUrl}/api/notifications/project-update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: project_id,
      type: "customer_snag",
      title: "New snag submitted",
      body: title,
      audience: "admins",
      push: false,
    }),
  });

  return NextResponse.json({ ok: true, snagId: snag.id });
}
