"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/lib/useProfile";

type Summary = {
  expiringQuotes: number;
  overdueInbox: number;
  pendingApprovals: number;
};

export default function StatusBanner() {
  const { profile } = useProfile();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [banner, setBanner] = useState<any | null>(null);

  useEffect(() => {
    if (!profile?.role || profile.role === "customer") return;
    const load = async () => {
      const [summaryRes, bannerRes] = await Promise.all([
        fetch("/api/status/summary"),
        fetch("/api/status/banner"),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (bannerRes.ok) {
        const data = await bannerRes.json();
        setBanner(data?.banner || null);
      }
    };
    load();
  }, [profile?.role]);

  if (!summary && !banner) return null;

  const { expiringQuotes = 0, overdueInbox = 0, pendingApprovals = 0 } = summary || {};
  const hasSummary = expiringQuotes || overdueInbox || pendingApprovals;

  const bannerStyle =
    banner?.level === "critical"
      ? "border-red-200 bg-red-50 text-red-800"
      : banner?.level === "warn"
        ? "border-orange-200 bg-orange-50 text-orange-800"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <div className="space-y-3">
      {banner && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${bannerStyle}`}>
          <div className="font-semibold">Status update</div>
          <div className="mt-1 text-xs">{banner.message}</div>
        </div>
      )}
      {hasSummary && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <div className="font-semibold">Operational alerts</div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs">
            {expiringQuotes > 0 && (
              <span className="rounded-full bg-orange-100 px-3 py-1">
                {expiringQuotes} quote{expiringQuotes === 1 ? "" : "s"} expiring soon
              </span>
            )}
            {overdueInbox > 0 && (
              <span className="rounded-full bg-orange-100 px-3 py-1">
                {overdueInbox} inbox SLA{overdueInbox === 1 ? "" : "s"} overdue
              </span>
            )}
            {pendingApprovals > 0 && (
              <span className="rounded-full bg-orange-100 px-3 py-1">
                {pendingApprovals} pending approval{pendingApprovals === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
