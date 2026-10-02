# Backstage

Backstage is a venue coordination agent for Delhi NCR and Bengaluru. Its promise is simple: tell Backstage what you’re hosting, and it will find a place where that event can actually work.

The product helps organizers explain their event setup and helps hosts coordinate policies, spaces, equipment, requests, and availability. The organizer agent retrieves source-backed venue entries from a Sanity Knowledge Base through Sanity Context MCP. Operational booking workflows are now demonstrated with fictional hosts; real researched leads remain draft-only.

## Implemented status

The responsive product shell, event brief and live Sanity Context discovery are implemented. The brief validates required fields and persists in browser local storage. Organizers can save source-backed draft applications for the six researched leads; these leads cannot be submitted because Backstage has no verified booking authority for them. Two clearly fictional demonstration hosts, one per city, support the full application-review, hold, approval, resource calendar, cancellation, alternative-slot, and preparation checklist workflow. Demonstration operations are stored server-side in SQLite and scoped by an opaque HTTP-only simulation cookie. Host/organizer role switching is a workflow simulation, not production identity or authorization. Communications stay inside the application.

The `/venues` page remains a local JSON research preview. The organizer discovery API connects to the Knowledge Base-only Context MCP endpoint and freshly published Sanity venue/source records at request time. It requires actual entry reads before returning recommendations, checks the entry, locality, source identity, canonical URL, and structured claim associations, and builds citations from verified published source records. Audience restrictions and resource quantities must match evidence; conflicts and unestablished conditions remain unknown. Model-backed discovery requires server-only `OPENAI_API_KEY`; builds and the rest of the app do not. Recommendations are potential hosts to investigate, not partners or bookable inventory. The operational request, calendar, approval, and reservation workflow is available only for fictional demonstration hosts; real-host calendars and booking authority are not connected.

Sanity project `1428jmxu` in organization `o8mue7lt8` has a private `production` dataset with 37 published research documents and Knowledge Base `kbPFAVeDOOjD`. The schema is deployed, and `backstage-venues` exposes `initial_context`, `knowledge_base_read`, and `knowledge_base_search`. Live source-grounded retrieval passed for all six venues on 2 October 2026. `/venues` remains a local JSON preview. The operational demo inventory is created only in the SQLite application store and is excluded from Sanity and the Knowledge Base query.

## Run locally

Requires Node.js 22.13 or newer and npm. The operational store uses the built-in `node:sqlite` API; Node currently marks that API as a release candidate.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sanity credentials are not required for the app or local research preview. For Studio and live imports/retrieval, follow [docs/sanity-setup.md](docs/sanity-setup.md) and keep real credentials in the ignored `.env.local` file.

## Commands

```bash
npm run dev       # start the local development server
npm run lint      # run ESLint
npm run typecheck # run the TypeScript compiler without emitting files
npm run build     # create a production build
npm start         # serve a production build
npm run sanity:validate       # validate source records and unknowns
npm run sanity:seed:dry-run   # validate intended import without credentials/writes
npm run sanity:seed           # publish records, skipping existing docs/drafts
npm run sanity:verify-seed    # verify published records and reference integrity
npm run sanity:schema:validate # validate Sanity Studio schema locally
npm run sanity:schema:deploy   # deploy schema with an authenticated Sanity CLI
npm run sanity:context-check  # verify real Knowledge Base MCP retrieval
npm run test:context-outline  # test Context outline and citation parsing
npm run test:agent            # test agent input and provenance guards
npm run test:operations       # test SQLite operations, persistence, and concurrent approvals
```

## Next milestones

1. Replace simulation workspaces with production organizer/host identity, authorization, and onboarding; connect verified hosts and their current policies.
2. Move operational storage to a managed durable, multi-instance database and add production alerting, backups, and operational recovery.
3. Serve the venue catalog from published Sanity content and add freshness/rebuild monitoring.
4. Consider recurring events and attendance conditions after production booking controls are reliable.

See [the product brief](docs/product-brief.md), [architecture](docs/architecture.md), [Sanity setup](docs/sanity-setup.md), [build log](docs/build-log.md), and [session capture guide](docs/session-capture.md).

To use organizer discovery locally, add `OPENAI_API_KEY` to ignored `.env.local` (never a `NEXT_PUBLIC_` variable). `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`. Sanity’s project import token, Context MCP URL, and organization Context Viewer token must also be configured for the live retrieval path; see [Sanity setup](docs/sanity-setup.md). For the local SQLite path, backup and production deployment constraints, see [operations setup](docs/operations-setup.md).
