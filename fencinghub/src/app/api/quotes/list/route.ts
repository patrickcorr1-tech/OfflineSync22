import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "sales"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: quotes, error } = await admin
    .from("quotes")
    .select(
      "id,status,file_path,project_id,version,pinned,archived,internal_notes,sent_at,viewed_at,responded_at,response_comment,expires_at,reminder_sent_at,response_due_at,created_at,projects(name,customer_email)",
    )
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all(
    (quotes || []).map(async (q: any) => {
      const { data } = await admin.storage.from("quotes").createSignedUrl(q.file_path, 60 * 10);
      return { ...q, url: data?.signedUrl || null };
    }),
  );

  return NextResponse.json({ quotes: withUrls });
}
