import AdminShell from "@/components/layouts/AdminShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Timeline } from "@/components/ui/Timeline";
import { DataTable } from "@/components/ui/DataTable";
import { MotionCard } from "@/components/ui/MotionCard";
import { FilterChips } from "@/components/ui/FilterChips";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function JobsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, created_at, company:companies(name)")
    .order("created_at", { ascending: false })
    .limit(25);

  const rows = (projects || []).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    company: (p as any).company?.name ?? "—",
    created_at: p.created_at,
  }));

  const primaryProjectId = projects?.[0]?.id;

  const [{ data: notes }, { data: attachments }, { data: invoices }, { data: quotes }] =
    await Promise.all([
      supabase
        .from("project_notes")
        .select("id, content, created_at")
        .eq("project_id", primaryProjectId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("gallery_items")
        .select("id, file_path, caption, created_at")
        .eq("project_id", primaryProjectId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("invoices")
        .select("id, file_path, created_at")
        .eq("project_id", primaryProjectId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("quotes")
        .select("id, status, version, created_at")
        .eq("project_id", primaryProjectId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge type="success">Completed</Badge>;
    if (status === "in_progress") return <Badge type="info">Active</Badge>;
    if (status === "quoted") return <Badge type="warn">Quoted</Badge>;
    return <Badge type="info">Lead</Badge>;
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-semibold">Jobs</div>
          <div className="text-sm text-[var(--text-muted)]">
            Manage all active jobs, schedules, and invoices.
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">Filters</Button>
          <Button>New Job</Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Tabs
          tabs={["All Jobs", "Active", "Scheduled", "Overdue"]}
          active="All Jobs"
          onChange={() => {}}
        />
        <div className="flex gap-2">
          <Button variant="secondary">Saved Views</Button>
          <Button variant="secondary">Bulk Actions</Button>
        </div>
      </div>

      <FilterChips chips={["This Week", "Needs Scheduling", "Waiting Payment"]} />

      <DataTable
        tableId="jobs"
        columns={[
          { header: "Job ID", accessorKey: "id" },
          { header: "Customer", accessorKey: "company" },
          { header: "Project", accessorKey: "name" },
          {
            header: "Status",
            accessorKey: "status",
            cell: ({ getValue }) => statusBadge(getValue() as string),
          },
          {
            header: "Created",
            accessorKey: "created_at",
            cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
          },
        ]}
        data={rows}
        renderRowActions={() => (
          <div className="flex justify-end gap-2 text-xs">
            <Button variant="secondary">View</Button>
            <Button variant="secondary">Message</Button>
          </div>
        )}
      />

      <div className="grid grid-cols-4 gap-6 mt-8">
        <MotionCard>
          <div className="font-semibold mb-2">Job Timeline</div>
          <Timeline
            items={[
              { title: "Booked", meta: "Oct 10, 09:15", status: "done" },
              { title: "On the way", meta: "Oct 12, 08:30", status: "active" },
              { title: "In progress", meta: "Expected 10:00", status: "muted" },
              { title: "Completed", meta: "Awaiting", status: "muted" },
            ]}
          />
        </MotionCard>
        <MotionCard>
          <div className="font-semibold mb-2">Notes</div>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {(notes || []).length === 0 && (
              <div className="text-[var(--text-muted)]">No notes yet.</div>
            )}
            {(notes || []).map((n) => (
              <div key={n.id} className="border-b border-[var(--border)] pb-2">
                {n.content}
              </div>
            ))}
          </div>
        </MotionCard>
        <MotionCard>
          <div className="font-semibold mb-2">Attachments</div>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {(attachments || []).length === 0 && (
              <div className="text-[var(--text-muted)]">No attachments.</div>
            )}
            {(attachments || []).map((a) => (
              <div key={a.id} className="flex justify-between border-b border-[var(--border)] pb-2">
                <span>{a.caption || "Site photo"}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </MotionCard>
        <MotionCard>
          <div className="font-semibold mb-2">Invoices & Quotes</div>
          <div className="text-xs text-[var(--text-muted)]">Quotes</div>
          <div className="space-y-2 text-sm text-[var(--text-secondary)] mb-3">
            {(quotes || []).length === 0 && (
              <div className="text-[var(--text-muted)]">No quotes yet.</div>
            )}
            {(quotes || []).map((q) => (
              <div key={q.id} className="flex justify-between border-b border-[var(--border)] pb-2">
                <span>v{q.version}</span>
                <span className="text-xs text-[var(--text-muted)]">{q.status}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Invoices</div>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {(invoices || []).length === 0 && (
              <div className="text-[var(--text-muted)]">No invoices yet.</div>
            )}
            {(invoices || []).map((inv) => (
              <div
                key={inv.id}
                className="flex justify-between border-b border-[var(--border)] pb-2"
              >
                <span>Invoice</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(inv.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </MotionCard>
      </div>
    </AdminShell>
  );
}
