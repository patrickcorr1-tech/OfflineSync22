"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

export default function ProjectChat({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const isStaff = ["admin", "sales", "contractor"].includes(profile?.role || "");
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const quickReplies = [
    "Thanks for the update — we’re on it.",
    "Can you add a couple more photos?",
    "We’ll schedule a site visit shortly.",
    "Quote is being prepared now.",
  ];

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id,message,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };
    load();

    const channel = supabase
      .channel(`chat:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const send = async () => {
    if (!text.trim()) return;
    await supabase.from("chat_messages").insert({ project_id: projectId, message: text });
    // trigger push (server-side should route to project members)
    await fetch("/api/notify/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title: "New chat message", body: text }),
    });
    await fetch("/api/notifications/project-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        type: "chat_message",
        title: isStaff ? "New staff message" : "New customer message",
        body: text,
        audience: isStaff ? "customers" : "admins",
        push: true,
      }),
    });
    setText("");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="max-h-80 overflow-y-auto space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="rounded-xl bg-white/10 p-3 text-sm">
            {m.message}
          </div>
        ))}
      </div>
      {isStaff && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70"
              onClick={() => setText(reply)}
            >
              {reply}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-xl bg-white/10 px-4 py-2"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="rounded-xl bg-white text-black px-4" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
