export default function Contact() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <div className="glow-card rounded-[22px] p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-yellow-200/70">Contact</p>
        <h1 className="mt-4 text-4xl font-semibold">Let’s build the next drop.</h1>
        <p className="mt-4 text-zinc-300">
          Have a design idea or collaboration in mind? Send a message and we’ll
          get back to you.
        </p>
        <form className="mt-8 grid gap-4">
          <input
            className="w-full rounded-full border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
            placeholder="Name"
          />
          <input
            className="w-full rounded-full border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
            placeholder="Email"
            type="email"
          />
          <textarea
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
            placeholder="Message"
          />
          <button
            type="button"
            className="w-fit rounded-full bg-yellow-300 px-6 py-3 text-sm font-semibold text-black"
          >
            Send message
          </button>
        </form>
      </div>
    </div>
  );
}
