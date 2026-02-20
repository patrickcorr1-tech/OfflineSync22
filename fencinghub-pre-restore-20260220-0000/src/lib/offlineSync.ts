"use client";

import { dequeueAll } from "@/lib/offline";

export function startOfflineSync() {
  if (typeof window === "undefined") return;

  const sync = async () => {
    if (navigator.onLine) {
      const items = await dequeueAll();
      if (items.length) {
        await fetch("/api/sync/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
      }
    }
  };

  // run immediately + every 10 minutes
  sync();
  const interval = setInterval(sync, 10 * 60 * 1000);

  window.addEventListener("online", sync);

  return () => {
    clearInterval(interval);
    window.removeEventListener("online", sync);
  };
}
