"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import DashboardShell from "@/components/DashboardShell";
import { useProfile } from "@/lib/useProfile";
import {
  addOutboxItem,
  countOutboxItems,
  runOutboxSync,
  startOutboxAutoSync,
} from "@/lib/customerOutbox";

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
    const { data } = await supabase
      .from("projects")
      .select("id,name,status,address,updated_at")
      .order("created_at", { ascending: false });
    setProjects((data as Project[]) || []);
    setLoading(false);
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
      runOutboxSync(() => {
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
      await addOutboxItem({
        type: "customer_project",
        payload: {
          title: projectTitle,
          site_address: projectAddress,
          notes: projectNotes,
          materials: projectMaterials,
          preferred_date: preferredDate,
        },
        images: projectFiles,
        createdAt: Date.now(),
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
      await addOutboxItem({
        type: "customer_snag",
        payload: {
          project_id: snagProjectId,
          title: snagTitle,
          description: snagDescription,
        },
        images: snagFiles,
        createdAt: Date.now(),
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
        <div className="card p-4 mb-4">
          <div className="section-title">Customer tools</div>
          <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap sm:gap-3 text-sm">
            <a href="/projects/new" className="btn-primary text-center">
              New project
            </a>
            <a href="/quotes" className="btn-ghost text-center">
              Quotes
            </a>
            <span
              className={`rounded-full px-3 py-1 text-xs ${isOnline ? "bg-emerald-500/15 text-emerald-700" : "bg-orange-500/20 text-orange-700"}`}
            >
              {isOnline ? "Online" : "Offline ready"}
            </span>
            <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs text-slate-600">
              Pending sync: {syncCount}
            </span>
          </div>
          {feedback && <p className="mt-2 text-sm text-[var(--slate-500)]">{feedback}</p>}
          {draftSaved && !feedback && (
            <p className="mt-2 text-xs text-[var(--slate-500)]">Draft saved</p>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-white/60">Loading…</p>
      ) : (
        <div className="space-y-3">
          {projects.length === 0 && <p className="text-white/60 mt-2">No projects yet.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-[var(--slate-500)]">{p.address || "No address"}</p>
                    {profile?.role === "customer" && (
                      <p className="text-xs text-[var(--slate-500)] mt-1">
                        Last updated{" "}
                        {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                      </p>
                    )}
                  </div>
                  <span className="chip">
                    {profile?.role === "customer" ? statusLabel(p.status) : p.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
