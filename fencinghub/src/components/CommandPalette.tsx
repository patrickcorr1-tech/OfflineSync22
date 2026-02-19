"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";

const items = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Jobs", href: "/admin/jobs" },
  { label: "Quotes", href: "/admin/quotes" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Invoices", href: "/admin/invoices" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Create Quote", href: "/admin/quotes" },
  { label: "Create Job", href: "/projects/new" },
  { label: "Create Invoice", href: "/admin/invoices" },
];

export default function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const filtered = useMemo(
    () => items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--overlay)] pt-24">
      <div className="glass w-[620px] max-w-[92vw] rounded-2xl p-3 shadow-[var(--shadow-md)]">
        <Command className="w-full">
          <Command.Input
            autoFocus
            placeholder="Search jobs, quotes, customers…"
            value={search}
            onValueChange={setSearch}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm outline-none"
          />
          <Command.List className="mt-3 max-h-[320px] overflow-auto">
            {filtered.map((item) => (
              <Command.Item
                key={item.label}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(item.href);
                }}
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--text-1)] hover:bg-[var(--state-hover)]"
              >
                <span>{item.label}</span>
                <span className="text-xs text-[var(--text-2)]">↵</span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
