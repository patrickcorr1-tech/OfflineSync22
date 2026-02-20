"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/lib/useProfile";

export default function ActionsMenu() {
  const [open, setOpen] = useState(false);
  const { profile } = useProfile();

  if (!profile || profile.role !== "admin") return null;

  return (
    <div className="relative">
      <button
        className="rounded-full border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/80"
        onClick={() => setOpen(!open)}
      >
        Settings ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0b0d10] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
          <Link className="block rounded-lg px-3 py-2 text-xs hover:bg-white/5" href="/quotes">
            Upload Quote
          </Link>
          <Link className="block rounded-lg px-3 py-2 text-xs hover:bg-white/5" href="/quotes">
            View Quotes
          </Link>
          <Link className="block rounded-lg px-3 py-2 text-xs hover:bg-white/5" href="/projects">
            Projects
          </Link>
          <Link className="block rounded-lg px-3 py-2 text-xs hover:bg-white/5" href="/">
            Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
