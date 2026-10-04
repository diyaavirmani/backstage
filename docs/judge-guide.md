# Backstage judge walkthrough

Start at the deployed app: **[https://backstage-production-0849.up.railway.app](https://backstage-production-0849.up.railway.app)**.

Backstage helps organizers describe what they are hosting, then retrieves source-backed venue leads from Sanity. The six researched venues are not Backstage partners: organizers can prepare private application drafts, but cannot submit booking requests to them. The host approval and calendar workflow uses fictional demo hosts. Switching between Organizer and Host is a simulation, not production account authentication.

## What to look for (about five minutes)

1. **Homepage, “Keyword search would have said yes.”** Four real traps from the published records, with the measured score: 22 organizer questions, keyword match 14 correct, Backstage's structured verifier 21. The [full table, method and misses](structure-eval.md) is reproducible with `npm run eval:structure`.
2. **A live search** (below), then open **How these leads were verified**. It shows the Knowledge Base outline size, the exact entries the agent read over Sanity Context MCP, each citation check, and how many model suggestions the server rejected.
3. **A lead's View evidence.** It shows every requirement status and the evidence behind it, the Knowledge Base entries and citations for that lead, and its published enquiry routes.
4. **Change the audience to *Students* and search again.** Shifu Den's founder-community access must stay unknown rather than become a yes.

## Try discovery in your own browser

1. Open `/organizer` in the same browser where you want to keep your demo workspace. Backstage creates an isolated, cookie-scoped workspace for this browser; no account sign-in is required.
2. In **Try an example**, choose **Bengaluru founders · qualified eligibility**, then click **Load example**. This fills the form only; it does not save a brief, create an application, or reserve anything.
3. Use **Continue** through Event details and Space and requirements. Review the complete brief, then click **Find suitable venues** and wait for live discovery. Backstage reads the current Sanity Context outline and actual Knowledge Base entries before showing recommendations.
4. Review the Shifu Den card. Open its source link to `https://den.shifuventures.com/`. The source describes pro-bono access for a founder community; it does not establish that every organizer qualifies. Room/layout capacity, current availability, price terms, and Backstage booking authority remain unknown.
5. Open **How these leads were verified** above the leads to see the entries read and the citation checks.
6. Ask a follow-up such as “What founder eligibility does the source establish, and what would the host still need to confirm?” The saved event brief remains attached to the follow-up.

Discovery uses a shared daily limit of five requests per browser session and fifty across the demo. The limits are persisted; please avoid repeated refreshes or retry loops.

## Save a research draft

1. On the recommendation, click **Create private draft**. The selected venue and exact brief carry into the application builder with evidence qualifications and unanswered questions.
2. Review the snapshot and source links, enter demo contact details, check the review box, then click **Save application draft**.
3. Reload the **Private drafts** view to see the restored **DRAFT ONLY** application. **Submit demo request** remains disabled for researched venues because Backstage has no verified booking authority for them.

## Try fictional host operations

1. In the event brief, choose **Fictional host workshop · operations demo**, then click **Load example**, use **Continue** twice, and choose **Save event brief** in Review.
2. In the **Private drafts** view, click **Load saved event brief**. Select **[FICTIONAL DEMO] Backstage Demo House**, choose **Workshop Studio** and **Projector**, add fictional organizer details, review the request, and click **Submit demo request**.
3. Open `/host`. Set **Simulation role** to **Host** and open **View application details** in Requests and select **Approve & allocate** on the new request. The selected demo resources become allocated; the accepted brief and shared checklist appear in **Confirmed events**.
4. Use **Preparation**, or open the confirmed event details, to complete a host-owned checklist item. Switch the simulation role to **Organizer** and complete an organizer-owned item; both roles see the same saved checklist progress.

These operations use fictional policies, availability, inventory, requests, and confirmations stored in Backstage’s SQLite database. Nothing is sent to a real host. For a longer shared-projector conflict and alternative-slot walkthrough, follow [the recording script](demo-script.md).

## Local alternative

Use Node.js 24 and npm:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). Live discovery needs the server-only Sanity Context, Sanity read, and OpenAI environment variables described in [Sanity setup](sanity-setup.md). Without them, the catalog explicitly identifies itself as a local research preview and live discovery reports that configuration is missing.

## Implemented and future work

Implemented: published Sanity catalog retrieval, real Knowledge Base entry reads through Context MCP, source-checked recommendations and follow-ups, private research application drafts, and a fictional host approval/resource/checklist demo.

Future production work includes organizer and host authentication, verified host onboarding and booking authority, actual operational availability, delivery of real applications, and production-grade multi-instance storage and recovery. See [architecture](architecture.md), [deployment details](deployment.md), and the [build log](build-log.md).
