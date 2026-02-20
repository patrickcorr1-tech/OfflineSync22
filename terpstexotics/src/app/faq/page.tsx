const faqs = [
  {
    q: "Is Terpstar Exotics an official brand?",
    a: "No. This is a fan-based supported site and is simply merchandise.",
  },
  {
    q: "Where can I shop?",
    a: "Use the Shop link to visit shop.terpstarexotics.co.uk for drops and releases.",
  },
  {
    q: "Do you ship internationally?",
    a: "We’ll announce shipping zones with each drop. Join the mailing list for updates.",
  },
  {
    q: "Can I suggest designs?",
    a: "Yes — reach out via the Contact page with your ideas.",
  },
];

export default function FAQ() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <div className="glow-card rounded-[22px] p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-yellow-200/70">FAQ</p>
        <h1 className="mt-4 text-4xl font-semibold">Questions, answered.</h1>
        <div className="mt-8 space-y-4">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="rounded-[16px] border border-white/10 bg-black/70 p-5"
            >
              <summary className="cursor-pointer text-lg text-white">
                {item.q}
              </summary>
              <p className="mt-3 text-sm text-zinc-300">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
