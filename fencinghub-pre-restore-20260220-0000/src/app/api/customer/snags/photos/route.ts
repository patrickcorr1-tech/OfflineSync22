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
  const snagId = form.get("snagId") as string | null;
  if (!snagId) return NextResponse.json({ error: "Missing snagId" }, { status: 400 });

  const files = form.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ ok: true, uploaded: 0 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const uploadedPaths: string[] = [];
  for (const file of files) {
    const ext = file.type?.includes("png") ? "png" : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage.from("customer-uploads").upload(path, file);
    if (!error) uploadedPaths.push(path);
  }

  if (uploadedPaths.length) {
    await admin.from("snag_photos").insert(
      uploadedPaths.map((path) => ({
        snag_id: snagId,
        photo_url: path,
        file_path: path,
        created_by: user.id,
      })),
    );
  }

  return NextResponse.json({ ok: true, uploaded: uploadedPaths.length });
}
