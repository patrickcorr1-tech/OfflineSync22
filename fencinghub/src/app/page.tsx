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
  const [commandCenter, setCommandCenter] = useState({
    dueJobs: [] as any[],
    expiringQuotes: [] as any[],
    overdueSnags: [] as any[],
  });

  const [projects, setProjects] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");
  const [callbackMsg, setCallbackMsg] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [inviteRole, setInviteRole] = useState<"customer" | "sales">("customer");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [pulseMsg, setPulseMsg] = useState<string | null>(null);

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
    if (!profile?.role || profile.role === "customer") return;
    const loadCommandCenter = async () => {
      const { data: dueJobs } = await supabase
        .from("projects")
        .select("id,name,status,preferred_date")
        .in("status", ["approved", "in_progress"])
        .order("preferred_date", { ascending: true })
        .limit(5);

      const soon = new Date();
      soon.setDate(soon.getDate() + 5);
      const { data: expiringQuotes } = await supabase
        .from("quotes")
        .select("id,expires_at,project_id,projects(name)")
        .not("expires_at", "is", null)
        .lt("expires_at", soon.toISOString())
        .neq("status", "accepted")
        .order("expires_at", { ascending: true })
        .limit(5);

      const past = new Date();
      past.setDate(past.getDate() - 7);
      const { data: overdueSnags } = await supabase
        .from("snags")
        .select("id,title,project_id,created_at,projects(name)")
        .neq("status", "closed")
        .lt("created_at", past.toISOString())
        .order("created_at", { ascending: true })
        .limit(5);

      setCommandCenter({
        dueJobs: dueJobs || [],
        expiringQuotes: expiringQuotes || [],
        overdueSnags: overdueSnags || [],
      });
    };
    loadCommandCenter();
  }, [profile?.role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (profile?.role !== "customer") return;
    const loadCustomer = async () => {
      const { data: proj } = await supabase
        .from("projects")
        .select("id,name,status,created_at,updated_at")
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
          type: "quote",
        })),
      );

      const jobPacks = (proj || []).slice(0, 5).map((p: any) => ({
        id: `job-pack-${p.id}`,
        label: `Job pack – ${p.name || "Project"}`,
        url: `/api/projects/${p.id}/job-pack`,
        created_at: p.updated_at || p.created_at,
        type: "job_pack",
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
      <DashboardShell title="Customer Portal" subtitle="Everything for your project, in one place">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="card p-6">
            <div className="section-title">Mission control</div>
            <h2 className="mt-3 text-2xl font-semibold heading-display">
              Your project at a glance
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Track progress, access documents, and reach your team fast.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href="/projects" className="btn-primary text-center">
                View projects
              </a>
              <a href="/quotes" className="btn-ghost text-center">
                View quotes
              </a>
              <a href="/projects" className="btn-ghost text-center">
                Report a snag
              </a>
              <a href="/quotes" className="btn-ghost text-center">
                Request changes
              </a>
            </div>
            <div className="mt-6 grid gap-3">
              {checklist.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <span>{item.label}</span>
                  <span className={item.done ? "text-emerald-400" : "text-white/50"}>
                    {item.done ? "Done" : "Start"}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="section-title">Timeline</div>
            {!latestProject && (
              <p className="mt-3 text-sm text-white/60">Create a project to see your timeline.</p>
            )}
            {latestProject && (
              <div className="mt-3 space-y-3 text-sm">
                <div className="text-xs text-white/50">
                  Latest: {latestProject.name || "Project"}
                </div>
                {timeline.map((step) => (
                  <div
                    key={step.key}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
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
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mt-4">
          <div className="card p-6">
            <div className="section-title">Downloads</div>
            <p className="mt-2 text-xs text-white/50">Quotes and job packs in one place.</p>
            <div className="mt-4 space-y-3 text-sm">
              {downloads.length === 0 && (
                <div className="text-xs text-white/50">No downloads yet.</div>
              )}
              {downloads.map((d) => (
                <a
                  key={d.id}
                  href={d.url || "#"}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <div>{d.label}</div>
                    <div className="text-[10px] text-white/40">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}
                      {d.type === "job_pack" && !isOnline ? " • Available offline" : ""}
                    </div>
                  </div>
                  <span className="text-white/50">Download</span>
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="card p-6">
              <div className="section-title">Request a callback</div>
              <p className="mt-2 text-xs text-white/50">
                Prefer a phone call? Leave your number and we’ll call you back.
              </p>
              <input
                className="mt-3 w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm"
                placeholder="Phone number"
                value={callbackPhone}
                onChange={(e) => setCallbackPhone(e.target.value)}
              />
              <textarea
                className="mt-2 w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm"
                rows={3}
                placeholder="Any notes (optional)"
                value={callbackNotes}
                onChange={(e) => setCallbackNotes(e.target.value)}
              />
              {callbackMsg && <p className="mt-2 text-xs text-emerald-400">{callbackMsg}</p>}
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

            <div className="card p-6">
              <div className="section-title">How did we do?</div>
              <p className="mt-2 text-xs text-white/50">One tap helps us improve.</p>
              {pulseMsg && <p className="mt-2 text-xs text-emerald-400">{pulseMsg}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  className="btn-primary"
                  onClick={async () => {
                    await supabase.from("support_audit_logs").insert({
                      action: "customer_pulse",
                      context: { rating: "up" },
                    });
                    setPulseMsg("Thanks for the feedback!");
                  }}
                >
                  👍 Great
                </button>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    await supabase.from("support_audit_logs").insert({
                      action: "customer_pulse",
                      context: { rating: "down" },
                    });
                    setPulseMsg("Thanks — we’ll improve this.");
                  }}
                >
                  👎 Needs work
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Admin Command" subtitle="Operations overview for today">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="card p-4">
          <div className="section-title">Approved quotes</div>
          <div className="mt-2 text-2xl font-semibold heading-display">
            {metrics.approvedQuotes}
          </div>
          <div className="mt-1 text-[10px] text-white/50">Ready for scheduling.</div>
        </div>
        <div className="card p-4">
          <div className="section-title">Completed</div>
          <div className="mt-2 text-2xl font-semibold heading-display">{metrics.completed}</div>
          <div className="mt-1 text-[10px] text-white/50">Closed in the system.</div>
        </div>
        <div className="card p-4">
          <div className="section-title">Not completed</div>
          <div className="mt-2 text-2xl font-semibold heading-display">{metrics.open}</div>
          <div className="mt-1 text-[10px] text-white/50">Active and in motion.</div>
        </div>
        <div className="card p-4">
          <div className="section-title">Status</div>
          <div className="mt-2 text-2xl font-semibold heading-display">Online</div>
          <div className="mt-1 text-[10px] text-white/50">All systems normal.</div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div className="card p-5">
          <div className="section-title">Today command center</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="space-y-2">
              <div className="uppercase tracking-[0.2em] text-white/40">Jobs due</div>
              {commandCenter.dueJobs.length === 0 && (
                <div className="text-xs text-white/50">No jobs due.</div>
              )}
              <div className="space-y-1">
                {commandCenter.dueJobs.map((job) => (
                  <a
                    key={job.id}
                    href={`/projects/${job.id}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span>{job.name || "Project"}</span>
                    <span className="text-white/50">
                      {job.preferred_date ? new Date(job.preferred_date).toLocaleDateString() : ""}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="uppercase tracking-[0.2em] text-white/40">Quotes expiring</div>
              {commandCenter.expiringQuotes.length === 0 && (
                <div className="text-xs text-white/50">None in next 5 days.</div>
              )}
              <div className="space-y-1">
                {commandCenter.expiringQuotes.map((q) => (
                  <a
                    key={q.id}
                    href={`/projects/${q.project_id}?tab=Documents`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span>{q.projects?.name || "Quote"}</span>
                    <span className="text-white/50">
                      {q.expires_at ? new Date(q.expires_at).toLocaleDateString() : ""}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="uppercase tracking-[0.2em] text-white/40">Overdue snags</div>
              {commandCenter.overdueSnags.length === 0 && (
                <div className="text-xs text-white/50">No overdue snags.</div>
              )}
              <div className="space-y-1">
                {commandCenter.overdueSnags.map((s) => (
                  <a
                    key={s.id}
                    href={`/projects/${s.project_id}?tab=Snags`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span>{s.projects?.name || "Project"}</span>
                    <span className="text-white/50">{s.title || "Snag"}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="section-title">Status banner presets</div>
          <p className="mt-2 text-[10px] text-white/50">One tap to post a status update.</p>
          <div className="mt-3 grid gap-2">
            {[
              { message: "Weather delay today — we’ll update schedules by 2pm.", level: "warn" },
              { message: "Team on site. Expect updates this afternoon.", level: "info" },
              { message: "Emergency callouts only — response times extended.", level: "critical" },
            ].map((preset) => (
              <button
                key={preset.message}
                className="btn-ghost text-left"
                onClick={async () => {
                  await fetch("/api/status-banner/set", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(preset),
                  });
                }}
              >
                {preset.message}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="section-title">Quick actions</div>
          <div className="mt-3 grid gap-2 text-xs">
            <a href="/projects" className="btn-primary text-center">
              View projects
            </a>
            <a href="/quotes" className="btn-ghost text-center">
              View quotes
            </a>
            <a href="/admin/inbox" className="btn-ghost text-center">
              Open inbox
            </a>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
