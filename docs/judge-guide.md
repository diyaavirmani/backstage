# Backstage judge walkthrough

Backstage is a venue coordination agent for Delhi NCR and Bengaluru. The connected knowledge project is Sanity project `1428jmxu`, dataset `production`, with Knowledge Base `kbPFAVeDOOjD`.

## 1. See live, sourced venue discovery

1. Start the app with `npm run dev` and open `/venues`. The page should say **Published Sanity content** and show six eligible research leads. The city filter separates Delhi NCR from Bengaluru; the two Ofis Square locations remain separate cards even though they share an original source page.
2. Open `/organizer`. In **Try an example**, choose **Bengaluru founders · qualified eligibility** and click **Load example**. This changes and saves the event brief only; it does not create an application or reservation.
3. Click **Find suitable venues**. The app reads current paths from the Sanity Context outline and reads Knowledge Base entries before it displays any lead. Ask a follow-up about Shifu Den’s pro-bono access and eligibility.
4. Review Shifu’s source link and qualification. The public page describes a founder community; it does not prove every organizer qualifies or establish Backstage booking permission. The card must leave current availability, price, and booking authority unknown.

The Knowledge Base uses structured venue, claim, source, and relationship records. That structure lets the app check venue identity, locality, evidence type, source association, and source-check date, while leaving unknown values unresolved. A recent Sanity fetch does not change the date when the source itself was checked.

## 2. Prepare a private research application draft

1. On the Shifu recommendation, click **Prepare application draft**. The existing builder should select Shifu and carry over the exact brief used for discovery, its evidence qualifications, and requirement questions that still need answers.
2. Add organizer details and review the snapshot, questions, and source links. If you edit the brief, the builder identifies the original discovery brief and asks you to review the application contents.
3. Click **Save application draft**. The saved card shows the source evidence capture time separately from the original source-check dates. **Submit demo request** stays disabled for a researched venue; no contact or booking request is sent.

The server resolves the venue and source evidence again from published Sanity records when it saves the draft. Values supplied by the browser cannot establish citations or booking permission.

## 3. Demonstrate fictional host approval and resource conflict

1. Return to the event brief and choose **Fictional host workshop · operations demo**. Click **Load example**. The example date is generated in Asia/Kolkata and falls on a weekday within the demo hosts’ seeded availability window.
2. In **Application workspace**, choose **[FICTIONAL DEMO] Backstage Demo House**. Select **Workshop Studio** and the shared **Projector**, add a sample organizer name and email, and submit after reviewing. This fictional request enters the simulated host queue.
3. Start another demo application for the same date and overlapping time. Choose **Gathering Salon** and the same shared **Projector**. Submit it with a date-flexibility range that includes a later weekday.
4. Switch the simulation role to **Host** and approve the first request. Try to approve the second: its shared projector allocation conflicts. Propose an available weekday and time inside the organizer-approved range.
5. Switch back to **Organizer**, accept the proposed alternative, then return to **Host** and approve it. The monthly calendar now shows the two reservations on separate dates. Open **Confirmed events** to review each accepted brief and shared checklist.
6. Complete a host-owned checklist item in Host simulation and an organizer-owned item in Organizer simulation. Each side sees the same saved progress.

Every venue, request, calendar entry, resource, and confirmation in this section is fictional demonstration inventory stored in the application’s SQLite database. It is excluded from Sanity and the Knowledge Base. Role switching is a simulation, not production authentication.

## Implemented and future work

Implemented: published Sanity catalog retrieval with an explicitly labeled fallback, real Context entry reads, server-validated source citations and requirement coverage, follow-up discovery, a reviewable private application draft for research leads, and the fictional host workflow for approvals and resources.

Future production work: organizer and host identity, host onboarding and verified booking authority, real operational availability, request delivery, payment or sponsorship processing, and migration to managed multi-instance storage. Railway deployment is prepared but remains pending creation or selection of a project in the authenticated account and a reviewed plan/budget; Backstage is not represented as deployed.
