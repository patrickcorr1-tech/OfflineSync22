"use client";

type CacheKey = "projects" | `snags:${string}` | `measurements:${string}` | `project:${string}`;

function read<T>(key: CacheKey): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`fh-cache:${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write<T>(key: CacheKey, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`fh-cache:${key}`, JSON.stringify({ value, updatedAt: Date.now() }));
}

export function getCachedProjects<T>() {
  return read<{ value: T; updatedAt: number }>("projects");
}

export function setCachedProjects<T>(data: T) {
  write("projects", data);
}

export function getCachedProject<T>(projectId: string) {
  return read<{ value: T; updatedAt: number }>(`project:${projectId}`);
}

export function setCachedProject<T>(projectId: string, data: T) {
  write(`project:${projectId}`, data);
}

export function getCachedSnags<T>(projectId: string) {
  return read<{ value: T; updatedAt: number }>(`snags:${projectId}`);
}

export function setCachedSnags<T>(projectId: string, data: T) {
  write(`snags:${projectId}`, data);
}

export function getCachedMeasurements<T>(projectId: string) {
  return read<{ value: T; updatedAt: number }>(`measurements:${projectId}`);
}

export function setCachedMeasurements<T>(projectId: string, data: T) {
  write(`measurements:${projectId}`, data);
}
