"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getSignedUrl } from "@/lib/storage";
import { useProfile } from "@/lib/useProfile";

export default function ProjectDetails({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [project, setProject] = useState<any | null>(null);
  const [photos, setPhotos] = useState<{ id: string; url: string | null }[]>([]);
  const [snagPhotos, setSnagPhotos] = useState<{ id: string; url: string | null }[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      const { data } = await supabase
        .from("projects")
        .select("name,address,materials,preferred_date,notes,internal_notes,created_at")
        .eq("id", projectId)
        .single();
      setProject(data || null);
      setInternalNotes(data?.internal_notes || "");

      const { data: photoRows } = await supabase
        .from("project_photos")
        .select("id,photo_url")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      const withUrls = await Promise.all(
        (photoRows || []).map(async (p: any) => {
          const raw = p.photo_url as string | null;
          const normalized = raw?.startsWith("customer-uploads/")
            ? raw.replace("customer-uploads/", "")
            : raw;
          return {
            id: p.id,
            url: normalized ? await getSignedUrl("customer-uploads", normalized) : null,
          };
        }),
      );
      setPhotos(withUrls.filter((p) => p.url));

      const { data: quoteRows } = await supabase
        .from("quotes")
        .select("id,file_path,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      const quotesWithUrls = await Promise.all(
        (quoteRows || []).map(async (q: any) => ({
          ...q,
          url: q.file_path ? await getSignedUrl("quotes", q.file_path) : null,
        })),
      );
      setQuotes(quotesWithUrls || []);

      const { data: snagIds } = await supabase
        .from("snags")
        .select("id")
        .eq("project_id", projectId);
      const { data: snagRows } = await supabase
        .from("snag_photos")
        .select("id,file_path,photo_url")
        .in(
          "snag_id",
          (snagIds || []).map((s: any) => s.id),
        );

      const snagWithUrls = await Promise.all(
        (snagRows || []).map(async (p: any) => {
          const raw = (p.photo_url || p.file_path) as string | null;
          if (!raw) return { id: p.id, url: null };
          if (p.photo_url) {
            const normalized = raw.startsWith("customer-uploads/")
              ? raw.replace("customer-uploads/", "")
              : raw;
            return { id: p.id, url: await getSignedUrl("customer-uploads", normalized) };
          }
          return { id: p.id, url: await getSignedUrl("snags", raw) };
        }),
      );
      setSnagPhotos(snagWithUrls.filter((p) => p.url));
    };
    load();
  }, [projectId]);

  if (!project) return null;

  return (
    <div className="card p-4 mb-6">
      <div className="section-title">Project details</div>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
            Title
          </div>
          <div className="mt-1 font-medium text-[var(--slate-900)]">{project.name}</div>
        </div>
        {project.address && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
              Address
            </div>
            <div className="mt-1 font-medium text-[var(--slate-900)]">{project.address}</div>
          </div>
        )}
        {project.materials && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
              Materials
            </div>
            <div className="mt-1 font-medium text-[var(--slate-900)]">{project.materials}</div>
          </div>
        )}
        {project.preferred_date && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
              Required by
            </div>
            <div className="mt-1 font-medium text-[var(--slate-900)]">
              {new Date(project.preferred_date).toLocaleDateString()}
            </div>
          </div>
        )}
        {project.notes && (
          <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
              Customer notes
            </div>
            <div className="mt-1 text-[var(--slate-900)] whitespace-pre-wrap">{project.notes}</div>
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
          Customer photos
        </div>
        {photos.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="group relative">
                <img
                  src={p.url || ""}
                  alt="Project upload"
                  className="rounded-xl border border-white/10 object-cover"
                />
                {p.url && (
                  <a
                    href={p.url}
                    download
                    className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-slate-700 shadow"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--slate-500)]">No project photos uploaded yet.</p>
        )}
      </div>

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
          Snag photos
        </div>
        {snagPhotos.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {snagPhotos.map((p) => (
              <div key={p.id} className="group relative">
                <img
                  src={p.url || ""}
                  alt="Snag upload"
                  className="rounded-xl border border-white/10 object-cover"
                />
                {p.url && (
                  <a
                    href={p.url}
                    download
                    className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-slate-700 shadow"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--slate-500)]">No snag photos uploaded yet.</p>
        )}
      </div>

      {profile?.role && ["admin", "sales"].includes(profile.role) && (
        <div className="mt-6 space-y-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
              Quotes uploaded
            </div>
            {quotes.length > 0 ? (
              <div className="mt-2 space-y-2">
                {quotes.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-2 text-xs"
                  >
                    <span className="truncate">{q.file_path}</span>
                    <div className="flex gap-2">
                      {q.url && (
                        <a
                          className="rounded-lg border border-slate-200 px-2 py-1"
                          href={q.url}
                          target="_blank"
                        >
                          View
                        </a>
                      )}
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1"
                        onClick={async () => {
                          await fetch("/api/quotes/delete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ quoteId: q.id }),
                          });
                          setQuotes((prev) => prev.filter((x) => x.id !== q.id));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--slate-500)]">No quotes uploaded yet.</p>
            )}

            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
                Quote upload
              </div>
              <div className="mt-2 rounded-xl border border-slate-200 p-3">
                <input type="file" onChange={(e) => setQuoteFile(e.target.files?.[0] || null)} />
                {quoteFile && (
                  <p className="mt-2 text-xs text-[var(--slate-500)]">Selected: {quoteFile.name}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
              Internal notes (staff only)
            </div>
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={4}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add internal notes for staff..."
            />
          </div>

          <button
            className="btn-primary"
            onClick={async () => {
              setSavingNotes(true);
              try {
                if (quoteFile) {
                  const path = `${Date.now()}-${quoteFile.name}`;
                  const { error } = await supabase.storage.from("quotes").upload(path, quoteFile);
                  if (!error) {
                    await supabase.from("quotes").insert({
                      project_id: projectId,
                      file_path: path,
                      status: "sent",
                      sent_at: new Date().toISOString(),
                    });
                    await fetch("/api/notifications/project-update", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        projectId,
                        type: "quote_uploaded",
                        title: "Quote uploaded",
                        body: quoteFile.name,
                        audience: "customers",
                        push: true,
                      }),
                    });
                  }
                  setQuoteFile(null);
                }
                await supabase
                  .from("projects")
                  .update({ internal_notes: internalNotes || null })
                  .eq("id", projectId);
                await fetch("/api/notifications/project-update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    projectId,
                    type: "internal_note",
                    title: "Project notes updated",
                    body: internalNotes || "",
                    audience: "customers",
                    push: true,
                  }),
                });
                const { data: q } = await supabase
                  .from("quotes")
                  .select("id,file_path,created_at")
                  .eq("project_id", projectId)
                  .order("created_at", { ascending: false });
                const qWithUrls = await Promise.all(
                  (q || []).map(async (row: any) => ({
                    ...row,
                    url: row.file_path ? await getSignedUrl("quotes", row.file_path) : null,
                  })),
                );
                setQuotes(qWithUrls || []);
              } finally {
                setSavingNotes(false);
              }
            }}
            disabled={savingNotes}
          >
            {savingNotes ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}
