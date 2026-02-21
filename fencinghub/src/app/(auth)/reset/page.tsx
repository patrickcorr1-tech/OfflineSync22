"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import AuthShell from "@/components/AuthShell";

export default function ResetPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    });
    setSent(true);
  };

  return (
    <AuthShell title="Reset password" subtitle="We’ll email you a reset link.">
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn-primary w-full">Send reset link</button>
        {sent && <p className="text-emerald-300 text-sm">Reset link sent.</p>}
      </form>
    </AuthShell>
  );
}
