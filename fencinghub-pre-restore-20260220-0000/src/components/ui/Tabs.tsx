import React from "react";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="flex gap-2 p-1 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-2 text-sm rounded-md transition ${
            active === t
              ? "bg-[var(--surface-2)] text-[var(--text-primary)] shadow-[0_0_0_1px_var(--border-strong)]"
              : "text-[var(--text-muted)] hover:bg-[var(--state-hover)]"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
