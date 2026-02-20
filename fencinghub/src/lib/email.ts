export async function sendEmail(to: string, subject: string, html: string) {
  await fetch("/api/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html }),
  });
}
