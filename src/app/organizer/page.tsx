import { EventBriefForm } from "@/components/event-brief-form";
import {OperationsWorkspace} from "@/components/operations-workspace";
import { SiteHeader } from "@/components/site-header";

export default function OrganizerPage() {
  return (
    <>
      <SiteHeader active="organizer" />
      <main className="workflow-page page-wrap">
        <div className="workflow-intro">
          <div className="workflow-heading"><p className="eyebrow"><span className="eyebrow-dot" /> FOR THE PEOPLE BRINGING PEOPLE TOGETHER</p><h1>Let’s make a<br /><em>little room.</em></h1><p>Describe what you’re hosting. Backstage will look through sourced venue knowledge and show leads with details that still need a host’s confirmation.</p></div>
          <aside className="workflow-note"><span className="note-icon" aria-hidden="true">✳</span><p><strong>What happens next?</strong><br />Research leads can receive private drafts only. Fictional demo hosts support a complete simulated request, approval, and preparation checklist.</p></aside>
        </div>
        <EventBriefForm />
        <OperationsWorkspace mode="organizer" />
      </main>
      <footer className="site-footer page-wrap"><span>BACKSTAGE · ORGANIZER</span><span>Briefs stay local; demo applications use a private server workspace.</span><span>DELHI NCR · BENGALURU</span></footer>
    </>
  );
}
