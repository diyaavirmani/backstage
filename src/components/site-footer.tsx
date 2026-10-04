import Link from "next/link";
import { LogoMark } from "@/components/icons";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-wrap footer-grid">
        <div className="footer-brand">
          <Link className="wordmark" href="/">
            <LogoMark />
            <span>backstage</span>
          </Link>
          <p>
            Source-backed venue research for community gatherings in Delhi NCR
            and Bengaluru.
          </p>
        </div>
        <nav aria-label="Footer navigation" className="footer-columns">
          <div>
            <p className="footer-label">Product</p>
            <Link href="/organizer">Plan an event</Link>
            <Link href="/venues">Venue research</Link>
            <Link href="/host">Fictional host demo</Link>
          </div>
          <div>
            <p className="footer-label">Workspace</p>
            <Link href="/organizer?view=brief">Event brief</Link>
            <Link href="/organizer?view=research">Research leads</Link>
            <Link href="/organizer?view=drafts">Private drafts</Link>
          </div>
        </nav>
      </div>
      <div className="page-wrap footer-bottom">
        <span>Delhi NCR · Bengaluru</span>
        <span>
          Venues listed are research leads, not partners. Host operations use
          fictional records.
        </span>
      </div>
    </footer>
  );
}
