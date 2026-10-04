import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge, SourceLink } from "@/components/ui";
import { Icon, LogoMark } from "@/components/icons";
import catalog from "@/data/research-catalog.json";

const steps = [
  {
    n: "01",
    tag: "Brief",
    title: "Create a brief",
    text: "Capture the audience, schedule, budget, rooms, and requirements that matter.",
    href: "/organizer",
    link: "Build your brief",
    visual: "brief",
  },
  {
    n: "02",
    tag: "Research",
    title: "Research venues",
    text: "Read source-grounded leads with qualifications, unknowns, and original citations.",
    href: "/venues",
    link: "Explore the catalog",
    visual: "research",
  },
  {
    n: "03",
    tag: "Coordinate",
    title: "Coordinate next steps",
    text: "Review a private research draft, or try approvals and resource planning with fictional hosts.",
    href: "/host",
    link: "Try the host demo",
    visual: "coordinate",
  },
] as const;

const evidenceTypes = [
  {
    tone: "supported",
    label: "Documented",
    text: "A public source describes it, with the date it was checked.",
  },
  {
    tone: "historical",
    label: "Historical",
    text: "An event happened there once. It does not confirm access today.",
  },
  {
    tone: "unknown",
    label: "Needs confirmation",
    text: "Not published. Ask the host before you plan around it.",
  },
  {
    tone: "conflicting",
    label: "Conflicting",
    text: "Sources disagree. Resolve it before you rely on it.",
  },
] as const;

function StepVisual({ kind }: { kind: (typeof steps)[number]["visual"] }) {
  if (kind === "brief")
    return (
      <div className="step-visual" aria-hidden="true">
        <div className="mini-field">
          <span>Headcount</span>
          <strong>28 founders</strong>
        </div>
        <div className="mini-field">
          <span>Room</span>
          <strong>Gathering room</strong>
        </div>
        <div className="mini-chips">
          <span className="mini-chip strong">Essential · Projector</span>
          <span className="mini-chip">Flexible · Evening</span>
        </div>
      </div>
    );
  if (kind === "research")
    return (
      <div className="step-visual" aria-hidden="true">
        {[
          ["Hosting purpose", "supported", "Documented"],
          ["Room capacity", "unknown", "Unknown"],
          ["Past event", "historical", "Historical"],
        ].map(([label, tone, status]) => (
          <div className="mini-row" key={label}>
            <span>{label}</span>
            <span className={`status-chip ${tone}`}>{status}</span>
          </div>
        ))}
      </div>
    );
  return (
    <div className="step-visual" aria-hidden="true">
      <div className="mini-slot hold">
        <span>Temporary hold</span>
        <strong>Sat · 17:00–19:00</strong>
      </div>
      <div className="mini-slot confirmed">
        <span>Confirmed</span>
        <strong>Projector · 1 of 1</strong>
      </div>
      <div className="mini-check">
        <Icon name="check" size={14} /> Share AV checklist
      </div>
    </div>
  );
}

export default function Home() {
  const shifu = catalog.venues.find(
    (venue) => venue.id === "venue-shifu-den-bengaluru",
  )!;
  const source = catalog.sources.find(
    (item) => item.id === shifu.sourceIds[0],
  )!;
  const claims = catalog.venues.flatMap((venue) => venue.claims);
  const cited = claims.filter((claim) => claim.sourceIds.length > 0).length;
  const cities = new Set(catalog.venues.map((venue) => venue.city)).size;
  const stats = [
    [String(catalog.venues.length), "researched venue profiles"],
    [String(catalog.sources.length), "dated public sources"],
    [`${cited}/${claims.length}`, "claims linked to a source"],
    [String(cities), "cities: Delhi NCR and Bengaluru"],
  ];
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="home">
        <section className="home-hero">
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-copy">
            <p className="hero-eyebrow">
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
              <Link className="button button-accent" href="/organizer">
                Plan an event <Icon name="arrowRight" size={16} />
              </Link>
              <Link className="button button-ghost" href="/venues">
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
            <div className="preview-chrome">
              <span className="chrome-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="chrome-url">backstage / organizer / research</span>
              <Badge>Illustrative example</Badge>
            </div>
            <div className="preview-body">
              <div className="preview-sidebar" aria-hidden="true">
                <span className="preview-brand">
                  <LogoMark size={18} /> backstage
                </span>
                <span className="preview-nav">
                  <Icon name="brief" size={15} /> Event brief
                </span>
                <span className="preview-nav current">
                  <Icon name="search" size={15} /> Venue research
                </span>
                <span className="preview-nav">
                  <Icon name="drafts" size={15} /> Private drafts
                </span>
              </div>
              <div className="preview-main">
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
                    <span className="venue-city">
                      <Icon name="pin" size={13} /> Bengaluru
                    </span>
                  </div>
                  <h3>{shifu.name}</h3>
                  <p className="preview-summary">{shifu.summary}</p>
                  <div className="preview-facts">
                    <div className="preview-fact">
                      <Badge tone="supported">Documented</Badge>
                      <p>
                        The source describes pro-bono access for its founder
                        community.
                      </p>
                    </div>
                    <p className="qualification-note">
                      <strong>Qualification:</strong> Detailed eligibility
                      requires confirmation. This does not establish access for
                      every organizer.
                    </p>
                    <div className="preview-fact">
                      <Badge tone="unknown">Needs confirmation</Badge>
                      <p>
                        Room/layout capacity, current availability, price terms,
                        and booking authority.
                      </p>
                    </div>
                  </div>
                  <div className="preview-source">
                    <SourceLink url={source.url}>{source.title}</SourceLink>
                    <small>
                      Source checked {source.checkedAt}. Preview uses
                      checked-in research; run discovery for live entry reads.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="stats-strip page-wrap" aria-label="Research coverage">
          {stats.map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className="how-section page-wrap" aria-labelledby="how-heading">
          <div className="section-heading">
            <p className="eyebrow">From idea to a useful next step</p>
            <h2 id="how-heading">Keep the event setup in one place.</h2>
            <p>
              Start with what your event needs. Let the evidence guide the
              conversation.
            </p>
          </div>
          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.n}>
                <StepVisual kind={step.visual} />
                <div className="step-body">
                  <span className="step-number">
                    {step.n} · {step.tag}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <Link className="text-link" href={step.href}>
                    {step.link} <Icon name="arrowRight" size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="research-boundary page-wrap"
          aria-labelledby="evidence-heading"
        >
          <div className="evidence-intro">
            <p className="eyebrow">How evidence is labelled</p>
            <h2 id="evidence-heading">Evidence helps you ask better questions.</h2>
            <p>
              Public research can describe a venue and its hosting conditions.
              It cannot confirm today’s availability, a price, your eligibility,
              or permission for Backstage to book.
            </p>
            <ul className="evidence-legend">
              {evidenceTypes.map((type) => (
                <li key={type.label}>
                  <Badge tone={type.tone}>{type.label}</Badge>
                  <span>{type.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="demo-card">
            <div className="demo-card-head">
              <Badge tone="demo">Fictional operations</Badge>
              <Icon name="calendar" size={20} />
            </div>
            <h3>See the host side, safely.</h3>
            <p>
              Two sample hosts demonstrate requests, approvals, shared
              resources, and preparation. Role switching is a simulation.
            </p>
            <ul className="demo-timeline" aria-hidden="true">
              <li>
                <span className="dot pending" /> Request received
                <small>Organizer simulation</small>
              </li>
              <li>
                <span className="dot hold" /> Temporary hold placed
                <small>Resource calendar</small>
              </li>
              <li>
                <span className="dot confirmed" /> Approved · checklist shared
                <small>Preparation</small>
              </li>
            </ul>
            <Link className="text-link" href="/host">
              Explore the demonstration <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </section>

        <section className="closing-banner page-wrap">
          <div>
            <h2>Bring a plan. Find a place to explore.</h2>
            <p>Start with your event brief.</p>
          </div>
          <Link className="button button-accent" href="/organizer">
            Plan an event <Icon name="arrowRight" size={16} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
