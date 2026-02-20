import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const cutoff = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const { data: quotes, error } = await admin
    .from("quotes")
    .select("id, project_id, expires_at, reminder_sent_at, status, projects(name)")
    .lte("expires_at", cutoff)
    .is("reminder_sent_at", null)
    .in("status", ["sent", "viewed"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!quotes || quotes.length === 0) {
    return NextResponse.json({ ok: true, reminders: 0 });
  }

  const { data: staff } = await admin
    .from("profiles")
    .select("email")
    .in("role", ["admin", "sales"])
    .not("email", "is", null);

  const to = (staff || []).map((s: any) => s.email).filter(Boolean);

  for (const quote of quotes) {
    const project = Array.isArray(quote.projects) ? quote.projects[0] : quote.projects;
    const projectName = project?.name || "Project";
    const subject = `Quote expiring soon — ${projectName}`;
    const html = `<p>Quote for <strong>${projectName}</strong> expires within 5 days.</p>`;

    if (to.length) {
      await fetch(`${appUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html }),
      });
    }

    await fetch(`${appUrl}/api/notifications/project-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: quote.project_id,
        type: "quote_expiring",
        title: "Quote expiring",
        body: `${projectName} quote expires in 5 days.`,
        audience: "admins",
        push: true,
      }),
    });

    await admin
      .from("quotes")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", quote.id);
  }

  return NextResponse.json({ ok: true, reminders: quotes.length });
}
