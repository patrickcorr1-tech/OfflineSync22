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
  const processedIds: number[] = [];
  const failed: { id?: number; error: string }[] = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const cookie = req.headers.get("cookie") || "";

  const uploadFromDataUrl = async (bucket: string, path: string, dataUrl: string) => {
    const base64 = dataUrl.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: dataUrl.split(";")[0]?.replace("data:", ""),
    });
  };

  for (const item of items) {
    try {
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
          .insert({ status: "open", is_internal: false, ...payload, created_by: user.id })
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

      if (item.type === "snag_status") {
        await supabase
          .from("snags")
          .update({ status: item.payload.status })
          .eq("id", item.payload.id);
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

      if (item.type === "customer_project") {
        const { photos = [], ...payload } = item.payload || {};
        const res = await fetch(`${appUrl}/api/customer/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({
            title: payload.title,
            site_address: payload.site_address,
            notes: payload.notes,
            materials: payload.materials,
            preferred_date: payload.preferred_date,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create failed");

        const projectId = data.projectId as string;
        if (photos.length) {
          await Promise.all(
            photos.map(async (photo: any, index: number) => {
              const filename = photo.name || `customer-${Date.now()}-${index}`;
              const path = `${user.id}/${Date.now()}-${filename}`;
              await uploadFromDataUrl("customer-uploads", path, photo.dataUrl);
              await supabase
                .from("project_photos")
                .insert({ project_id: projectId, photo_url: path });
            }),
          );
        }
      }

      if (item.type === "customer_snag") {
        const { photos = [], ...payload } = item.payload || {};
        const res = await fetch(`${appUrl}/api/customer/snags`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({
            project_id: payload.project_id,
            title: payload.title,
            description: payload.description,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create failed");

        const snagId = data.snagId as string;
        if (photos.length) {
          await Promise.all(
            photos.map(async (photo: any, index: number) => {
              const filename = photo.name || `snag-${Date.now()}-${index}`;
              const path = `${payload.project_id}/${Date.now()}-${filename}`;
              await uploadFromDataUrl("snags", path, photo.dataUrl);
              await supabase.from("snag_photos").insert({
                snag_id: snagId,
                file_path: path,
                created_by: user.id,
              });
            }),
          );
        }
      }

      if (item.id) processedIds.push(item.id);
    } catch (error: any) {
      failed.push({ id: item.id, error: error?.message || "Unknown error" });
    }
  }

  return NextResponse.json({ ok: failed.length === 0, processedIds, failed });
}
