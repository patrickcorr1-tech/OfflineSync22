"use client";

import { useState } from "react";
import AuthShell from "@/components/AuthShell";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/onboarding/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, companyName: companyName.trim() || null }),
    });

    if (!res.ok) {
      const data = await res.json();
      return setError(data?.error || "Request failed");
    }

    setSubmitted(true);
  };

  return (
    <AuthShell title="Request access" subtitle="Invite-only — admin approval required.">
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
          placeholder="Company name (or Non Business)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        {error && <p className="text-red-300 text-sm">{error}</p>}
        {submitted && (
          <p className="text-emerald-300 text-sm">Request sent. We’ll email you once approved.</p>
        )}
        <button className="btn-primary w-full" disabled={submitted}>
          Request access
        </button>
        <div className="text-sm text-white/60">
          <a href="/login" className="underline">
            Back to login
          </a>
        </div>
      </form>
    </AuthShell>
  );
}
