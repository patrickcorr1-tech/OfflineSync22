"use client";

import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/lib/useProfile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getSignedUrl } from "@/lib/storage";
import DashboardShell from "@/components/DashboardShell";

const statusSteps = [
  { key: "lead", label: "Lead received" },
  { key: "quoted", label: "Quote sent" },
  { key: "approved", label: "Approved" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

export default function Home() {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [metrics, setMetrics] = useState({ approvedQuotes: 0, completed: 0, open: 0 });

  const [projects, setProjects] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");
  const [callbackMsg, setCallbackMsg] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"customer" | "sales">("customer");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      const { count: approvedQuotes } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted");
      const { count: completed } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed");
      const { count: open } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .neq("status", "completed");
      setMetrics({
        approvedQuotes: approvedQuotes || 0,
        completed: completed || 0,
        open: open || 0,
      });
    };
    loadMetrics();
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.role !== "customer") return;
    const loadCustomer = async () => {
      const { data: proj } = await supabase
        .from("projects")
        .select("id,name,status,created_at")
        .order("created_at", { ascending: false });
      setProjects(proj || []);

      const { data: quoteData } = await supabase
        .from("quotes")
        .select("id,file_path,status,created_at,project_id,projects(name)")
        .order("created_at", { ascending: false });
      setQuotes(quoteData || []);

      const withUrls = await Promise.all(
        (quoteData || []).slice(0, 5).map(async (q: any) => ({
          id: q.id,
          label: `Quote – ${q.projects?.name || "Project"}`,
          url: q.file_path ? await getSignedUrl("quotes", q.file_path) : null,
          created_at: q.created_at,
        })),
      );

      const jobPacks = (proj || []).slice(0, 5).map((p: any) => ({
        id: `job-pack-${p.id}`,
        label: `Job pack – ${p.name || "Project"}`,
        url: `/api/projects/${p.id}/job-pack`,
        created_at: p.created_at,
      }));

      setDownloads([...withUrls, ...jobPacks]);
    };
    loadCustomer();
  }, [profile?.id]);

  const latestProject = projects[0];

  const checklist = useMemo(() => {
    const hasProject = projects.length > 0;
    const hasQuote = quotes.length > 0;
    return [
      {
        label: hasProject ? "Project created" : "Create your first project",
        done: hasProject,
        href: hasProject ? "/projects" : "/projects/new",
      },
      {
        label: hasQuote ? "Quote received" : "Check for new quotes",
        done: hasQuote,
        href: "/quotes",
      },
      {
        label: "Add photos or a snag (optional)",
        done: false,
        href: latestProject ? `/projects/${latestProject.id}` : "/projects",
      },
    ];
  }, [projects, quotes, latestProject?.id]);

  const timeline = useMemo(() => {
    if (!latestProject) return [];
    const idx = statusSteps.findIndex((s) => s.key === latestProject.status);
    return statusSteps.map((s, i) => ({
      ...s,
      done: idx >= i,
      current: idx === i,
    }));
  }, [latestProject?.status]);

  if (profile?.role === "customer") {
    return (
      <DashboardShell title="Welcome" subtitle="Simple, friendly, and built for busy days">
        <div className="card p-4 mb-4">
          <div className="section-title">My actions</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a href="/projects" className="btn-primary text-center">
              Projects
            </a>
            <a href="/quotes" className="btn-ghost text-center">
              Quotes
            </a>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-4">
            <div className="section-title">Quick‑start checklist</div>
            <div className="mt-3 space-y-2 text-sm">
              {checklist.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
                >
                  <span>{item.label}</span>
                  <span className={item.done ? "text-emerald-400" : "text-white/50"}>
                    {item.done ? "Done" : "Start"}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="section-title">Project timeline</div>
            {!latestProject && (
              <p className="mt-3 text-sm text-[var(--slate-500)]">
                Create a project to see your timeline.
              </p>
            )}
            {latestProject && (
              <div className="mt-3 space-y-2 text-sm">
                <div className="text-xs text-white/50">
                  Latest: {latestProject.name || "Project"}
                </div>
                {timeline.map((step) => (
                  <div
                    key={step.key}
                    className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
                  >
                    <span>{step.label}</span>
                    <span className={step.done ? "text-emerald-400" : "text-white/40"}>
                      {step.current ? "Now" : step.done ? "Done" : "Soon"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="section-title">Request a callback</div>
            <p className="mt-2 text-xs text-white/50">
              Prefer a phone call? Leave your number and we’ll call you back.
            </p>
            <input
              className="mt-3 w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm text-[var(--slate-900)]"
              placeholder="Phone number"
              value={callbackPhone}
              onChange={(e) => setCallbackPhone(e.target.value)}
            />
            <textarea
              className="mt-2 w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm text-[var(--slate-900)]"
              rows={3}
              placeholder="Any notes (optional)"
              value={callbackNotes}
              onChange={(e) => setCallbackNotes(e.target.value)}
            />
            {callbackMsg && <p className="mt-2 text-xs text-emerald-500">{callbackMsg}</p>}
            <button
              className="mt-3 btn-primary w-full"
              onClick={async () => {
                setCallbackMsg(null);
                const res = await fetch("/api/customer/callback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ phone: callbackPhone, notes: callbackNotes }),
                });
                if (res.ok) {
                  setCallbackPhone("");
                  setCallbackNotes("");
                  setCallbackMsg("Callback requested. We’ll be in touch.");
                } else {
                  const data = await res.json();
                  setCallbackMsg(data?.error || "Could not submit request.");
                }
              }}
            >
              Request callback
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mt-4">
          <div className="card p-4">
            <div className="section-title">Downloads</div>
            <p className="mt-2 text-xs text-white/50">Quotes and job packs in one place.</p>
            <div className="mt-3 space-y-2 text-sm">
              {downloads.length === 0 && (
                <div className="text-xs text-white/50">No downloads yet.</div>
              )}
              {downloads.map((d) => (
                <a
                  key={d.id}
                  href={d.url || "#"}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
                >
                  <span>{d.label}</span>
                  <span className="text-white/50">Download</span>
                </a>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="section-title">Invite a teammate</div>
            <p className="mt-2 text-xs text-white/50">
              Add another person from your company. They’ll get an invite email.
            </p>
            <input
              className="mt-3 w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm text-[var(--slate-900)]"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button
                className={inviteRole === "customer" ? "btn-primary" : "btn-ghost"}
                onClick={() => setInviteRole("customer")}
              >
                Customer
              </button>
              <button
                className={inviteRole === "sales" ? "btn-primary" : "btn-ghost"}
                onClick={() => setInviteRole("sales")}
              >
                Sales
              </button>
            </div>
            {inviteMsg && <p className="mt-2 text-xs text-emerald-500">{inviteMsg}</p>}
            <button
              className="mt-3 btn-primary w-full"
              onClick={async () => {
                setInviteMsg(null);
                const res = await fetch("/api/team/invite", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
                });
                if (res.ok) {
                  setInviteEmail("");
                  setInviteMsg("Invite sent.");
                } else {
                  const data = await res.json();
                  setInviteMsg(data?.error || "Could not send invite.");
                }
              }}
            >
              Send invite
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Dashboard" subtitle="Fence quoting and project oversight">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <div className="section-title">Approved quotes</div>
          <div className="mt-2 text-3xl font-semibold">{metrics.approvedQuotes}</div>
        </div>
        <div className="card p-4">
          <div className="section-title">Completed</div>
          <div className="mt-2 text-3xl font-semibold">{metrics.completed}</div>
        </div>
        <div className="card p-4">
          <div className="section-title">Not completed</div>
          <div className="mt-2 text-3xl font-semibold">{metrics.open}</div>
        </div>
        <div className="card p-4">
          <div className="section-title">Status</div>
          <div className="mt-2 text-3xl font-semibold">Online</div>
        </div>
      </div>
    </DashboardShell>
  );
}
