"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

export default function ProjectChecklist({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const isStaff = ["admin", "sales", "contractor"].includes(profile?.role || "");
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("project_checklist_items")
      .select("id,title,is_done,sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems(data || []);
  };

  useEffect(() => {
    if (!projectId) return;
    load();
  }, [projectId]);

  const add = async () => {
    if (!title.trim()) return;
    await supabase.from("project_checklist_items").insert({
      project_id: projectId,
      title,
      created_by: profile?.id,
      sort_order: items.length + 1,
    });
    setTitle("");
    load();
  };

  const toggle = async (id: string, is_done: boolean) => {
    await supabase.from("project_checklist_items").update({ is_done }).eq("id", id);
    load();
  };

  return (
    <div className="card p-4">
      <div className="section-title">Checklist</div>
      <div className="mt-3 space-y-2 text-sm">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-3 text-[var(--slate-500)]">
            No checklist items yet.
          </div>
        )}
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
          >
            <input
              type="checkbox"
              checked={item.is_done}
              onChange={(e) => toggle(item.id, e.target.checked)}
              disabled={!isStaff}
            />
            <span className={item.is_done ? "line-through text-[var(--slate-500)]" : ""}>
              {item.title}
            </span>
          </label>
        ))}
      </div>

      {isStaff && (
        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Add checklist item"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className="btn-primary" onClick={add}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}
