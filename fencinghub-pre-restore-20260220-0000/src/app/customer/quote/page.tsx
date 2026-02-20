import CustomerShell from "@/components/layouts/CustomerShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { Input } from "@/components/ui/Input";

export default function CustomerQuoteFlow() {
  return (
    <CustomerShell>
      <div className="mb-6">
        <Stepper steps={["Details", "Site", "Upload", "Review"]} activeIndex={1} />
      </div>
      <Card>
        <div className="font-semibold mb-3">Tell us about your site</div>
        <div className="space-y-3">
          <Input label="Property type" placeholder="Farm / Estate" />
          <Input label="Fence length" placeholder="Approx. 120m" />
          <Input label="Preferred date" placeholder="Oct 20" />
        </div>
        <Button className="mt-4">Continue</Button>
      </Card>
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface-1)] border-t border-[var(--border)] p-3 flex gap-2">
        <Button className="flex-1">Save & Continue</Button>
        <Button variant="secondary" className="flex-1">
          Finish Later
        </Button>
      </div>
    </CustomerShell>
  );
}
