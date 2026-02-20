import { createBrowserClient } from "@supabase/ssr";

function resolveStorage() {
  if (typeof window === "undefined") return undefined;
  try {
    const pref = window.localStorage.getItem("fh_auth_storage");
    if (pref === "session") return window.sessionStorage;
  } catch {
    return window.localStorage;
  }
  return window.localStorage;
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: resolveStorage(),
      },
    },
  );
}
