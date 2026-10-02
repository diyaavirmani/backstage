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

## Milestone 2C — Personal Sanity resources and outline parser

### Account and resources

- The existing local Sanity CLI authentication was used. It was signed in and had no organizations or projects; the authorized new-account path was followed without requesting an invitation. Organization `Backstage` was created and verified as `o8mue7lt8`.
- After the project ID was configured, `npx sanity debug` confirmed the Sanity account name and email match the existing local Git author identity (Google provider); the CLI redacted its token. This confirmed the intended personal account context before continuing.
- Project `Backstage` was created in that organization as `1428jmxu`, with a private `production` dataset. `npx sanity projects list` and `npx sanity datasets list` confirmed both resources. The ignored `.env.local` now contains the actual non-secret project ID and dataset and has empty slots for the project import token, Context MCP URL, and organization token. Secret values remain missing.
- `npx sanity context list --organization o8mue7lt8 --json` returned `[]`: no existing Backstage Knowledge Base was present. Labs still needs an organization-admin action before creating/importing/building a Knowledge Base. No Knowledge Base or MCP endpoint is claimed as created.
- `npm run sanity:schema:deploy` succeeded: Sanity CLI reported `Deployed 1/1 schemas`.
- Project import token is not yet configured, so no seed write or dataset document query has been made. The last dry run validated 37 stable-ID documents. Imported count is 0; published document/reference verification is pending.

### Context outline and citation handling

- Replaced the `.md`-only path regular expression with `scripts/context-outline.mjs`, which follows the documented `Knowledge base id:` / outline heading / entry-count / flush-left path rows, recognizes optional `[core]` and `[peripheral]` tags, preserves extensionless and `.md` paths, ignores indented summaries, related annotations, and source URLs, and returns every path with its Knowledge Base ID.
- Added `npm run test:context-outline` with focused cases for extensionless and `.md` paths, tags, unrelated summary/related/source rows, and multiple Knowledge Bases.
- Changed the live checker to read each discovered path separately using its associated Knowledge Base ID. It matches retrieved citation URLs against source URLs attached to each locally researched venue and reports supported claim descriptions, avoiding the previous behavior of assigning every URL in a multi-entry batch to every matched city. It still fails unless venue sources cover both Delhi NCR and Bengaluru.
- Updated the setup guide with actual resource IDs, Labs/token actions, the local preview distinction, and parser behavior. The app still reads local research JSON.

### Checks and remaining account actions

- Passed: parser tests (3/3), catalog validation (six venues/six sources), seed dry run (37 documents), schema validation (zero errors), lint, and TypeScript check.
- Schema deployment passed as above. Production build passed and prerendered `/`, `/host`, `/organizer`, `/venues`, `/studio/[[...tool]]`, and `/icon.svg`. Full and production-only `npm audit` both report zero vulnerabilities.
- `npm run sanity:seed` exited before network access because `SANITY_PROJECT_IMPORT_TOKEN` is empty. `npm run sanity:context-check` exited before connecting because `SANITY_CONTEXT_MCP_URL` and `SANITY_ORGANIZATION_TOKEN` are empty. These are blocked setup checks, not successful imports or retrievals.
- Live import/retrieval remain blocked until an organization admin enables Context and Knowledge Bases under Sanity Manage → organization **Backstage** → **Labs**, and the user creates/saves a project-scoped content-write token under project **API → Tokens** plus an organization **Context Viewer** token under organization **API → Tokens**. The Context MCP URL must then be saved in `.env.local` after configuring an endpoint with Knowledge Base sources only.
- No Sanity documents have been imported; no Knowledge Base build, MCP tools listing, entry read, or citation evidence exists yet. The site catalog stays labelled a local preview.

## Milestone 2B continuation — Live dataset seed and Knowledge Base build

### Import and dataset verification

- Secret-safe environment inspection found project ID, dataset, project import token, and organization Context Viewer token configured; `SANITY_CONTEXT_MCP_URL` is still missing. `.env.local` remains ignored and was not printed or staged.
- Confirmed organization `o8mue7lt8`, project `1428jmxu`, and private dataset `production` using the Sanity CLI. Catalog validation passed and the seed dry run validated 37 documents.
- The first real seed attempt exposed strong reference cycles between venues and spaces. The importer now stages reference-free document skeletons and then restores reference fields in the same atomic transaction, while excluding existing published/draft IDs before writing. This preserves existing host edits and avoids leaving a partial cyclic-reference import.
- Successful recovery transaction created 26 missing documents and skipped 11 already present from the interrupted first attempt. A second idempotency run created 0 and skipped 37. Total published research documents: **37** — 6 source references, 5 host organizations, 9 spaces, 5 resources, 6 opportunities, and 6 venues.
- Added `npm run sanity:verify-seed`. Live verification found all 37/37 expected published IDs, six research venues, 117 document references resolving within the seed, zero seed drafts, and zero demonstration venues. The query from `sanity/knowledge-base-query.groq` returned six eligible research venues across Delhi NCR (4) and Bengaluru (2), with seven dereferenced venue-level source references. It excludes demonstration records and does not include private organizer or operational booking data.

### Knowledge Base build

- `npx sanity context list --organization o8mue7lt8 --json` found no pre-existing Knowledge Base. Created **Backstage Venue Knowledge** with public ID `kbPFAVeDOOjD` and the requested purpose to preserve unknowns.
- Inspected existing imports before adding a source; none existed. Added one dataset source for project `1428jmxu`, dataset `production`, using the complete `sanity/knowledge-base-query.groq`. Import status is `complete`: six of six source records distilled, zero unsupported.
- Dataset import ID: `e96533ac-0eb1-446a-81a4-1bda7ae12175`. The stored source query selects eligible published venue records, excludes demonstration inventory and demonstration relationship statuses, dereferences original source URLs and related policies/spaces/resources/opportunities, and excludes organizer and operational data.
- `npx sanity context build kbPFAVeDOOjD --watch` completed successfully. Build job `ctx-build-65e4c6c0-2470-4b40-ba3c-b90a958f5ed6-1790944788387` reached `succeeded`; Knowledge Base state is `ready`, three entries, all six source items cited, and zero issues (including zero critical issues). Build coverage reported all 10 gated entities covered and none missing.
- The CLI metadata confirms the generated entries and issue counts. Their actual text and citations have not yet been read through MCP; this remains part of the live retrieval check.

### MCP status and checks

- `SANITY_CONTEXT_MCP_URL` remains absent. No MCP endpoint exists yet, so tools, outline paths, venue entry reads, and actual MCP citation URLs are not available. Live Context retrieval is **not** marked successful.
- Dashboard step for the user: Sanity Dashboard **Context app → Create MCP**, name `backstage-venues`, select **Knowledge Bases** and only `Backstage Venue Knowledge` (`kbPFAVeDOOjD`), attach no dataset, save, then place the displayed URL directly in ignored `.env.local` as `SANITY_CONTEXT_MCP_URL`. The configured Context Viewer token is already present locally.
- `npm run sanity:context-check` was invoked, but stopped before opening a connection because `SANITY_CONTEXT_MCP_URL` is missing. No Context tools, outline paths, venue entry reads, or actual MCP citation URLs have been observed; live retrieval is not successful yet.
- Checks passed: lint, TypeScript, outline tests (3/3), catalog validation, dry run (37), schema validation (zero errors), published seed verification (37/37), production build, full npm audit and production-only npm audit (zero vulnerabilities). Schema deployment had already succeeded in the previous log entry.
- `/venues` still reads local research JSON and remains explicitly labeled a local preview.

## Milestone 2B continuation — Live Context endpoint and citation review

### Live MCP observation

- The configured `backstage-venues` endpoint connected using the locally configured organization Context Viewer credential. Credential values and the endpoint URL were not printed or added to this log.
- At `2026-10-02T13:25:08Z`, the endpoint listed `initial_context`, `knowledge_base_read`, and `knowledge_base_search`. `initial_context` identified Knowledge Base `kbPFAVeDOOjD` and returned two `[core]` paths: `venues/bengaluru` and `venues/delhi_ncr`. The checker called `knowledge_base_read` for both exact paths successfully. The endpoint is Knowledge Base mode, not GROQ-only.
- The Bengaluru entry contains Shifu Den and SAIACS CEO Centre information. The Delhi NCR entry contains Ofis Square Sector 62, Ofis Square Sohna Road, Masters’ Union Campus, and the historical Paytm Office event listing. The entries preserve unknown pricing, current availability, and Backstage booking authority; the Paytm event remains historical evidence.
- Citation integrity failed. The numbered references in the venue sections map to other venue labels in each entry’s `## Sources` list: Shifu Den `[1]` → SAIACS CEO Centre; SAIACS `[2]` → Shifu Den; Masters’ Union `[4]` → Ofis Square Sohna Road; Ofis Square Sohna Road `[1]` → Ofis Square Sector 62; Ofis Square Sector 62 `[3]` → Paytm; Paytm `[2]` → Masters’ Union. Five sections (Shifu Den, Masters’ Union, both Ofis Square profiles, and Paytm) omit their original source URLs as inline links. SAIACS includes its URL, but its numbered footnote points to Shifu Den. Therefore, live entry reads succeeded, but **live source-grounded retrieval did not pass** and must not be reported as successful.
- Separately queried the published dataset’s venue source references: the original source URLs resolve against the intended venue records. That confirms this observed mismatch is in generated Knowledge Base entry/citation associations rather than the verified source-reference relationships. The Sanity build metadata reported ready/zero issues earlier; that status did not catch the citation-label mismatch.
- No Knowledge Base source or generated entry was modified during this review. The installed CLI supports listing/creating/importing/building Knowledge Bases but does not expose entry editing or instruction management. The setup guide now directs an organization user to add a source-scoped citation instruction in **Context → Backstage Venue Knowledge → Instructions**, rebuild, inspect the generated entries, and rerun the live check. If the mismatch persists, the source/query needs restructuring and another build.
- `/venues` still displays the local JSON research preview; successful MCP reads do not change that data origin.

### Checker and verification changes

- Updated the outline parser to accept the backticked Knowledge Base ID format returned by this live endpoint; added the matching fixture to its multiple-Knowledge-Base test.
- Added a citation association parser. The live check now associates each footnote only with the `## Sources` label in the same venue section and requires an original source URL to appear in that section. It no longer treats unrelated host links or every URL in a combined entry as evidence for all venues. Added tests for correct and reversed footnote maps.
- `npm run test:context-outline` — passed, 6 tests. `npm run sanity:context-check` — connected and read both entries, then exited 1 because the six citation/source associations above are mismatched and original source links are absent from five venue sections. This is an expected integrity failure, not a credential or connectivity failure.

## Milestone 2B citation recovery — provenance instruction and full-catalog verification

### Response diagnosis and rebuild

- Inspected MCP responses directly before changing attribution checks. Both `initial_context` and `knowledge_base_read` responses contained only `{content, isError}`; each content item was text and had no `annotations`, `_meta`, or structured citation payload. The older swapped footnote numbers were literal in the raw entry text and its `## Sources` text, so they were generated-content mismatches, not response formatting or parser artifacts.
- Rebuilt the existing `kbPFAVeDOOjD` after the user saved a source-scoped provenance instruction. The supported `npx sanity context build kbPFAVeDOOjD --watch` job `ctx-build-65e4c6c0-2470-4b40-ba3c-b90a958f5ed6-1790948631445` reached `succeeded` at `2026-10-02T13:46:48.671Z`; state is `ready`, build metadata reports 12 entries, six cited source records, and zero issues. The actual MCP outline exposes nine paths, all read by the checker: `event_hosting_history`, `facilities_and_equipment`, `unknown_and_unverified`, `venues/bengaluru/saiacs_ceo_centre`, `venues/bengaluru/shifu_den`, `venues/delhi_ncr/masters_union`, `venues/delhi_ncr/ofis_square_gurugram`, `venues/delhi_ncr/ofis_square_noida`, and `venues/delhi_ncr/paytm_office_noida`.
- The rebuilt text contains correctly scoped source links and source labels for the six individual venue profiles. The Ofis profiles remain distinct by locality while sharing the canonical URL `https://ofissquare.com/events-spaces`.

### Checker corrections and live evidence

- Replaced venue-substring/URL-only matching with direct verification against the six published venue documents and their dereferenced source records. The checker now reads every path from the outline, verifies all six expected published venue IDs, compares source identities both at venue level and for each published claim, checks source titles/canonical URLs, resolves numbered citations only in that same entry’s Sources list, checks links only in the associated venue section, and requires locality tokens. A wrong footnote fails even if the correct URL also appears elsewhere in the entry. Correct URL links inside a footnote are accepted. It keeps two Ofis venue records separate despite their shared webpage.
- Added regression tests for swapped Ofis footnotes despite correct inline URLs, omitted expected venue coverage, a correct URL in the corresponding footnote, and distinct locations sharing one URL. `npm run test:context-outline` passes all 7 tests.
- At `2026-10-02T14:03:13Z`, `npm run sanity:context-check` connected to the real endpoint, verified six published Sanity venue/source records and each claim’s source identities, listed `initial_context`, `knowledge_base_read`, and `knowledge_base_search`, fetched all nine outline paths, and passed source-grounded verification for all six venues:
  - Masters’ Union Campus — `venue-masters-union-gurugram`; source IDs `source-masters-union-companies`, `source-masters-union-campus-tour`; URLs `https://mastersunion.org/for-companies` and `https://mastersunion.org/book-a-campus-tour`.
  - Ofis Square — Sohna Road, Gurugram — `venue-ofis-gurugram-sohna-road`; source ID `source-ofis-events`; URL `https://ofissquare.com/events-spaces`.
  - Ofis Square — Sector 62, Noida — `venue-ofis-noida-sector-62`; source ID `source-ofis-events`; same source webpage, matched in its separate Noida section.
  - Paytm Office, Noida — `venue-paytm-office-noida`; source ID `source-gdg-thinkfluence-paytm`; URL `https://gdg.community.dev/events/details/google-gdg-cloud-noida-presents-thinkfluence/`; retained as historical evidence.
  - SAIACS CEO Centre — `venue-saiacs-ceo-centre-bengaluru`; source ID `source-saiacs-ceo-centre`; URL `https://saiacs-ceocenter.com/`.
  - Shifu Den — `venue-shifu-den-bengaluru`; source ID `source-shifu-den`; URL `https://den.shifuventures.com/`.
- Each venue section retains explicit unknown pricing, availability, capacity (where no room/layout pair is established), and Backstage booking authority. SAIACS approximate figures remain qualified and are not treated as room/layout matches. Shifu’s founder-community pro-bono statement remains limited to that audience and does not imply Backstage eligibility.
- No source query change was needed after the new build passed these checks. The website’s `/venues` page remains a local JSON preview.

### Local checks

- Passed: lint, seven parser/citation tests, catalog validation, 37-document seed dry run, Sanity schema validation (zero errors), published seed verification (37/37; 117 references resolved; zero drafts/demos), and production build.
- `npm run typecheck` first raced a simultaneous production build while `.next` route types were being regenerated and reported a missing generated `routes.js`; rerunning after the build completed passed. The production build itself also passed its TypeScript step.

## Milestone 3 — Conversational venue discovery foundation

### Implemented

- Added `POST /api/venue-discovery` using Next.js 16.3 App Router Route Handlers, AI SDK `generateText` with structured output and a bounded tool loop, the OpenAI provider, and the existing MCP client. Provider construction is isolated in `src/lib/ai-provider.ts` and checks server-only `OPENAI_API_KEY` on request; `OPENAI_MODEL` defaults to `gpt-4.1-mini`. A missing model key does not break builds.
- Each request validates the locally saved EventBrief and a bounded (up to eight messages, six thousand characters) conversation. It fetches current published research venue records and source references using the server-side project token, calls Context `initial_context`, parses the live outline, and gives the model only the currently discovered entry IDs/paths/tags as read choices. The model can make up to six entry-tool calls. Context and entry calls have timeouts and cancellation; MCP cleanup is bounded and always attempted.
- The model returns only venue identities, localities, and paths it selected after reading. The server validates the actual venue section against published Sanity records, exact localities, source IDs, citation scope, and canonical original URLs. It constructs source links from those records; no model-supplied citations or claim classifications are accepted. Requirement coverage is derived from source-linked structured claims. Unknowns remain unknown; conflicts require explicitly conflicting evidence; capacity needs a named space, layout, and adequate documented count.
- Added organizer actions to save the brief or find suitable leads, loading/retry/configuration/empty states, sourced recommendation cards, known facts and important unknowns, and follow-up questions that reuse the same saved brief. The page continues to make clear that these are research leads; it does not submit a booking or check a calendar. `/venues` remains a local JSON preview.
- Added input, retrieval, locality, evidence, capacity, source-link, conflict, and override regression tests. New dependencies use AI SDK `ai@7.0.127`, `@ai-sdk/openai@4.0.83`, and existing `@ai-sdk/mcp@2.0.66`; the AI SDK 7 Node engine requirement is reflected as Node.js 22+ in README. Official current AI SDK tool/structured-output/MCP documentation and the installed Next 16.3 route-handler and server/client component documentation were reviewed.

### Checks and observed retrieval

- `npm run lint` — passed with no warnings.
- `npm run typecheck` — passed.
- `npm run test:agent` — passed, 24 tests including malformed brief/time/date handling, rejection of client system/tool/citation fields, empty/failed retrieval, unsupported capacity, source-backed conflict handling, unknown food/access/booking authority, swapped venue paths/localities, and source-link construction.
- `npm run build` — passed with the Sanity environment available and OpenAI key absent; `/api/venue-discovery` is dynamic and the build did not initialize provider credentials.
- `npm audit` — passed, zero vulnerabilities after dependency additions.
- `npm run sanity:validate` — passed for all six source-backed profiles; demonstration inventory remains empty and unsupported capacity, availability, price, and booking authority remain unknown.
- `npm run sanity:seed:dry-run` — passed, 37 intended stable-ID published research documents across six venues; no writes were performed in this milestone.
- `npm run sanity:context-check` — live Sanity retrieval succeeded at `2026-10-02T14:43:00Z`. The endpoint listed `initial_context`, `knowledge_base_read`, and `knowledge_base_search`; the checker called the outline and read all nine paths from `kbPFAVeDOOjD`, then matched source IDs/URLs and localities for all six published venues. The verified profiles included Masters’ Union, both distinct Ofis Square locations, historical Paytm event evidence, SAIACS CEO Centre, and Shifu Den. No local fixture was involved.
- Production HTTP smoke requests to `/api/venue-discovery` returned HTTP 400 for a malformed brief and HTTP 503 with the actionable missing `OPENAI_API_KEY` message for a valid brief. The key is absent in both the process environment and ignored `.env.local`; therefore no OpenAI request or model-driven Knowledge Base tool selection was run, and no live agent scenario is claimed as successful.
- Browser automation tooling was not available in this workspace, so the interactive navigation/mobile/form-persistence browser journey was not verified. The component flow passed static lint, TypeScript, and production compilation.

### Remaining limitations

- Add `OPENAI_API_KEY` directly to ignored `.env.local` and rerun the requested live scenarios: 80-person Delhi NCR hackathon, Bengaluru founder/sponsored-access exploration, immediate Paytm booking request, and Noida/Gurugram follow-up. Save neither secrets nor raw request/session content in build evidence.
- Organizer follow-up history is held in component state for the current browser session; the EventBrief itself remains saved locally. No account identity, host applications, live availability, host approval, booking, or reservation transaction is implemented.
- The discovery endpoint has bounded per-request work but no user authentication or cross-instance rate limiting. Add those before exposing paid model access publicly.
- No Knowledge Base content or Sanity configuration was changed by this milestone. The catalog route remains a local preview by design.
