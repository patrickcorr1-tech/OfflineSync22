import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(145deg,var(--surface-0),var(--surface-1))] shadow-[var(--shadow-sm)] p-5 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}
