"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export type Profile = {
  id: string;
  role: "admin" | "sales" | "contractor" | "customer";
  full_name: string | null;
  company_id: string | null;
};

export function useProfile() {
  const supabase = createSupabaseBrowserClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, role, full_name, company_id")
        .eq("id", user.id)
        .single();
      setProfile(data as Profile);
      setLoading(false);
    };
    load();
  }, []);

  return { profile, loading };
}
