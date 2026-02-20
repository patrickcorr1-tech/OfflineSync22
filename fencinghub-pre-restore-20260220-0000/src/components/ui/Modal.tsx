import React from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[var(--overlay)]" onClick={onClose} />
      <div className="relative w-[520px] max-w-[90vw] bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="text-lg font-semibold">{title}</div>
          <button className="px-2 py-1 rounded-md hover:bg-[var(--state-hover)]" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
