"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import UploadToBucket from "@/components/UploadToBucket";
import { getSignedUrl } from "@/lib/storage";
import { useProfile } from "@/lib/useProfile";
import { canWriteProject } from "@/lib/roles";

export default function ProjectGallery({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("gallery_items")
      .select("id,file_path,caption")
      .eq("project_id", projectId);
    const withUrls = await Promise.all(
      (data || []).map(async (i: any) => ({
        ...i,
        url: i.file_path ? await getSignedUrl("gallery", i.file_path) : null,
      })),
    );
    setItems(withUrls || []);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const onUploaded = async (path: string) => {
    await supabase.from("gallery_items").insert({ project_id: projectId, file_path: path });
    load();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      {canWriteProject(profile?.role) && (
        <UploadToBucket bucket="gallery" onUploaded={onUploaded} />
      )}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((i) => (
          <div key={i.id} className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
            {i.url ? (
              <img src={i.url} alt={i.caption || "Gallery"} className="h-32 w-full object-cover" />
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-white/60">
                No preview
              </div>
            )}
            <div className="p-2 text-xs text-white/60 truncate">{i.caption || i.file_path}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
