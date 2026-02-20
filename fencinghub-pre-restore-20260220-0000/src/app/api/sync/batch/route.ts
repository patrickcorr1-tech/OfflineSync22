import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const items = body?.items || [];

  const uploadFromDataUrl = async (bucket: string, path: string, dataUrl: string) => {
    const base64 = dataUrl.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: dataUrl.split(";")[0]?.replace("data:", ""),
    });
  };

  for (const item of items) {
    if (item.type === "note") {
      await supabase.from("project_notes").insert(item.payload);
    }
    if (item.type === "measurement") {
      const payload =
        typeof item.payload.data === "string" ? JSON.parse(item.payload.data) : item.payload.data;
      await supabase
        .from("measurements")
        .insert({ project_id: item.payload.project_id, data: payload });
    }
    if (item.type === "snag") {
      const { photos = [], ...payload } = item.payload || {};
      const { data: snag } = await supabase
        .from("snags")
        .insert({ ...payload, created_by: user.id })
        .select("id")
        .single();
      if (snag?.id && photos.length) {
        await Promise.all(
          photos.map(async (photo: any, index: number) => {
            const filename = photo.name || `snag-${Date.now()}-${index}`;
            const path = `${payload.project_id}/${Date.now()}-${filename}`;
            await uploadFromDataUrl("snags", path, photo.dataUrl);
            await supabase.from("snag_photos").insert({
              snag_id: snag.id,
              file_path: path,
              created_by: user.id,
            });
          }),
        );
      }
    }
    if (item.type === "quote_request") {
      const { photos = [], ...payload } = item.payload || {};
      const { data: request } = await supabase
        .from("quote_requests")
        .insert({ ...payload, created_by: user.id })
        .select("id")
        .single();
      if (request?.id && photos.length) {
        await Promise.all(
          photos.map(async (photo: any, index: number) => {
            const filename = photo.name || `quote-${Date.now()}-${index}`;
            const path = `${payload.project_id}/${Date.now()}-${filename}`;
            await uploadFromDataUrl("quote-requests", path, photo.dataUrl);
            await supabase.from("quote_request_photos").insert({
              quote_request_id: request.id,
              file_path: path,
              created_by: user.id,
            });
          }),
        );
      }
    }
  }

  return NextResponse.json({ ok: true, processed: items.length });
}
