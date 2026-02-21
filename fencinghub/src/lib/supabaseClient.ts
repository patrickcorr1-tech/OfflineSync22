import { createBrowserClient } from "@supabase/ssr";

const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
})();

function resolveStorage() {
  if (typeof window === "undefined") return undefined;
  try {
    const pref = window.localStorage.getItem("fh_auth_storage");
    if (pref === "session") return window.sessionStorage;
  } catch {
    return memoryStorage;
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
