"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.signOut().finally(() => {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("fh_auth_storage");
          window.localStorage.removeItem("supabase.auth.token");
          window.sessionStorage.removeItem("supabase.auth.token");
        } catch {
          // Ignore storage errors
        }
      }
      router.push("/login");
    });
  }, []);

  return <p className="p-6">Signing out...</p>;
}
