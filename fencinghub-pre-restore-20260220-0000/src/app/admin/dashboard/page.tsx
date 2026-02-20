import AdminShell from "@/components/layouts/AdminShell";
import { MotionCard } from "@/components/ui/MotionCard";
import { Badge } from "@/components/ui/Badge";
import { Activity, AlertTriangle, ClipboardList, PoundSterling } from "lucide-react";

export default function AdminDashboard() {
  return (
    <AdminShell>
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: "Active Jobs", icon: <Activity size={16} /> },
          { label: "Quotes Pending", icon: <ClipboardList size={16} /> },
          { label: "Overdue", icon: <AlertTriangle size={16} /> },
          { label: "Revenue", icon: <PoundSterling size={16} /> },
        ].map((k) => (
          <MotionCard key={k.label} className="interactive">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-2)]">
                {k.label}
              </div>
              <div className="text-[var(--accent)]">{k.icon}</div>
            </div>
            <div className="mt-3 text-3xl font-semibold">24</div>
            <div className="mt-2 text-xs text-[var(--text-2)]">+12% this week</div>
          </MotionCard>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-5">
        <MotionCard className="col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Pipeline</div>
            <Badge type="info">Live</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {["Leads", "Quoted", "Scheduled", "In Progress", "Completed"].map((stage, i) => (
              <div key={stage} className="flex items-center gap-3">
                <div className="w-24 text-xs text-[var(--text-2)]">{stage}</div>
                <div className="h-2 flex-1 rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-2 rounded-full bg-[var(--accent)]"
                    style={{ width: `${(i + 1) * 18}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </MotionCard>
        <MotionCard>
          <div className="text-sm font-semibold">Insights</div>
          <div className="mt-4 space-y-3 text-sm text-[var(--text-1)]">
            <div className="flex items-center justify-between">
              <span>Overdue jobs</span>
              <Badge type="warn">3</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Payments at risk</span>
              <Badge type="error">2</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Needs scheduling</span>
              <Badge type="info">5</Badge>
            </div>
          </div>
        </MotionCard>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <MotionCard>
          <div className="text-sm font-semibold">Activity Feed</div>
          <div className="mt-4 space-y-3 text-sm text-[var(--text-1)]">
            <div className="flex justify-between border-b border-[var(--border)] pb-2">
              <span>Quote v3 sent to Hillcrest Farm</span>
              <span className="text-xs text-[var(--text-2)]">10:24</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)] pb-2">
              <span>Job booked: Langdon Estates</span>
              <span className="text-xs text-[var(--text-2)]">09:10</span>
            </div>
            <div className="flex justify-between">
              <span>Payment received: £1,250</span>
              <span className="text-xs text-[var(--text-2)]">Yesterday</span>
            </div>
          </div>
        </MotionCard>
        <MotionCard>
          <div className="text-sm font-semibold">Next Actions</div>
          <div className="mt-4 space-y-3 text-sm text-[var(--text-1)]">
            <div className="flex items-center justify-between">
              <span>Send reminder to Northgate Stables</span>
              <Badge type="warn">Due</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Schedule survey for Hillcrest Farm</span>
              <Badge type="info">This week</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Upload invoice for Langdon Estates</span>
              <Badge type="success">Ready</Badge>
            </div>
          </div>
        </MotionCard>
      </div>
    </AdminShell>
  );
}
