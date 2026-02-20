import CustomerShell from "@/components/layouts/CustomerShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function CustomerDashboard() {
  return (
    <CustomerShell>
      <div className="text-2xl font-semibold mb-6">Your Project</div>
      <Card className="interactive">
        <div className="text-sm text-[var(--text-muted)]">Current Job</div>
        <div className="mt-2 text-xl font-semibold">Hillcrest Farm – Timber Fence</div>
        <div className="mt-3 text-sm text-[var(--text-2)]">Next step: approve final quote</div>
        <div className="mt-4 flex gap-2">
          <Button>View Quote</Button>
          <Button variant="secondary">Message Team</Button>
        </div>
      </Card>
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface-1)] border-t border-[var(--border)] p-3 flex gap-2">
        <Button className="flex-1">Approve Quote</Button>
        <Button variant="secondary" className="flex-1">
          Pay Deposit
        </Button>
      </div>
    </CustomerShell>
  );
}
