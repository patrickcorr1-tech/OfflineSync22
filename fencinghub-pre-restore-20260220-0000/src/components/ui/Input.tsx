import React from "react";

export function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block space-y-2">
      {label && <div className="text-xs text-[var(--text-muted)]">{label}</div>}
      <input
        className="w-full px-4 py-2 rounded-lg bg-[var(--surface-0)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        {...props}
      />
    </label>
  );
}
