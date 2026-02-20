import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "sales"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { quoteId } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("id,file_path,project_id,projects(name,customer_email)")
    .eq("id", quoteId)
    .single();
  if (qErr || !quote)
    return NextResponse.json({ error: qErr?.message || "Quote not found" }, { status: 404 });

  const project = Array.isArray(quote.projects) ? quote.projects[0] : quote.projects;
  const to = project?.customer_email;
  if (!to) return NextResponse.json({ error: "Customer email missing" }, { status: 400 });

  const { data: signed } = await admin.storage
    .from("quotes")
    .createSignedUrl(quote.file_path, 60 * 60);
  const link = signed?.signedUrl;
  if (!link) return NextResponse.json({ error: "Unable to sign quote" }, { status: 500 });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Quote ready — ${project?.name || "Project"}`,
    html: `<p>Your quote is ready for <strong>${project?.name || "your project"}</strong>.</p><p><a href="${link}">View/Download quote</a></p>`,
  });

  return NextResponse.json({ ok: true });
}
