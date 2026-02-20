"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getSignedUrl } from "@/lib/storage";
import { useProfile } from "@/lib/useProfile";

export default function ProjectChecklist({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const isStaff = ["admin", "sales", "contractor"].includes(profile?.role || "");
  const canUpload = !!profile?.role;
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("project_checklist_items")
      .select(
        "id,title,is_done,sort_order,requires_photo,project_checklist_photos(id,file_path,photo_url)",
      )
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const withUrls = await Promise.all(
      (data || []).map(async (item: any) => {
        const photos = await Promise.all(
          (item.project_checklist_photos || []).map(async (p: any) => {
            const raw = p.file_path || p.photo_url;
            if (!raw) return { ...p, url: null };
            if (p.photo_url) {
              const normalized = raw.startsWith("customer-uploads/")
                ? raw.replace("customer-uploads/", "")
                : raw;
              return { ...p, url: await getSignedUrl("customer-uploads", normalized) };
            }
            return { ...p, url: await getSignedUrl("checklist-photos", raw) };
          }),
        );
        return { ...item, photos };
      }),
    );
    setItems(withUrls || []);
  };

  useEffect(() => {
    if (!projectId) return;
    load();
  }, [projectId]);

  const add = async () => {
    if (!title.trim()) return;
    await supabase.from("project_checklist_items").insert({
      project_id: projectId,
      title,
      requires_photo: requiresPhoto,
      created_by: profile?.id,
      sort_order: items.length + 1,
    });
    setTitle("");
    setRequiresPhoto(false);
    load();
  };

  const toggle = async (id: string, is_done: boolean) => {
    await supabase.from("project_checklist_items").update({ is_done }).eq("id", id);
    load();
  };

  const uploadPhoto = async (itemId: string, file: File) => {
    setUploadingId(itemId);
    try {
      const path = `project-checklist/${projectId}/${itemId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("checklist-photos").upload(path, file);
      if (!error) {
        await supabase.from("project_checklist_photos").insert({
          checklist_item_id: itemId,
          file_path: path,
          created_by: profile?.id,
        });
      }
      await load();
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="card p-4">
      <div className="section-title">Checklist</div>
      <div className="mt-3 space-y-2 text-sm">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-3 text-[var(--slate-500)]">
            No checklist items yet.
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={item.is_done}
                onChange={(e) => toggle(item.id, e.target.checked)}
                disabled={!isStaff}
              />
              <span className={item.is_done ? "line-through text-[var(--slate-500)]" : ""}>
                {item.title}
              </span>
            </label>

            {item.requires_photo && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
                  Photos
                </div>
                {item.photos?.length ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {item.photos.map((p: any) => (
                      <img
                        key={p.id}
                        src={p.url || ""}
                        alt="Checklist"
                        className="rounded-lg border border-slate-200 object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-[var(--slate-500)]">No photos yet.</div>
                )}
                {canUpload && (
                  <div className="mt-2">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPhoto(item.id, file);
                      }}
                      disabled={uploadingId === item.id}
                    />
                    {uploadingId === item.id && (
                      <div className="mt-1 text-xs text-[var(--slate-500)]">Uploading...</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {isStaff && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Add checklist item"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-[var(--slate-500)]">
            <input
              type="checkbox"
              checked={requiresPhoto}
              onChange={(e) => setRequiresPhoto(e.target.checked)}
            />
            Requires photo
          </label>
          <button className="btn-primary" onClick={add}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}
