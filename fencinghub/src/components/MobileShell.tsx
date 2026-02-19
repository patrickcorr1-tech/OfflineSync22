"use client";

import Link from "next/link";

export default function MobileShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[420px] px-5 pb-28 pt-6 text-[var(--text-0)]">
      <div className="flex items-center justify-between mb-4">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--text-0)]">
          ☰
        </button>
        <div className="text-right">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-[var(--text-2)]">{subtitle}</p>}
        </div>
        <div className="h-9 w-9 rounded-full bg-[var(--surface-1)]" />
      </div>
      {children}

      <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface-1)] border-t border-[var(--border)] px-6 py-3">
        <div className="relative flex items-center justify-between text-xs">
          <Link className="flex flex-col items-center gap-1 text-[var(--accent)]" href="/">
            <span>🏠</span>
            Dashboard
          </Link>
          <Link className="flex flex-col items-center gap-1 text-[var(--text-2)]" href="/projects">
            <span>📁</span>
            Projects
          </Link>
          <div className="-mt-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-md)]">
            360
          </div>
          <Link className="flex flex-col items-center gap-1 text-[var(--text-2)]" href="/quotes">
            <span>📄</span>
            Quotes
          </Link>
          <div className="flex flex-col items-center gap-1 text-[var(--text-2)]">
            <span>👤</span>
            Profile
          </div>
        </div>
        <div className="mx-auto mt-2 h-1 w-32 rounded-full bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}
