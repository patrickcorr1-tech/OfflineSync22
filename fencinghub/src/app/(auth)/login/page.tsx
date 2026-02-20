"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("fh_auth_storage", rememberMe ? "local" : "session");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    router.push("/");
  };

  return (
    <AuthShell title="Sign in" subtitle="Access your FencingHub workspace.">
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm text-[var(--slate-900)]"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-[var(--slate-900)]"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--slate-700)]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/30"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Keep me signed in
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn-primary w-full">Sign in</button>
        <div className="text-sm text-[var(--slate-500)] flex justify-between">
          <a href="/signup" className="underline">
            Create account
          </a>
          <a href="/reset" className="underline">
            Forgot password
          </a>
        </div>
      </form>
    </AuthShell>
  );
}
