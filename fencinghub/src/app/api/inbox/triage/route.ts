import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const inferPriority = (text: string) => {
  if (/urgent|asap|immediately|critical/i.test(text)) return "urgent";
  if (/soon|important/i.test(text)) return "high";
  return "normal";
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: msg } = await supabase
    .from("inbox_messages")
    .select("subject, body")
    .eq("id", id)
    .single();
  const text = `${msg?.subject || ""} ${msg?.body || ""}`;
  const priority = inferPriority(text);
  const tags: string[] = [];
  if (/quote/i.test(text)) tags.push("quote");
  if (/invoice/i.test(text)) tags.push("invoice");
  if (/snag|issue|problem/i.test(text)) tags.push("snag");

  const { data, error } = await supabase
    .from("inbox_messages")
    .update({ status: "triaged", priority, tags, triage_reason: "auto" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}
