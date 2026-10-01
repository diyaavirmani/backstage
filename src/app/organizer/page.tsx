import { EventBriefForm } from "@/components/event-brief-form";
import { SiteHeader } from "@/components/site-header";

export default function OrganizerPage() {
  return (
    <>
      <SiteHeader active="organizer" />
      <main className="workflow-page page-wrap">
        <div className="workflow-intro">
          <div className="workflow-heading"><p className="eyebrow"><span className="eyebrow-dot" /> FOR THE PEOPLE BRINGING PEOPLE TOGETHER</p><h1>Let’s make a<br /><em>little room.</em></h1><p>Start with the details you know. Your brief stays in this browser for now, ready for the next step.</p></div>
          <aside className="workflow-note"><span className="note-icon" aria-hidden="true">✳</span><p><strong>What happens next?</strong><br />This first version saves your event brief locally. Venue recommendations and booking requests arrive in a later milestone.</p></aside>
        </div>
        <EventBriefForm />
      </main>
      <footer className="site-footer page-wrap"><span>BACKSTAGE · EVENT BRIEF</span><span>Your draft stays on this device.</span><span>DELHI NCR · BENGALURU</span></footer>
    </>
  );
}
