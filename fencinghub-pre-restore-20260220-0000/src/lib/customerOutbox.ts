"use client";

import { openDB } from "idb";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export type CustomerOutboxItem = {
  id?: number;
  type: "customer_project" | "customer_snag";
  payload: any;
  images: Blob[];
  createdAt: number;
};

const DB_NAME = "fencinghub-customer";
const STORE = "outbox";

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function addOutboxItem(item: Omit<CustomerOutboxItem, "id">) {
  const database = await db();
  await database.add(STORE, item);
}

export async function listOutboxItems() {
  const database = await db();
  const items = (await database.getAll(STORE)) as CustomerOutboxItem[];
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeOutboxItem(id: number) {
  const database = await db();
  await database.delete(STORE, id);
}

export async function countOutboxItems() {
  const database = await db();
  return (await database.count(STORE)) as number;
}

async function uploadCustomerImages(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
  images: Blob[],
) {
  const uploads: string[] = [];
  for (const file of images) {
    const ext = file.type?.includes("png") ? "png" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("customer-uploads").upload(path, file);
    if (error) throw error;
    uploads.push(path);
  }
  return uploads;
}

async function insertProjectPhotos(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  projectId: string,
  paths: string[],
  userId: string,
) {
  if (!paths.length) return;
  await supabase
    .from("project_photos")
    .insert(paths.map((photo_url) => ({ project_id: projectId, photo_url, created_by: userId })));
}

async function insertSnagPhotos(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  snagId: string,
  paths: string[],
  userId: string,
  images: Blob[],
) {
  if (!paths.length && !images.length) return;
  // prefer server-side insertion to avoid RLS issues
  const form = new FormData();
  form.append("snagId", snagId);
  images.forEach((file) => form.append("files", file));
  await fetch("/api/customer/snags/photos", { method: "POST", body: form });
}

export async function runOutboxSync(onSynced?: () => void) {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const items = await listOutboxItems();
  for (const item of items) {
    try {
      if (item.type === "customer_project") {
        const res = await fetch("/api/customer/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        const data = await res.json();
        if (!res.ok) break;
        const projectId = data.projectId as string;
        const paths = await uploadCustomerImages(supabase, userId, item.images || []);
        await insertProjectPhotos(supabase, projectId, paths, userId);
      }
      if (item.type === "customer_snag") {
        const res = await fetch("/api/customer/snags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        const data = await res.json();
        if (!res.ok) break;
        const snagId = data.snagId as string;
        const paths = await uploadCustomerImages(supabase, userId, item.images || []);
        await insertSnagPhotos(supabase, snagId, paths, userId, item.images || []);
      }
      if (item.id) await removeOutboxItem(item.id);
    } catch {
      break;
    }
  }

  if (onSynced) onSynced();
}

export function startOutboxAutoSync(onSynced?: () => void) {
  if (typeof window === "undefined") return;
  const run = () => runOutboxSync(onSynced);
  run();
  window.addEventListener("online", run);
  return () => window.removeEventListener("online", run);
}
