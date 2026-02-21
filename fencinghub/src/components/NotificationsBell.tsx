"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

export default function NotificationsBell({ compact = false }: { compact?: boolean }) {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id,type,payload,read,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data || []);
  };

  useEffect(() => {
    if (!profile?.id) return;
    load();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const unread = items.filter((i) => !i.read).length;

  const getLink = (n: any) => {
    const payload = n?.payload || {};
    if (payload.link) return payload.link;
    if (payload.projectId && payload.quoteId) return `/projects/${payload.projectId}?tab=Documents`;
    if (payload.projectId) return `/projects/${payload.projectId}?tab=Project%20details`;
    if (payload.quoteId) return `/admin/quotes`;
    return null;
  };

  const markRead = async () => {
    const unreadIds = items.filter((i) => !i.read).map((i) => i.id);
    if (unreadIds.length) {
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      load();
    }
  };

  if (!profile || !["admin", "sales"].includes(profile.role)) return null;

  return (
    <div className="relative">
      <button
        className={
          compact
            ? "rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80"
            : "rounded-full border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
        }
        onClick={() => {
          setOpen(!open);
          if (!open) markRead();
        }}
      >
        🔔 {unread > 0 ? `(${unread})` : ""}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-[#0b0d10] p-3 shadow-2xl">
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">Notifications</div>
          <div className="mt-3 space-y-2 max-h-80 overflow-auto">
            {items.map((n) => {
              const link = getLink(n);
              const content = (
                <div className="rounded-xl border border-white/10 p-3 text-xs hover:border-white/30 hover:bg-white/5 transition">
                  <div className="font-semibold">{n.payload?.title || n.type}</div>
                  {n.payload?.body && <div className="text-white/60 mt-1">{n.payload.body}</div>}
                  <div className="text-white/40 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              );
              return link ? (
                <Link key={n.id} href={link} onClick={() => setOpen(false)} className="block">
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
            {!items.length && <div className="text-white/50 text-xs">No notifications.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
