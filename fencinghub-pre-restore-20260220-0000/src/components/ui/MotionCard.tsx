"use client";

import { motion, useReducedMotion } from "framer-motion";
import React from "react";

export function MotionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={
        reduceMotion ? undefined : { y: -2, rotateX: 1, rotateY: -1, boxShadow: "var(--shadow-md)" }
      }
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(145deg,var(--surface-0),var(--surface-1))] shadow-[var(--shadow-sm)] p-5 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
