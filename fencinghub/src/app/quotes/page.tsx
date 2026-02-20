"use client";

import { useEffect, useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getSignedUrl } from "@/lib/storage";
import DashboardShell from "@/components/DashboardShell";
import CobrowseWidget from "@/components/CobrowseWidget";
import { useProfile } from "@/lib/useProfile";
import { canEdit } from "@/lib/roles";

export default function QuotesPage() {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [resendId, setResendId] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [discountMsg, setDiscountMsg] = useState<string | null>(null);
  const [discountPdf, setDiscountPdf] = useState<string | null>(null);
  const [pendingDiscounts, setPendingDiscounts] = useState<any[]>([]);
  const [remindId, setRemindId] = useState<string | null>(null);
  const [approvedCompanies, setApprovedCompanies] = useState<any[]>([]);
  const [companyOptions, setCompanyOptions] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    if (canEdit(profile?.role)) {
      const res = await fetch("/api/quotes/list");
      const data = await res.json();
      if (res.ok) {
        setQuotes(data.quotes || []);
        if (!selectedId) {
          const first = data.quotes?.find((q: any) => q.url);
          if (first?.id) setSelectedId(first.id);
        }
      }
      const { data: proj } = await supabase
        .from("projects")
        .select("id,name")
        .order("created_at", { ascending: false });
      setProjects(proj || []);

      const { data: discounts } = await supabase
        .from("quote_discounts")
        .select("id, percent, status, quote_id, created_at")
        .order("created_at", { ascending: false });
      setPendingDiscounts((discounts || []).filter((d: any) => d.status === "pending"));

      const { data: companies } = await supabase
        .from("companies")
        .select("id,name")
        .order("name", { ascending: true });
      setCompanyOptions(companies || []);

      const { data: approved } = await supabase
        .from("discount_approved_companies")
        .select("id, company_id, companies(name)")
        .order("created_at", { ascending: false });
      setApprovedCompanies(approved || []);
      return;
    }

    const { data } = await supabase
      .from("quotes")
      .select(
        "id,status,file_path,project_id,version,pinned,archived,sent_at,viewed_at,responded_at,response_comment,expires_at,response_due_at,reminder_sent_at,projects(name),created_at",
      )
      .order("created_at", { ascending: false });

    const withUrls = await Promise.all(
      (data || []).map(async (q: any) => ({
        ...q,
        url: q.file_path ? await getSignedUrl("quotes", q.file_path) : null,
      })),
    );

    setQuotes(withUrls);
    if (!selectedId) {
      const first = withUrls?.find((q) => q.url);
      if (first?.id) setSelectedId(first.id);
    }
  };

  const requestDiscount = async () => {
    if (!selectedId || !discountPercent) return;
    setDiscountMsg(null);
    setDiscountPdf(null);
    const res = await fetch("/api/quotes/discount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: selectedId, percent: Number(discountPercent) }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.status === "approved" && data.pdf_path) {
        const url = await getSignedUrl("quotes", data.pdf_path);
        setDiscountPdf(url);
        setDiscountMsg("Discount approved and PDF is ready.");
      } else {
        setDiscountMsg("Discount request sent for approval.");
      }
    } else {
      setDiscountMsg(`Request failed: ${data?.error || "Unknown error"}`);
    }
  };

  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");
  const formatDateInput = (value?: string | null) =>
    value ? new Date(value).toISOString().slice(0, 10) : "";
  const isExpiringSoon = (value?: string | null) => {
    if (!value) return false;
    const diff = new Date(value).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  };
  const daysUntil = (value?: string | null) => {
    if (!value) return null;
    const diff = new Date(value).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusLabel = (q: any) => {
    if (q.archived) return "Archived";
    if (q.status === "accepted") return "Accepted";
    if (q.status === "rejected") return "Rejected";
    if (q.viewed_at) return "Viewed";
    return "Sent";
  };

  const getStatusClass = (label: string) => {
    switch (label) {
      case "Accepted":
        return "bg-emerald-500/20 text-emerald-700";
      case "Rejected":
        return "bg-red-500/20 text-red-700";
      case "Viewed":
        return "bg-slate-500/15 text-slate-600";
      case "Archived":
        return "bg-gray-500/20 text-gray-700";
      default:
        return "bg-blue-500/20 text-blue-700";
    }
  };

  const updateQuote = async (quoteId: string, patch: Record<string, any>) => {
    const res = await fetch("/api/quotes/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId, ...patch }),
    });
    if (res.ok) {
      setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, ...patch } : q)));
    }
  };

  const resendQuote = async (quoteId: string) => {
    setResendId(quoteId);
    const res = await fetch("/api/quotes/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId }),
    });
    const data = await res.json();
    if (res.ok) setUploadMsg("Quote email resent.");
    else setUploadMsg(`Resend failed: ${data?.error || "Unknown error"}`);
    setResendId(null);
  };

  const sendExpiryReminder = async (quoteId: string) => {
    setRemindId(quoteId);
    const res = await fetch("/api/quotes/remind-expiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId }),
    });
    if (res.ok) {
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === quoteId ? { ...q, reminder_sent_at: new Date().toISOString() } : q,
        ),
      );
      setUploadMsg("Expiry reminder sent.");
    }
    setRemindId(null);
  };

  useEffect(() => {
    if (!profile) return;
    load();
  }, [profile]);

  const uploadQuote = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setUploadMsg(null);

    const form = new FormData();
    form.append("projectId", projectId);
    form.append("file", file);

    const res = await fetch("/api/quotes/upload", { method: "POST", body: form });
    const data = await res.json();

    if (res.ok) {
      await fetch("/api/notify/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title: "Quote sent", body: "A new quote is available." }),
      });
      if (data?.path) {
        // refresh list so we can select by id
        await load();
      }
      setUploadMsg("Quote uploaded successfully.");
    } else {
      setUploadMsg(`Upload failed: ${data?.error || "Unknown error"}`);
    }

    setUploading(false);
    load();
  };

  const deleteQuote = async (quoteId: string) => {
    await fetch("/api/quotes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId }),
    });
    load();
  };

  const filteredQuotes = (quotes || [])
    .filter((q) => (showArchived ? true : !q.archived))
    .filter((q) =>
      statusFilter === "all" ? true : getStatusLabel(q).toLowerCase() === statusFilter,
    )
    .filter((q) => (projectFilter ? q.project_id === projectFilter : true))
    .filter((q) => (dateFrom ? new Date(q.created_at) >= new Date(dateFrom) : true))
    .filter((q) => (dateTo ? new Date(q.created_at) <= new Date(`${dateTo}T23:59:59`) : true))
    .sort((a, b) => {
      const pinScore = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (pinScore !== 0) return pinScore;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <DashboardShell title="Quotes" subtitle="Upload and manage customer quotes">
      <CobrowseWidget label="Request help" />
      {!canEdit(profile?.role) && (
        <div className="card p-4 mb-4">
          <div className="section-title">Apply discount</div>
          <div className="mt-2 text-sm text-[var(--slate-500)]">
            Enter your discount % and we’ll approve instantly if your company is approved.
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
              placeholder="Discount %"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
            <button className="btn-primary" type="button" onClick={requestDiscount}>
              Apply discount
            </button>
          </div>
          {discountMsg && <div className="mt-2 text-sm text-[var(--slate-500)]">{discountMsg}</div>}
          {discountPdf && (
            <a
              className="btn-ghost mt-2 inline-block"
              href={discountPdf}
              target="_blank"
              rel="noreferrer"
            >
              Download approved PDF
            </a>
          )}
        </div>
      )}

      {canEdit(profile?.role) && (
        <div className="card p-4 mb-4">
          <div className="section-title">Upload quote</div>
          {uploadMsg && <div className="mt-2 text-sm text-[var(--slate-500)]">{uploadMsg}</div>}
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <select
              className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`btn-primary ${!projectId || uploading ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => fileRef.current?.click()}
              >
                Choose PDF
              </button>
              <button
                type="button"
                className={`btn-ghost ${!projectId || uploading || !fileRef.current?.files?.[0] ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => {
                  const file = fileRef.current?.files?.[0];
                  if (file) uploadQuote(file);
                }}
              >
                Submit
              </button>
              {/* download button removed */}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={() => setUploadMsg("File selected. Click Submit to upload.")}
              />
            </div>
          </div>
        </div>
      )}

      {canEdit(profile?.role) && (
        <div className="card p-4 mb-4">
          <div className="section-title">Discount approvals</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-white/50">
                Approved companies
              </div>
              <div className="mt-2 space-y-2 text-sm">
                {approvedCompanies.length === 0 && (
                  <div className="text-white/50 text-xs">No approved companies yet.</div>
                )}
                {approvedCompanies.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 p-3"
                  >
                    <div className="text-sm">{c.companies?.name || c.company_id}</div>
                    <button
                      className="btn-ghost"
                      type="button"
                      onClick={async () => {
                        await supabase.from("discount_approved_companies").delete().eq("id", c.id);
                        load();
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/50">Add company</div>
              <div className="mt-2 flex items-center gap-2">
                <select
                  className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm w-full"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                >
                  <option value="">Select company</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={async () => {
                    if (!selectedCompany) return;
                    await supabase
                      .from("discount_approved_companies")
                      .insert({ company_id: selectedCompany });
                    setSelectedCompany("");
                    load();
                  }}
                >
                  Add
                </button>
              </div>
              <div className="mt-6 text-xs uppercase tracking-wide text-white/50">
                Pending requests
              </div>
              <div className="mt-2 space-y-2 text-sm">
                {pendingDiscounts.length === 0 && (
                  <div className="text-white/50 text-xs">No pending discount requests.</div>
                )}
                {pendingDiscounts.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 p-3"
                  >
                    <div>
                      <div className="text-sm">Quote {d.quote_id}</div>
                      <div className="text-xs text-white/50">{d.percent}% requested</div>
                    </div>
                    <button
                      className="btn-primary"
                      type="button"
                      onClick={async () => {
                        await fetch("/api/quotes/discount/approve", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ discountId: d.id }),
                        });
                        load();
                      }}
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="section-title">All Quotes</div>
          {canEdit(profile?.role) && (
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost"
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/quotes/archive-old", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ days: 30, projectId: projectFilter || null }),
                  });
                  if (res.ok) setUploadMsg("Archived quotes older than 30 days.");
                  load();
                }}
              >
                Auto‑archive 30d+
              </button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  const qs = projectFilter ? `?projectId=${projectFilter}` : "";
                  window.location.href = `/api/quotes/download-all${qs}`;
                }}
              >
                Download all (ZIP)
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <select
            className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
          <select
            className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-[var(--slate-500)]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
        {profile?.role !== "customer" && (
          <div className="mt-3">
            <select
              className="w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
              value={selectedId || ""}
              onChange={(e) => {
                const q = quotes.find((x) => x.id === e.target.value);
                if (q) {
                  setSelectedId(q.id);
                  if (profile?.role === "customer") {
                    fetch("/api/notifications/quote-viewed", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ quoteId: q.id, projectId: q.project_id }),
                    });
                  }
                }
              }}
            >
              <option value="">Select quote to preview</option>
              {filteredQuotes
                .filter((q) => q.url)
                .map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.projects?.name || q.project_id} — v{q.version || 1} — {q.file_path}
                  </option>
                ))}
            </select>
          </div>
        )}
        <div className="mt-3 space-y-3">
          {filteredQuotes.map((q) => (
            <div key={q.id} className="rounded-xl border border-white/10 p-3 sm:p-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm sm:text-base">
                    {q.projects?.name || q.project_id}
                    <span className="ml-2 text-white/50">v{q.version || 1}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(() => {
                      const label = getStatusLabel(q);
                      return (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${getStatusClass(label)}`}
                        >
                          {label}
                        </span>
                      );
                    })()}
                    {q.pinned && (
                      <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-700">
                        Pinned
                      </span>
                    )}
                  </div>
                  {q.expires_at && (
                    <div className="mt-2 text-[10px] text-white/50">
                      Expires in {daysUntil(q.expires_at)} days
                    </div>
                  )}
                  {profile?.role !== "customer" && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-white/50">
                      <span>Set expiry</span>
                      <input
                        type="date"
                        className="rounded-lg bg-[#f1f5f9] px-2 py-1 text-xs text-[var(--slate-900)]"
                        defaultValue={q.expires_at ? q.expires_at.slice(0, 10) : ""}
                        onChange={async (e) => {
                          const value = e.target.value;
                          await fetch("/api/quotes/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              quoteId: q.id,
                              expires_at: value ? new Date(value).toISOString() : null,
                            }),
                          });
                          load();
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="text-left sm:text-right text-[10px] text-white/50">
                  <div>Sent {formatDate(q.sent_at || q.created_at)}</div>
                  <div>Viewed {formatDate(q.viewed_at)}</div>
                  <div>
                    Responded {q.responded_at ? `${formatDate(q.responded_at)} (${q.status})` : "—"}
                  </div>
                  <div className={isExpiringSoon(q.expires_at) ? "text-orange-200" : ""}>
                    Expires {q.expires_at ? formatDate(q.expires_at) : "—"}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {q.url && (
                  <a
                    className="rounded-lg border border-white/20 px-3 py-1 w-full sm:w-auto text-center"
                    href={q.url}
                    target="_blank"
                  >
                    Download
                  </a>
                )}
                {q.url && profile?.role !== "customer" && (
                  <button
                    className="rounded-lg border border-white/20 px-3 py-1 w-full sm:w-auto"
                    onClick={() => {
                      setSelectedId(q.id);
                      if (profile?.role === "customer") {
                        fetch("/api/notifications/quote-viewed", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ quoteId: q.id, projectId: q.project_id }),
                        });
                      }
                    }}
                  >
                    Preview
                  </button>
                )}
                {canEdit(profile?.role) && (
                  <button
                    className="rounded-lg border border-white/20 px-3 py-1"
                    onClick={() => updateQuote(q.id, { pinned: !q.pinned })}
                  >
                    {q.pinned ? "Unpin" : "Pin"}
                  </button>
                )}
                {canEdit(profile?.role) && (
                  <button
                    className="rounded-lg border border-white/20 px-3 py-1"
                    onClick={() => updateQuote(q.id, { archived: !q.archived })}
                  >
                    {q.archived ? "Unarchive" : "Archive"}
                  </button>
                )}
                {canEdit(profile?.role) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className="rounded-lg border border-white/20 bg-transparent px-2 py-1"
                      value={formatDateInput(q.expires_at)}
                      onChange={(e) =>
                        updateQuote(q.id, {
                          expires_at: e.target.value ? `${e.target.value}T17:00:00` : null,
                        })
                      }
                    />
                    {q.expires_at && (
                      <button
                        className="rounded-lg border border-white/20 px-3 py-1"
                        onClick={() => sendExpiryReminder(q.id)}
                        disabled={!!q.reminder_sent_at || remindId === q.id}
                      >
                        {q.reminder_sent_at ? "Reminder sent" : "Send reminder"}
                      </button>
                    )}
                  </div>
                )}
                {canEdit(profile?.role) && (
                  <button
                    className={`rounded-lg border border-white/20 px-3 py-1 ${resendId === q.id ? "opacity-50" : ""}`}
                    onClick={() => resendQuote(q.id)}
                  >
                    Resend email
                  </button>
                )}
                {canEdit(profile?.role) && (
                  <button
                    className="rounded-lg border border-red-400/40 text-red-200 px-3 py-1"
                    onClick={() => deleteQuote(q.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
              {canEdit(profile?.role) && (
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-wide text-white/40">
                    Internal notes
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 text-xs"
                    rows={2}
                    value={noteDrafts[q.id] ?? q.internal_notes ?? ""}
                    onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    onBlur={(e) => {
                      const next = e.target.value;
                      if ((q.internal_notes || "") !== next)
                        updateQuote(q.id, { internal_notes: next });
                    }}
                    placeholder="Add private notes for the team"
                  />
                </div>
              )}
            </div>
          ))}
          {!filteredQuotes.length && <div className="text-white/50 text-xs">No quotes yet.</div>}
        </div>
      </div>

      {profile?.role !== "customer" && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="section-title">Preview</div>
            {selectedId &&
              (() => {
                const q = quotes.find((x) => x.id === selectedId);
                return q?.url ? (
                  <a className="btn-ghost" href={q.url} target="_blank" rel="noreferrer">
                    Download
                  </a>
                ) : null;
              })()}
          </div>
          <div className="mt-3">
            <select
              className="w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
              value={selectedId || ""}
              onChange={(e) => {
                const q = quotes.find((x) => x.id === e.target.value);
                if (q) {
                  setSelectedId(q.id);
                  if (profile?.role === "customer") {
                    fetch("/api/notifications/quote-viewed", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ quoteId: q.id, projectId: q.project_id }),
                    });
                  }
                }
              }}
            >
              <option value="">Select quote to preview</option>
              {filteredQuotes
                .filter((q) => q.url)
                .map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.projects?.name || q.project_id} — v{q.version || 1} — {q.file_path}
                  </option>
                ))}
            </select>
          </div>
          {selectedId && quotes.find((x) => x.id === selectedId)?.url ? (
            <iframe
              title="Quote preview"
              src={quotes.find((x) => x.id === selectedId)?.url}
              className="mt-3 h-[520px] w-full rounded-xl border border-white/10 bg-white/5"
            />
          ) : (
            <div className="mt-3 flex h-[520px] items-center justify-center rounded-xl border border-white/10 text-white/50">
              Select a quote to preview
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
