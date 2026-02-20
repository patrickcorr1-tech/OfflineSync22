"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.signOut().then(() => router.push("/login"));
  }, []);

  return <p className="p-6">Signing out...</p>;
}
