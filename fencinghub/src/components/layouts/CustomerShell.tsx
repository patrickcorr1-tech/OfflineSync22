"use client";

import React from "react";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/motion";
import Link from "next/link";

export default function CustomerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-0)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] p-4">
        <div className="font-semibold">FencingHub</div>
        <button className="interactive rounded-lg bg-[var(--accent)] px-3 py-2 text-[var(--accent-contrast)]">
          Get Quote
        </button>
      </header>
      <motion.main {...motionPresets.page} className="p-4 pb-28">
        {children}
      </motion.main>
      <nav className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between text-xs">
          <Link
            className="flex flex-col items-center gap-1 text-[var(--accent)]"
            href="/customer/home"
          >
            <span>🏠</span>
            Home
          </Link>
          <Link
            className="flex flex-col items-center gap-1 text-[var(--text-2)]"
            href="/customer/quote"
          >
            <span>🧾</span>
            Quote
          </Link>
          <div className="-mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-md)]">
            +
          </div>
          <Link
            className="flex flex-col items-center gap-1 text-[var(--text-2)]"
            href="/customer/tracking"
          >
            <span>🧭</span>
            Jobs
          </Link>
          <Link
            className="flex flex-col items-center gap-1 text-[var(--text-2)]"
            href="/customer/dashboard"
          >
            <span>👤</span>
            Account
          </Link>
        </div>
      </nav>
    </div>
  );
}
