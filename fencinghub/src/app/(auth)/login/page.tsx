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
      try {
        window.localStorage.setItem("fh_auth_storage", rememberMe ? "local" : "session");
      } catch {
        // Ignore storage errors (private mode / restricted storage)
      }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    router.push("/");
  };

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <AuthShell title="Sign in" subtitle="Access your FencingHub workspace.">
      {isOffline && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          You’re offline. Reconnect to sign in.
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-sm text-white/90"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-2xl bg-[#0b1118] px-4 py-3 text-white/90"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/30"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Keep me signed in
        </label>
        {error && <p className="text-red-300 text-sm">{error}</p>}
        <button className="btn-primary w-full">Sign in</button>
        <div className="text-sm text-white/60 flex justify-between">
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
