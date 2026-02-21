"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import DashboardShell from "@/components/DashboardShell";
import { useProfile } from "@/lib/useProfile";
import {
  enqueueOutbox,
  countOutboxItems,
  startOutboxAutoSync,
  syncOutbox,
  readFileAsDataUrl,
} from "@/lib/outbox";
import { getCachedProjects, setCachedProjects } from "@/lib/offlineCache";

type Project = {
  id: string;
  name: string;
  status: string;
  address: string | null;
  updated_at?: string | null;
};

const statusLabel = (status: string) => {
  if (status === "lead") return "In review";
  if (status === "quoted") return "Quoted";
  if (status === "approved") return "Approved";
  if (status === "in_progress") return "In progress";
  if (status === "completed") return "Complete";
  if (status === "on_hold") return "On hold";
  return status;
};

const statusPill = (status: string) => {
  if (status === "completed") return "bg-emerald-500/15 text-emerald-300";
  if (status === "in_progress") return "bg-blue-500/15 text-blue-300";
  if (status === "approved") return "bg-purple-500/15 text-purple-300";
  if (status === "quoted") return "bg-amber-500/15 text-amber-300";
  if (status === "on_hold") return "bg-slate-500/15 text-slate-300";
  return "bg-white/10 text-white/70";
};

export default function ProjectsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { profile } = useProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncCount, setSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const [projectTitle, setProjectTitle] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [projectMaterials, setProjectMaterials] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [snagProjectId, setSnagProjectId] = useState("");
  const [snagTitle, setSnagTitle] = useState("");
  const [snagDescription, setSnagDescription] = useState("");
  const [snagFiles, setSnagFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const load = async () => {
    try {
      const { data } = await supabase
        .from("projects")
        .select("id,name,status,address,updated_at")
        .order("created_at", { ascending: false });
      const list = (data as Project[]) || [];
      setProjects(list);
      setCachedProjects(list);
    } catch {
      const cached = getCachedProjects<Project[]>();
      if (cached?.value) setProjects(cached.value);
    } finally {
      setLoading(false);
    }
  };

  const refreshSyncCount = async () => {
    const count = await countOutboxItems();
    setSyncCount(count);
  };

  useEffect(() => {
    load();
    refreshSyncCount();
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const stop = startOutboxAutoSync(() => {
      load();
      refreshSyncCount();
      router.refresh();
    });
    const onOnline = () => {
      setIsOnline(true);
      syncOutbox().then(() => {
        load();
        refreshSyncCount();
        router.refresh();
      });
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // load drafts
    const draft = localStorage.getItem("customerDrafts");
    if (draft) {
      try {
        const d = JSON.parse(draft);
        setProjectTitle(d.projectTitle || "");
        setProjectAddress(d.projectAddress || "");
        setProjectNotes(d.projectNotes || "");
        setProjectMaterials(d.projectMaterials || "");
        setPreferredDate(d.preferredDate || "");
        setSnagTitle(d.snagTitle || "");
        setSnagDescription(d.snagDescription || "");
      } catch {}
    }

    return () => {
      stop?.();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const payload = {
      projectTitle,
      projectAddress,
      projectNotes,
      projectMaterials,
      preferredDate,
      snagTitle,
      snagDescription,
    };
    localStorage.setItem("customerDrafts", JSON.stringify(payload));
    setDraftSaved(true);
    const t = setTimeout(() => setDraftSaved(false), 1200);
    return () => clearTimeout(t);
  }, [
    projectTitle,
    projectAddress,
    projectNotes,
    projectMaterials,
    preferredDate,
    snagTitle,
    snagDescription,
  ]);

  const uploadCustomerImages = async (images: File[]) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [] as string[];
    const paths: string[] = [];
    for (const file of images) {
      const ext = file.type?.includes("png") ? "png" : "jpg";
      const path = `customer-uploads/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("customer-uploads").upload(path, file);
      if (!error) paths.push(path);
    }
    return paths;
  };

  const submitProject = async () => {
    if (!projectTitle.trim()) return;
    setFeedback(null);
    if (!navigator.onLine) {
      const photos = await Promise.all(
        projectFiles.map(async (file) => ({
          name: file.name,
          dataUrl: await readFileAsDataUrl(file),
        })),
      );
      await enqueueOutbox("customer_project", {
        title: projectTitle,
        site_address: projectAddress,
        notes: projectNotes,
        materials: projectMaterials,
        preferred_date: preferredDate,
        photos,
      });
      setFeedback("Saved offline – will submit when you're back online.");
      setProjectTitle("");
      setProjectAddress("");
      setProjectNotes("");
      setProjectMaterials("");
      setPreferredDate("");
      setProjectFiles([]);
      refreshSyncCount();
      return;
    }

    const res = await fetch("/api/customer/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: projectTitle,
        site_address: projectAddress,
        notes: projectNotes,
        materials: projectMaterials,
        preferred_date: preferredDate,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      const paths = await uploadCustomerImages(projectFiles);
      if (paths.length) {
        await supabase
          .from("project_photos")
          .insert(paths.map((photo_url) => ({ project_id: data.projectId, photo_url })));
      }
      setFeedback("✅ Submission received — we’ll review and update you shortly.");
      setProjectTitle("");
      setProjectAddress("");
      setProjectNotes("");
      setProjectMaterials("");
      setPreferredDate("");
      setProjectFiles([]);
      load();
      refreshSyncCount();
      router.refresh();
    } else {
      setFeedback(`Submit failed: ${data?.error || "Unknown error"}`);
    }
  };

  const submitSnag = async () => {
    if (!snagProjectId || !snagTitle.trim()) return;
    setFeedback(null);
    if (!navigator.onLine) {
      const photos = await Promise.all(
        snagFiles.map(async (file) => ({
          name: file.name,
          dataUrl: await readFileAsDataUrl(file),
        })),
      );
      await enqueueOutbox("customer_snag", {
        project_id: snagProjectId,
        title: snagTitle,
        description: snagDescription,
        photos,
      });
      setFeedback("Saved offline – will submit when you're back online.");
      setSnagTitle("");
      setSnagDescription("");
      setSnagFiles([]);
      refreshSyncCount();
      return;
    }

    const res = await fetch("/api/customer/snags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: snagProjectId,
        title: snagTitle,
        description: snagDescription,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      const paths = await uploadCustomerImages(snagFiles);
      if (paths.length) {
        await supabase
          .from("snag_photos")
          .insert(paths.map((photo_url) => ({ snag_id: data.snagId, photo_url })));
      }
      setFeedback("Snag report submitted.");
      setSnagTitle("");
      setSnagDescription("");
      setSnagFiles([]);
      load();
      refreshSyncCount();
      router.refresh();
    } else {
      setFeedback(`Submit failed: ${data?.error || "Unknown error"}`);
    }
  };

  return (
    <DashboardShell
      title="Projects"
      subtitle="Track every install, approval, and snag from one view."
    >
      {profile?.role === "customer" && (
        <div className="card p-5 mb-4">
          <div className="section-title">Customer tools</div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <a href="/projects/new" className="btn-primary text-center">
              New project
            </a>
            <a href="/quotes" className="btn-ghost text-center">
              Quotes
            </a>
            <span
              className={`rounded-full px-3 py-1 text-xs ${isOnline ? "bg-emerald-500/15 text-emerald-300" : "bg-orange-500/20 text-orange-300"}`}
            >
              {isOnline ? "Online" : "Offline ready"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              Pending sync: {syncCount}
            </span>
          </div>
          {feedback && <p className="mt-2 text-sm text-white/60">{feedback}</p>}
          {draftSaved && !feedback && <p className="mt-2 text-xs text-white/40">Draft saved</p>}
        </div>
      )}

      {loading ? (
        <p className="text-white/60">Loading…</p>
      ) : (
        <div className="space-y-3">
          {projects.length === 0 && <p className="text-white/60 mt-2">No projects yet.</p>}

          {profile?.role !== "customer" && projects.length > 0 && (
            <div className="hidden md:block rounded-2xl border border-white/10 bg-white/5">
              <div className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 border-b border-white/10 px-6 py-3 text-[10px] uppercase tracking-[0.3em] text-white/40">
                <span>Project</span>
                <span>Address</span>
                <span>Status</span>
                <span>Updated</span>
              </div>
              <div className="divide-y divide-white/5">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 px-6 py-4 text-sm hover:bg-white/5"
                  >
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-white/60">{p.address || "No address"}</div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${statusPill(p.status)}`}
                    >
                      {statusLabel(p.status)}
                    </span>
                    <div className="text-white/50">
                      {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-2 md:hidden">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-white/60">{p.address || "No address"}</p>
                    {profile?.role === "customer" && (
                      <p className="text-[10px] text-white/40 mt-1">
                        Updated {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${statusPill(p.status)}`}
                    >
                      {profile?.role === "customer" ? statusLabel(p.status) : p.status}
                    </span>
                    <span className="text-[10px] text-white/40">Open →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
