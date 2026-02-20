import React from "react";

type BadgeType = "info" | "success" | "warn" | "error";

export function Badge({
  type = "info",
  children,
}: {
  type?: BadgeType;
  children: React.ReactNode;
}) {
  const map: Record<BadgeType, string> = {
    info: "bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-border)]",
    success: "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]",
    warn: "bg-[var(--warn-bg)] text-[var(--warn-text)] border-[var(--warn-border)]",
    error: "bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)]",
  };
  return (
    <span
      className={`px-2 py-1 rounded-full border text-xs uppercase tracking-[0.2em] ${map[type]}`}
    >
      {children}
    </span>
  );
}
