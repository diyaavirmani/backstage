import { SiteHeader } from "@/components/site-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui";
import { EventBriefForm } from "@/components/event-brief-form";
import { OperationsWorkspace } from "@/components/operations-workspace";

export default function OrganizerPage() {
  return (
    <>
      <SiteHeader active="organizer" />
      <WorkspaceShell kind="organizer">
        <main id="main-content">
          <PageHeader
            label="Organizer workspace"
            title="Plan your event"
            description="Create a brief, research venue leads, and review a private application draft."
          />
          <EventBriefForm />
          <div id="application-workspace-disclosure">
            <OperationsWorkspace mode="organizer" />
          </div>
        </main>
      </WorkspaceShell>
    </>
  );
}
