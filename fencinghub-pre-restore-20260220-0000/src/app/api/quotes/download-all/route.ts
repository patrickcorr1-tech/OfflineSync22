import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import archiver from "archiver";
import { PassThrough } from "stream";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "sales"].includes(profile.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return new Response("Server not configured", { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined;

  let q = admin
    .from("quotes")
    .select("id,file_path,project_id,projects(name)")
    .order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  const { data: quotes, error } = await q;
  if (error) return new Response(error.message, { status: 500 });

  const stream = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(stream);

  if (quotes && quotes.length) {
    for (const q of quotes) {
      if (!q.file_path) continue;
      const { data: file } = await admin.storage.from("quotes").download(q.file_path);
      if (!file) continue;
      const arrayBuffer = await file.arrayBuffer();
      const name = q.file_path.split("/").pop() || `${q.id}.pdf`;
      archive.append(Buffer.from(arrayBuffer), { name });
    }
  }

  archive.finalize();

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=quotes${projectId ? "-" + projectId : ""}.zip`,
    },
  });
}
