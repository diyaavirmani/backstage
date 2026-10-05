import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge, SourceLink } from "@/components/ui";
import { PresentationIcon } from "@/components/presentation-icon";
import catalog from "@/data/research-catalog.json";
import {
  runStructureEval,
  venuesFromCatalog,
} from "../../scripts/structure-eval.mjs";
import { structureEvalCases } from "../../scripts/structure-eval-cases.mjs";

// Computed at build time from the reviewed catalog and the production verifier (see docs/structure-eval.md).
const evaluation = runStructureEval(
  venuesFromCatalog(catalog),
  structureEvalCases,
);
const traps = [
  {
    id: "ofis-sohna-outside-food",
    keyword: "the text contains “outside-food permission”.",
  },
  {
    id: "saiacs-80-workshop",
    keyword: "the text mentions 100 theatre seats and about 350 auditorium seats.",
  },
  { id: "shifu-free-students", keyword: "the text says “pro bono” and “free”." },
  { id: "paytm-200", keyword: "the text contains 2026, which is more than 200." },
];

export default function Home() {
  const shifu = catalog.venues.find(
    (venue) => venue.id === "venue-shifu-den-bengaluru",
  )!;
  const source = catalog.sources.find(
    (item) => item.id === shifu.sourceIds[0],
  )!;
  return (
    <div className="landing-site">
      <SiteHeader tone="dark" />
      <main id="main-content">
        <section className="home-hero">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-copy page-wrap">
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
                Explore venues <span aria-hidden="true">↗</span>
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
            <small className="artwork-note">
              Original AI illustration · an imaginary gathering, not a
              photograph of a researched venue.
            </small>
          </div>
        </section>

        <section
          className="product-section page-wrap"
          aria-label="Illustrative event research example"
        >
          <div className="product-preview">
            <div className="preview-top">
              <span className="wordmark">
                <span className="wordmark-icon" aria-hidden="true">
                  <span />
                </span>
                backstage
              </span>
              <span className="preview-navigation">
                Event brief <span>Venue research</span> Private drafts
              </span>
              <Badge>Illustrative example</Badge>
            </div>
            <div className="preview-body">
              <div className="preview-brief">
                <PresentationIcon name="brief" />
                <h2>Bengaluru founder gathering</h2>
                <p>Start with the complete event setup.</p>
                <dl className="preview-brief-details">
                  <div>
                    <dt>Audience</dt>
                    <dd>28 founders</dd>
                  </div>
                  <div>
                    <dt>Space</dt>
                    <dd>Gathering room</dd>
                  </div>
                  <div>
                    <dt>Access question</dt>
                    <dd>Pro-bono access?</dd>
                  </div>
                </dl>
                <p className="preview-explainer">
                  An example of how evidence informs a private draft. It is not
                  a live recommendation or a booking.
                </p>
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
            </div>
          </div>
          <p className="preview-caption">
            A brief, the evidence behind a lead, and the questions that still
            matter.
          </p>
        </section>

        <section
          className="how-section page-wrap"
          aria-labelledby="how-heading"
        >
          <div className="section-heading">
            <h2 id="how-heading">
              Keep the event setup
              <br />
              in one place.
            </h2>
            <p>
              Start with what your event needs. Let the evidence guide the
              conversation.
            </p>
          </div>
          <div className="steps-grid">
            <article className="step-card">
              <div className="step-copy">
                <span className="step-number">01 / Your event</span>
                <h3>Create a brief</h3>
                <p>
                  Capture the audience, schedule, budget, rooms, and
                  requirements that matter. Keep essential needs and flexible
                  preferences together.
                </p>
                <Link className="text-link" href="/organizer">
                  Build your brief →
                </Link>
              </div>
              <div className="feature-art feature-brief">
                <div className="feature-sample">
                  <span className="sample-label">Illustrative brief</span>
                  <h4>Bengaluru founder gathering</h4>
                  <dl>
                    <div>
                      <dt>Audience</dt>
                      <dd>Founder community</dd>
                    </div>
                    <div>
                      <dt>Attendees</dt>
                      <dd>28</dd>
                    </div>
                    <div>
                      <dt>Requirements</dt>
                      <dd>Gathering room · projector</dd>
                    </div>
                    <div>
                      <dt>Questions</dt>
                      <dd>Eligibility · capacity · access terms</dd>
                    </div>
                  </dl>
                  <span className="sample-note">
                    Examples fill your form. You decide when to save.
                  </span>
                </div>
              </div>
            </article>
            <article className="step-card">
              <div className="step-copy">
                <span className="step-number">02 / The evidence</span>
                <h3>Research venues</h3>
                <p>
                  Read source-grounded leads with qualifications, unknowns, and
                  original citations. A source can explain a condition without
                  proving that your event meets it.
                </p>
                <Link className="text-link" href="/venues">
                  Explore the catalog →
                </Link>
              </div>
              <div className="feature-art feature-research">
                <div className="feature-sample">
                  <span className="sample-label">
                    Checked-in research example
                  </span>
                  <h4>{shifu.name}</h4>
                  <p>Bengaluru · research lead</p>
                  <Badge tone="supported">
                    Founder-community access described
                  </Badge>
                  <p className="qualification-note">
                    Organizer eligibility still needs confirmation.
                  </p>
                  <Badge tone="unknown">
                    Availability and capacity unknown
                  </Badge>
                  <SourceLink url={source.url}>
                    Read the original source
                  </SourceLink>
                </div>
              </div>
            </article>
            <article className="step-card">
              <div className="step-copy">
                <span className="step-number">03 / Next steps</span>
                <h3>Coordinate next steps</h3>
                <p>
                  Review and save a private application draft for a researched
                  lead. Explore approvals, resource planning, and a shared
                  checklist separately with fictional hosts.
                </p>
                <Link className="text-link" href="/host">
                  Try the host demo →
                </Link>
              </div>
              <div className="feature-art feature-operations">
                <div className="feature-sample">
                  <Badge tone="demo">Fictional workflow example</Badge>
                  <h4>One setup. A shared plan.</h4>
                  <ul className="sample-checklist">
                    <li>
                      <PresentationIcon name="requests" />
                      <span>Review the submitted brief</span>
                    </li>
                    <li>
                      <PresentationIcon name="calendar" />
                      <span>Check and allocate selected resources</span>
                    </li>
                    <li>
                      <PresentationIcon name="preparation" />
                      <span>Prepare together with assigned tasks</span>
                    </li>
                  </ul>
                  <span className="sample-note">
                    This illustration shows no actual request, approval, or
                    reservation.
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          className="structure-proof page-wrap"
          aria-labelledby="structure-heading"
        >
          <div className="section-heading">
            <h2 id="structure-heading">
              Keyword search
              <br />
              would have said yes.
            </h2>
            <p>
              We asked {evaluation.length} real organizer questions of the same
              published venue text. A keyword match answered{" "}
              {evaluation.filter((row) => row.keywordCorrect).length} correctly;
              Backstage&apos;s structured checks answered{" "}
              {evaluation.filter((row) => row.structuredCorrect).length}.
              Keyword matching errs toward a confident yes. Backstage errs
              toward “needs confirmation”.
            </p>
          </div>
          <div className="proof-grid">
            {traps.map((trap) => {
              const row = evaluation.find((item) => item.id === trap.id)!;
              return (
                <article className="proof-card" key={trap.id}>
                  <p className="proof-question">“{row.question}”</p>
                  <p>
                    <span className="proof-label proof-wrong">
                      Keyword match: yes
                    </span>{" "}
                    because {trap.keyword}
                  </p>
                  <p>
                    <span className="proof-label proof-right">
                      Backstage: not established
                    </span>{" "}
                    because {row.why}.
                  </p>
                </article>
              );
            })}
          </div>
          <a
            className="text-link"
            href="https://github.com/diyaavirmani/backstage/blob/main/docs/structure-eval.md"
          >
            See all {evaluation.length} questions, the method and our misses →
          </a>
        </section>

        <section className="research-boundary page-wrap">
          <div>
            <h2>
              Evidence helps you ask
              <br />
              better questions.
            </h2>
            <p>
              Public research can describe a venue and its hosting conditions.
              It cannot confirm today’s availability, a price, your eligibility,
              or permission for Backstage to book.
            </p>
            <div className="evidence-legend">
              <Badge tone="supported">Documented</Badge>
              <Badge tone="unknown">Needs confirmation</Badge>
              <Badge tone="historical">Past hosting evidence</Badge>
            </div>
          </div>
          <div className="boundary-demo">
            <PresentationIcon name="calendar" />
            <h3>Fictional hosts. Real workflow.</h3>
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
            <h2>
              Bring a plan.
              <br />
              Find a place to explore.
            </h2>
            <p>Start with your event brief.</p>
          </div>
          <Link className="button button-light" href="/organizer">
            Plan an event →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
