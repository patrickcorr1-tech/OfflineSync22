import AdminShell from "@/components/layouts/AdminShell";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function CustomersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  const rows = (companies || []).map((c) => ({
    id: c.id,
    name: c.name,
    created_at: c.created_at,
  }));

  return (
    <AdminShell>
      <div className="text-2xl font-semibold mb-6">Customers</div>
      <Card>
        <DataTable
          tableId="customers"
          columns={[
            { header: "Customer ID", accessorKey: "id" },
            { header: "Name", accessorKey: "name" },
            {
              header: "Created",
              accessorKey: "created_at",
              cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
            },
          ]}
          data={rows}
        />
      </Card>
    </AdminShell>
  );
}
