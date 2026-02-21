"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";

export default function SignupPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);

    if (companyName.trim()) {
      await fetch("/api/onboarding/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });
    }

    router.push("/login");
  };

  return (
    <AuthShell title="Create account" subtitle="Invite-only in production.">
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
          placeholder="Company name (or Non Business)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        {error && <p className="text-red-300 text-sm">{error}</p>}
        <button className="btn-primary w-full">Create account</button>
        <div className="text-sm text-white/60">
          <a href="/login" className="underline">
            Back to login
          </a>
        </div>
      </form>
    </AuthShell>
  );
}
