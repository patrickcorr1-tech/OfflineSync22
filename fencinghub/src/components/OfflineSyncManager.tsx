"use client";

import { useEffect } from "react";
import { startOutboxAutoSync, syncOutbox } from "@/lib/outbox";
import { runOutboxSync, startOutboxAutoSync as startCustomerSync } from "@/lib/customerOutbox";
import { useProfile } from "@/lib/useProfile";

export default function OfflineSyncManager() {
  const { profile } = useProfile();

  useEffect(() => {
    const stopOutbox = startOutboxAutoSync();
    const stopCustomer = startCustomerSync();

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "sync-outbox") {
        syncOutbox();
        runOutboxSync();
      }
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", onMessage);
    }

    return () => {
      stopOutbox?.();
      stopCustomer?.();
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", onMessage);
      }
    };
  }, [profile?.role]);

  return null;
}
