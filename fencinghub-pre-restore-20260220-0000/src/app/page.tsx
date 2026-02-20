"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/lib/useProfile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import DashboardShell from "@/components/DashboardShell";

export default function Home() {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [metrics, setMetrics] = useState({ approvedQuotes: 0, completed: 0, open: 0 });

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
        <div className="grid gap-4 sm:grid-cols-2">
          <a href="/projects" className="card p-5">
            <div className="section-title">Projects</div>
            <div className="mt-2 text-lg font-semibold">📍 My Projects</div>
            <p className="text-sm text-[var(--slate-500)] mt-2">
              Track progress, report issues, and upload photos.
            </p>
          </a>
          <a href="/quotes" className="card p-5">
            <div className="section-title">Quotes</div>
            <div className="mt-2 text-lg font-semibold">📄 My Quotes</div>
            <p className="text-sm text-[var(--slate-500)] mt-2">
              Download and review quotes sent to you.
            </p>
          </a>
        </div>
        <div className="mt-4 card p-4">
          <div className="section-title">Quick steps</div>
          <ol className="mt-2 space-y-2 text-sm text-[var(--slate-500)]">
            <li>1) Open a project to add photos or report a snag.</li>
            <li>2) Check quotes when you’re ready to approve.</li>
            <li>3) We’ll keep everything synced even if you go offline.</li>
          </ol>
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
