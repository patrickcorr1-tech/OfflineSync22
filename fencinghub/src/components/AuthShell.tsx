"use client";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--slate-900)] flex items-start sm:items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-md">
        <div className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(127,208,255,0.2),_transparent_70%)] blur-3xl"></div>
        <div className="card p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="section-title">FencingHub</div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-white/40">Secure</span>
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-semibold heading-display">{title}</h1>
          <p className="text-white/60 mt-2">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
