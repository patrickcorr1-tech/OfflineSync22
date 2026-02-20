"use client";

import { startOutboxAutoSync } from "@/lib/outbox";

export function startOfflineSync(onSynced?: () => void) {
  return startOutboxAutoSync(onSynced);
}
