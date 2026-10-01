import Link from "next/link";

export function SiteHeader({ active }: { active?: "organizer" | "host" }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" href="/" aria-label="Backstage home">
          <span className="wordmark-icon" aria-hidden="true"><span /></span>
          <span>backstage</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link className={active === "organizer" ? "nav-link active" : "nav-link"} href="/organizer">For organizers</Link>
          <Link className={active === "host" ? "nav-link active" : "nav-link"} href="/host">For hosts</Link>
        </nav>
        <Link className="header-action" href="/organizer">Start an event brief <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}
