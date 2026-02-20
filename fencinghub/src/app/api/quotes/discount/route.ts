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

  const { quoteId, percent } = await req.json();
  if (!quoteId || !percent || percent <= 0) {
    return NextResponse.json({ error: "Invalid percent" }, { status: 400 });
  }

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, project_id")
    .eq("id", quoteId)
    .single();

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name, company_id")
    .eq("id", quote?.project_id)
    .single();

  const projectName = project?.name || "Project";
  const companyId = project?.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Missing company" }, { status: 400 });
  }

  const { data: approved } = await supabase
    .from("discount_approved_companies")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  const isApproved = !!approved;

  const { data: discount } = await supabase
    .from("quote_discounts")
    .insert({
      quote_id: quoteId,
      company_id: companyId,
      percent,
      status: isApproved ? "auto_approved" : "pending",
      requested_by: user.id,
    })
    .select("id")
    .single();

  if (!discount?.id) return NextResponse.json({ error: "Failed to create" }, { status: 500 });

  if (isApproved) {
    const pdf = await createDiscountPdf({ projectName, percent });
    const path = `discounts/${quoteId}/${Date.now()}-discount.pdf`;
    await supabase.storage.from("quotes").upload(path, pdf, { contentType: "application/pdf" });
    await supabase
      .from("quote_discounts")
      .update({ status: "approved", pdf_path: path, approved_by: user.id, approved_at: new Date() })
      .eq("id", discount.id);

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/project-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: quote.project_id,
        type: "discount_approved",
        title: "Discount approved",
        body: `Your ${percent}% discount has been approved.`,
        audience: "customers",
        push: true,
      }),
    });

    return NextResponse.json({ status: "approved", pdf_path: path });
  }

  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/project-update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: quote.project_id,
      type: "discount_request",
      title: "Discount request",
      body: `Customer requested ${percent}% discount`,
      audience: "admins",
      push: true,
    }),
  });

  return NextResponse.json({ status: "pending" });
}
