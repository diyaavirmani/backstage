import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HostPage() {
  return (
    <>
      <SiteHeader active="host" />
      <main className="host-page page-wrap">
        <div className="host-heading"><p className="eyebrow"><span className="eyebrow-dot" /> FOR THE PEOPLE WHO OPEN THEIR DOORS</p><h1>Your space can<br />make <em>something happen.</em></h1><p>Backstage is building a calmer way to share your venue’s guidelines, available dates, and the kinds of gatherings you welcome.</p></div>
        <section className="host-empty" aria-labelledby="host-empty-title"><div className="empty-illustration" aria-hidden="true"><div className="empty-sun">✳</div><div className="empty-door"><span /></div><div className="empty-step" /></div><div className="empty-copy"><p className="eyebrow">HOST SPACE · COMING IN A LATER MILESTONE</p><h2 id="host-empty-title">A little quiet<br />before the <em>gathering.</em></h2><p>Requests and availability will show up here once host tools are ready. No requests have been received, and no availability is being tracked yet.</p><Link className="text-link" href="/">Explore Backstage <span aria-hidden="true">→</span></Link></div><div className="empty-status"><span className="status-dot" /> Host requests <strong>Not connected yet</strong><span className="status-dot" /> Availability calendar <strong>Not connected yet</strong></div></section>
        <div className="host-next"><span className="next-number">UP NEXT</span><p>Hosts will be able to describe preferred event types, share room and equipment details, and review requests in one place.</p><span className="next-symbol" aria-hidden="true">↗</span></div>
      </main>
      <footer className="site-footer page-wrap"><span>BACKSTAGE · FOR HOSTS</span><span>Building with care, one milestone at a time.</span><span>DELHI NCR · BENGALURU</span></footer>
    </>
  );
}
