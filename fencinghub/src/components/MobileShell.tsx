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
    <div className="mx-auto w-full max-w-[420px] px-5 pb-28 pt-6">
      <div className="flex items-center justify-between mb-4">
        <button className="h-10 w-10 rounded-full bg-[#e2e8f0] text-[#0f172a] flex items-center justify-center">
          ☰
        </button>
        <div className="text-right">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-[#64748b]">{subtitle}</p>}
        </div>
        <div className="h-9 w-9 rounded-full bg-[#e2e8f0]" />
      </div>
      {children}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-6 py-3">
        <div className="relative flex items-center justify-between text-xs">
          <Link className="flex flex-col items-center gap-1 text-blue-600" href="/">
            <span>🏠</span>
            Dashboard
          </Link>
          <Link className="flex flex-col items-center gap-1 text-[#64748b]" href="/projects">
            <span>📁</span>
            Projects
          </Link>
          <div className="-mt-10 h-14 w-14 rounded-full bg-[#0f172a] text-white flex items-center justify-center shadow-lg">
            360
          </div>
          <Link className="flex flex-col items-center gap-1 text-[#64748b]" href="/quotes">
            <span>📄</span>
            Quotes
          </Link>
          <div className="flex flex-col items-center gap-1 text-[#64748b]">
            <span>👤</span>
            Profile
          </div>
        </div>
        <div className="mx-auto mt-2 h-1 w-32 rounded-full bg-[#0f172a]" />
      </div>
    </div>
  );
}
