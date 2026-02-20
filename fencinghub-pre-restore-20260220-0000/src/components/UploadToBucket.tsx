"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function UploadToBucket({
  bucket,
  onUploaded,
}: {
  bucket: string;
  onUploaded: (path: string) => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [uploading, setUploading] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    setUploading(false);
    if (!error) onUploaded(path);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <input type="file" onChange={onFile} />
      {uploading && <p className="text-xs text-white/60 mt-2">Uploading...</p>}
    </div>
  );
}
