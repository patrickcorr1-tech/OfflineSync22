"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"customer" | "sales">("customer");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sendInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setMessage(null);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    if (res.ok) {
      setMessage("Invite sent.");
      setEmail("");
    } else {
      const data = await res.json();
      setMessage(data?.error || "Invite failed.");
    }
    setSending(false);
  };

  return (
    <DashboardShell title="Invites" subtitle="Invite teammates and customers">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="card p-6">
          <div className="section-title">Send invite</div>
          <h2 className="mt-3 text-xl font-semibold heading-display">Access control</h2>
          <p className="mt-2 text-sm text-white/60">
            Admins approve access. Invites create secure onboarding links.
          </p>
          <div className="mt-4 grid gap-3">
            <input
              className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className={role === "customer" ? "btn-primary" : "btn-ghost"}
                onClick={() => setRole("customer")}
                type="button"
              >
                Customer
              </button>
              <button
                className={role === "sales" ? "btn-primary" : "btn-ghost"}
                onClick={() => setRole("sales")}
                type="button"
              >
                Sales
              </button>
            </div>
            <button className="btn-primary w-full" onClick={sendInvite} disabled={sending}>
              {sending ? "Sending…" : "Send invite"}
            </button>
            {message && <p className="text-sm text-white/60">{message}</p>}
          </div>
        </div>

        <div className="card p-6">
          <div className="section-title">Invite policy</div>
          <div className="mt-3 space-y-3 text-sm text-white/70">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-white/40">Approval</div>
              <p className="mt-2">All new signups require admin approval.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-white/40">Security</div>
              <p className="mt-2">Invite links are single‑use and time‑limited.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-white/40">Roles</div>
              <p className="mt-2">Customers see their projects. Sales/admins see all.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
