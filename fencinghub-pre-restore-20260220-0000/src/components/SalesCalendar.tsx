"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function SalesCalendar() {
  const supabase = createSupabaseBrowserClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("sales_orders")
      .select("id,expected_delivery_date,project_id,projects(name)")
      .order("expected_delivery_date", { ascending: true });
    setOrders(data || []);
  };

  const generateToken = async () => {
    const res = await fetch("/api/calendar/token", { method: "POST" });
    const data = await res.json();
    if (data?.token) setToken(data.token);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.3em] text-white/50">Install calendar</div>
        <a className="btn-ghost" href="/api/calendar/ics" target="_blank" rel="noreferrer">
          Download ICS
        </a>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
        <button className="rounded-lg border border-white/20 px-3 py-1" onClick={generateToken}>
          Generate share link
        </button>
        {token && (
          <code className="rounded-lg border border-white/10 px-2 py-1">
            /api/calendar/public/ics?token={token}
          </code>
        )}
      </div>
      <div className="mt-3 space-y-3 text-sm">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-white/10 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span>{o.projects?.name || o.project_id}</span>
              <span className="text-white/60">{o.expected_delivery_date || "Unscheduled"}</span>
            </div>
          </div>
        ))}
        {!orders.length && <div className="text-white/50 text-xs">No scheduled installs yet.</div>}
      </div>
    </div>
  );
}
