export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <div className="glow-card rounded-[22px] p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-yellow-200/70">About</p>
        <h1 className="mt-4 text-4xl font-semibold">Built by Terps. Powered by Exotics.</h1>
        <p className="mt-6 text-lg text-zinc-300">
          Terpstar Exotics is a fan-based supported site and is simply merchandise.
          We’re not affiliated with any official brands. We just love the culture and
          create gear that celebrates it.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[18px] border border-white/10 bg-black/70 p-5">
            <h3 className="text-lg font-semibold text-white">Our mission</h3>
            <p className="mt-2 text-sm text-zinc-300">
              Craft standout pieces with bold visuals, clean silhouettes, and a
              premium feel.
            </p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-black/70 p-5">
            <h3 className="text-lg font-semibold text-white">Our community</h3>
            <p className="mt-2 text-sm text-zinc-300">
              Built on energy, creativity, and collectors. You’re the reason we drop.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
