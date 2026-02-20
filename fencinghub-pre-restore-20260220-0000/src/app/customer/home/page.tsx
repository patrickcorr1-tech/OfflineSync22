import CustomerShell from "@/components/layouts/CustomerShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function CustomerHome() {
  return (
    <CustomerShell>
      <div className="text-3xl font-semibold mb-4">Premium fencing, built for pros.</div>
      <div className="text-sm text-[var(--text-muted)] mb-6">
        Get a quote in minutes. Track every step. Pay securely.
      </div>
      <Button className="interactive">Get a Quote</Button>

      <div className="grid grid-cols-3 gap-6 mt-10">
        {"Fast Quotes|Trusted Craft|Transparent Pricing".split("|").map((t) => (
          <Card key={t}>
            <div className="font-semibold mb-2">{t}</div>
            <div className="text-sm text-[var(--text-muted)]">
              Built for landowners, farms, and estates.
            </div>
          </Card>
        ))}
      </div>
    </CustomerShell>
  );
}
