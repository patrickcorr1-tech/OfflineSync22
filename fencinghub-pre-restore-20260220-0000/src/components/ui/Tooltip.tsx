import React from "react";

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="relative group">
      {children}
      <span className="absolute z-40 hidden group-hover:block -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
        {label}
      </span>
    </span>
  );
}
