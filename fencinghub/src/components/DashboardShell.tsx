"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NotificationsBell from "@/components/NotificationsBell";
import OfflineStatusBar from "@/components/OfflineStatusBar";
import PushSubscribe from "@/components/PushSubscribe";
import StatusBanner from "@/components/StatusBanner";
import { useProfile } from "@/lib/useProfile";

export default function DashboardShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useProfile();
  const roleReady = !!profile?.role;
  const isCustomer = profile?.role === "customer";
  const pathname = usePathname();
  const onProjectsPage = pathname?.startsWith("/projects");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--slate-900)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.45em] text-white/70">
            FencingHub
          </div>
          <div className="hidden text-xs uppercase tracking-[0.3em] text-white/40 sm:block">
            Operations Portal
          </div>
        </div>

        <nav className="hidden items-center gap-3 text-xs uppercase tracking-[0.25em] text-white/60 md:flex">
          <Link href="/" className="btn-ghost">
            {isCustomer ? "Home" : "Dashboard"}
          </Link>
          <Link href="/projects" className="btn-ghost">
            Projects
          </Link>
          <Link href="/quotes" className="btn-ghost">
            Quotes
          </Link>
          {!isCustomer && (
            <>
              <Link href="/inbox" className="btn-ghost">
                Inbox
              </Link>
              <Link href="/templates" className="btn-ghost">
                Templates
              </Link>
            </>
          )}
          <Link href="/logout" className="btn-ghost">
            Sign out
          </Link>
        </nav>

        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-sm"
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1">
              <span className="h-0.5 w-5 rounded-full bg-white/70" />
              <span className="h-0.5 w-5 rounded-full bg-white/70" />
              <span className="h-0.5 w-5 rounded-full bg-white/70" />
            </div>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="mx-auto w-full max-w-6xl px-6 pt-4 md:hidden">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
            <div className="grid gap-2 text-xs uppercase tracking-[0.25em] text-white/60">
              <Link href="/" className="btn-ghost" onClick={() => setMobileOpen(false)}>
                {isCustomer ? "Home" : "Dashboard"}
              </Link>
              <Link href="/projects" className="btn-ghost" onClick={() => setMobileOpen(false)}>
                Projects
              </Link>
              <Link href="/quotes" className="btn-ghost" onClick={() => setMobileOpen(false)}>
                Quotes
              </Link>
              {!isCustomer && (
                <>
                  <Link href="/inbox" className="btn-ghost" onClick={() => setMobileOpen(false)}>
                    Inbox
                  </Link>
                  <Link
                    href="/templates"
                    className="btn-ghost"
                    onClick={() => setMobileOpen(false)}
                  >
                    Templates
                  </Link>
                </>
              )}
              {isCustomer && (
                <>
                  <Link href="/projects" className="btn-ghost" onClick={() => setMobileOpen(false)}>
                    Request help (Projects)
                  </Link>
                  <Link href="/quotes" className="btn-ghost" onClick={() => setMobileOpen(false)}>
                    Request help (Quotes)
                  </Link>
                  <div className="mt-2">
                    <PushSubscribe />
                  </div>
                </>
              )}
              <Link href="/logout" className="btn-ghost" onClick={() => setMobileOpen(false)}>
                Sign out
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <div className="card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="section-title">Operations</div>
              <h1 className="mt-3 text-3xl font-semibold heading-display">{title}</h1>
              {subtitle && <p className="text-white/60 mt-2 max-w-2xl">{subtitle}</p>}
            </div>
            {!isCustomer && (
              <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                <div className="flex flex-wrap gap-2 items-center ml-auto md:ml-0">
                  <Link href="/" className="btn-ghost">
                    Dashboard
                  </Link>
                  <div className="flex flex-col items-center gap-2">
                    <div className="hidden md:flex w-full justify-center">
                      <NotificationsBell compact />
                    </div>
                    <Link href="/projects" className="btn-primary">
                      Projects
                    </Link>
                  </div>
                  <Link href="/quotes" className="btn-ghost">
                    Quotes
                  </Link>
                  <Link href="/inbox" className="btn-ghost">
                    Inbox
                  </Link>
                  <Link href="/templates" className="btn-ghost">
                    Templates
                  </Link>
                  {roleReady && !isCustomer && (
                    <button
                      type="button"
                      className="btn-ghost md:hidden"
                      onClick={() => setMobileOpen((v) => !v)}
                    >
                      Menu
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-3">
            <StatusBanner />
            <OfflineStatusBar />
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
