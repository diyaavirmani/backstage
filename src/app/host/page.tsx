import {OperationsWorkspace} from "@/components/operations-workspace";
import {SiteHeader} from "@/components/site-header";

export default function HostPage() {
  return <>
    <SiteHeader active="host" />
    <main className="host-page page-wrap">
      <div className="host-heading"><p className="eyebrow"><span className="eyebrow-dot"/> HOST REVIEW · SIMULATED DEMONSTRATION</p><h1>Make room for<br/><em>what’s possible.</em></h1><p>Review requests and coordinate fictional demonstration resources. Real venues are not onboarded for Backstage bookings.</p></div>
      <OperationsWorkspace mode="host" />
    </main>
    <footer className="site-footer page-wrap"><span>BACKSTAGE · HOST SIMULATION</span><span>Fictional operations workspace</span><span>DELHI NCR · BENGALURU</span></footer>
  </>;
}
