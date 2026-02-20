"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

function isWithinHours() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .reduce(
      (acc: any, p) => {
        if (p.type === "hour" || p.type === "minute") acc[p.type] = Number(p.value);
        return acc;
      },
      {} as Record<string, number>,
    );
  const minutes = parts.hour * 60 + parts.minute;
  return minutes >= 7 * 60 + 30 && minutes <= 17 * 60;
}

export default function LivePresenceWidget() {
  const supabase = createSupabaseBrowserClient();
  const { profile } = useProfile();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadCompany = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .single();
      setCompanyName(data?.name || null);
    };
    loadCompany();
  }, [profile?.company_id]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: profile.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flatMap((entries: any) => entries || []);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: profile.id,
            role: profile.role,
            name: profile.full_name || "Customer",
            company: companyName || "",
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role, profile?.full_name, companyName]);

  const staffOnline = useMemo(
    () => onlineUsers.filter((u) => ["admin", "sales", "contractor"].includes(u.role)).length,
    [onlineUsers],
  );

  const isCustomer = profile?.role === "customer";
  const inHours = isWithinHours();

  const submitHelpdesk = async () => {
    if (!message.trim()) return;
    setSending(true);
    await fetch("/api/helpdesk/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        name: name || profile?.full_name || "",
        email,
        company: companyName || "",
      }),
    });
    setMessage("");
    setSending(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        className="rounded-full bg-[#1d4ed8] px-4 py-2 text-white shadow-lg"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Need help?"}
      </button>

      {open && (
        <div className="mt-3 w-[320px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Live support</div>
          {inHours ? (
            <div className="mt-2 text-sm">
              <div className="font-semibold">Staff online: {staffOnline}</div>
              <p className="mt-2 text-slate-500">
                {staffOnline > 0 ? "A team member is online." : "No one online right now."}
              </p>
            </div>
          ) : (
            <div className="mt-2 text-sm">
              <div className="font-semibold">AgriFence Assistant (out of hours)</div>
              <p className="mt-1 text-slate-500">Leave a message and we’ll email the team.</p>
              <div className="mt-2 grid gap-2">
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Email or phone"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <textarea
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={4}
                  placeholder="How can we help?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button className="btn-primary" disabled={sending} onClick={submitHelpdesk}>
                  {sending ? "Sending..." : "Leave a message"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
