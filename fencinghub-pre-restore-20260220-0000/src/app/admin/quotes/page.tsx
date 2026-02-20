import AdminShell from "@/components/layouts/AdminShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { Input } from "@/components/ui/Input";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function QuotesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, status, version, created_at, file_path, project:projects(name)")
    .order("created_at", { ascending: false })
    .limit(20);

  const primaryQuoteId = quotes?.[0]?.id;

  const [{ data: measurements }, { data: quoteItems }] = await Promise.all([
    supabase
      .from("measurements")
      .select("data, created_at")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("quote_items")
      .select("id, description, quantity, unit_price, total")
      .eq("quote_id", primaryQuoteId)
      .order("sort_order", { ascending: true })
      .limit(25),
  ]);

  const rows = (quotes || []).map((q) => ({
    id: q.id,
    status: q.status,
    version: q.version,
    project: (q as any).project?.name ?? "—",
    created_at: q.created_at,
    file_path: (q as any).file_path,
  }));

  const steps = ["Details", "Measurements", "Items", "Pricing", "Send"];
  const measurementData = measurements?.[0]?.data as any;

  const latestQuote = quotes?.[0];

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-semibold">Quote Builder</div>
          <div className="text-sm text-[var(--text-muted)]">
            Create a luxurious customer‑ready quote.
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Save Draft</Button>
          <Button>Preview PDF</Button>
        </div>
      </div>

      <div className="mb-6">
        <Stepper steps={steps} activeIndex={2} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <div className="font-semibold mb-3">Project Details</div>
          <div className="space-y-3">
            <Input label="Customer" placeholder="Hillcrest Farm" />
            <Input label="Location" placeholder="North Yorkshire" />
            <Input label="Fence Type" placeholder="Premium Timber" />
            <Input label="Delivery Window" placeholder="Oct 20 – Oct 28" />
          </div>
        </Card>
        <Card>
          <div className="font-semibold mb-3">Measurements (Live)</div>
          <div className="text-sm text-[var(--text-muted)]">Most recent measurement snapshot.</div>
          <div className="mt-3 space-y-2 text-sm">
            {measurementData ? (
              Object.entries(measurementData).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span>{key}</span>
                  <span>{String(value)}</span>
                </div>
              ))
            ) : (
              <div className="text-[var(--text-muted)]">No measurements yet.</div>
            )}
          </div>
          <Button variant="secondary" className="mt-4">
            + Add Measurement
          </Button>
        </Card>
        <Card>
          <div className="font-semibold mb-3">Pricing</div>
          <div className="text-sm text-[var(--text-muted)]">Subtotal, VAT, total.</div>
          <div className="mt-3 text-xl font-semibold">£3,840</div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">VAT included</div>
          <Button className="mt-4">Send Quote</Button>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-8">
        <Card>
          <div className="font-semibold mb-3">Items & Materials (Live)</div>
          <DataTable
            tableId="quote-items"
            columns={[
              { header: "Item", accessorKey: "description" },
              { header: "Qty", accessorKey: "quantity" },
              { header: "Unit", accessorKey: "unit_price" },
              { header: "Total", accessorKey: "total" },
            ]}
            data={(quoteItems || []) as any}
          />
          <Button variant="secondary" className="mt-4">
            + Add Item
          </Button>
        </Card>
        <Card>
          <div className="font-semibold mb-3">Quote Preview (Lux)</div>
          <div className="h-[420px] rounded-lg bg-[var(--surface-2)] border border-[var(--border)] p-5 flex flex-col">
            <div className="flex justify-between mb-6">
              <div>
                <div className="text-lg font-semibold">FencingHub</div>
                <div className="text-xs text-[var(--text-muted)]">Luxury Quote Preview</div>
              </div>
              <Badge type="info">{latestQuote ? `v${latestQuote.version}` : "Draft"}</Badge>
            </div>
            <div className="text-sm text-[var(--text-muted)] mb-4">
              Prepared for {rows[0]?.project ?? "Customer"}
            </div>
            <div className="flex-1 border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--text-secondary)]">
              {latestQuote?.file_path ? (
                <iframe
                  className="w-full h-full rounded-md"
                  src={`/api/storage/sign?bucket=quotes&path=${encodeURIComponent(latestQuote.file_path)}`}
                />
              ) : (
                "Upload a PDF quote to preview here."
              )}
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span>Total</span>
              <span className="font-semibold">£3,840</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <div className="font-semibold mb-3">Recent Quotes</div>
          <DataTable
            tableId="quotes"
            columns={[
              { header: "Quote ID", accessorKey: "id" },
              { header: "Project", accessorKey: "project" },
              {
                header: "Status",
                accessorKey: "status",
                cell: ({ getValue }) => <Badge type="info">{String(getValue())}</Badge>,
              },
              { header: "Version", accessorKey: "version" },
              {
                header: "Created",
                accessorKey: "created_at",
                cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
              },
            ]}
            data={rows}
          />
        </Card>
      </div>
    </AdminShell>
  );
}
