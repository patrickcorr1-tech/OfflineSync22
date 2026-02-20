"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

const statusOptions = ["new", "triaged", "open", "waiting", "closed"];
const priorityOptions = ["low", "normal", "high", "urgent"];

export default function InboxPage() {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState("email");

  const isStaff = profile?.role && profile.role !== "customer";

  const load = async () => {
    const { data } = await supabase
      .from("inbox_messages")
      .select(
        "id,subject,channel,status,priority,sla_due_at,assigned_to,received_at,updated_at,project_id,company_id,companies(name),projects(name)",
      )
      .order("received_at", { ascending: false });
    setThreads(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isStaff) return;
    load();
  }, [isStaff]);

  const updateThread = async (id: string, patch: Record<string, any>) => {
    await supabase.from("inbox_messages").update(patch).eq("id", id);
    load();
  };

  const createThread = async () => {
    if (!subject.trim()) return;
    await supabase.from("inbox_messages").insert({
      subject,
      channel,
      status: "new",
      priority: "normal",
      received_at: new Date().toISOString(),
    });
    setSubject("");
    setChannel("email");
    load();
  };

  const setSla = async (id: string, hours: number) => {
    const due = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await updateThread(id, { sla_due_at: due });
  };

  const isOverdue = (row: any) =>
    row.sla_due_at && row.status !== "closed" && new Date(row.sla_due_at).getTime() < Date.now();

  return (
    <DashboardShell title="Inbox" subtitle="Triage customer requests and track SLA commitments.">
      {!isStaff && <p className="text-white/60">Staff access only.</p>}
      {isStaff && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="section-title">New inbox item</div>
            <div className="mt-3 grid gap-2 md:grid-cols-[2fr_1fr_auto]">
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Web</option>
              </select>
              <button className="btn-primary" onClick={createThread}>
                Add
              </button>
            </div>
          </div>

          <div className="card p-4">
            <div className="section-title">Inbox triage</div>
            {loading ? (
              <p className="text-white/60 mt-2">Loading…</p>
            ) : (
              <div className="mt-3 space-y-3">
                {threads.length === 0 && (
                  <div className="text-xs text-[var(--slate-500)]">No inbox items yet.</div>
                )}
                {threads.map((row) => (
                  <div
                    key={row.id}
                    className={`rounded-xl border p-3 ${
                      isOverdue(row)
                        ? "border-orange-300 bg-orange-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm text-[var(--slate-900)]">
                          {row.subject || "Untitled"}
                        </div>
                        <div className="text-xs text-[var(--slate-500)]">
                          {row.channel} • {row.projects?.name || "No project"} •{" "}
                          {row.companies?.name || "No company"}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <select
                          className="rounded-lg border border-slate-200 px-2 py-1"
                          value={row.status}
                          onChange={(e) => updateThread(row.id, { status: e.target.value })}
                        >
                          {statusOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-lg border border-slate-200 px-2 py-1"
                          value={row.priority}
                          onChange={(e) => updateThread(row.id, { priority: e.target.value })}
                        >
                          {priorityOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn-ghost"
                          onClick={() => updateThread(row.id, { assigned_to: profile?.id })}
                        >
                          Assign to me
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <button className="btn-ghost" onClick={() => setSla(row.id, 2)}>
                        SLA 2h
                      </button>
                      <button className="btn-ghost" onClick={() => setSla(row.id, 8)}>
                        SLA 8h
                      </button>
                      <button className="btn-ghost" onClick={() => setSla(row.id, 24)}>
                        SLA 24h
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() =>
                          updateThread(row.id, { first_response_at: new Date().toISOString() })
                        }
                      >
                        Mark responded
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => updateThread(row.id, { status: "closed" })}
                      >
                        Close
                      </button>
                      {row.sla_due_at && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px]">
                          SLA due {new Date(row.sla_due_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
