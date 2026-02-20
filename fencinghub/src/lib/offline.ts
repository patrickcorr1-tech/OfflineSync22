"use client";

import Dexie, { type Table } from "dexie";

export type OfflineQueueItem = {
  id?: number;
  type: string;
  payload: any;
  createdAt: number;
};

class OfflineDB extends Dexie {
  queue!: Table<OfflineQueueItem, number>;
  constructor() {
    super("fencinghub");
    this.version(1).stores({ queue: "++id, type, createdAt" });
  }
}

export const offlineDB = new OfflineDB();

export async function enqueue(type: string, payload: any) {
  await offlineDB.queue.add({ type, payload, createdAt: Date.now() });
}

export async function dequeueAll() {
  const items = await offlineDB.queue.toArray();
  await offlineDB.queue.clear();
  return items;
}
