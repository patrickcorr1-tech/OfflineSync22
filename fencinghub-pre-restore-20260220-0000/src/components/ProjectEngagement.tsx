"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";
import { enqueue } from "@/lib/offline";
import { addOutboxItem } from "@/lib/customerOutbox";
import { getSignedUrl } from "@/lib/storage";

const snagStatuses = ["open", "in_progress", "closed"] as const;
const quoteStatuses = ["new", "reviewing", "quoted", "closed"] as const;

type PhotoFile = {
  name: string;
  dataUrl: string;
};

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function ProjectEngagement({
  projectId,
  showStatus = true,
  showSnags = true,
  showQuoteRequests = true,
}: {
  projectId: string;
  showStatus?: boolean;
  showSnags?: boolean;
  showQuoteRequests?: boolean;
}) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const isCustomer = profile?.role === "customer";

  const [snags, setSnags] = useState<any[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [projectStatus, setProjectStatus] = useState<string>("");
  const [snagTitle, setSnagTitle] = useState("");
  const [snagDescription, setSnagDescription] = useState("");
  const [snagFiles, setSnagFiles] = useState<File[]>([]);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestFiles, setRequestFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [snagNotice, setSnagNotice] = useState<string | null>(null);

  const load = async () => {
    const { data: project } = await supabase
      .from("projects")
      .select("status")
      .eq("id", projectId)
      .single();
    setProjectStatus(project?.status || "");

    let snagQuery = supabase
      .from("snags")
      .select(
        "id,title,description,status,is_internal,created_at,snag_photos(id,file_path,photo_url)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (isCustomer) snagQuery = snagQuery.eq("is_internal", false);

    const { data: snagData } = await snagQuery;

    const withSnagUrls = await Promise.all(
      (snagData || []).map(async (snag: any) => ({
        ...snag,
        photos: await Promise.all(
          (snag.snag_photos || []).map(async (p: any) => ({
            ...p,
            url: p.photo_url
              ? await getSignedUrl("customer-uploads", p.photo_url)
              : p.file_path
                ? await getSignedUrl("snags", p.file_path)
                : null,
          })),
        ),
      })),
    );

    const { data: requestData } = await supabase
      .from("quote_requests")
      .select("id,title,details,status,created_at,quote_request_photos(id,file_path)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    const withRequestUrls = await Promise.all(
      (requestData || []).map(async (request: any) => ({
        ...request,
        photos: await Promise.all(
          (request.quote_request_photos || []).map(async (p: any) => ({
            ...p,
            url: p.file_path ? await getSignedUrl("quote-requests", p.file_path) : null,
          })),
        ),
      })),
    );

    setSnags(withSnagUrls);
    setQuoteRequests(withRequestUrls);
  };

  useEffect(() => {
    if (!projectId) return;
    load();
  }, [projectId]);

  const snagSummary = useMemo(() => {
    const open = snags.filter((s) => s.status !== "closed").length;
    return { total: snags.length, open };
  }, [snags]);

  const requestSummary = useMemo(() => {
    const open = quoteRequests.filter((r) => r.status !== "closed").length;
    return { total: quoteRequests.length, open };
  }, [quoteRequests]);

  const snagStatusLabel = (status: string) => {
    if (status === "in_progress") return "In progress";
    if (status === "closed") return "Resolved";
    return "Open";
  };

  const projectStep = (status: string) => {
    if (status === "approved") return 2;
    if (status === "in_progress") return 3;
    if (status === "completed") return 4;
    return 1; // lead/quoted/on_hold
  };

  const uploadFiles = async (bucket: string, files: File[], prefix: string) => {
    const paths: string[] = [];
    for (const file of files) {
      const path = `${prefix}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (!error) paths.push(path);
    }
    return paths;
  };

  const createSnag = async () => {
    if (!snagTitle.trim()) return;
    setSubmitting(true);
    setSnagNotice(null);
    try {
      if (isCustomer) {
        if (!navigator.onLine) {
          await addOutboxItem({
            type: "customer_snag",
            payload: { project_id: projectId, title: snagTitle, description: snagDescription },
            images: snagFiles,
            createdAt: Date.now(),
          });
          setSnagNotice("Saved offline – will submit when you're back online.");
        } else {
          const res = await fetch("/api/customer/snags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: projectId,
              title: snagTitle,
              description: snagDescription,
            }),
          });
          const data = await res.json();
          if (res.ok && snagFiles.length) {
            const form = new FormData();
            form.append("snagId", data.snagId);
            snagFiles.forEach((file) => form.append("files", file));
            await fetch("/api/customer/snags/photos", { method: "POST", body: form });
          }
          if (res.ok) setSnagNotice("Snag submitted.");
        }
      } else {
        if (!navigator.onLine) {
          const photos: PhotoFile[] = await Promise.all(
            snagFiles.map(async (file) => ({
              name: file.name,
              dataUrl: await readAsDataUrl(file),
            })),
          );
          await enqueue("snag", {
            project_id: projectId,
            title: snagTitle,
            description: snagDescription,
            photos,
          });
        } else {
          const { data: snag } = await supabase
            .from("snags")
            .insert({ project_id: projectId, title: snagTitle, description: snagDescription })
            .select("id")
            .single();

          if (snag?.id && snagFiles.length) {
            const paths = await uploadFiles("snags", snagFiles, projectId);
            if (paths.length) {
              await supabase.from("snag_photos").insert(
                paths.map((path) => ({
                  snag_id: snag.id,
                  file_path: path,
                })),
              );
            }
          }
          await fetch("/api/notifications/project-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              type: "snag_created",
              title: "New snag added",
              body: snagTitle,
              audience: "customers",
              push: true,
            }),
          });
        }
      }
      setSnagTitle("");
      setSnagDescription("");
      setSnagFiles([]);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const createQuoteRequest = async () => {
    if (!requestTitle.trim()) return;
    setSubmitting(true);
    try {
      if (!navigator.onLine) {
        const photos: PhotoFile[] = await Promise.all(
          requestFiles.map(async (file) => ({
            name: file.name,
            dataUrl: await readAsDataUrl(file),
          })),
        );
        await enqueue("quote_request", {
          project_id: projectId,
          title: requestTitle,
          details: requestDetails,
          photos,
        });
      } else {
        const { data: request } = await supabase
          .from("quote_requests")
          .insert({ project_id: projectId, title: requestTitle, details: requestDetails })
          .select("id")
          .single();

        if (request?.id && requestFiles.length) {
          const paths = await uploadFiles("quote-requests", requestFiles, projectId);
          if (paths.length) {
            await supabase.from("quote_request_photos").insert(
              paths.map((path) => ({
                quote_request_id: request.id,
                file_path: path,
              })),
            );
          }
        }
      }
      setRequestTitle("");
      setRequestDetails("");
      setRequestFiles([]);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const updateSnagStatus = async (id: string, status: string) => {
    await supabase.from("snags").update({ status }).eq("id", id);
    await fetch("/api/notifications/project-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        type: "snag_status",
        title: "Snag status updated",
        body: status,
        audience: "customers",
        push: true,
      }),
    });
    load();
  };

  const updateRequestStatus = async (id: string, status: string) => {
    await supabase.from("quote_requests").update({ status }).eq("id", id);
    load();
  };

  return (
    <div className={isCustomer ? "space-y-4 sm:space-y-6" : "grid gap-6 lg:grid-cols-3"}>
      <div className={isCustomer ? "space-y-4 sm:space-y-6" : "lg:col-span-2 space-y-6"}>
        {showStatus && isCustomer && (
          <div className="card p-4">
            <div className="section-title">Next step</div>
            <div className="mt-2 text-sm text-[var(--slate-500)]">
              {projectStatus === "completed"
                ? "Project complete — thank you!"
                : projectStatus === "in_progress"
                  ? "Work is in progress. We’ll keep you updated."
                  : projectStatus === "approved"
                    ? "Approved — scheduling is next."
                    : "We’re reviewing your request."}
            </div>
            <div className="mt-4 flex items-center gap-3">
              {["Submitted", "Approved", "In progress", "Complete"].map((label, idx) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${projectStep(projectStatus) > idx ? "bg-emerald-500" : "bg-slate-200"}`}
                  />
                  <span className="text-xs text-[var(--slate-500)] hidden sm:inline">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {showSnags && (
          <div className="card p-4 sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="section-title">Snag tracker</div>
                <h2 className="mt-2 text-xl font-semibold">Report snags and track fixes</h2>
                <p className="mt-2 text-sm text-[var(--slate-500)]">
                  Share issues with photos so the team can respond quickly.
                </p>
              </div>
              {isCustomer && (
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <a href="#snag-form" className="btn-primary w-full sm:w-auto text-center">
                    Report an issue
                  </a>
                  <a href="#snag-form" className="btn-ghost w-full sm:w-auto text-center">
                    Upload photos
                  </a>
                </div>
              )}
              <div className="flex gap-4 text-sm text-[var(--slate-500)]">
                <span>{snagSummary.open} open</span>
                <span>{snagSummary.total} total</span>
              </div>
            </div>

            <div id="snag-form" className="mt-4 grid gap-3">
              <input
                className="rounded-xl border border-slate-200 px-4 py-2"
                placeholder="Snag summary"
                value={snagTitle}
                onChange={(e) => setSnagTitle(e.target.value)}
              />
              <textarea
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
                rows={3}
                placeholder="Describe the issue and location"
                value={snagDescription}
                onChange={(e) => setSnagDescription(e.target.value)}
              />
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setSnagFiles(Array.from(e.target.files || []))}
              />
              {snagFiles.length > 0 && (
                <p className="text-xs text-[var(--slate-500)]">
                  {snagFiles.length} photo{snagFiles.length === 1 ? "" : "s"} ready to upload
                </p>
              )}
              <button
                className="btn-primary w-full sm:w-fit"
                onClick={createSnag}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Submit snag"}
              </button>
              {snagNotice && <p className="text-xs text-[var(--slate-500)]">{snagNotice}</p>}
            </div>

            <div className="mt-6 space-y-3">
              {snags.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-[var(--slate-500)]">
                  No snags yet. Submissions will appear here.
                </div>
              )}
              {snags.map((snag) => (
                <div key={snag.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm sm:text-base font-semibold">{snag.title}</div>
                      {snag.description && (
                        <div className="text-xs text-[var(--slate-500)] mt-1">
                          {snag.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {isCustomer ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 uppercase tracking-wide">
                          {snagStatusLabel(snag.status)}
                        </span>
                      ) : (
                        <select
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          value={snag.status}
                          onChange={(e) => updateSnagStatus(snag.id, e.target.value)}
                        >
                          {snagStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  {snag.photos?.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {snag.photos.map((photo: any) => (
                        <div key={photo.id} className="group relative">
                          <img
                            src={photo.url}
                            alt="Snag photo"
                            className="h-20 sm:h-24 w-full rounded-lg object-cover"
                          />
                          {photo.url && (
                            <a
                              href={photo.url}
                              download
                              className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow"
                            >
                              Download
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showQuoteRequests && (
          <div className="card p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="section-title">Quote requests</div>
                <h2 className="mt-2 text-xl font-semibold">Request a new quote or change</h2>
                <p className="mt-2 text-sm text-[var(--slate-500)]">
                  Ask for pricing updates, add-ons, or scope changes. Attach photos for clarity.
                </p>
              </div>
              <div className="flex gap-4 text-sm text-[var(--slate-500)]">
                <span>{requestSummary.open} active</span>
                <span>{requestSummary.total} total</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                className="rounded-xl border border-slate-200 px-4 py-2"
                placeholder="Request summary"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
              />
              <textarea
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
                rows={3}
                placeholder="Describe what needs quoting"
                value={requestDetails}
                onChange={(e) => setRequestDetails(e.target.value)}
              />
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setRequestFiles(Array.from(e.target.files || []))}
              />
              {requestFiles.length > 0 && (
                <p className="text-xs text-[var(--slate-500)]">
                  {requestFiles.length} photo{requestFiles.length === 1 ? "" : "s"} ready to upload
                </p>
              )}
              <button
                className="btn-primary w-full sm:w-fit"
                onClick={createQuoteRequest}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Submit request"}
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {quoteRequests.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-[var(--slate-500)]">
                  No quote requests yet. Submissions will appear here.
                </div>
              )}
              {quoteRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold">{request.title}</div>
                      {request.details && (
                        <div className="text-xs text-[var(--slate-500)] mt-1">
                          {request.details}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {isCustomer ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 uppercase tracking-wide">
                          {request.status}
                        </span>
                      ) : (
                        <select
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          value={request.status}
                          onChange={(e) => updateRequestStatus(request.id, e.target.value)}
                        >
                          {quoteStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  {request.photos?.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {request.photos.map((photo: any) => (
                        <img
                          key={photo.id}
                          src={photo.url}
                          alt="Request photo"
                          className="h-24 w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isCustomer && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="section-title">Engagement overview</div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-widest text-[var(--slate-500)]">
                  Open snags
                </div>
                <div className="mt-2 text-2xl font-semibold">{snagSummary.open}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-widest text-[var(--slate-500)]">
                  Active quote requests
                </div>
                <div className="mt-2 text-2xl font-semibold">{requestSummary.open}</div>
              </div>
            </div>
          </div>
          <div className="card p-5 text-sm text-[var(--slate-500)]">
            <div className="section-title">Customer guidance</div>
            <p className="mt-3">
              Encourage customers to include close-up and wide-angle photos. Offline submissions are
              queued automatically and will sync once connectivity returns.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
