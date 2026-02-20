import React from "react";

export function Toast({
  type = "info",
  title,
  message,
}: {
  type?: "info" | "success" | "warn" | "error";
  title: string;
  message: string;
}) {
  const map = {
    info: "border-[var(--info-border)] text-[var(--info-text)]",
    success: "border-[var(--success-border)] text-[var(--success-text)]",
    warn: "border-[var(--warn-border)] text-[var(--warn-text)]",
    error: "border-[var(--error-border)] text-[var(--error-text)]",
  };
  return (
    <div className={`px-4 py-3 rounded-lg border bg-[var(--surface-1)] ${map[type]}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-[var(--text-muted)]">{message}</div>
    </div>
  );
}
