import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.08),rgba(255,255,255,0.04))] bg-[length:200%_100%] rounded-lg ${className}`}
    />
  );
}
