export function Stepper({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="flex items-center gap-4">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`h-6 w-6 rounded-full flex items-center justify-center text-xs border ${
              i <= activeIndex
                ? "bg-[var(--accent)] text-[var(--text-inverse)] border-transparent shadow-[0_0_0_4px_rgba(57,242,178,0.15)]"
                : "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]"
            }`}
          >
            {i + 1}
          </div>
          <div
            className={`text-sm ${i <= activeIndex ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
          >
            {step}
          </div>
          {i < steps.length - 1 && <div className="w-8 h-px bg-[var(--border)]" />}
        </div>
      ))}
    </div>
  );
}
