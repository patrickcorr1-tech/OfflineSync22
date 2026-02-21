"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

export default function TemplatesPage() {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const isStaff = profile?.role && profile.role !== "customer";
  const [templates, setTemplates] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("message_templates")
      .select("id,name,channel,subject,body,is_active,created_at")
      .order("created_at", { ascending: false });
    setTemplates(data || []);
  };

  useEffect(() => {
    if (!isStaff) return;
    load();
  }, [isStaff]);

  const createTemplate = async () => {
    if (!name.trim() || !body.trim()) return;
    await supabase.from("message_templates").insert({
      name: name.trim(),
      channel,
      subject: subject.trim() || null,
      body: body.trim(),
      created_by: profile?.id,
    });
    setName("");
    setSubject("");
    setBody("");
    load();
  };

  const updateTemplate = async (id: string, patch: Record<string, any>) => {
    await supabase.from("message_templates").update(patch).eq("id", id);
    load();
  };

  return (
    <DashboardShell title="Templates" subtitle="Reusable responses for email and WhatsApp.">
      {!isStaff && <p className="text-white/60">Staff access only.</p>}
      {isStaff && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="section-title">New template</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                className="rounded-2xl bg-[#0b1118] px-3 py-2 text-sm text-white/90"
                placeholder="Template name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <select
                className="rounded-2xl bg-[#0b1118] px-3 py-2 text-sm text-white/90"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
              <input
                className="rounded-2xl bg-[#0b1118] px-3 py-2 text-sm text-white/90 md:col-span-2"
                placeholder="Subject (optional)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <textarea
                className="rounded-2xl bg-[#0b1118] px-3 py-2 text-sm text-white/90 md:col-span-2"
                rows={4}
                placeholder="Template body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <button className="btn-primary mt-3" onClick={createTemplate}>
              Save template
            </button>
          </div>

          <div className="card p-5">
            <div className="section-title">Saved templates</div>
            {templates.length === 0 && (
              <div className="mt-2 text-xs text-white/50">No templates yet.</div>
            )}
            <div className="mt-3 space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs text-white/50">{t.channel}</div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-white/60">
                      <input
                        type="checkbox"
                        checked={t.is_active}
                        onChange={(e) => updateTemplate(t.id, { is_active: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                  <input
                    className="mt-3 w-full rounded-lg bg-[#0b1118] px-3 py-2 text-xs text-white/90"
                    value={t.subject || ""}
                    onChange={(e) => updateTemplate(t.id, { subject: e.target.value })}
                    placeholder="Subject"
                  />
                  <textarea
                    className="mt-2 w-full rounded-lg bg-[#0b1118] px-3 py-2 text-xs text-white/90"
                    rows={3}
                    value={t.body || ""}
                    onChange={(e) => updateTemplate(t.id, { body: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
