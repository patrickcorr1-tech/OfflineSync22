"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { enqueueOutbox } from "@/lib/outbox";
import { getCachedMeasurements, setCachedMeasurements } from "@/lib/offlineCache";
import { useProfile } from "@/lib/useProfile";

type Run = {
  id: string;
  length: string;
  height: string;
  spacing: string;
  fenceType: string;
  notes: string;
};

type Point = {
  id: string;
  kind: "Gate" | "Corner" | "End";
  width: string;
  height: string;
  notes: string;
};

export default function ProjectMeasurements({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [items, setItems] = useState<any[]>([]);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);

  const [runs, setRuns] = useState<Run[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [notes, setNotes] = useState("");

  const [runLength, setRunLength] = useState("");
  const [runHeight, setRunHeight] = useState("");
  const [runSpacing, setRunSpacing] = useState("");
  const [runType, setRunType] = useState("");
  const [runNotes, setRunNotes] = useState("");

  const [pointKind, setPointKind] = useState<Point["kind"]>("Gate");
  const [pointWidth, setPointWidth] = useState("");
  const [pointHeight, setPointHeight] = useState("");
  const [pointNotes, setPointNotes] = useState("");

  const load = async () => {
    try {
      const { data } = await supabase
        .from("measurements")
        .select("id,data,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      setItems(data || []);
      setCachedMeasurements(projectId, data || []);
    } catch {
      const cached = getCachedMeasurements<any[]>(projectId);
      if (cached?.value) setItems(cached.value);
    }
  };

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(`fh_measurement_draft_${projectId}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setRuns(parsed.runs || []);
          setPoints(parsed.points || []);
          setNotes(parsed.notes || "");
          setDraftStatus("Draft loaded");
        } catch {
          // ignore
        }
      }
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (runs.length === 0 && points.length === 0 && !notes) return;
    setDraftStatus("Saving draft...");
    const t = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `fh_measurement_draft_${projectId}`,
          JSON.stringify({ runs, points, notes }),
        );
        setDraftStatus("Draft saved");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [projectId, runs, points, notes]);

  const addRun = () => {
    if (!runLength.trim()) return;
    setRuns((prev) => [
      {
        id: crypto.randomUUID(),
        length: runLength,
        height: runHeight,
        spacing: runSpacing,
        fenceType: runType,
        notes: runNotes,
      },
      ...prev,
    ]);
    setRunLength("");
    setRunHeight("");
    setRunSpacing("");
    setRunType("");
    setRunNotes("");
  };

  const addPoint = () => {
    setPoints((prev) => [
      {
        id: crypto.randomUUID(),
        kind: pointKind,
        width: pointWidth,
        height: pointHeight,
        notes: pointNotes,
      },
      ...prev,
    ]);
    setPointWidth("");
    setPointHeight("");
    setPointNotes("");
  };

  const saveMeasurement = async () => {
    const payload = {
      type: "fencing_tool",
      runs,
      points,
      notes,
    };

    if (!navigator.onLine) {
      await enqueueOutbox("measurement", { project_id: projectId, data: payload });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`fh_measurement_draft_${projectId}`);
      }
      setDraftStatus(null);
      setItems((prev) => [{ id: `queued-${Date.now()}`, data: payload }, ...prev]);
      setRuns([]);
      setPoints([]);
      setNotes("");
      return;
    }

    await supabase.from("measurements").insert({ project_id: projectId, data: payload });

    await fetch("/api/notify/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title: "New measurements submitted",
        body: "Customer submitted measurements for this project.",
      }),
    });

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`fh_measurement_draft_${projectId}`);
    }
    setDraftStatus(null);
    setRuns([]);
    setPoints([]);
    setNotes("");
    load();
  };

  const isCustomer = profile?.role === "customer";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 panel p-5">
        <div className="section-title">Fencing tool (offline)</div>
        <p className="mt-2 text-sm text-white/60">
          Add runs and points while on site. Works offline and syncs when you reconnect.
        </p>

        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">Add run</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
                placeholder="Length (m)"
                value={runLength}
                onChange={(e) => setRunLength(e.target.value)}
              />
              <input
                className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
                placeholder="Height (m)"
                value={runHeight}
                onChange={(e) => setRunHeight(e.target.value)}
              />
              <input
                className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
                placeholder="Post spacing (m)"
                value={runSpacing}
                onChange={(e) => setRunSpacing(e.target.value)}
              />
              <input
                className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
                placeholder="Fence type (e.g. featheredge)"
                value={runType}
                onChange={(e) => setRunType(e.target.value)}
              />
            </div>
            <textarea
              className="mt-3 w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
              placeholder="Notes (optional)"
              value={runNotes}
              onChange={(e) => setRunNotes(e.target.value)}
              rows={2}
            />
            <button className="mt-3 btn-primary" onClick={addRun}>
              Add run
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">Add point</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Gate", "Corner", "End"].map((kind) => (
                <button
                  key={kind}
                  className={
                    pointKind === kind
                      ? "btn-primary"
                      : "rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60"
                  }
                  onClick={() => setPointKind(kind as Point["kind"])}
                >
                  {kind}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
                placeholder="Width (m)"
                value={pointWidth}
                onChange={(e) => setPointWidth(e.target.value)}
              />
              <input
                className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
                placeholder="Height (m)"
                value={pointHeight}
                onChange={(e) => setPointHeight(e.target.value)}
              />
            </div>
            <textarea
              className="mt-3 w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
              placeholder="Notes (optional)"
              value={pointNotes}
              onChange={(e) => setPointNotes(e.target.value)}
              rows={2}
            />
            <button className="mt-3 btn-primary" onClick={addPoint}>
              Add point
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">Summary</div>
            <div className="mt-3 grid gap-2 text-sm text-white/70">
              <div>Runs: {runs.length}</div>
              <div>Points: {points.length}</div>
            </div>
            <textarea
              className="mt-3 w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
              placeholder="Overall notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
            {draftStatus && <p className="mt-2 text-xs text-emerald-400">{draftStatus}</p>}
            {isCustomer && (
              <button className="mt-3 btn-primary w-full" onClick={saveMeasurement}>
                Save measurements
              </button>
            )}
            {!isCustomer && (
              <p className="mt-3 text-xs text-white/50">
                Customers save measurements here. Admins can view history on the right.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <div className="section-title">History</div>
        <div className="mt-3 space-y-2 text-xs text-white/60">
          {items.map((m) => (
            <div key={m.id} className="rounded-xl border border-white/10 p-3 bg-black/30">
              <div className="flex items-center justify-between">
                <span>Fencing tool</span>
                <span className="text-white/50">
                  {m.created_at ? new Date(m.created_at).toLocaleDateString() : ""}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-white/50">
                Runs: {m.data?.runs?.length || 0} · Points: {m.data?.points?.length || 0}
              </div>
              {m.data?.notes && (
                <div className="mt-2 text-[11px] text-white/60">Notes: {m.data.notes}</div>
              )}
            </div>
          ))}
          {items.length === 0 && <div className="text-white/40">No measurements yet.</div>}
        </div>
      </div>
    </div>
  );
}
