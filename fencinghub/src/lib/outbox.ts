"use client";

import Dexie, { type Table } from "dexie";

export type OutboxItem = {
  id?: number;
  type:
    | "note"
    | "snag"
    | "snag_status"
    | "measurement"
    | "quote_request"
    | "customer_project"
    | "customer_snag";
  payload: any;
  createdAt: number;
};

const OUTBOX_EVENT = "fencinghub:outbox-changed";
const SYNC_TAG = "fencinghub-sync";

class OutboxDB extends Dexie {
  outbox!: Table<OutboxItem, number>;
  constructor() {
    super("fencinghub-outbox");
    this.version(1).stores({ outbox: "++id, type, createdAt" });
  }
}

export const outboxDB = new OutboxDB();

export function notifyOutboxChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

export function onOutboxChanged(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OUTBOX_EVENT, handler);
  return () => window.removeEventListener(OUTBOX_EVENT, handler);
}

export async function enqueueOutbox(type: OutboxItem["type"], payload: any) {
  await outboxDB.outbox.add({ type, payload, createdAt: Date.now() });
  notifyOutboxChanged();
  await registerBackgroundSync();
}

export async function countOutboxItems() {
  return outboxDB.outbox.count();
}

export async function listOutboxItems() {
  return outboxDB.outbox.orderBy("createdAt").toArray();
}

export async function removeOutboxItems(ids: number[]) {
  if (!ids.length) return;
  await outboxDB.outbox.bulkDelete(ids);
  notifyOutboxChanged();
}

export async function syncOutbox() {
  if (typeof window === "undefined" || !navigator.onLine) return { processed: 0 };
  const items = await listOutboxItems();
  if (!items.length) return { processed: 0 };

  const res = await fetch("/api/sync/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    return { processed: 0, error: await res.text() };
  }

  const data = await res.json().catch(() => ({}));
  const processedIds: number[] =
    data?.processedIds?.filter(Boolean) || items.map((i) => i.id).filter(Boolean);
  await removeOutboxItems(processedIds);
  return { processed: processedIds.length };
}

export function startOutboxAutoSync(onSynced?: () => void) {
  if (typeof window === "undefined") return;
  let syncing = false;
  const run = async () => {
    if (syncing) return;
    syncing = true;
    try {
      const result = await syncOutbox();
      if (result.processed && onSynced) onSynced();
    } finally {
      syncing = false;
    }
  };

  run();
  const interval = setInterval(run, 10 * 60 * 1000);
  window.addEventListener("online", run);
  return () => {
    clearInterval(interval);
    window.removeEventListener("online", run);
  };
}

export async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function registerBackgroundSync() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const anyReg = reg as any;
    if (anyReg?.sync?.register) {
      await anyReg.sync.register(SYNC_TAG);
    }
  } catch {
    // ignore background sync registration failures
  }
}
