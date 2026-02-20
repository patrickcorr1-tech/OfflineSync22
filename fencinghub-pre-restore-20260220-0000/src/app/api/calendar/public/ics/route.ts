import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await admin
    .from("profiles")
    .select("id,calendar_token")
    .eq("calendar_token", token)
    .single();
  if (!profile) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  const { data: orders } = await admin
    .from("sales_orders")
    .select("id,expected_delivery_date,project_id,projects(name)")
    .not("expected_delivery_date", "is", null);

  const events = (orders || []).map((o: any) => {
    const date = formatDate(o.expected_delivery_date);
    const summary = `Install: ${o.projects?.name || o.project_id}`;
    return [
      "BEGIN:VEVENT",
      `UID:${o.id}@fencinghub`,
      `DTSTAMP:${date}T080000Z`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${date}`,
      `SUMMARY:${summary}`,
      "END:VEVENT",
    ].join("\n");
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FencingHub//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=install-calendar.ics",
    },
  });
}
