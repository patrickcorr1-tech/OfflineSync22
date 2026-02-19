"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/motion";
import CommandPalette from "@/components/CommandPalette";
import Link from "next/link";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--bg-0)]">
      <aside
        className={`${collapsed ? "w-20" : "w-64"} bg-[var(--bg-1)] border-r border-[var(--border)] p-4 transition-all duration-200`}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="text-lg font-semibold">{collapsed ? "FH" : "FencingHub"}</div>
          <button
            className="rounded-lg px-2 py-1 text-xs text-[var(--text-2)] hover:bg-[var(--state-hover)]"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>
        <nav className="space-y-2 text-sm">
          {[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Jobs", href: "/admin/jobs" },
            { label: "Quotes", href: "/admin/quotes" },
            { label: "Customers", href: "/admin/customers" },
            { label: "Invoices", href: "/admin/invoices" },
            { label: "Settings", href: "/admin/settings" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="interactive rounded-lg px-3 py-2 text-[var(--text-1)] hover:bg-[var(--surface-1)]"
            >
              {collapsed ? item.label[0] : item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <motion.main {...motionPresets.page} className="flex-1 p-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={() => setPaletteOpen(true)}
            className="glass flex w-full max-w-lg items-center gap-3 rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-2)]"
          >
            <span>Search…</span>
            <span className="ml-auto rounded-md border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-2)]">
              ⌘K
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button className="relative rounded-lg bg-[var(--surface-1)] px-3 py-2">
              🔔
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--accent)]" />
            </button>
            <div className="relative group">
              <button className="interactive rounded-lg bg-[var(--accent)] px-4 py-2 text-[var(--accent-contrast)]">
                + New
              </button>
              <div className="absolute right-0 mt-2 hidden w-40 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2 text-sm shadow-[var(--shadow-md)] group-hover:block">
                {["Quote", "Job", "Invoice"].map((t) => (
                  <div
                    key={t}
                    className="rounded-lg px-3 py-2 text-[var(--text-1)] hover:bg-[var(--state-hover)]"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-[var(--surface-1)]" />
          </div>
        </header>
        {children}
      </motion.main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
