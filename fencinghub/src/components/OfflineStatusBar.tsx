"use client";

import { useEffect, useMemo, useState } from "react";
import { countOutboxItems, onOutboxChanged, startOutboxAutoSync, syncOutbox } from "@/lib/outbox";

export default function OfflineStatusBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const canSync = isOnline && pending > 0 && !syncing;

  const loadCount = async () => {
    const count = await countOutboxItems();
    setPending(count);
  };

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    loadCount();

    const stop = startOutboxAutoSync(() => loadCount());
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onChanged = () => loadCount();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const off = onOutboxChanged(onChanged);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "sync-outbox") {
          syncOutbox().then(loadCount);
        }
        if (event.data?.type === "SYNC_NOW") {
          syncOutbox().then(loadCount);
        }
        if (event.data?.type === "OUTBOX_UPDATED") {
          loadCount();
        }
      });
    }

    return () => {
      stop?.();
      off?.();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const statusText = useMemo(() => {
    if (!isOnline) return "Offline — changes will sync automatically";
    if (pending > 0) return "Online — changes queued";
    return "Online";
  }, [isOnline, pending]);

  const onSyncNow = async () => {
    if (!canSync) return;
    setSyncing(true);
    try {
      await syncOutbox();
      await loadCount();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
      <span
        className={`rounded-full px-2 py-1 ${isOnline ? "bg-emerald-500/20 text-emerald-200" : "bg-orange-500/20 text-orange-200"}`}
      >
        {statusText}
      </span>
      <span className="rounded-full bg-slate-500/20 px-2 py-1 text-slate-200">
        Pending sync: {pending}
      </span>
      <button
        type="button"
        className={`rounded-full border border-white/20 px-2 py-1 ${canSync ? "text-white" : "text-white/40"}`}
        onClick={onSyncNow}
        disabled={!canSync}
      >
        {syncing ? "Syncing..." : "Sync now"}
      </button>
    </div>
  );
}
