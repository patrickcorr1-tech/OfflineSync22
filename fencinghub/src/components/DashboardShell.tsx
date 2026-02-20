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
        <div className="text-sm uppercase tracking-[0.25em] text-[var(--slate-500)]">
          FencingHub
        </div>

        <nav className="hidden items-center gap-3 text-xs uppercase tracking-[0.25em] text-[var(--slate-500)] md:flex">
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
              <NotificationsBell />
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
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1">
              <span className="h-0.5 w-5 rounded-full bg-slate-700" />
              <span className="h-0.5 w-5 rounded-full bg-slate-700" />
              <span className="h-0.5 w-5 rounded-full bg-slate-700" />
            </div>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="mx-auto w-full max-w-6xl px-6 pt-4 md:hidden">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
            <div className="grid gap-2 text-xs uppercase tracking-[0.25em] text-[var(--slate-500)]">
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
              {!isCustomer && <NotificationsBell />}
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
              <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
              {subtitle && <p className="text-[var(--slate-500)] mt-2 max-w-2xl">{subtitle}</p>}
            </div>
            {!isCustomer && (
              <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                <div className="flex flex-wrap gap-2 items-center ml-auto md:ml-0">
                  <Link href="/projects" className="btn-primary">
                    Projects
                  </Link>
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
