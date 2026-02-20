export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-10 text-sm text-zinc-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-zinc-200">Terpstar Exotics</p>
          <p className="text-xs text-zinc-500">
            Fan-based merchandise experience. No affiliation with any brands.
          </p>
        </div>
        <div className="flex items-center gap-6 text-xs uppercase tracking-[0.2em]">
          <a className="link-underline" href="/about">About</a>
          <a className="link-underline" href="/faq">FAQ</a>
          <a className="link-underline" href="/contact">Contact</a>
          <a className="link-underline" href="https://shop.terpstarexotics.co.uk">Shop</a>
        </div>
      </div>
    </footer>
  );
}
