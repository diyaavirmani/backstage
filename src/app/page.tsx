import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return <>
    <SiteHeader />
    <main className="home-page page-wrap">
      <section className="home-hero" aria-labelledby="home-heading">
        <p className="eyebrow"><span className="eyebrow-dot" /> DELHI NCR · BENGALURU</p>
        <h1 id="home-heading">Find a space that fits your event.</h1>
        <p className="hero-description">Share your plan. Explore venue leads with evidence, qualifications, and unknowns kept clear.</p>
        <div className="hero-actions">
          <Link className="button button-dark" href="/organizer">Plan an event <span aria-hidden="true">→</span></Link>
          <Link className="button button-light" href="/venues">Explore venues</Link>
        </div>
        <p className="home-note">Researched venues are leads for private drafts. Host approvals and calendars use fictional demo venues.</p>
      </section>
    </main>
    <footer className="site-footer page-wrap"><Link className="wordmark" href="/" aria-label="Backstage home"><span className="wordmark-icon" aria-hidden="true"><span /></span><span>backstage</span></Link><span>Delhi NCR · Bengaluru</span></footer>
  </>;
}
