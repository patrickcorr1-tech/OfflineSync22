import Link from "next/link";
import Image from "next/image";

const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo-v5.png"
            alt="Terpstar Exotics"
            width={280}
            height={100}
            priority
            className="w-[240px] md:w-[300px]"
          />
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-underline text-zinc-200 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="https://shop.terpstarexotics.co.uk"
            className="rounded-full border border-yellow-400/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-yellow-200 transition hover:border-yellow-300 hover:text-yellow-100"
          >
            Shop
          </a>
        </nav>
        <div className="md:hidden">
          <a
            href="https://shop.terpstarexotics.co.uk"
            className="rounded-full border border-yellow-400/40 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-yellow-200"
          >
            Shop
          </a>
        </div>
      </div>
    </header>
  );
}
