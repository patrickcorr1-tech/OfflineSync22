import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function createDiscountPdf({
  projectName,
  percent,
}: {
  projectName: string;
  percent: number;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width } = page.getSize();

  page.drawText("Discount Approval", { x: 48, y: 780, size: 22, font, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`Project: ${projectName}`, {
    x: 48,
    y: 740,
    size: 12,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText(`Discount: ${percent}%`, {
    x: 48,
    y: 720,
    size: 12,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText("This addendum confirms the approved discount for this quote.", {
    x: 48,
    y: 690,
    size: 10,
    font,
    color: rgb(0.35, 0.35, 0.35),
    maxWidth: width - 96,
  });

  return Buffer.from(await pdfDoc.save());
}

export async function POST(req: NextRequest) {
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

  const { discountId } = await req.json();
  if (!discountId) return NextResponse.json({ error: "Missing discountId" }, { status: 400 });

  const { data: discount } = await supabase
    .from("quote_discounts")
    .select("id, percent, quote_id")
    .eq("id", discountId)
    .single();

  if (!discount) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: quote } = await supabase
    .from("quotes")
    .select("project_id")
    .eq("id", discount.quote_id)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", quote?.project_id)
    .single();

  const pdf = await createDiscountPdf({
    projectName: project?.name || "Project",
    percent: Number(discount.percent),
  });

  const path = `discounts/${discount.quote_id}/${Date.now()}-discount.pdf`;
  await supabase.storage.from("quotes").upload(path, pdf, { contentType: "application/pdf" });

  await supabase
    .from("quote_discounts")
    .update({ status: "approved", pdf_path: path, approved_by: user.id, approved_at: new Date() })
    .eq("id", discount.id);

  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/project-update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: quote?.project_id,
      type: "discount_approved",
      title: "Discount approved",
      body: `Your ${discount.percent}% discount has been approved.`,
      audience: "customers",
      push: true,
    }),
  });

  return NextResponse.json({ ok: true, pdf_path: path });
}
