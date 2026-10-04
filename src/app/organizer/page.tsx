import { EventBriefForm } from "@/components/event-brief-form";
import {OperationsWorkspace} from "@/components/operations-workspace";
import { SiteHeader } from "@/components/site-header";

export default function OrganizerPage() {
  return (
    <>
      <SiteHeader active="organizer" />
      <main className="workflow-page page-wrap">
        <div className="workflow-intro">
          <div className="workflow-heading"><p className="eyebrow"><span className="eyebrow-dot" /> ORGANIZER</p><h1>Plan your event</h1><p>Describe your event. Backstage will find source-backed venue leads and show what needs confirmation.</p></div>
        </div>
        <EventBriefForm />
        <details id="application-workspace-disclosure" className="application-workspace-disclosure">
          <summary>Application details <span>Private drafts and fictional host requests</span></summary>
          <OperationsWorkspace mode="organizer" />
        </details>
      </main>
      <footer className="site-footer page-wrap"><span>BACKSTAGE · ORGANIZER</span><span>Briefs stay local; demo applications use a private server workspace.</span><span>DELHI NCR · BENGALURU</span></footer>
    </>
  );
}
