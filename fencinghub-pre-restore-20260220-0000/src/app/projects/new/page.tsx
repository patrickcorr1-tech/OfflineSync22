"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { useProfile } from "@/lib/useProfile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { addOutboxItem, countOutboxItems, runOutboxSync } from "@/lib/customerOutbox";

export default function NewProjectPage() {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const router = useRouter();
  const [projectTitle, setProjectTitle] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [projectMaterials, setProjectMaterials] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => {
      setIsOnline(true);
      runOutboxSync(() => setSyncCount((c) => Math.max(c - 1, 0)));
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    countOutboxItems().then(setSyncCount);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const uploadCustomerImages = async (images: File[]) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [] as string[];
    const paths: string[] = [];
    for (const file of images) {
      const ext = file.type?.includes("png") ? "png" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("customer-uploads").upload(path, file);
      if (!error) paths.push(path);
    }
    return paths;
  };

  const submitProject = async () => {
    if (!projectTitle.trim()) {
      setFeedback("Please add a project title.");
      return;
    }
    setFeedback(null);
    setSubmitting(true);
    try {
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
        countOutboxItems().then(setSyncCount);
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
      const data = await res.json().catch(() => ({}));
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
        router.push("/projects");
      } else {
        setFeedback(`Submit failed: ${data?.error || res.statusText || "Unknown error"}`);
      }
    } catch (err: any) {
      setFeedback(`Submit failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (profile?.role !== "customer") {
    return (
      <DashboardShell title="New project" subtitle="Customers only">
        <div className="card p-4">Access denied.</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="New project"
      subtitle="Tell us what you need and upload photos if helpful"
    >
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 text-sm">
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

        <div className="mt-4 grid gap-3">
          <input
            className="rounded-xl bg-[#f1f5f9] px-4 py-2 text-sm"
            placeholder="Project title"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
          />
          <input
            className="rounded-xl bg-[#f1f5f9] px-4 py-2 text-sm"
            placeholder="Site address"
            value={projectAddress}
            onChange={(e) => setProjectAddress(e.target.value)}
          />
          <textarea
            className="rounded-xl bg-[#f1f5f9] px-4 py-2 text-sm"
            placeholder="Notes"
            value={projectNotes}
            onChange={(e) => setProjectNotes(e.target.value)}
          />
          <input
            className="rounded-xl bg-[#f1f5f9] px-4 py-2 text-sm"
            placeholder="Materials required (e.g., wood, chain link, metal)"
            value={projectMaterials}
            onChange={(e) => setProjectMaterials(e.target.value)}
          />
          <input
            type="date"
            className="rounded-xl bg-[#f1f5f9] px-4 py-2 text-sm"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
          />
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setProjectFiles(Array.from(e.target.files || []))}
          />
          {projectFiles.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {projectFiles.map((file, idx) => (
                <div key={idx} className="text-[10px] text-[var(--slate-500)]">
                  {file.name}
                </div>
              ))}
            </div>
          )}
          <button
            className="btn-primary w-full sm:w-fit"
            type="button"
            onClick={submitProject}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit project"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
