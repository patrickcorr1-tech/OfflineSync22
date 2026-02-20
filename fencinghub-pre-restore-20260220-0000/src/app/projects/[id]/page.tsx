"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProjectTabs from "@/components/ProjectTabs";
// Customer chat removed
import ProjectEngagement from "@/components/ProjectEngagement";
import ProjectApprovals from "@/components/ProjectApprovals";
import ProjectGallery from "@/components/ProjectGallery";
import ProjectDocuments from "@/components/ProjectDocuments";
import ProjectTimeline from "@/components/ProjectTimeline";
// Measurements removed
import ProjectDetails from "@/components/ProjectDetails";
import ProjectChecklist from "@/components/ProjectChecklist";
import ProjectReminders from "@/components/ProjectReminders";
import DashboardShell from "@/components/DashboardShell";
import { useProfile } from "@/lib/useProfile";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = (params?.id as string) || "";
  const { profile } = useProfile();
  const [active, setActive] = useState("Engagement");

  useEffect(() => {
    if (profile?.role && profile.role !== "customer") {
      setActive("Project details");
    }
  }, [profile?.role]);

  return (
    <DashboardShell title="Project Workspace" subtitle={`Project ID: ${projectId || ""}`}>
      <ProjectTabs
        active={active}
        onChange={setActive}
        isCustomer={profile?.role === "customer"}
        role={profile?.role}
      />

      <div className="mt-6">
        {active === "Engagement" && (
          <ProjectEngagement
            projectId={projectId}
            showSnags={profile?.role === "customer"}
            showQuoteRequests
          />
        )}
        {active === "Snags" && (
          <ProjectEngagement
            projectId={projectId}
            showStatus={false}
            showSnags
            showQuoteRequests={false}
          />
        )}
        {/* Customer chat removed */}
        {active === "Approvals" && <ProjectApprovals projectId={projectId} />}
        {active === "Project details" && <ProjectDetails projectId={projectId} />}
        {active === "Checklist" && <ProjectChecklist projectId={projectId} />}
        {active === "Reminders" && <ProjectReminders projectId={projectId} />}
        {active === "Gallery" && <ProjectGallery projectId={projectId} />}
        {active === "Documents" && <ProjectDocuments projectId={projectId} />}
        {active === "Timeline" && <ProjectTimeline projectId={projectId} />}
        {/* Measurements removed */}
      </div>
    </DashboardShell>
  );
}
