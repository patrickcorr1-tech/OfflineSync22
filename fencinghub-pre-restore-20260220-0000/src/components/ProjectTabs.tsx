"use client";

const tabs = [
  "Engagement",
  "Snags",
  "Timeline",
  "Approvals",
  "Gallery",
  "Documents",
  "Project details",
  "Checklist",
  "Reminders",
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
    ? tabs.filter((t) => !["Snags", "Project details", "Checklist", "Reminders"].includes(t))
    : tabs;
  if (role === "admin") {
    visibleTabs = visibleTabs.filter(
      (t) => !["Engagement", "Gallery", "Documents", "Timeline"].includes(t),
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {visibleTabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.3em] backdrop-blur ${
            active === t
              ? "border-[#f39c12]/60 text-white bg-[#f39c12]/10"
              : "border-white/10 text-white/50"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
