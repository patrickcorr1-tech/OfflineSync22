import React from "react";

export function FilterChips({ chips }: { chips: string[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {chips.map((c) => (
        <span
          key={c}
          className="interactive px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)]"
        >
          {c}
        </span>
      ))}
    </div>
  );
}
