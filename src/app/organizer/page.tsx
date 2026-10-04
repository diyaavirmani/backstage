import { EventBriefForm } from "@/components/event-brief-form";
import {OperationsWorkspace} from "@/components/operations-workspace";
import { SiteHeader } from "@/components/site-header";

export default function OrganizerPage() {
  return (
    <>
      <SiteHeader active="organizer" />
      <main className="workflow-page page-wrap">
        <div className="workflow-intro">
          <div className="workflow-heading"><p className="eyebrow"><span className="eyebrow-dot" /> ORGANIZER WORKSPACE</p><h1>Plan your event</h1><p>Share the details that make your event work. Backstage will look for sourced venue leads and show what still needs confirmation.</p></div>
          <aside className="workflow-note"><span className="note-icon" aria-hidden="true">✳</span><p><strong>What happens next?</strong><br />Research leads can receive private drafts only. Fictional demo hosts support a complete simulated request, approval, and preparation checklist.</p></aside>
        </div>
        <nav className="section-nav" aria-label="Organizer page sections">
          <a href="#event-brief">Event brief</a><a href="#venue-leads">Venue leads</a><a href="#application-workspace">Application workspace</a>
        </nav>
        <EventBriefForm />
        <OperationsWorkspace mode="organizer" />
      </main>
      <footer className="site-footer page-wrap"><span>BACKSTAGE · ORGANIZER</span><span>Briefs stay local; demo applications use a private server workspace.</span><span>DELHI NCR · BENGALURU</span></footer>
    </>
  );
}
