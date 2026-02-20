"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function ApprovalResponsePage() {
  const params = useParams();
  const token = (params?.token as string) || "";
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const respond = async (decision: "approved" | "rejected") => {
    setLoading(true);
    const res = await fetch("/api/approvals/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, status: decision, comment }),
    });
    if (res.ok) setStatus(decision);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--slate-900)] flex items-center justify-center p-6">
      <div className="card w-full max-w-xl p-6">
        <div className="section-title">Approval response</div>
        {status ? (
          <div className="mt-4 text-sm">
            Thanks! You have {status} this approval. You can close this page.
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-[var(--slate-500)]">
              Review the approval details shared with you and respond below.
            </p>
            <textarea
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comment (optional)"
            />
            <div className="mt-4 flex gap-2">
              <button
                className="btn-primary"
                disabled={loading}
                onClick={() => respond("approved")}
              >
                Approve
              </button>
              <button className="btn-ghost" disabled={loading} onClick={() => respond("rejected")}>
                Reject
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
