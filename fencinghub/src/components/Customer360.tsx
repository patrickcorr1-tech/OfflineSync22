"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getSignedUrl } from "@/lib/storage";
import { useProfile } from "@/lib/useProfile";

export default function Customer360({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [project, setProject] = useState<any | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);

  const isStaff = ["admin", "sales", "contractor"].includes(profile?.role || "");

  useEffect(() => {
    if (!projectId || !isStaff) return;
    const load = async () => {
      const { data: proj } = await supabase
        .from("projects")
        .select(
          "id,name,customer_email,companies(id,name,whatsapp_group_link,whatsapp_group_placeholder)",
        )
        .eq("id", projectId)
        .single();
      setProject(proj || null);

      if (proj?.companies?.id) {
        const { data: contactRows } = await supabase
          .from("company_contacts")
          .select("id,full_name,email,phone,is_primary,role")
          .eq("company_id", proj.companies.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true });
        setContacts(contactRows || []);
      }

      const { data: quoteRows } = await supabase
        .from("quotes")
        .select("id,file_path,expires_at,status,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(5);
      const quotesWithUrls = await Promise.all(
        (quoteRows || []).map(async (q: any) => ({
          ...q,
          url: q.file_path ? await getSignedUrl("quotes", q.file_path) : null,
        })),
      );
      setQuotes(quotesWithUrls || []);
    };
    load();
  }, [projectId, isStaff]);

  if (!isStaff || !project) return null;

  return (
    <div className="card p-4">
      <div className="section-title">Customer 360</div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
            Company
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--slate-900)]">
            {project.companies?.name || "Unknown"}
          </div>
          {project.customer_email && (
            <div className="mt-2 text-xs text-[var(--slate-500)]">
              Primary email: {project.customer_email}
            </div>
          )}
          {project.companies?.whatsapp_group_link && (
            <div className="mt-2">
              <a
                className="btn-ghost text-xs"
                href={project.companies.whatsapp_group_link}
                target="_blank"
              >
                Open WhatsApp group
              </a>
              {project.companies?.whatsapp_group_placeholder && (
                <div className="mt-1 text-xs text-[var(--slate-500)]">
                  {project.companies.whatsapp_group_placeholder}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
            Latest quotes
          </div>
          {quotes.length === 0 ? (
            <div className="mt-2 text-xs text-[var(--slate-500)]">No quotes yet.</div>
          ) : (
            <div className="mt-2 space-y-2 text-xs">
              {quotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[var(--slate-900)]">Quote</div>
                    <div className="text-[var(--slate-500)]">
                      {q.expires_at
                        ? `Expires ${new Date(q.expires_at).toLocaleDateString()}`
                        : "No expiry"}
                    </div>
                  </div>
                  {q.url && (
                    <a className="btn-ghost text-xs" href={q.url} target="_blank">
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--slate-500)]">
          Contacts
        </div>
        {contacts.length === 0 ? (
          <div className="mt-2 text-xs text-[var(--slate-500)]">No contacts on file.</div>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            {contacts.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-[var(--slate-900)]">{c.full_name}</div>
                  <div className="text-xs text-[var(--slate-500)]">
                    {c.role || "Contact"}
                    {c.is_primary ? " • Primary" : ""}
                  </div>
                  <div className="text-xs text-[var(--slate-500)]">
                    {c.email || "No email"} {c.phone ? `• ${c.phone}` : ""}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  {c.phone && (
                    <a className="btn-ghost" href={`tel:${c.phone}`}>
                      Call
                    </a>
                  )}
                  {c.email && (
                    <a className="btn-ghost" href={`mailto:${c.email}`}>
                      Email
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
