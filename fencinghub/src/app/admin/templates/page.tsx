"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    const res = await fetch("/api/templates/list");
    const data = await res.json();
    if (res.ok) setTemplates(data.templates || []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name || !body) return;
    await fetch("/api/templates/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, body, channel: "email" }),
    });
    setName("");
    setSubject("");
    setBody("");
    load();
  };

  return (
    <DashboardShell title="Templates" subtitle="Reusable messages for customers">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="section-title">New template</div>
          <input
            className="mt-3 w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="mt-2 w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
            placeholder="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="mt-2 w-full rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
            rows={6}
            placeholder="Message body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button className="mt-3 btn-primary" onClick={create}>
            Save template
          </button>
        </div>
        <div className="card p-4">
          <div className="section-title">Templates</div>
          <div className="mt-3 space-y-2 text-sm">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 p-3">
                <div className="font-medium">{t.name}</div>
                {t.subject && <div className="text-xs text-white/50">{t.subject}</div>}
                <div className="mt-2 text-xs text-white/60 whitespace-pre-wrap">{t.body}</div>
                <button
                  className="btn-ghost mt-2"
                  onClick={async () => {
                    await fetch("/api/templates/delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: t.id }),
                    });
                    load();
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
