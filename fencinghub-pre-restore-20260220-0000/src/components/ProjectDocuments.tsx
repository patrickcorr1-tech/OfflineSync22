"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import UploadToBucket from "@/components/UploadToBucket";
import { useProfile } from "@/lib/useProfile";
import { canEdit } from "@/lib/roles";
import { getSignedUrl } from "@/lib/storage";

export default function ProjectDocuments({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  // isCustomer moved above
  const isStaff = ["admin", "sales", "contractor"].includes(profile?.role || "");
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<{
    type: "quote" | "invoice";
    url: string;
    label: string;
  } | null>(null);
  const [responseComments, setResponseComments] = useState<Record<string, string>>({});
  const [fileCounts, setFileCounts] = useState({
    projectPhotos: 0,
    snagPhotos: 0,
    requestPhotos: 0,
  });

  const load = async () => {
    const { data: q } = await supabase
      .from("quotes")
      .select(
        "id,status,file_path,response_comment,version,viewed_at,sent_at,responded_at,created_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    const { data: inv } = await supabase
      .from("invoices")
      .select("id,file_path,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    const { data: so } = await supabase
      .from("sales_orders")
      .select("id,project_id,quote_id,expected_delivery_date,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    const qWithUrls = await Promise.all(
      (q || []).map(async (x: any) => ({
        ...x,
        url: x.file_path ? await getSignedUrl("quotes", x.file_path) : null,
      })),
    );
    const iWithUrls = await Promise.all(
      (inv || []).map(async (x: any) => ({
        ...x,
        url: x.file_path ? await getSignedUrl("invoices", x.file_path) : null,
      })),
    );

    setQuotes(qWithUrls || []);
    setInvoices(iWithUrls || []);
    setOrders(so || []);

    const [projectPhotos, snagPhotos, requestPhotos] = await Promise.all([
      supabase.from("project_photos").select("id").eq("project_id", projectId),
      supabase
        .from("snag_photos")
        .select("id, snag_id")
        .in(
          "snag_id",
          (await supabase.from("snags").select("id").eq("project_id", projectId)).data?.map(
            (s: any) => s.id,
          ) || [],
        ),
      supabase
        .from("quote_request_photos")
        .select("id, quote_request_id")
        .in(
          "quote_request_id",
          (
            await supabase.from("quote_requests").select("id").eq("project_id", projectId)
          ).data?.map((q: any) => q.id) || [],
        ),
    ]);
    setFileCounts({
      projectPhotos: projectPhotos.data?.length || 0,
      snagPhotos: snagPhotos.data?.length || 0,
      requestPhotos: requestPhotos.data?.length || 0,
    });

    if (!selected) {
      const firstQuote = qWithUrls?.[0];
      const firstInvoice = iWithUrls?.[0];
      if (firstQuote?.url) setSelected({ type: "quote", url: firstQuote.url, label: "Quote" });
      else if (firstInvoice?.url)
        setSelected({ type: "invoice", url: firstInvoice.url, label: "Invoice" });
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const onQuoteUploaded = async (path: string) => {
    await supabase.from("quotes").insert({
      project_id: projectId,
      file_path: path,
      status: "sent",
      sent_at: new Date().toISOString(),
    });
    await fetch("/api/notify/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title: "Quote sent", body: "A new quote is available." }),
    });
    await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "riley.wheatcroft@stowag.com",
        subject: `Quote sent — Project ${projectId}`,
        html: `<p>A new quote was sent for project ${projectId}.</p>`,
      }),
    });
    load();
  };

  const onInvoiceUploaded = async (path: string) => {
    await supabase.from("invoices").insert({ project_id: projectId, file_path: path });
    load();
  };

  const respondQuote = async (id: string, status: "accepted" | "rejected") => {
    const comment = responseComments[id] || "";
    await supabase
      .from("quotes")
      .update({ status, response_comment: comment, responded_at: new Date().toISOString() })
      .eq("id", id);

    if (status === "accepted") {
      await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, quoteId: id }),
      });
    }

    await fetch("/api/notify/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title: `Quote ${status}`,
        body: `Customer ${status} the quote${comment ? `: ${comment}` : "."}`,
      }),
    });
    await fetch("/api/notifications/project-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        type: "quote_response",
        title: `Quote ${status}`,
        body: comment || "Customer responded to quote",
      }),
    });
    await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "riley.wheatcroft@stowag.com",
        subject: `Quote ${status} — Project ${projectId}`,
        html: `<p>Customer ${status} the quote for project ${projectId}.</p><p>${comment}</p>`,
      }),
    });
    setResponseComments((prev) => ({ ...prev, [id]: "" }));
    load();
  };

  const updateDeliveryDate = async (orderId: string, date: string) => {
    await supabase.from("sales_orders").update({ expected_delivery_date: date }).eq("id", orderId);
    load();
  };

  const allDocs = [
    ...(quotes || []).map((q) => ({
      id: q.id,
      type: "quote" as const,
      label: `Quote v${q.version || 1} — ${q.file_path}`,
      url: q.url,
    })),
    ...(invoices || []).map((i) => ({
      id: i.id,
      type: "invoice" as const,
      label: `Invoice — ${i.file_path}`,
      url: i.url,
    })),
  ].filter((d) => d.url);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center justify-between">
            <div className="section-title">Preview</div>
            {selected?.url && (
              <a className="btn-ghost" href={selected.url} target="_blank" rel="noreferrer">
                Download
              </a>
            )}
          </div>
          <div className="mt-3">
            <select
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm"
              value={selected?.url || ""}
              onChange={(e) => {
                const doc = allDocs.find((d) => d.url === e.target.value);
                if (doc) {
                  setSelected({ type: doc.type, url: doc.url, label: doc.label });
                  if (profile?.role === "customer" && doc.type === "quote") {
                    fetch("/api/notifications/quote-viewed", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ quoteId: doc.id, projectId }),
                    });
                  }
                }
              }}
            >
              <option value="">Select document to preview</option>
              {allDocs.map((d) => (
                <option key={d.id} value={d.url}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          {selected?.url ? (
            <iframe
              title="Document preview"
              src={selected.url}
              className="mt-3 h-[520px] w-full rounded-xl border border-white/10 bg-white/5"
            />
          ) : (
            <div className="mt-3 flex h-[520px] items-center justify-center rounded-xl border border-white/10 text-white/50">
              Select a document to preview
            </div>
          )}
        </div>

        <div className="space-y-6">
          {isStaff && (
            <div className="panel p-5">
              <h3 className="section-title">Project files</h3>
              <div className="mt-3 text-xs text-white/60">
                Customer photos: {fileCounts.projectPhotos} • Snag photos: {fileCounts.snagPhotos} •
                Quote request photos: {fileCounts.requestPhotos}
              </div>
              <div className="mt-3">
                <a
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs inline-flex"
                  href={`/api/projects/download-files?projectId=${projectId}`}
                >
                  Download all files (zip)
                </a>
              </div>
            </div>
          )}

          <div className="panel p-5">
            <h3 className="section-title">Quotes</h3>
            {canEdit(profile?.role) && (
              <UploadToBucket bucket="quotes" onUploaded={onQuoteUploaded} />
            )}
            <div className="mt-3 space-y-3">
              {quotes.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-white/10 p-3 text-xs bg-black/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {q.file_path}
                      <span className="ml-2 text-white/50">v{q.version || 1}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${q.status === "accepted" ? "bg-emerald-500/20 text-emerald-200" : q.status === "rejected" ? "bg-red-500/20 text-red-200" : q.status === "expired" ? "bg-orange-500/20 text-orange-200" : "bg-blue-500/20 text-blue-200"}`}
                      >
                        {q.status}
                      </span>
                      {q.viewed_at && (
                        <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-200">
                          Viewed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-white/50">
                    Sent{" "}
                    {q.sent_at
                      ? new Date(q.sent_at).toLocaleString()
                      : new Date(q.created_at).toLocaleString()}{" "}
                    • Viewed {q.viewed_at ? new Date(q.viewed_at).toLocaleString() : "—"} •
                    Responded {q.responded_at ? new Date(q.responded_at).toLocaleString() : "—"}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-white/50">
                    <div
                      className={`rounded-lg px-2 py-1 ${q.sent_at ? "bg-emerald-500/20" : "bg-white/10"}`}
                    >
                      Sent
                    </div>
                    <div
                      className={`rounded-lg px-2 py-1 ${q.viewed_at ? "bg-emerald-500/20" : "bg-white/10"}`}
                    >
                      Viewed
                    </div>
                    <div
                      className={`rounded-lg px-2 py-1 ${q.responded_at ? "bg-emerald-500/20" : "bg-white/10"}`}
                    >
                      Responded
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.url && (
                      <button
                        className="rounded-lg border border-white/20 px-3 py-1"
                        onClick={() => {
                          setSelected({ type: "quote", url: q.url, label: q.file_path });
                          if (profile?.role === "customer") {
                            fetch("/api/notifications/quote-viewed", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ quoteId: q.id, projectId }),
                            });
                          }
                        }}
                      >
                        Preview
                      </button>
                    )}
                    {q.url && (
                      <a
                        className="rounded-lg border border-white/20 px-3 py-1"
                        href={q.url}
                        target="_blank"
                      >
                        Download
                      </a>
                    )}
                    {isStaff && (
                      <>
                        <button
                          className="rounded-lg border border-white/20 px-3 py-1"
                          onClick={async () => {
                            await fetch("/api/quotes/update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                quoteId: q.id,
                                status: "sent",
                                sent_at: new Date().toISOString(),
                              }),
                            });
                            await fetch("/api/notifications/project-update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                projectId,
                                type: "quote_sent",
                                title: "Quote sent",
                                body: "A quote was sent",
                                audience: "customers",
                                push: true,
                              }),
                            });
                            load();
                          }}
                        >
                          Mark sent
                        </button>
                        <button
                          className="rounded-lg border border-white/20 px-3 py-1"
                          onClick={async () => {
                            await fetch("/api/quotes/update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                quoteId: q.id,
                                viewed_at: new Date().toISOString(),
                              }),
                            });
                            await fetch("/api/notifications/project-update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                projectId,
                                type: "quote_viewed",
                                title: "Quote viewed",
                                body: "Quote marked viewed",
                                audience: "customers",
                                push: true,
                              }),
                            });
                            load();
                          }}
                        >
                          Mark viewed
                        </button>
                        <button
                          className="rounded-lg border border-white/20 px-3 py-1"
                          onClick={async () => {
                            await fetch("/api/quotes/update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                quoteId: q.id,
                                status: "accepted",
                                responded_at: new Date().toISOString(),
                              }),
                            });
                            await fetch("/api/notifications/project-update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                projectId,
                                type: "quote_accepted",
                                title: "Quote accepted",
                                body: "Quote marked accepted",
                                audience: "customers",
                                push: true,
                              }),
                            });
                            load();
                          }}
                        >
                          Mark accepted
                        </button>
                        <button
                          className="rounded-lg border border-white/20 px-3 py-1"
                          onClick={async () => {
                            await fetch("/api/quotes/update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                quoteId: q.id,
                                status: "rejected",
                                responded_at: new Date().toISOString(),
                              }),
                            });
                            await fetch("/api/notifications/project-update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                projectId,
                                type: "quote_rejected",
                                title: "Quote rejected",
                                body: "Quote marked rejected",
                                audience: "customers",
                                push: true,
                              }),
                            });
                            load();
                          }}
                        >
                          Mark rejected
                        </button>
                      </>
                    )}
                    {profile?.role === "customer" && q.status === "sent" && (
                      <>
                        <input
                          className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs"
                          placeholder="Comment for sales (optional)"
                          value={responseComments[q.id] ?? ""}
                          onChange={(e) =>
                            setResponseComments((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg bg-white text-black px-3 py-1"
                            onClick={() => respondQuote(q.id, "accepted")}
                          >
                            Accept
                          </button>
                          <button
                            className="rounded-lg border border-white/20 px-3 py-1"
                            onClick={() => respondQuote(q.id, "rejected")}
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="section-title">Invoices</h3>
            {canEdit(profile?.role) && (
              <UploadToBucket bucket="invoices" onUploaded={onInvoiceUploaded} />
            )}
            <div className="mt-3 space-y-3">
              {invoices.map((i) => (
                <div
                  key={i.id}
                  className="rounded-xl border border-white/10 p-3 text-xs bg-black/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{i.file_path}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {i.url && (
                      <button
                        className="rounded-lg border border-white/20 px-3 py-1"
                        onClick={() =>
                          setSelected({ type: "invoice", url: i.url, label: i.file_path })
                        }
                      >
                        Preview
                      </button>
                    )}
                    {i.url && (
                      <a
                        className="rounded-lg border border-white/20 px-3 py-1"
                        href={i.url}
                        target="_blank"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="section-title">Delivery / Install</h3>
            <div className="mt-3 space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-white/10 p-3 text-xs bg-black/30"
                >
                  <div className="flex items-center justify-between">
                    <span>Sales order</span>
                    <span className="text-white/50">
                      {o.expected_delivery_date || "Not scheduled"}
                    </span>
                  </div>
                  {canEdit(profile?.role) && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="date"
                        className="rounded-lg bg-white/10 px-3 py-2 text-xs"
                        value={o.expected_delivery_date || ""}
                        onChange={(e) => updateDeliveryDate(o.id, e.target.value)}
                      />
                      <span className="text-white/50">Updates the shared calendar.</span>
                    </div>
                  )}
                </div>
              ))}
              {!orders.length && <div className="text-white/50 text-xs">No sales order yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
