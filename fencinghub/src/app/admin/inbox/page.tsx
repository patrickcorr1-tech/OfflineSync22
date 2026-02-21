"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function InboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [tab, setTab] = useState<"new" | "triaged" | "assigned" | "closed" | "notifications">(
    "new",
  );

  const load = async () => {
    const res = await fetch("/api/inbox/list");
    const data = await res.json();
    if (res.ok) setMessages(data.messages || []);
  };

  useEffect(() => {
    load();
  }, []);

  const triage = async (id: string) => {
    await fetch("/api/inbox/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const assign = async (id: string, assigned_to: string) => {
    await fetch("/api/inbox/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, assigned_to }),
    });
    load();
  };

  const daysLeft = (due?: string) => {
    if (!due) return null;
    const diff = new Date(due).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const notificationCount = messages.filter((m) => m.channel === "system").length;
  const filtered =
    tab === "notifications"
      ? messages.filter((m) => m.channel === "system")
      : messages.filter((m) => m.status === tab);

  return (
    <DashboardShell title="Inbox" subtitle="Triage and respond to customer messages">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-2">
        <div className="flex flex-wrap gap-2">
          {(["new", "triaged", "assigned", "closed", "notifications"] as const).map((t) => (
            <button
              key={t}
              className={
                tab === t
                  ? "rounded-full border border-white/40 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white"
                  : "rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white/60 hover:border-white/30"
              }
              onClick={() => setTab(t)}
            >
              {t === "notifications" ? (
                <span className="flex items-center gap-2">
                  Notifications
                  {notificationCount > 0 && (
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-200">
                      {notificationCount}
                    </span>
                  )}
                </span>
              ) : (
                t[0].toUpperCase() + t.slice(1)
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-sm text-white/50">No messages in {tab}.</div>
        )}
        {filtered.map((m) => (
          <div key={m.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{m.subject || "(no subject)"}</div>
              <div className="flex items-center gap-2">
                {m.sla_due_at &&
                  (() => {
                    const remaining = daysLeft(m.sla_due_at) ?? 0;
                    const color =
                      remaining <= 0
                        ? "text-red-300"
                        : remaining <= 1
                          ? "text-amber-300"
                          : "text-white/60";
                    return <span className={`text-xs ${color}`}>SLA {remaining}d</span>;
                  })()}
                {m.priority !== "normal" && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300">
                    {m.priority}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-1 text-xs text-white/50">
              {m.from_name || m.from_email || "Unknown"} • {m.channel}
            </div>
            <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{m.body}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tab === "new" && (
                <button className="btn-primary" onClick={() => triage(m.id)}>
                  Triage
                </button>
              )}
              {tab !== "closed" && (
                <button className="btn-ghost" onClick={() => assign(m.id, "")}>
                  Mark assigned
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
