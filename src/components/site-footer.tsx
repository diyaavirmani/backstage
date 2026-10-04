import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-columns page-wrap">
        <div>
          <Link className="wordmark" href="/">
            backstage
          </Link>
          <p>Find a place your event can actually work.</p>
          <p>Delhi NCR · Bengaluru</p>
        </div>
        <nav aria-label="Footer navigation">
          <strong>Explore</strong>
          <Link href="/organizer">Plan an event</Link>
          <Link href="/venues">Venue research</Link>
          <Link href="/host">Fictional host demo</Link>
        </nav>
        <div>
          <strong>Built around evidence</strong>
          <p>
            Researched venues support private drafts. Demo hosts show the
            operational workflow.
          </p>
          <a
            href="https://github.com/diyaavirmani/backstage"
            target="_blank"
            rel="noreferrer"
          >
            View the code ↗
          </a>
        </div>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        backstage
      </div>
      <div className="footer-bottom page-wrap">
        <span>Source-backed venue research. Clear next steps.</span>
        <span>Original AI artwork · fictional scenes</span>
      </div>
    </footer>
  );
}
