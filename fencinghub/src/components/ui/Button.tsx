import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

export function Button({
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = "px-4 py-2 rounded-lg font-medium transition duration-200";
  const styles: Record<Variant, string> = {
    primary:
      "bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] shadow-[0_10px_24px_rgba(24,200,150,0.25)]",
    secondary: "bg-[var(--surface-1)] border border-[var(--border)] hover:bg-[var(--surface-2)]",
    ghost: "text-[var(--text-secondary)] hover:bg-[var(--state-hover)]",
    destructive: "bg-[var(--error-text)] text-[var(--text-inverse)] hover:opacity-90",
  };
  return <button className={`${base} ${styles[variant]}`} {...props} />;
}
