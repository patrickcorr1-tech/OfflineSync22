import React from "react";
import { Button } from "./Button";

export function EmptyState({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
      <div className="text-lg font-semibold mb-2">{title}</div>
      <div className="text-sm text-[var(--text-muted)] mb-4">{message}</div>
      {cta && <Button onClick={cta.onClick}>{cta.label}</Button>}
    </div>
  );
}
