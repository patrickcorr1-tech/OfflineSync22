import { type NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  const { subscription, payload } = await req.json();

  webpush.setVapidDetails(
    `mailto:${process.env.SMTP_USER}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  await webpush.sendNotification(subscription, JSON.stringify(payload));
  return NextResponse.json({ ok: true });
}
