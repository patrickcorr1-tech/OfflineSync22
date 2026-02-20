"use client";

import { motion } from "framer-motion";

export function SuccessTick({ label = "Saved" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--success-text)]">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)]"
      >
        ✓
      </motion.span>
      <span className="text-sm">{label}</span>
    </div>
  );
}
