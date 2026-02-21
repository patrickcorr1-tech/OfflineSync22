"use client";

const tabs = [
  "Engagement",
  "Snags",
  "Timeline",
  "Approvals",
  "Gallery",
  "Documents",
  "Project details",
  "Customer 360",
  "Checklist",
  "Reminders",
  "Measurements",
];

export default function ProjectTabs({
  active,
  onChange,
  isCustomer,
  role,
}: {
  active: string;
  onChange: (t: string) => void;
  isCustomer?: boolean;
  role?: string | null;
}) {
  let visibleTabs = isCustomer
    ? tabs.filter(
        (t) => !["Snags", "Project details", "Customer 360", "Checklist", "Reminders"].includes(t),
      )
    : tabs;
  if (role === "admin") {
    visibleTabs = visibleTabs.filter(
      (t) => !["Engagement", "Gallery", "Documents", "Timeline"].includes(t),
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition ${
              active === t
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/10 text-white/50 hover:border-white/30 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
