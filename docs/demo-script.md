# Backstage recording script (4–5 minutes)

Use the live deployment and the same browser tab throughout the recording. The browser receives its own demo workspace cookie. The public demo has persisted discovery limits of five requests per session and fifty requests total per day; this script uses two discovery calls. Do not reset counters or raise those limits for a recording. If the shared limit has already been reached, record the non-live walkthrough and label discovery as unavailable rather than retrying repeatedly.

Use fictional organizer contact details in the demo. Do not show private environment settings, browser storage, cookies, database contents, or raw provider output.

## 0:00–0:35 — Problem and boundaries

**Navigate:** Open [https://backstage-production-0849.up.railway.app](https://backstage-production-0849.up.railway.app).

**Say:** “Organizers often have to message venues one by one and piece together capacity, equipment, permissions, and access rules from scattered sources. Backstage starts with the complete event setup and returns source-backed venue leads with the important unknowns. The researched venues are not partners, and I cannot submit bookings to them. The approval flow later in the demo is fictional.”

**Show:** The home page, then click **Organizer** or navigate to `/organizer`.

## 0:35–1:15 — Example brief and real discovery

**Navigate:** In **Try an example**, select **Bengaluru founders · qualified eligibility**. Click **Load example**, then **Find suitable venues**.

**Say while results load:** “The sample asks about a founder gathering, a room, a projector, a zero budget, and pro-bono access. Loading the example is explicit and does not create a booking. This request is now retrieving a current Knowledge Base outline and reading its selected venue entry.”

## 1:15–2:05 — Citation, qualification, and unknowns

**Navigate:** In the Shifu Den recommendation, point to the source link and open it briefly in a new tab. Return to the Backstage tab and show the supported facts, qualification, and unknowns.

**Say:** “The original Shifu source describes pro-bono access for a founder community. That is evidence about the described community, not proof that every organizer qualifies or that Backstage can apply. The room and layout capacity, current availability, price terms, and booking authority remain unknown. Backstage attaches the citation to this venue and its claims instead of treating any URL in the response as support.”

## 2:05–2:35 — Follow-up

**Navigate:** In **Ask a follow-up question**, enter: “What founder eligibility does the source establish, and what still needs confirmation?” Click **Refine leads**.

**Say:** “The follow-up keeps the same 28-person brief and checks the source-backed qualification again. A recommendation is useful only if the organizer can see both the evidence and its limits.”

## 2:35–3:15 — Prepare and restore a research draft

**Navigate:** On Shifu’s card click **Prepare application draft**. Point out the selected venue, copied brief, unanswered questions, evidence, and source link. Enter fictional organizer details, check the review acknowledgement, and click **Save application draft**. Reload `/organizer` and show the restored **DRAFT ONLY** card.

**Say:** “The server re-resolves the venue evidence from published Sanity records when it saves. The draft preserves the evidence snapshot and its capture date. Submission remains disabled because there is no verified booking authority for this real research lead.”

## 3:15–4:25 — Fictional approval, allocation, and checklist

**Navigate:** In the event brief choose **Fictional host workshop · operations demo**. Click **Load example**, then **Save event brief**. In **Application workspace**, click **Load saved event brief**. Select **[FICTIONAL DEMO] Backstage Demo House**, choose **Workshop Studio** and **Projector**, enter fictional organizer details, review the snapshot, and click **Submit demo request**.

Open `/host`. Set **Simulation role** to **Host**, then click **Approve & allocate** on the request. Show the **Confirmed events** section, the room/projector allocation, and the shared preparation checklist. Complete one host-owned item; switch to **Organizer** simulation and complete an organizer-owned item.

**Say:** “This workflow uses fictional inventory and availability stored in the application’s SQLite database. Approval checks resource availability and allocates selected resources together. Both role views share the same checklist. The role selector simulates a workflow; it does not authenticate a real host or organizer.”

If there is time, explain that the full demo also checks shared-projector conflicts and requires an organizer to accept a proposed alternative before the host can allocate it.

## 4:25–4:50 — Why structured evidence matters

**Say:** “Sanity gives each venue a stable identity, locality, source-linked claims, qualifications, and explicit unknowns. That lets Backstage keep two locations with the same source page separate, retain a historical event as historical, and avoid turning missing room capacity or availability into an assumption. Sanity provides knowledge; the application database owns transactional requests and allocations.”

**End card:** Show the live URL and the repository link: [github.com/diyaavirmani/backstage](https://github.com/diyaavirmani/backstage).
