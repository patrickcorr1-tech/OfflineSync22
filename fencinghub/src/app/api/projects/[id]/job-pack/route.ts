import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { chromium } from "playwright";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id,name,address,status")
    .eq("id", id)
    .single();
  const { data: notes } = await supabase
    .from("project_notes")
    .select("content,created_at")
    .eq("project_id", id)
    .limit(5);
  const { data: snags } = await supabase
    .from("snags")
    .select("title,status")
    .eq("project_id", id)
    .limit(5);

  const html = `
  <html><head><style>
    body{font-family:Arial;padding:24px} h1{font-size:20px}
    .meta{color:#555;font-size:12px}
  </style></head><body>
    <h1>Job Pack: ${project?.name || "Project"}</h1>
    <div class="meta">Status: ${project?.status} | Address: ${project?.address || ""}</div>
    <h2>Latest Notes</h2>
    <ul>${(notes || []).map((n) => `<li>${n.content}</li>`).join("")}</ul>
    <h2>Open Snags</h2>
    <ul>${(snags || []).map((s) => `<li>${s.title} (${s.status})</li>`).join("")}</ul>
  </body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  const pdf = await page.pdf({ format: "A4" });
  await browser.close();

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=job-pack-${id}.pdf`,
    },
  });
}
