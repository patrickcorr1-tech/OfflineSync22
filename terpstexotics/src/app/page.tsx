import Link from "next/link";

const featureCards = [
  {
    title: "Fan-built merch",
    body: "Original designs inspired by the community. No official affiliation — just passion.",
  },
  {
    title: "Quality first",
    body: "We obsess over fit, feel, and finish so every drop feels premium.",
  },
  {
    title: "Limited releases",
    body: "Small batches, rare pieces, and drop culture energy for collectors.",
  },
];

const highlight = [
  "Streetwear energy",
  "Bold yellow accents",
  "Black-on-black minimal",
  "Drop alerts",
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <section className="grid gap-12 rounded-[28px] border border-white/10 bg-gradient-to-br from-black via-zinc-950 to-zinc-900/40 p-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-300/80">
            Terpstar Exotics
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-6xl">
            Welcome to Terpstar Exotics.
          </h1>
          <p className="mt-6 text-lg text-zinc-300">
            Welcome to the site — have a look at the shop and exclusive drops. Merchandise
            incoming soon.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="https://shop.terpstarexotics.co.uk"
              className="rounded-full bg-yellow-300 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-yellow-400/20 transition hover:-translate-y-0.5"
            >
              Enter the Shop
            </a>
            <Link
              href="/about"
              className="rounded-full border border-white/15 px-6 py-3 text-sm text-white/90 transition hover:border-white/40"
            >
              About the brand
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-zinc-400">
            {highlight.map((item) => (
              <span key={item} className="rounded-full border border-white/10 px-4 py-2">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="glow-card rounded-[22px] p-6">
          <div className="rounded-[18px] border border-white/10 bg-black/60 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-200/70">
              Quick intro
            </p>
            <p className="mt-4 text-base text-zinc-200">
              Merchandise store for the fans. Expect exclusive drops, bold visuals,
              and a clean black aesthetic that lets the art do the talking.
            </p>
            <div className="mt-6 space-y-3 text-sm text-zinc-400">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span>Designed for collectors</span>
                <span className="text-yellow-200">Always</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span>Shop link ready</span>
                <span className="text-yellow-200">shop.terpstarexotics.co.uk</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Community energy</span>
                <span className="text-yellow-200">100%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-20 grid gap-6 md:grid-cols-3">
        {featureCards.map((card) => (
          <div key={card.title} className="glow-card rounded-[20px] p-6">
            <h3 className="text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-3 text-sm text-zinc-300">{card.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 grid gap-10 rounded-[28px] border border-white/10 bg-gradient-to-br from-black via-zinc-950 to-black p-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="text-3xl font-semibold">Get the drop alerts</h2>
          <p className="mt-4 text-zinc-300">
            Join the list to catch limited releases, pre-order drops, and behind-the-scenes
            design updates.
          </p>
        </div>
        <form className="flex flex-col gap-3 md:flex-row">
          <input
            className="w-full rounded-full border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
            placeholder="you@email.com"
            type="email"
          />
          <button
            type="button"
            className="rounded-full bg-yellow-300 px-6 py-3 text-sm font-semibold text-black"
          >
            Join
          </button>
        </form>
      </section>
    </div>
  );
}
