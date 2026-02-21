import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

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
  if (!profile || (profile.role !== "admin" && profile.role !== "sales")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { projectName, address, notes, preferredDate, customerEmail, customerName, companyName } =
    body || {};

  if (!projectName || !customerEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let targetProfile = await admin
    .from("profiles")
    .select("id,company_id")
    .eq("email", customerEmail)
    .maybeSingle();

  let customerId = targetProfile.data?.id || null;
  let companyId = targetProfile.data?.company_id || null;

  if (!customerId) {
    const invite = await admin.auth.admin.inviteUserByEmail(customerEmail, {
      redirectTo: `${appUrl}/login`,
    });
    if (invite.error) {
      return NextResponse.json({ error: invite.error.message }, { status: 400 });
    }
    customerId = invite.data?.user?.id || null;
  }

  if (!companyId) {
    const name = (companyName || customerName || customerEmail.split("@")[0]).trim();
    const companyRes = await admin.from("companies").insert({ name }).select("id").single();
    if (companyRes.error) {
      return NextResponse.json({ error: companyRes.error.message }, { status: 400 });
    }
    companyId = companyRes.data.id;
  }

  if (customerId) {
    await admin.from("profiles").upsert({
      id: customerId,
      role: "customer",
      email: customerEmail,
      full_name: customerName || customerEmail.split("@")[0],
      company_id: companyId,
    });
  }

  const projectRes = await admin
    .from("projects")
    .insert({
      name: projectName,
      address,
      notes,
      preferred_date: preferredDate || null,
      company_id: companyId,
      customer_email: customerEmail,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (projectRes.error) {
    return NextResponse.json({ error: projectRes.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, projectId: projectRes.data.id });
}
