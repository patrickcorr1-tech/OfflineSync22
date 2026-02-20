import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { name, email, company, message } = await req.json();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const to = "patrickcorr4@gmail.com";

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "AgriFence Assistant — Out of hours request",
    html: `<p><strong>Name:</strong> ${name || ""}</p>
           <p><strong>Email/Phone:</strong> ${email || ""}</p>
           <p><strong>Company:</strong> ${company || ""}</p>
           <p><strong>Message:</strong><br/>${(message || "").replace(/\n/g, "<br/>")}</p>`,
  });

  return NextResponse.json({ ok: true });
}
