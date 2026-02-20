"use client";

export async function getSignedUrl(bucket: string, path: string) {
  const res = await fetch("/api/storage/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path }),
  });
  const data = await res.json();
  return data.url as string;
}
