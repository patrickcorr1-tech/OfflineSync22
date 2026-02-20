import React from "react";

export function Timeline({
  items,
}: {
  items: { title: string; meta?: string; status?: "done" | "active" | "muted" }[];
}) {
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div
            className={`mt-1 h-3 w-3 rounded-full border ${
              item.status === "done"
                ? "bg-[var(--accent)] border-transparent shadow-[0_0_0_4px_rgba(57,242,178,0.15)]"
                : item.status === "active"
                  ? "bg-[var(--surface-2)] border-[var(--accent)]"
                  : "bg-[var(--surface-2)] border-[var(--border)]"
            }`}
          />
          <div className="flex-1">
            <div className="text-sm font-medium">{item.title}</div>
            {item.meta && <div className="text-xs text-[var(--text-muted)]">{item.meta}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
