import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import archiver from "archiver";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const [quotesRes, invoicesRes, galleryRes, projectPhotosRes, snagPhotosRes, requestPhotosRes] =
    await Promise.all([
      admin.from("quotes").select("file_path").eq("project_id", projectId),
      admin.from("invoices").select("file_path").eq("project_id", projectId),
      admin.from("gallery_items").select("file_path").eq("project_id", projectId),
      admin.from("project_photos").select("photo_url").eq("project_id", projectId),
      admin
        .from("snag_photos")
        .select("file_path,photo_url,snag_id")
        .in(
          "snag_id",
          (await admin.from("snags").select("id").eq("project_id", projectId)).data?.map(
            (s: any) => s.id,
          ) || [],
        ),
      admin
        .from("quote_request_photos")
        .select("file_path,quote_request_id")
        .in(
          "quote_request_id",
          (await admin.from("quote_requests").select("id").eq("project_id", projectId)).data?.map(
            (q: any) => q.id,
          ) || [],
        ),
    ]);

  const files: { bucket: string; path: string; name: string }[] = [];

  (quotesRes.data || []).forEach(
    (q: any) =>
      q.file_path &&
      files.push({
        bucket: "quotes",
        path: q.file_path,
        name: q.file_path.split("/").pop() || "quote.pdf",
      }),
  );
  (invoicesRes.data || []).forEach(
    (i: any) =>
      i.file_path &&
      files.push({
        bucket: "invoices",
        path: i.file_path,
        name: i.file_path.split("/").pop() || "invoice.pdf",
      }),
  );
  (galleryRes.data || []).forEach(
    (g: any) =>
      g.file_path &&
      files.push({
        bucket: "gallery",
        path: g.file_path,
        name: g.file_path.split("/").pop() || "gallery",
      }),
  );
  (projectPhotosRes.data || []).forEach(
    (p: any) =>
      p.photo_url &&
      files.push({
        bucket: "customer-uploads",
        path: p.photo_url,
        name: p.photo_url.split("/").pop() || "photo.jpg",
      }),
  );
  (snagPhotosRes.data || []).forEach((p: any) => {
    const path = p.photo_url || p.file_path;
    if (path)
      files.push({
        bucket: p.photo_url ? "customer-uploads" : "snags",
        path,
        name: path.split("/").pop() || "snag.jpg",
      });
  });
  (requestPhotosRes.data || []).forEach(
    (p: any) =>
      p.file_path &&
      files.push({
        bucket: "quote-requests",
        path: p.file_path,
        name: p.file_path.split("/").pop() || "request.jpg",
      }),
  );

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("data", (chunk) => writer.write(chunk));
  archive.on("end", () => writer.close());
  archive.on("error", () => writer.close());

  for (const file of files) {
    const { data, error } = await admin.storage.from(file.bucket).download(file.path);
    if (error || !data) continue;
    const arrayBuffer = await data.arrayBuffer();
    archive.append(Buffer.from(arrayBuffer), { name: `${file.bucket}/${file.name}` });
  }

  archive.finalize();

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=project-${projectId}-files.zip`,
    },
  });
}
