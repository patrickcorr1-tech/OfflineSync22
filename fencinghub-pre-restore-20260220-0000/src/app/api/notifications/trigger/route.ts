import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

// Example hook to log a notification payload
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId, type, payload } = await req.json();
  await supabase.from("notifications").insert({ user_id: targetUserId, type, payload });
  return NextResponse.json({ ok: true });
}
