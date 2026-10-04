# Operational workspace setup

## Local development

Node.js 22.13+ and npm are required. The operational API imports Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) `DatabaseSync`; no separate database service or credential is required. This API is currently documented by Node as a release candidate. The store initializes on the first request to `/api/operations`; `npm run build` does not create a database.

```bash
cp .env.example .env.local
# BACKSTAGE_DB_PATH=.data/backstage.sqlite is already the local example value.
npm install
npm run dev
```

The app creates one private demo workspace per opaque HTTP-only cookie. Organizer/host role switching is only a demonstration control and is not authentication. Real researched venues accept saved drafts only; the two demo hosts and their resources, policies, availability, requests, allocations, and confirmations are fictional. No messages are sent externally.

## Database path, backup, and migrations

- `BACKSTAGE_DB_PATH` is server-only and can be an absolute path or a path resolved from the process working directory. The default is `.data/backstage.sqlite`.
- `.data/`, SQLite files, and WAL/SHM sidecars are ignored by Git. Back up the SQLite database using a SQLite-aware online backup or while the application is stopped; include the WAL state consistently. Do not copy an active database file alone and assume it is a complete backup.
- Migrations `db/migrations/001_operations.sql` through `004-discovery-quotas.sql` initialize the workspace/session, venue/resource, availability/block, application, allocation, checklist, history, transition, and persisted discovery-quota tables/columns. Migration 003 repairs incomplete task deadlines without altering completed checklist history. Migrations run lazily and applied versions are recorded in `schema_migrations`. Each change must add a new ordered migration; do not edit a migration already deployed to a persistent database.
- All stored instants are UTC ISO-8601. Organizer-facing calendar labels use Asia/Kolkata.

## Deployment constraints

This synchronous SQLite file is intended for local development and a single-node hackathon demonstration. The prepared Railway image uses Node 24 and requires a **durable writable filesystem mounted at `/data`**, with `BACKSTAGE_DB_PATH=/data/backstage.sqlite`; ephemeral filesystems lose applications when instances restart. Keep the Railway service at exactly one replica; never share this SQLite file across a network-mounted multi-instance deployment. Migrations run on the first runtime operations/discovery request after Railway mounts the volume; there is no build-time or pre-deploy database initialization. `/api/health` does not initialize SQLite. Railway mounts volumes as root-owned; the service configuration sets `RAILWAY_RUN_UID=0` while the Docker image otherwise defaults to the `node` user.

SQLite persists workspace applications, allocations, checklist progress, transitions, and daily demo discovery counters across restarts, provided the volume is attached and the app uses the configured path. Back up with SQLite's online backup feature or while the app is stopped, and account for WAL/SHM state. Verify a restore using a separate volume. A volume-backed deployment can have brief downtime during a redeploy. Before production or multiple app instances, move to a managed transactional database and add authenticated organizer and host identities with server-enforced roles, audit and backup/restore monitoring, account-aware rate limiting, and operational recovery. Cookie-scoped role simulation does not establish any actual host's identity or permission.

Public demo discovery limits default to five per session and fifty globally per UTC day; configure `DEMO_DISCOVERY_DAILY_PER_SESSION` and `DEMO_DISCOVERY_DAILY_GLOBAL`. The global counter is persisted in SQLite and cannot be bypassed by clearing cookies. POST bodies are byte-bounded before buffering and browser mutations must present the configured `APP_ORIGIN`. These are demonstration protections only, not production abuse prevention.

See [Railway deployment preparation](deployment.md) for Docker, volume, healthcheck, exact runtime variables, setup, and cost notes.

## Operational browser tests

The Playwright suite uses the installed Next.js production build and Chromium. Install the browser once, then run:

```bash
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` runs `npm run build` followed by `playwright test`. To run the suite again without rebuilding, use `npx playwright test`. Playwright's `webServer` starts the generated standalone server with `npm start` on `127.0.0.1:3107` and waits for `/api/operations` to answer before opening the browser. The test config creates a unique temporary SQLite directory under the operating-system temp directory, supplies its path as `BACKSTAGE_DB_PATH`, and removes it during global teardown. It never points at `.data/backstage.sqlite`.

The end-to-end scenario uses fresh Chromium contexts. It transfers only the opaque demo workspace cookie and saved sample brief to the second context so organizer and host views can work in the same simulated workspace. No discovery request is issued: `test:agent` contains credential-free unit tests, while OpenAI and Sanity are not mocked or contacted by this browser suite. Discovery's separately recorded live retrieval evidence remains in `docs/build-log.md`.

The provider boundary also has deterministic direct-handler tests. Run `npx --yes --package=node@24 --call 'npm run test:provider-failures'` to exercise OpenAI 401/429, generation timeout, cancellation, Context authorization/transport/read failures, missing tools, empty outline, malformed model output, cleanup, and no application/allocation writes. Those calls use injected in-process mocks and isolated temporary SQLite files; they are not live provider checks.

`npm run test:backend-stress` is the missing-configuration HTTP benchmark (500 requests; all requests intentionally stop before provider egress). `npm run test:backend-operations-stress` is a separate successful workflow load profile against another isolated standalone server: 90 reads, 90 draft saves, 90 submissions, and 90 concurrent approvals at concurrency 1/5/20/50, plus bounded checklist, quota, and restart probes. The only expected business failures are exact resource conflict errors. Neither script targets Railway or `.data/backstage.sqlite`.

### Opt-in live discovery browser check

The opt-in `tests/e2e/live-discovery.spec.ts` uses the localhost production server, Playwright's temporary database, and the real OpenAI/Sanity Context settings from ignored `.env.local`. It performs up to five discovery requests in sequence, including the Bengaluru founder flow and Delhi NCR locality follow-ups. Its catalog/read/citation metadata artifact is sanitized and ignored. It does not reset or change Railway quotas. Run only when spending the allowed live calls:

```bash
npx --yes --package=node@24 --call 'BACKSTAGE_LIVE_BROWSER=1 node --import ./scripts/load-env.mjs ./node_modules/playwright/cli.js test tests/e2e/live-discovery.spec.ts'
```

The historical single-request locality defect reproduction remains available as `npm run test:backend-live-locality-diagnostic`, but it consumes a real discovery request and predates the fix. Do not run it alongside the five-call browser journey. The corrected live journey requires a positive Gurugram venue identity/locality, a matching location-specific Knowledge Base path, an original source ID, no Noida venue identities, and an unchanged saved brief. The shared Ofis source title may mention both locations, so do not use whole-card text as the locality assertion. The five-call journey was run on 4 October 2026: all five actual responses included source-verified recommendations and the final Gurugram result was `venue-ofis-gurugram-sohna-road` from `venues/delhi_ncr/ofis_square_gurugram`, citing `source-ofis-events`. The run's terminal browser assertion initially failed because it searched the full card for the word “Noida” in that shared source title; the assertion now checks structured locality and path fields. Do not rerun the live flow when preserving the five-call cap; the correction was not rechecked live after those five provider calls.

Screenshots, failure screenshots, traces, and Playwright output are written under ignored `.playwright-artifacts/`. Do not stage these files or raw browser state. The suite captures organizer and host desktop/mobile screens for visual inspection.

The setup follows the [Playwright installation guide](https://playwright.dev/docs/intro) and its [`webServer` configuration](https://playwright.dev/docs/test-webserver). The current Next.js route-handler and testing guides are installed at `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`.

## Additional manual browser smoke checklist

These steps can supplement the automated Playwright scenario with a quick hands-on review.

1. On the redesign branch, complete the three-step Event brief and save from Review. Open Private drafts and load it. Examples fill only the form.
2. Select a researched lead and save a draft. Confirm its original sources, evidence, unknowns, and draft-only label; verify its submit button is disabled.
3. Select a clearly fictional demo host, select a room and equipment, edit the brief snapshot, enter organizer contact details, and set a flexibility range.
4. Review and submit. Confirm the request appears in the host simulation queue without any external message being sent.
5. Place a temporary hold, observe its calendar label, then approve the request. Confirm resource allocation, the accepted brief snapshot, and checklist appear.
6. Try another overlapping event using the same room or equipment; confirm the host gets a resource-specific conflict. Propose an available flexible slot, switch to organizer simulation to accept it, then approve from the host simulation.
7. In Resource calendar, navigate months, filter by resource, open an entry, or use the internal-block dialog outside active allocations. In Preparation, check role-owned tasks and see the other role’s progress. Repeat at a narrow mobile width.

## Green workspace branch

The redesign uses the existing APIs and database without migration or contract changes. `?view=requests`, `?view=calendar`, and `?view=preparation` identify host views; month/resource filters persist in URL history. Private drafts are at `/organizer?view=drafts`. Open **View application details** for actions, evidence snapshots and history. Requests and Preparation share persisted checklist state; actions still require the matching simulated role. This branch is not deployed by the redesign task.
