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
