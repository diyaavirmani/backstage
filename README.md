# Backstage

Backstage is a venue coordination agent for Delhi NCR and Bengaluru. Its promise is simple: tell Backstage what you’re hosting, and it will find a place where that event can actually work.

The product helps organizers explain their event setup and helps hosts coordinate policies, spaces, equipment, requests, and availability. The organizer agent retrieves source-backed venue entries from a Sanity Knowledge Base through Sanity Context MCP. Operational booking workflows are now demonstrated with fictional hosts; real researched leads remain draft-only.

## Implemented status

The responsive product shell, event brief and live Sanity Context discovery are implemented. The brief validates required fields and persists in browser local storage. Organizers can save source-backed draft applications for the six researched leads; these leads cannot be submitted because Backstage has no verified booking authority for them. Two clearly fictional demonstration hosts, one per city, support the full application-review, hold, approval, resource calendar, cancellation, alternative-slot, and preparation checklist workflow. Demonstration operations are stored server-side in SQLite and scoped by an opaque HTTP-only simulation cookie. Host/organizer role switching is a workflow simulation, not production identity or authorization. Communications stay inside the application.

Milestone 6 prepares the Railway deployment package, a runtime readiness check, and persisted public-demo discovery limits. Milestone 6B moves Sanity Studio to the local Sanity CLI workflow and adds a credential-free Docker image smoke workflow. The actual image build and mounted-volume restart check passed in [GitHub Actions](https://github.com/diyaavirmani/backstage/actions/runs/37125473296) for commit `bccc987f933e53d57a6d078d900506ad7f0f288c`. A Railway Backstage project now exists in the intended personal workspace, but the HOBBY trial rejects the configured 512 MB persistent volume because its cap is 500 MB. An empty service definition exists; there are no deployments, volumes, or domain, and no credentials have been transferred. Deployment requires explicit approval for the $5/month Hobby subscription or approval to reduce the requested volume to 500 MB. Local Docker/Podman is unavailable. See [deployment preparation](docs/deployment.md) for the verified account/project state, redacted plan, and remaining steps.

The `/venues` page reads published, eligible venue records and related claims, spaces, resources, policies, and sources from Sanity on the server. If Sanity is not configured or cannot be reached, it shows the checked-in research catalogue as an explicitly labeled local preview. The organizer discovery API connects to the Knowledge Base-only Context MCP endpoint and freshly published Sanity records at request time. It requires actual entry reads before returning recommendations, validates entry-scoped source identity and original URLs, and builds citations from verified published records. Audience restrictions and resource quantities must match evidence; conflicting or unestablished conditions remain unknown. Model-backed discovery requires server-only `OPENAI_API_KEY`; builds do not. Each recommendation can open the existing application builder with the exact discovery brief, unanswered requirements, and qualifications. Saving a research draft re-resolves the selected published venue and its source claims on the server, records the evidence capture date, and remains private and unsubmitable. The operational request, calendar, approval, and reservation workflow is available only for fictional demonstration hosts; real-host calendars and booking authority are not connected.

Sanity project `1428jmxu` in organization `o8mue7lt8` has a private `production` dataset with 37 published research documents and Knowledge Base `kbPFAVeDOOjD`. The schema is deployed, and `backstage-venues` exposes `initial_context`, `knowledge_base_read`, and `knowledge_base_search`. The live Context check verified all six venue entries on 3 October 2026; the live browser walkthrough retrieved Shifu with source `source-shifu-den`, ran a follow-up, opened its original source, and saved a private draft. The `/venues` server query excludes drafts and demonstration content. The operational demo inventory is created only in the SQLite application store and is excluded from Sanity and the Knowledge Base query.

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
npm run sanity:dev             # run the editing Studio locally at localhost:3333/studio
npm run sanity:context-check  # verify real Knowledge Base MCP retrieval
npm run test:context-outline  # test Context outline and citation parsing
npm run test:agent            # test agent input and provenance guards
npm run test:operations       # test SQLite operations, persistence, and concurrent approvals
npm run test:deployment-controls # test same-origin checks, bounded bodies, and persistent discovery caps
npm run verify:standalone     # run the traced Next.js artifact with isolated persistent storage
npm run verify:docker-image   # verify a locally built image and volume restart persistence
npm run test:e2e              # production build plus deterministic Chromium walkthroughs
```

The opt-in live browser walkthrough requires configured server-side Sanity and OpenAI credentials and makes real model requests:

```bash
DOTENV_CONFIG_PATH=.env.local BACKSTAGE_LIVE_BROWSER=1 node -r dotenv/config ./node_modules/@playwright/test/cli.js test tests/e2e/live-discovery.spec.ts
```
It writes only bounded, non-secret retrieval evidence into ignored `.playwright-artifacts/`.

## Next milestones

1. Replace simulation workspaces with production organizer/host identity, authorization, and onboarding; connect verified hosts and their current policies.
2. Move operational storage to a managed durable, multi-instance database and add production alerting, backups, and operational recovery.
3. Add verified host availability, real request delivery, payment/sponsorship operations, and booking authority only after hosts onboard.
4. Consider recurring events and attendance conditions after production booking controls are reliable.

See [the product brief](docs/product-brief.md), [architecture](docs/architecture.md), [Sanity setup](docs/sanity-setup.md), [deployment preparation](docs/deployment.md), [judge walkthrough](docs/judge-guide.md), [build log](docs/build-log.md), and [session capture guide](docs/session-capture.md).

To use organizer discovery locally, add `OPENAI_API_KEY` and a project-scoped `SANITY_PROJECT_READ_TOKEN` to ignored `.env.local` (never a `NEXT_PUBLIC_` variable). `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`. The content-write `SANITY_PROJECT_IMPORT_TOKEN` is only for local seed tooling. The Context MCP URL and organization Context Viewer token are also required for live discovery; see [Sanity setup](docs/sanity-setup.md). For local SQLite backup notes and the deployment volume contract, see [operations setup](docs/operations-setup.md) and [deployment preparation](docs/deployment.md).
