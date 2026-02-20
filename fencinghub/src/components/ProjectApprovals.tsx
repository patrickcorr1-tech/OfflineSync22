"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";
import { canEdit } from "@/lib/roles";

export default function ProjectApprovals({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [type, setType] = useState("");
  const [staffComment, setStaffComment] = useState("");
  const [responseComments, setResponseComments] = useState<Record<string, string>>({});
  const [whatsAppPhones, setWhatsAppPhones] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("approvals")
      .select("id,type,status,created_at")
      .eq("project_id", projectId);
    setApprovals(data || []);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const submit = async () => {
    if (!type.trim()) return;
    await supabase.from("approvals").insert({ project_id: projectId, type, comment: staffComment });
    setType("");
    setStaffComment("");
    load();
  };

  const decide = async (id: string, status: "approved" | "rejected", responseComment?: string) => {
    await supabase.from("approvals").update({ status, comment: responseComment }).eq("id", id);
    await fetch("/api/notify/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title: `Approval ${status}`,
        body: `Customer ${status} an approval.`,
      }),
    });
    await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "riley.wheatcroft@stowag.com",
        subject: `Approval ${status} — Project ${projectId}`,
        html: `<p>Customer ${status} an approval for project ${projectId}.</p>`,
      }),
    });
    setResponseComments((prev) => ({ ...prev, [id]: "" }));
    load();
  };

  const sendWhatsApp = async (approvalId: string) => {
    const phone = whatsAppPhones[approvalId] || "";
    const res = await fetch("/api/approvals/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId, projectId, phone }),
    });
    const data = await res.json();
    if (res.ok && data?.waLink) {
      window.open(data.waLink, "_blank");
      setWhatsAppPhones((prev) => ({ ...prev, [approvalId]: "" }));
    }
  };

  return (
    <div className="panel p-5">
      {canEdit(profile?.role) && (
        <div className="flex flex-col gap-2">
          <input
            className="rounded-xl bg-white/10 px-4 py-2"
            placeholder="Approval type (e.g., Gate position)"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <input
            className="rounded-xl bg-white/10 px-4 py-2"
            placeholder="Notes for customer"
            value={staffComment}
            onChange={(e) => setStaffComment(e.target.value)}
          />
          <button className="btn-primary" onClick={submit}>
            Submit
          </button>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {approvals.map((a) => (
          <div key={a.id} className="rounded-xl border border-white/10 p-3 bg-black/30">
            <div className="flex justify-between">
              <span>{a.type}</span>
              <span className="text-xs text-white/50">{a.status}</span>
            </div>
            {canEdit(profile?.role) && a.status === "pending" && (
              <div className="mt-2 flex flex-col gap-2">
                <input
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs"
                  placeholder="WhatsApp phone (e.g. +614...)"
                  value={whatsAppPhones[a.id] ?? ""}
                  onChange={(e) =>
                    setWhatsAppPhones((prev) => ({ ...prev, [a.id]: e.target.value }))
                  }
                />
                <button
                  className="rounded-lg border border-white/20 px-3 py-1 text-xs"
                  onClick={() => sendWhatsApp(a.id)}
                >
                  Send WhatsApp approval link
                </button>
              </div>
            )}
            {profile?.role === "customer" && a.status === "pending" && (
              <div className="mt-2 flex flex-col gap-2">
                <input
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs"
                  placeholder="Comment (optional)"
                  value={responseComments[a.id] ?? ""}
                  onChange={(e) =>
                    setResponseComments((prev) => ({ ...prev, [a.id]: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <button
                    className="rounded-lg bg-white text-black px-3 py-1 text-xs"
                    onClick={() => decide(a.id, "approved", responseComments[a.id] || "")}
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-lg border border-white/20 px-3 py-1 text-xs"
                    onClick={() => decide(a.id, "rejected", responseComments[a.id] || "")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
