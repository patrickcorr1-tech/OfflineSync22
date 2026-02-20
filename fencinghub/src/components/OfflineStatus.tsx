"use client";

import { useEffect, useState } from "react";
import { countOutboxItems } from "@/lib/outbox";
import { countOutboxItems as countCustomerOutbox } from "@/lib/customerOutbox";
import { useProfile } from "@/lib/useProfile";

export default function OfflineStatus() {
  const { profile } = useProfile();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  const refresh = async () => {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    setOnline(isOnline);
    const count =
      profile?.role === "customer" ? await countCustomerOutbox() : await countOutboxItems();
    setPending(count);
  };

  useEffect(() => {
    refresh();
    const onOnline = () => refresh();
    const onOffline = () => refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [profile?.role]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`rounded-full px-3 py-1 ${online ? "bg-emerald-500/15 text-emerald-300" : "bg-orange-500/20 text-orange-300"}`}
      >
        {online ? "Online" : "Offline"}
      </span>
      <span className="rounded-full bg-white/5 px-3 py-1 text-[var(--text-2)]">
        Pending sync: {pending}
      </span>
    </div>
  );
}
