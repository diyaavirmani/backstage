# Build log

## Milestone 1 — Backstage foundation

### Changes

- Scaffolded a Next.js 16 App Router app with TypeScript, Tailwind CSS 4, ESLint, and npm lockfile.
- Added a responsive landing page and organizer/host navigation.
- Added a required-field event brief form with schedule validation and browser-local draft save/restore.
- Added an honest host empty state and clear notices that venue recommendations, booking requests, host requests, and live availability are not connected.
- Defined shared domain types and wrote product, architecture, and session-capture docs.
- Added placeholder environment configuration and expanded ignore rules for local data, secrets, and raw session exports.
- Added persistent milestone, verification, diff-review, commit, and push instructions in `AGENTS.md`.

### Decisions

- Keep the first organizer draft local to the browser; no credentials or backend are needed to use this foundation.
- Keep venue knowledge retrieval in the future Sanity Context/Knowledge Base path and booking transactions in the future application backend.
- Keep raw Codex recordings private and separate from this human-readable log.

### Checks

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed; `/`, `/organizer`, `/host`, and `/icon.svg` prerendered.
- Production HTTP smoke check — passed; `/`, `/organizer`, and `/host` returned HTTP 200 and included expected page content.
- Browser automation was unavailable in the environment, so mobile rendering and interactive form behavior were not browser-tested.
- Identified the current Codex recording using `CODEX_SESSION_ID` and confirmed its session metadata working directory is this project. Only the metadata was inspected; no transcript was read or exported.

### Remaining limitations

- Sanity Context MCP retrieval, venue matching, source citations in product output, authentication, host availability, booking operations, and host response workflows are not implemented.
- The form saves one local draft in one browser; it does not sync across devices or submit an application.

## Milestone 2 — Source-backed venue knowledge foundation

### Changes

- Added a Sanity Studio route and schemas for host organizations, venues, spaces, resources, hosting policies, hosting opportunities, source references, and evidence-backed claims.
- Added six researched profiles across Delhi NCR and Bengaluru, with source titles, URLs, review dates, concise summaries, claim evidence types, and unresolved questions. The historical Paytm office entry is explicitly dated and historical. All profiles remain research leads; none are represented as onboarded partners.
- Added a responsive `/venues` preview with a city filter, source links, visible unknowns, historical evidence treatment, and a clear local-data origin label.
- Added a validator and stable-ID importer. It validates source and relationship references before connecting, does a credential-free dry run, publishes normal documents, and skips existing records/drafts to avoid overwriting host edits.
- Added a documented complete GROQ query to build a Knowledge Base from eligible published venues and related source-backed records, excluding operational and private data. Content validation asserts the query has its eligibility/demo guards and dereferenced source URLs, contains no organizer/booking data, and matches the query in the setup guide.
- Added a server-side `@ai-sdk/mcp` Context check that lists tools, requires both Knowledge Base tools, discovers ID/path from the live outline, reads a venue entry, and requires source URLs.
- Kept the existing organizer draft model and local save/restore workflow unchanged. Added separate server-only import and organization Context token placeholders.

### Decisions and research limitations

- Local research is a preview rather than a claim of connected Sanity content. Neither a live project import nor a real MCP retrieval is represented as complete without account configuration.
- Approximate SAIACS capacity figures were not attached to rooms because the reviewed source did not establish room-and-layout pairs. Other unknown capacities remain unknown. Price, current availability, and Backstage booking authority remain unknown across the catalogue. Shifu’s public pro-bono statement is separately source-backed and does not establish Backstage access.
- Official pages reviewed: Masters’ Union company hosting and campus tour pages; Ofis Square events page; Shifu Den page; SAIACS CEO Centre page. The Paytm listing is a GDG Cloud Noida event page for the 12 September 2026 Thinkfluence event and is retained as historical evidence only. Research was checked on 2 October 2026. The dataset records URL/title/review date; recheck before relying on any claim.
- Sanity project, dataset, organization feature enablement, Knowledge Base build, MCP endpoint, and token were not configured in this workspace. Exact dashboard steps and the live retrieval command are documented in `docs/sanity-setup.md`.

### Checks

- `npm run sanity:validate` — passed; six profiles/six source records, no demonstration inventory, and required unknown assertions present.
- `npm run sanity:seed:dry-run` — passed; validated 37 stable-ID research documents, with no connection or write.
- `npm run sanity:seed` — not run because no project import token or configured Sanity project/dataset was available; no Sanity writes were attempted.
- `npm run lint` — passed.
- `npm run typecheck` — passed after resolving schema/catalog typing findings.
- `npm run sanity:schema:validate` — passed; Sanity CLI reported zero schema errors.
- `npm run build` — passed; `/`, `/host`, `/organizer`, `/venues`, `/studio/[[...tool]]`, and `/icon.svg` prerendered.
- Production HTTP smoke check — passed; `/`, `/organizer`, `/host`, `/venues`, and `/studio` returned HTTP 200 with expected page content.
- `npm run sanity:context-check` — not a live success: exited with the actionable missing configuration message because `SANITY_CONTEXT_MCP_URL` and `SANITY_ORGANIZATION_TOKEN` are not configured. No Sanity account credentials were available.
- `npx sanity context list --json` — could not inspect account Knowledge Bases because no Sanity organization ID is configured in the CLI (`Organization ID is required`).
- Browser automation was unavailable; interactive mobile rendering, city filtering, and form restoration were not browser-tested.
- npm reported 15 dependency advisories (11 moderate, 4 high), including the Sanity CLI/workbench dependency chain. Its suggested automatic fix requires a breaking CLI downgrade, so no forced dependency downgrade was applied in this milestone.

### Remaining limitations

- Run the Sanity setup steps in `docs/sanity-setup.md`, review/build the Knowledge Base, create a Knowledge Base-only Context MCP endpoint, and run `npm run sanity:context-check` with organization Context Viewer credentials.
- The website currently reads only the local research preview; a later milestone should serve reviewed venue entries via the live Context path and implement grounded event matching. Booking, operational availability, host applications, and host onboarding remain unimplemented.

## Milestone 2B — Sanity resource connection attempt

### Account and configuration inspection

- Read `AGENTS.md`, Sanity setup/query/import/retrieval files, package scripts, and current repository history before changing files. `main` was clean at Milestone 2 commit `e79106a`.
- `.env.local` was absent. The five Sanity variables are therefore unconfigured; no values were printed. The current CLI config uses placeholders `replace-with-project-id` and `replace-with-dataset-name`.
- `sanity debug` confirmed the Sanity CLI has an authenticated local token (output redacted) but its account API returned no organizations. `sanity organizations list` reported `No organizations found`; `sanity projects list` returned an empty list. No organization/project/dataset ID is available; no account resources were created or modified.
- Asked the user to identify the intended account/organization access. Project creation, import, Knowledge Base operations, and live retrieval are paused pending access to the intended organization. Do not substitute the GitHub identity or create an organization by assumption.
- Verified installed CLI help for `context list/create`, `context imports list/create`, `context build --watch`, `context get`, and `context jobs get`; setup instructions now use only documented commands and inspect existing imports before adding a dataset source.

### Local changes and dependency review

- Added explicit `.env.local` loading for Node seed/MCP commands and the Sanity CLI config using `dotenv`; Next.js continues to load its public project settings through its normal env support. A temporary file with fake placeholders confirmed all five variables load; it was removed immediately and contained no credentials.
- `npm audit` identified 15 transitive findings (11 moderate, 4 high) in the Sanity CLI/workbench dependency graph: `adm-zip`, `undici`, `js-yaml`, `smol-toml`, and `uuid`, via federation/Vercel/CLI packages. These appeared in both the full and `--omit=dev` audit because Sanity’s CLI/workbench packages are in the installed Sanity package graph; the vulnerable leaves are CLI/config tooling rather than Backstage business logic. Applied compatible lockfile overrides to patched versions (no `--force`, no CLI major downgrade). The full and production-only audits now report zero vulnerabilities.
- Full local checks after the dependency updates — `npm run lint`, `npm run typecheck`, `npm run sanity:validate`, `npm run sanity:seed:dry-run`, `npm run sanity:schema:validate`, and `npm run build` all passed. Build prerenders `/`, `/host`, `/organizer`, `/venues`, and `/studio/[[...tool]]`.
- A temporary `.env.local` containing fake placeholder strings verified the env loader reports all five expected names as loaded; the temporary file was removed immediately. Actual final status remains all five variables missing, `.env.local` absent.
- A second temporary fake-ID `.env.local` was used with `npx sanity debug`; its workspace output showed the injected project ID/dataset. The file was removed immediately. No token values were used or printed.

### External work not completed

- No Sanity project or dataset is available to this account, so schema deployment, seed writes, dataset verification, Knowledge Base create/import/build, and MCP endpoint setup did not run. Import counts, verified document counts, Knowledge Base ID, build status, endpoint tools, and retrieved paths/citations are unavailable.
- `npm run sanity:seed` and `npm run sanity:context-check` were invoked after the env-loader fix; each stopped before network access with its clear missing-configuration message. No remote writes or MCP calls occurred.
- The Next.js catalog remains explicitly labeled a local research preview. No live retrieval success is claimed.
- Required account action: the local Sanity CLI is authenticated but lists zero organizations and zero projects. Confirm this is the intended account; if so, an owner must invite it to the intended organization (or the user must create/join the intended organization). If it is the wrong account, sign in to the intended account with `npx sanity login`. Then select/create the Backstage project and private `production` dataset, enable Context in organization **Labs**, create the project content-write token under project **API → Tokens**, and create the organization Context Viewer token under organization **API → Tokens**. Store the two tokens only in ignored `.env.local`. The exact non-secret project ID and organization ID are not available yet.
