"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

export default function ProjectReminders({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const isStaff = ["admin", "sales", "contractor"].includes(profile?.role || "");
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("project_reminders")
      .select("id,title,due_at,completed")
      .eq("project_id", projectId)
      .order("due_at", { ascending: true });
    setItems(data || []);
  };

  useEffect(() => {
    if (!projectId) return;
    load();
  }, [projectId]);

  const add = async (presetHours?: number) => {
    if (!title.trim() && !presetHours) return;
    const due = presetHours
      ? new Date(Date.now() + presetHours * 3600 * 1000).toISOString()
      : dueAt;
    await supabase.from("project_reminders").insert({
      project_id: projectId,
      title: title.trim() || `Follow up in ${presetHours}h`,
      due_at: due || null,
      assigned_to: profile?.id,
      created_by: profile?.id,
    });
    setTitle("");
    setDueAt("");
    load();
  };

  const toggle = async (id: string, completed: boolean) => {
    await supabase.from("project_reminders").update({ completed }).eq("id", id);
    load();
  };

  return (
    <div className="card p-4">
      <div className="section-title">Reminders</div>
      <div className="mt-3 space-y-2 text-sm">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-3 text-[var(--slate-500)]">
            No reminders yet.
          </div>
        )}
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
          >
            <div>
              <div className={item.completed ? "line-through text-[var(--slate-500)]" : ""}>
                {item.title}
              </div>
              {item.due_at && (
                <div className="text-xs text-[var(--slate-500)]">
                  Due {new Date(item.due_at).toLocaleString()}
                </div>
              )}
            </div>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={(e) => toggle(item.id, e.target.checked)}
              disabled={!isStaff}
            />
          </label>
        ))}
      </div>

      {isStaff && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Reminder title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="datetime-local"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
          <button className="btn-primary" onClick={() => add()}>
            Add
          </button>
        </div>
      )}

      {isStaff && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button className="btn-ghost" onClick={() => add(24)}>
            Follow‑up in 24h
          </button>
          <button className="btn-ghost" onClick={() => add(48)}>
            Follow‑up in 48h
          </button>
        </div>
      )}
    </div>
  );
}
