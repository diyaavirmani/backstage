import { SiteHeader } from "@/components/site-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PageHeader } from "@/components/ui";
import { OperationsWorkspace } from "@/components/operations-workspace";

export default function HostPage() {
  return (
    <>
      <SiteHeader active="host" />
      <WorkspaceShell kind="host">
        <main id="main-content">
          <PageHeader
            illustration="host"
            label="Fictional host demonstration"
            title="Host workspace"
            description="Review requests, coordinate resources, and prepare together in your private demo workspace."
          />
          <OperationsWorkspace mode="host" />
        </main>
      </WorkspaceShell>
    </>
  );
}
