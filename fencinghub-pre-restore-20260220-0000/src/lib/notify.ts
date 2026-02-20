import webpush from "web-push";

export async function sendPush(subscription: any, payload: any) {
  webpush.setVapidDetails(
    `mailto:${process.env.SMTP_USER}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
