import CustomerShell from "@/components/layouts/CustomerShell";
import { Card } from "@/components/ui/Card";
import { Timeline } from "@/components/ui/Timeline";

export default function CustomerTracking() {
  return (
    <CustomerShell>
      <Card>
        <div className="font-semibold mb-3">Job Tracking</div>
        <Timeline
          items={[
            { title: "Booked", meta: "Confirmed", status: "done" },
            { title: "On the way", meta: "Today 08:30", status: "active" },
            { title: "In progress", meta: "Pending", status: "muted" },
            { title: "Completed", meta: "—", status: "muted" },
          ]}
        />
      </Card>
      <div className="fixed bottom-16 left-0 right-0 px-4 sm:hidden">
        <div className="glass flex gap-2 rounded-xl border border-[var(--border)] p-3">
          <button className="flex-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-[var(--accent-contrast)]">
            Message
          </button>
          <button className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-1)]">
            Reschedule
          </button>
        </div>
      </div>
    </CustomerShell>
  );
}
