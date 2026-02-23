import { NextResponse } from "next/server";
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
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile?.company_id) {
    return NextResponse.json({ error: "Missing company" }, { status: 400 });
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", profile.company_id);

  const ids = (projects || []).map((p) => p.id);
  if (!ids.length) return NextResponse.json({ quotes: [] });

  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      "id,status,file_path,project_id,version,pinned,archived,sent_at,viewed_at,responded_at,response_comment,expires_at,response_due_at,reminder_sent_at,projects(name),created_at",
    )
    .in("project_id", ids)
    .order("created_at", { ascending: false });

  const signed = await Promise.all(
    (quotes || []).map(async (q: any) => {
      if (!q.file_path) return { ...q, url: null };
      const { data } = await supabase.storage.from("quotes").createSignedUrl(q.file_path, 60 * 60);
      return { ...q, url: data?.signedUrl || null };
    }),
  );

  return NextResponse.json({ quotes: signed });
}
