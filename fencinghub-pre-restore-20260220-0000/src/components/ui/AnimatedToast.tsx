"use client";

import { motion } from "framer-motion";

export function AnimatedToast({ title, message }: { title: string; message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-[var(--text-muted)]">{message}</div>
    </motion.div>
  );
}
