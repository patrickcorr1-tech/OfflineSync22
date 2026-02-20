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
        <div className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_70%)] blur-3xl"></div>
        <div className="card p-6 sm:p-8">
          <div className="section-title">FencingHub</div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold">{title}</h1>
          <p className="text-[var(--slate-500)] mt-2">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
