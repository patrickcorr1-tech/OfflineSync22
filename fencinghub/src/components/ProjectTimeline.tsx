"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { enqueueOutbox } from "@/lib/outbox";

export default function ProjectTimeline({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const [notes, setNotes] = useState<any[]>([]);
  const [content, setContent] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("project_notes")
      .select("id,content,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setNotes(data || []);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const add = async () => {
    if (!content.trim()) return;
    try {
      await supabase.from("project_notes").insert({ project_id: projectId, content });
    } catch {
      await enqueueOutbox("note", { project_id: projectId, content });
    }
    setContent("");
    load();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl bg-white/10 px-4 py-2"
          placeholder="Add note"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button className="rounded-xl bg-white text-black px-4" onClick={add}>
          Add
        </button>
        <span className="text-xs text-white/50">Queued changes sync automatically.</span>
      </div>
      <div className="mt-4 space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="rounded-xl border border-white/10 p-3 text-sm">
            {n.content}
          </div>
        ))}
      </div>
    </div>
  );
}
