import {OperationsWorkspace} from "@/components/operations-workspace";
import {SiteHeader} from "@/components/site-header";

export default function HostPage() {
  return <>
    <SiteHeader active="host" />
    <main className="host-page page-wrap">
      <div className="host-heading"><p className="eyebrow"><span className="eyebrow-dot"/> FICTIONAL HOST DEMONSTRATION</p><h1>Host workspace</h1><p>Review demo requests, allocate fictional resources, and coordinate preparation. Role switching is a simulation; researched venues are not onboarded for bookings.</p></div>
      <OperationsWorkspace mode="host" />
    </main>
    <footer className="site-footer page-wrap"><span>BACKSTAGE · HOST SIMULATION</span><span>Fictional operations workspace</span><span>DELHI NCR · BENGALURU</span></footer>
  </>;
}
