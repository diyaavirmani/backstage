import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

function Arrow() {
  return <span className="arrow-circle" aria-hidden="true">↗</span>;
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="home-hero page-wrap">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> THE SPACE BEHIND YOUR NEXT GATHERING</p>
            <h1>Make room<br />for <em>what matters.</em></h1>
            <p className="hero-description">Tell Backstage what you’re hosting. We’ll find a place where your event can actually work.</p>
            <div className="hero-actions">
              <Link className="button button-dark" href="/organizer">Build an event brief <Arrow /></Link>
              <Link className="text-link" href="/host">I have a space <span aria-hidden="true">→</span></Link>
            </div>
            <p className="milestone-note"><span aria-hidden="true">↳</span> The first milestone saves your brief here. Venue recommendations and booking coordination are coming next.</p>
            <div className="city-note"><span className="city-mark" aria-hidden="true">✳</span><span>Starting in <strong>Delhi NCR</strong> and <strong>Bengaluru</strong></span></div>
          </div>
          <div className="hero-visual" aria-label="An event brief takes shape into a considered gathering" role="img">
            <div className="visual-topline"><span>GOOD THINGS, IN GOOD COMPANY</span><span>01 — 03</span></div>
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="visual-center">
              <div className="visual-spark" aria-hidden="true">✳</div>
              <p className="visual-kicker">A PLACE TO</p>
              <p className="visual-title">bring it<br /><i>together</i></p>
              <div className="visual-meta"><span>PEOPLE</span><b>+</b><span>IDEAS</span><b>+</b><span>SPACE</span></div>
            </div>
            <div className="orbit-tag tag-people"><span className="tag-icon">◌</span><span>the right<br />people</span></div>
            <div className="orbit-tag tag-place"><span className="tag-icon">⌂</span><span>a space that<br />fits the plan</span></div>
            <div className="visual-caption"><span>THOUGHTFUL BY DESIGN</span><span>DELHI NCR · BENGALURU</span></div>
          </div>
        </section>

        <section className="how-section page-wrap" aria-labelledby="how-heading">
          <div className="section-heading">
            <div><p className="eyebrow">A BETTER WAY TO GET TO YES</p><h2 id="how-heading">From “we should”<br />to <em>it’s happening.</em></h2></div>
            <p className="section-intro">The details that make an event work shouldn’t live in a dozen tabs and someone’s memory.</p>
          </div>
          <div className="steps-grid">
            <article className="step-card"><span className="step-number">01</span><div className="step-icon brief-icon" aria-hidden="true"><span /><span /><span /></div><h3>Tell us the shape of it</h3><p>Share the who, when, and what you need. Keep the must-haves and nice-to-haves clear.</p><span className="step-foot">A BRIEF THAT GETS THE DETAILS</span></article>
            <article className="step-card"><span className="step-number">02</span><div className="step-icon match-icon" aria-hidden="true">✳</div><h3>Find a place that fits</h3><p>Backstage will check a venue’s real policies, rooms, equipment, and availability.</p><span className="step-foot">MATCHED WITH THE WHOLE SETUP</span></article>
            <article className="step-card"><span className="step-number">03</span><div className="step-icon gather-icon" aria-hidden="true"><span>↗</span></div><h3>Make it happen together</h3><p>Understand why a place works, what’s still unknown, and what to do next.</p><span className="step-foot">CLEAR NEXT STEPS, NO GUESSWORK</span></article>
          </div>
        </section>

        <section className="closing-banner page-wrap"><div><p className="eyebrow">YOUR IDEA HAS A PLACE</p><h2>Start with the<br /><em>good part.</em></h2></div><Link className="button button-light" href="/organizer">Tell us about your event <Arrow /></Link></section>
      </main>
      <footer className="site-footer page-wrap"><Link className="wordmark" href="/" aria-label="Backstage home"><span className="wordmark-icon" aria-hidden="true"><span /></span><span>backstage</span></Link><span>Made for the moments that bring us together.</span><span>DELHI NCR · BENGALURU</span></footer>
    </>
  );
}
