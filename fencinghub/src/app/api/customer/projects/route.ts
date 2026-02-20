import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, site_address, notes, materials, preferred_date } = await req.json();
  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id,full_name,email")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) return NextResponse.json({ error: "No company" }, { status: 400 });

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name: title,
      address: site_address || null,
      materials: materials || null,
      preferred_date: preferred_date || null,
      notes: notes || null,
      status: "lead",
      company_id: profile.company_id,
      assigned_contractor_user_id: null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !project)
    return NextResponse.json({ error: error?.message || "Create failed" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const link = `${appUrl}/projects/${project.id}`;

  await supabase.from("activities").insert({
    project_id: project.id,
    user_id: user.id,
    type: "customer_project",
    payload: { title, site_address, notes, materials, preferred_date, link },
  });

  const to = process.env.RILEY_TO || "";
  if (to) {
    await supabase.from("email_events").insert({
      to_email: to,
      subject: `New customer project request — ${title}`,
      body: `A customer created a new project request.\n\nTitle: ${title}\nAddress: ${site_address || ""}\nNotes: ${notes || ""}\nMaterials: ${materials || ""}\nPreferred date: ${preferred_date || ""}\n\nView: ${link}`,
      metadata: { projectId: project.id, link },
    });
  }

  // notify admins/sales for bell notification
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (adminUrl && serviceKey) {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(adminUrl, serviceKey, { auth: { persistSession: false } });
    const { data: staff } = await admin
      .from("profiles")
      .select("id")
      .in("role", ["admin", "sales"]);
    const payload = { title, projectId: project.id, link };
    if (staff?.length) {
      await admin.from("notifications").insert(
        staff.map((s: any) => ({
          user_id: s.id,
          type: "customer_project",
          payload,
        })),
      );
    }
    // notify the customer too
    await admin.from("notifications").insert({
      user_id: user.id,
      type: "customer_project_submitted",
      payload,
    });
    // push to customer
    await fetch(`${appUrl}/api/notifications/project-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        type: "customer_project_submitted",
        title: "Request received",
        body: `Thanks — we’ve received “${title}”. We’ll keep you updated.`,
        audience: "customers",
        push: true,
      }),
    });
  }

  return NextResponse.json({ ok: true, projectId: project.id });
}
