---
title: "Backstage: a venue-scouting agent that knows “350 seats” isn’t a yes"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path One: Ship an Agent That Queries Real Content](https://dev.to/challenges/sanity-2026-09-16)*

## What I Built

**Backstage** helps community organizers in Delhi NCR and Bengaluru find a venue without weeks of cold outreach. You describe the event once: the audience, headcount, date, equipment, what's essential and what's optional. An agent reads a Sanity Knowledge Base and returns source-backed venue leads. Each lead says what the official pages actually establish and what still needs confirmation, and gives the published contact route for asking.

Venue research is a domain where a confident wrong answer costs real money and real trust. The public text is full of traps that keyword search walks straight into:

- **Negation.** An Ofis Square record reads “this does not establish outside-food permission”. Keyword search sees `outside`, `food` and `permission`, and says yes.
- **Numbers without a layout.** SAIACS mentions “approximately 350 seats” for its auditorium, but gives no layout. Its own hall table is precise: Jacaranda seats 100 theatre-style but only 60 in cluster seating. So a 90-person talk fits, and a 90-person hands-on workshop doesn't. Backstage counts capacity only when a source pairs a *named room* with a *seating layout* that suits the event.
- **Sources that disagree.** The CEO Centre says its ground hosts up to 500; its parent institute says 400. The hall table tops out at 60 in cluster seating; the institute says 30–80. Backstage shows both figures with both sources and doesn't pick one.
- **Audience conditions.** Shifu Den is “completely pro bono” *for founders*. A student meetup does not inherit that.
- **Past events.** A listing says Paytm's Noida office hosted a meetup in 2026. That is historical evidence, not availability, and “2026” is not a seat count.
- **Shared pages.** One Ofis page describes two locations. The Sector 62 auditorium must never leak into the Sohna Road lead.

**It only works because the content is structured.** Every claim in Sanity carries a subject, an evidence type (documented, historical, unknown or conflicting), a qualification, its source and a check date. Capacity claims point to a specific space and layout. The model never decides whether a requirement is met. It picks which Knowledge Base entries to read. The server then classifies each requirement from structured claims, with caveats scoped to the clause they appear in.

**Measured, not claimed.** I asked 26 real organizer questions of the *same* published text. A transparent keyword match answered **17** correctly; Backstage's structured verifier answered **25**. Keyword matching fails toward a confident yes. Backstage fails toward “needs confirmation”, and it never claimed something the sources don't establish.

The comparison also found bugs in my own verifier: one caveat anywhere in a claim was hiding documented facts like display screens and catering. I fixed it and then wrote six fresh cases I did not tune on. On those, keyword matching scored 6/6 and Backstage 5/6, and Backstage's miss was a cautious “unknown”. I'm reporting that rather than hiding it. The [full table, method and misses](https://github.com/diyaavirmani/backstage/blob/main/docs/structure-eval.md) are reproducible with `npm run eval:structure`.

What organizers get:

- **A guided brief:** audience presets that never imply eligibility, equipment kept separate from policies and services, and essentials kept separate from optional extras. A **suggested event setup** is proposed from the activities and is never inferred from headcount alone.
- **Evidence-first leads:** “Why consider this venue” comes first, with direct links to the exact cited pages and visible qualifications and conflicts.
- **“How these leads were verified”:** a trace of the Knowledge Base outline, the exact entries the agent read over MCP, each citation check, and how many model suggestions the server rejected.
- **Actionable unknowns:** each lead lists open questions next to published enquiry routes, labelled as venue-specific or organization-wide. An editable enquiry is built from the brief; it is copied, never sent.
- **Official photos** with branch-level location evidence and credit. Masters’ Union's terms forbid republishing, so its card links out instead.
- **Private drafts:** a lead can be saved with the server-resolved evidence snapshot. Real venues are research leads, never bookable through Backstage. A clearly fictional host workspace demonstrates approvals and conflict-safe resource allocation.

## Demo

**Live app (no login):** https://backstage-production-0849.up.railway.app

Try **Organizer → Try an example → Bengaluru founders**, continue to Review, then **Find suitable venues**. Open **How these leads were verified** and a lead's **View evidence**. Then change the audience to *Students* and search again: founder eligibility stays unknown. The homepage shows the keyword-vs-structure comparison.

**Recording:** <!-- PLACEHOLDER: add the public walkthrough recording URL or embed. -->

Live discovery is rate-limited to five searches per browser per day so shared credits survive judging.

## Code

**Repository:** https://github.com/diyaavirmani/backstage

Next.js App Router and TypeScript, the Vercel AI SDK with an OpenAI model, `@ai-sdk/mcp` for Sanity Context, and SQLite for the fictional operations demo. The tests cover 52 provenance, verifier and enrichment unit cases, 33 operations and concurrency tests, and 30 deterministic Playwright journeys. An opt-in live journey is capped at three discovery calls.

## How I Used Sanity

**What I pointed Sanity Context at.** The Knowledge Base `kbPFAVeDOOjD` is built from my own Sanity dataset through a GROQ import. The query takes eligible research venues and dereferences their claims, sources, spaces, resources, policies and hosting opportunities. It excludes drafts, demonstration inventory and anything private. Context distilled this into 9 navigable entries: one per venue plus `facilities_and_equipment`, `event_hosting_history` and `unknown_and_unverified`.

**Which tools the agent uses.** For each discovery, the agent:

1. Calls `initial_context` to get the current outline.
2. Narrows that outline to the event's city and any locality the organizer asked for (“exclude Noida”).
3. Calls `knowledge_base_read` through a constrained tool that only accepts entry IDs from that outline, up to six reads.

It must read before it may answer. The endpoint also exposes `knowledge_base_search`, which is BM25 keyword search. I deliberately do not let it decide answers, because keyword matching is exactly the failure mode measured above.

**What the agent does with what it reads.** The model returns only venue IDs, localities and the entry paths it read. The server then:

- Verifies every venue section's numbered footnotes against that venue's published `sourceReference` documents and original URLs, so a citation for one venue can't vouch for another.
- Rejects any identity, locality or path the reads don't support.
- Classifies every requirement from structured claims.
- Attaches published contacts and photos for the exact verified venue ID. These never reach the model.

**A real Knowledge Base lesson.** An early build put the numbered sources under the wrong venue section: Shifu Den's footnote pointed to SAIACS. Independent reads proved the dataset relationships were correct, so the problem was in the generated entries. I added a source-scoped provenance instruction to the Knowledge Base and rebuilt it. Then I made the citation checker fail closed: section-scoped footnotes, all six venues present, canonical URLs, and shared URLs allowed across distinct locations. `npm run sanity:context-check` re-verifies all six live entries; it passed again today.

**Structured content beyond the Knowledge Base.** Enquiry routes and photo galleries are separate `venueContact` and `venueGallery` documents. Each holds its venue, published purpose or caption, scope, source and check date. They are applied by an additive, idempotent enrichment script that reports differences instead of overwriting editors' work. The server validates them per venue against an allowlist of official image hosts.

## Sanity Project Details

- **Project ID:** `1428jmxu` (dataset `production`, private)
- **Knowledge Base:** `kbPFAVeDOOjD`, Backstage Venue Knowledge (9 entries)
- **Context MCP endpoint:** Knowledge Base mode; tools `initial_context`, `knowledge_base_read` and `knowledge_base_search`
- **Published documents:** 67 (6 venues, 17 source references, 13 spaces including SAIACS's four named halls, 10 enquiry routes, 5 photo galleries, plus resources, host organizations and opportunities)

**Honest limits:**

- Six researched venues is a small catalogue. So far only SAIACS publishes room × layout capacities; elsewhere capacity stays “needs confirmation”, which is the truthful answer.
- Published phone numbers and emails are not verified as active.
- Photos are embedded with credit under “all rights reserved” footers; no reuse licence was granted.
- The 26-case comparison is a demonstration built from real records, not a general benchmark.

## Agent Session

<!-- PLACEHOLDER: upload the redacted session at https://dev.to/agent_sessions/new, click "Make Public", then embed it here. -->
