"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function ProjectSnags({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const [snags, setSnags] = useState<any[]>([]);
  const [title, setTitle] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("snags")
      .select("id,title,status,created_at")
      .eq("project_id", projectId);
    setSnags(data || []);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const add = async () => {
    if (!title.trim()) return;
    await supabase.from("snags").insert({ project_id: projectId, title });
    setTitle("");
    load();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl bg-white/10 px-4 py-2"
          placeholder="New snag"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="rounded-xl bg-white text-black px-4" onClick={add}>
          Add
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {snags.map((s) => (
          <div key={s.id} className="rounded-xl border border-white/10 p-3">
            <div className="flex justify-between">
              <span>{s.title}</span>
              <span className="text-xs text-white/50">{s.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
