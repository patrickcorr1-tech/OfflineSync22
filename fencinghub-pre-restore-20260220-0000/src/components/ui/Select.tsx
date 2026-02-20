import React from "react";

export function Select({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: string[] }) {
  return (
    <label className="block space-y-2">
      {label && <div className="text-xs text-[var(--text-muted)]">{label}</div>}
      <select
        className="w-full px-4 py-2 rounded-lg bg-[var(--surface-0)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        {...props}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
