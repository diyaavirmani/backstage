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
- Migrations `db/migrations/001_operations.sql`, `002_operational-policy-and-checklist-history.sql`, and `003-checklist-deadlines.sql` initialize the workspace/session, venue/resource, availability/block, application, allocation, checklist, history, and transition tables/columns; the third migration also repairs incomplete task deadlines without altering completed checklist history. Migrations run lazily and applied versions are recorded in `schema_migrations`. Each change must add a new ordered migration; do not edit a migration already deployed to a persistent database.
- All stored instants are UTC ISO-8601. Organizer-facing calendar labels use Asia/Kolkata.

## Deployment constraints

This synchronous SQLite file is intended for local development and the single-node milestone demonstration. A deployment must provide Node 22.13 or newer and a **durable writable filesystem mounted at the configured database path**; ephemeral serverless filesystems lose requests when instances restart. A single SQLite file must not be shared as a network-mounted multi-instance database. Before production or multiple app instances, migrate to a managed transactional database, use authenticated organizer and host accounts with server-enforced venue roles, add audit and backup/restore monitoring, rate limits, and operational recovery. Cookie-scoped role simulation does not establish the identity or permission of any actual host.

## Operational browser tests

The Playwright suite uses the installed Next.js production build and Chromium. Install the browser once, then run:

```bash
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` runs `npm run build` followed by `playwright test`. To run the suite again without rebuilding, use `npx playwright test`. Playwright's `webServer` starts `next start` on `127.0.0.1:3107` and waits for `/api/operations` to answer before opening the browser. The test config creates a unique temporary SQLite directory under the operating-system temp directory, supplies its path as `BACKSTAGE_DB_PATH`, and removes it during global teardown. It never points at `.data/backstage.sqlite`.

The end-to-end scenario uses fresh Chromium contexts. It transfers only the opaque demo workspace cookie and saved sample brief to the second context so organizer and host views can work in the same simulated workspace. No discovery request is issued: `test:agent` contains credential-free unit tests, while OpenAI and Sanity are not mocked or contacted by this browser suite. Discovery's separately recorded live retrieval evidence remains in `docs/build-log.md`.

Screenshots, failure screenshots, traces, and Playwright output are written under ignored `.playwright-artifacts/`. Do not stage these files or raw browser state. The suite captures organizer and host desktop/mobile screens for visual inspection.

The setup follows the [Playwright installation guide](https://playwright.dev/docs/intro) and its [`webServer` configuration](https://playwright.dev/docs/test-webserver). The current Next.js route-handler and testing guides are installed at `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`.

## Additional manual browser smoke checklist

These steps can supplement the automated Playwright scenario with a quick hands-on review.

1. On `/organizer`, save a complete event brief; open the application section and load it.
2. Select a researched lead and save a draft. Confirm its original sources, evidence, unknowns, and draft-only label; verify its submit button is disabled.
3. Select a clearly fictional demo host, select a room and equipment, edit the brief snapshot, enter organizer contact details, and set a flexibility range.
4. Review and submit. Confirm the request appears in the host simulation queue without any external message being sent.
5. Place a temporary hold, observe its calendar label, then approve the request. Confirm resource allocation, the accepted brief snapshot, and checklist appear.
6. Try another overlapping event using the same room or equipment; confirm the host gets a resource-specific conflict. Propose an available flexible slot, switch to organizer simulation to accept it, then approve from the host simulation.
7. Navigate calendar months, filter by resource, add an internal block outside active allocations, and repeat the same steps at a narrow mobile width.
