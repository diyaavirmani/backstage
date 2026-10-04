import type { CSSProperties } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { RevealWords, Rise } from "@/components/motion";
import { PixelImage } from "@/components/pixel-image";
import catalog from "@/data/research-catalog.json";

const features = [
  {
    title: "Create a brief",
    text: "Capture the audience, schedule, budget, rooms, and requirements that matter. Mark what is essential and what can flex, so a host sees the whole setup, not just a headcount.",
    href: "/organizer",
    link: "Build your brief",
    painting: "/images/workshop-day.jpg",
    ui: "/images/ui/brief.png",
    uiSize: [2192, 1470],
    uiWidth: "94%",
    uiAlt:
      "The event brief editor with event details and a live summary of the event.",
  },
  {
    title: "Research venues",
    text: "Read source-grounded leads with qualifications, unknowns, and original citations. Every claim links to the page it came from and the date it was checked.",
    href: "/venues",
    link: "Explore the catalog",
    painting: "/images/founders-lounge.jpg",
    ui: "/images/ui/lead-card.png",
    uiSize: [1080, 1174],
    uiWidth: "54%",
    uiAlt:
      "A venue research card showing documented evidence, a qualification, open questions, and its source.",
  },
  {
    title: "Coordinate next steps",
    text: "Review a private research draft, or try approvals and resource planning with fictional hosts. Two sample hosts demonstrate requests, shared resources, and preparation; role switching is a simulation.",
    href: "/host",
    link: "Try the host demo",
    painting: "/images/terrace-mixer.jpg",
    ui: "/images/ui/calendar.png",
    uiSize: [2272, 668],
    uiWidth: "100%",
    uiAlt:
      "The fictional host resource calendar with a confirmed reservation and its shared resources.",
  },
];

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

export default function Home() {
  const claims = catalog.venues.flatMap((venue) => venue.claims);
  const cited = claims.filter((claim) => claim.sourceIds.length > 0).length;
  const cities = new Set(catalog.venues.map((venue) => venue.city)).size;
  const stats = [
    [String(catalog.venues.length), "researched venue profiles"],
    [String(catalog.sources.length), "dated public sources"],
    [`${cited}/${claims.length}`, "claims linked to a source"],
    [String(cities), "cities, Delhi NCR and Bengaluru"],
  ];
  return (
    <div className="landing">
      <SiteHeader tone="dark" />
      <main id="main-content" className="home">
        <section className="home-hero">
          <div className="hero-art" aria-hidden="true">
            <PixelImage
              src="/images/hero-hackathon.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
            />
          </div>
          <div className="hero-copy page-wrap">
            <h1>
              <RevealWords text="Find the right space." delay={0.15} step={0.075} />
              <br />
              <span className="hero-title-muted">
                <RevealWords text="Bring your event together." delay={0.42} step={0.075} />
              </span>
            </h1>
            <Rise as="p" delay={0.8} className="hero-description">
              Create an event brief, explore researched venue leads, and
              understand what still needs a host’s confirmation.
            </Rise>
            <Rise delay={0.92} className="hero-actions">
              <Link className="button button-light-solid" href="/organizer">
                Plan an event <Icon name="arrowRight" size={16} />
              </Link>
              <Link className="button button-glass" href="/venues">
                Explore venues
              </Link>
            </Rise>
            <Rise as="p" delay={1.04} className="city-note">
              Venue research in <strong>Delhi NCR</strong> and{" "}
              <strong>Bengaluru</strong>. Research leads support private
              drafts; approvals and calendars use clearly fictional hosts.
            </Rise>
          </div>
          <Rise as="figure" delay={1.1} className="product-preview">
            <div className="app-frame">
              <PixelImage
                src="/images/ui/app-venues.png"
                alt="The Backstage venue research workspace listing researched venue leads with evidence badges and sources."
                width={2880}
                height={1800}
                sizes="(max-width: 1280px) 100vw, 1200px"
                priority
              />
            </div>
            <figcaption>
              Illustrative example: the venue catalog with checked-in research.
            </figcaption>
          </Rise>
        </section>

        <section className="stats-strip page-wrap" aria-label="Research coverage">
          {stats.map(([value, label]) => (
            <div key={label} className="scroll-reveal">
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className="features page-wrap" aria-labelledby="how-heading">
          <div className="section-heading scroll-reveal">
            <h2 id="how-heading">Keep the event setup in one place.</h2>
            <p>
              Start with what your event needs. Let the evidence guide the
              conversation.
            </p>
          </div>
          {features.map((feature, index) => (
            <article
              className={`step-card feature-row${index % 2 ? " flipped" : ""}`}
              key={feature.title}
            >
              <div className="feature-copy scroll-reveal">
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <Link className="text-link" href={feature.href}>
                  {feature.link} <Icon name="arrowRight" size={14} />
                </Link>
              </div>
              <div className="feature-art scroll-reveal">
                <PixelImage
                  className="feature-painting"
                  src={feature.painting}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 640px"
                />
                <PixelImage
                  className="feature-ui"
                  src={feature.ui}
                  alt={feature.uiAlt}
                  width={feature.uiSize[0]}
                  height={feature.uiSize[1]}
                  sizes="(max-width: 900px) 90vw, 640px"
                  style={{ "--ui-w": feature.uiWidth } as CSSProperties}
                />
              </div>
            </article>
          ))}
        </section>

        <section
          className="evidence-showcase page-wrap"
          aria-labelledby="evidence-heading"
        >
          <div className="section-heading centered scroll-reveal">
            <h2 id="evidence-heading">Evidence helps you ask better questions.</h2>
            <p>
              Public research can describe a venue and its hosting conditions.
              It cannot confirm today’s availability, a price, your eligibility,
              or permission for Backstage to book.
            </p>
          </div>
          <div className="showcase-art scroll-reveal">
            <PixelImage
              className="feature-painting"
              src="/images/campus-centre.jpg"
              alt=""
              fill
              sizes="100vw"
            />
            <PixelImage
              className="showcase-ui"
              src="/images/ui/evidence.png"
              alt="The evidence dialog for a venue, listing each claim with its evidence type, check date, and original source."
              width={1520}
              height={1462}
              sizes="(max-width: 1100px) 80vw, 560px"
            />
          </div>
          <ul className="evidence-legend">
            {evidenceTypes.map((type) => (
              <li key={type.label} className="scroll-reveal">
                <Badge tone={type.tone}>{type.label}</Badge>
                <span>{type.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="closing-banner">
          <PixelImage
            className="closing-painting"
            src="/images/tech-talk-stage.jpg"
            alt=""
            fill
            sizes="100vw"
          />
          <div className="closing-copy scroll-reveal">
            <h2>Bring a plan. Find a place to explore.</h2>
            <p>Start with your event brief.</p>
            <Link className="button button-light-solid" href="/organizer">
              Plan an event <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
