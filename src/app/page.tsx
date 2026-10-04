import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Badge, SourceLink } from "@/components/ui";
import catalog from "@/data/research-catalog.json";

export default function Home() {
  const shifu = catalog.venues.find(
    (venue) => venue.id === "venue-shifu-den-bengaluru",
  )!;
  const source = catalog.sources.find(
    (item) => item.id === shifu.sourceIds[0],
  )!;
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="home-hero page-wrap">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" /> A clear starting point for your
              next gathering
            </p>
            <h1>
              Find the right space.
              <br />
              <span>Bring your event together.</span>
            </h1>
            <p className="hero-description">
              Create an event brief, explore researched venue leads, and
              understand what still needs a host’s confirmation.
            </p>
            <div className="hero-actions">
              <Link className="button button-dark" href="/organizer">
                Plan an event <span aria-hidden="true">→</span>
              </Link>
              <Link className="button button-light" href="/venues">
                Explore venues
              </Link>
            </div>
            <p className="city-note">
              Venue research in <strong>Delhi NCR</strong> and{" "}
              <strong>Bengaluru</strong>.
            </p>
            <p className="hero-boundary">
              Research leads support private drafts. Approvals and calendars use
              clearly fictional hosts.
            </p>
          </div>
          <aside
            className="product-preview"
            aria-label="Illustrative event research example"
          >
            <div className="preview-top">
              <span className="wordmark">
                backstage
                <span className="brand-spark" aria-hidden="true">
                  ✳
                </span>
              </span>
              <Badge>Illustrative example</Badge>
            </div>
            <div className="preview-brief">
              <p className="eyebrow">Event brief</p>
              <h2>Bengaluru founder gathering</h2>
              <div className="preview-meta">
                <span>28 founders</span>
                <span>Gathering room</span>
                <span>Pro-bono access?</span>
              </div>
            </div>
            <div className="preview-lead">
              <div className="venue-card-top">
                <Badge>Research lead</Badge>
                <span className="venue-city">Bengaluru</span>
              </div>
              <h3>{shifu.name}</h3>
              <p>{shifu.summary}</p>
              <div className="preview-fact">
                <Badge tone="supported">Documented</Badge>
                <p>
                  The source describes pro-bono access for its founder
                  community.
                </p>
              </div>
              <p className="qualification-note">
                <strong>Qualification:</strong> Detailed eligibility requires
                confirmation. This does not establish access for every
                organizer.
              </p>
              <div className="preview-fact">
                <Badge tone="unknown">Needs confirmation</Badge>
                <p>
                  Room/layout capacity, current availability, price terms, and
                  booking authority.
                </p>
              </div>
              <SourceLink url={source.url}>{source.title}</SourceLink>
              <small>
                Source checked {source.checkedAt}. Preview uses checked-in
                research; run discovery for live entry reads.
              </small>
            </div>
          </aside>
        </section>
        <section
          className="how-section page-wrap"
          aria-labelledby="how-heading"
        >
          <div className="section-heading">
            <p className="eyebrow">From idea to a useful next step</p>
            <h2 id="how-heading">Keep the event setup in one place.</h2>
            <p>
              Start with what your event needs. Let the evidence guide the
              conversation.
            </p>
          </div>
          <div className="steps-grid">
            {[
              {
                n: "01",
                title: "Create a brief",
                text: "Capture the audience, schedule, budget, rooms, and requirements that matter.",
                href: "/organizer",
                link: "Build your brief",
              },
              {
                n: "02",
                title: "Research venues",
                text: "Read source-grounded leads with qualifications, unknowns, and original citations.",
                href: "/venues",
                link: "Explore the catalog",
              },
              {
                n: "03",
                title: "Coordinate next steps",
                text: "Review a private research draft, or try approvals and resource planning with fictional hosts.",
                href: "/host",
                link: "Try the host demo",
              },
            ].map((step) => (
              <article className="step-card" key={step.n}>
                <span className="step-number">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <Link className="text-link" href={step.href}>
                  {step.link} <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="research-boundary page-wrap">
          <div>
            <h2>Evidence helps you ask better questions.</h2>
            <p>
              Public research can describe a venue and its hosting conditions.
              It cannot confirm today’s availability, a price, your eligibility,
              or permission for Backstage to book.
            </p>
          </div>
          <div>
            <Badge tone="demo">Fictional operations</Badge>
            <p>
              Two sample hosts demonstrate requests, approvals, shared
              resources, and preparation. Role switching is a simulation.
            </p>
            <Link className="text-link" href="/host">
              Explore the demonstration →
            </Link>
          </div>
        </section>
        <section className="closing-banner page-wrap">
          <div>
            <h2>Bring a plan. Find a place to explore.</h2>
            <p>Start with your event brief.</p>
          </div>
          <Link className="button button-light" href="/organizer">
            Plan an event →
          </Link>
        </section>
      </main>
      <footer className="site-footer page-wrap">
        <Link className="wordmark" href="/">
          backstage
        </Link>
        <span>Delhi NCR · Bengaluru</span>
        <nav aria-label="Footer navigation">
          <Link href="/venues">Venue research</Link>
          <Link href="/host">Fictional host demo</Link>
        </nav>
      </footer>
    </>
  );
}
