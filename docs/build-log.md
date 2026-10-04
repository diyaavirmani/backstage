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

## Milestone 3 requirement-classification and live-agent verification — 2 October 2026

### Corrections

- Eligibility and access-model support now requires the event audience to match an explicitly documented audience condition. Shifu’s founder-community wording no longer qualifies a general student gathering; matching founder audiences retain the source qualification that detailed criteria and Backstage access remain unconfirmed.
- Conflicting claims now classify as unknown, not prohibited. A single source-backed explicit prohibition can contradict a requested activity. An unrelated numeric fact cannot satisfy a requested room/equipment quantity; quantity evidence must be near the matching resource. Unknown or conflicting information remains visible with its source-derived wording.
- The live route scopes the current outline menu by event city and, when present in the latest organizer question, a venue or locality. A directly named research lead is returned only after its corresponding live entry read. Model candidates with an invalid venue identity, locality, or entry/path citation are discarded before publishing.
- Added sanitized server log records for each completed turn: Knowledge Base ID, successful entry paths, successful read-call count, accepted venue IDs/path/source IDs, counts by requirement status, and rejected candidate count. The logs do not include the EventBrief, organizer requirement text, conversation content, tool response text, or credentials.

### Live route scenarios

The OpenAI key and Sanity server configuration were present locally (only configured/missing booleans were inspected). The app was stopped and freshly restarted with `npm run dev -- --hostname 127.0.0.1`. Seven actual POST requests to `/api/venue-discovery` completed through the OpenAI provider and live Context MCP on 2 October 2026. Each returned HTTP 200 after at least one successful `knowledge_base_read` call; no fixture was used.

- **80-person Delhi NCR hackathon:** read `venues/delhi_ncr/ofis_square_noida`, `venues/delhi_ncr/paytm_office_noida`, `venues/delhi_ncr/masters_union`, and `venues/delhi_ncr/ofis_square_gurugram` in `kbPFAVeDOOjD`. Returned the two Ofis Square locations with their shared official source URL `https://ofissquare.com/events-spaces/`; the Noida and Gurugram entry paths and localities remained separate. Room count, equipment, food permission, 80-person room/layout capacity, event-date availability, setup/clear-up access, and budget fit all remained unknown. One model candidate failed the exact evidence/scope gate and was discarded.
- **Bengaluru founder gathering exploring pro-bono access:** read `venues/bengaluru/shifu_den` and `venues/bengaluru/saiacs_ceo_centre`. Returned Shifu Den with `https://den.shifuventures.com/`. The described pro-bono condition and founder audience were supported with the published qualification; capacity, exact price/sponsorship terms, dates, and booking authority remained unknown.
- **General student gathering asking about Shifu:** read `venues/bengaluru/shifu_den`; returned Shifu Den so the direct question could be answered. Audience eligibility and pro-bono access classified unknown for general university students, with the founder-community source wording and qualification preserved. No eligibility was inferred.
- **Immediate Paytm booking request:** read `venues/delhi_ncr/paytm_office_noida`; returned the record as historical evidence with the original GDG event URL `https://gdg.community.dev/events/details/google-gdg-cloud-noida-presents-thinkfluence/`. Backstage booking authority was unknown. No booking was represented as submitted or confirmed.
- **Delhi NCR locality follow-ups:** the initial brief returned the Gurugram Ofis lead and Noida Ofis lead. The Noida follow-up, carrying the same brief and conversation, returned Sector 62, Noida and the separate historical Paytm Noida record, with their respective Ofis and GDG citations. The next follow-up switched locality and returned only Ofis Square — Sohna Road, Gurugram. The same 35-person brief remained in each API request; capacity, availability, and budget terms remained unknown.

### Checks and remaining verification

- `npm run test:agent` — final run passed, 29 tests, including positive count-specific room evidence.
- `npm run lint` — passed with no warnings.
- `npm run typecheck` — passed.
- `npm run build` — passed after the final route, logging, and classification changes.
- `npm audit --audit-level=moderate` — passed, zero vulnerabilities.
- `npm run sanity:validate` and `npm run sanity:seed:dry-run` — passed; six source-backed profiles and 37 published research documents remain valid. No seed writes were run.
- Browser automation tooling is not available in this workspace. Browser verification remains pending. Manual browser checklist: (1) leave a required organizer field blank and confirm discovery is blocked; (2) save a completed brief, reload, and confirm fields restore; (3) run discovery and open an original source; (4) ask for Noida and then Gurugram and confirm the same event details remain; (5) repeat at a narrow mobile viewport.
- Remaining product limitations: requests are not authenticated or rate-limited across instances; the venue catalog page still reads local JSON; no host application, live availability, approval, reservation, or booking operation is implemented. Organizer conversation history remains browser-session state while the EventBrief is locally saved.

## Milestone 4 — Host applications, approvals, and resource calendar — 3 October 2026

### Implemented

- Added lazy server-side SQLite initialization through Node's built-in `node:sqlite` `DatabaseSync`, versioned SQL migrations in `db/migrations/001_operations.sql` and `002_operational-policy-and-checklist-history.sql`, and configurable `BACKSTAGE_DB_PATH` (default ignored `.data/backstage.sqlite`). Builds do not initialize the store. The database stores workspace/session hashes, venue and resource records, dated availability, internal blocks, event/brief snapshots, applications, holds/reservations, checklist items and completion history, and application transition history.
- The route issues an opaque random HTTP-only SameSite=Lax cookie and resolves workspace scope server-side. All operational reads and writes filter by that workspace. Demo IDs are workspace-scoped. Organizer/host switching changes a clearly labelled simulation role; it is not account authentication. Communications remain inside the product.
- Six researched Sanity/local-catalog venues can receive saved private application drafts with the brief, independently source-linked published evidence, citations, and unanswered questions. The server rejects attempts to submit these research drafts because no Backstage booking permission is verified. No researched venue was altered or added to Knowledge Base input.
- Added two fictional demonstration hosts: Backstage Demo House · Delhi NCR and Backstage Demo Commons · Bengaluru. Their facilities, room/layout capacities, finite shared equipment, rules, sponsored/pro-bono access models, host-approval fulfillment model, and weekday availability are synthetic and labelled throughout the UI. They exist only in the operational SQLite database.
- Organizers can load and edit a saved EventBrief, add contact/community details and open questions, select fictional resources and quantities, review, and submit a demo request. Request idempotency is enforced by a workspace-scoped unique key. Organizer replies, cancellation, and explicit acceptance of a host-proposed alternative are supported. The submitted brief is preserved as the accepted snapshot at approval.
- Replaced the host empty state with a demo queue and application details. Host actions include information requests, rejection, available in-flexibility alternatives, 15-minute holds, and approval after validating host rules, essential conditions, requested rooms/equipment and counts, room/layout capacity, released availability, internal blocks, buffers, and active allocations. Hosts can release unallocated availability and add internal blocks.
- Host calendar offers month navigation, resource filtering, and labels for released windows, internal blocks, pending requests, live holds with expiry, and confirmed reservations. Stored instants are UTC ISO strings and displayed in Asia/Kolkata. `BEGIN IMMEDIATE` transactions perform state changes and allocations; half-open occupied intervals include setup and cleanup buffers, finite equipment quantities are checked, expired holds stop blocking, and cancellation/rejection release allocations.
- Approval stores the accepted brief snapshot and generates idempotent organizer/host preparation tasks for room preparation, access coordination, setup/cleanup, permitted food arrangements, AV checks, and equipment return. Checklist completion changes are persisted with their own history.
- Updated shared application/resource/checklist types, README, architecture, Sanity demo-data boundary note, `.env.example`, and [operations setup](operations-setup.md). `.data/`, database files, and WAL sidecars are ignored.

### Verification

- `npm run test:operations` — passed 19 tests. Coverage includes the fictional two-city inventory and separate access/approval models, research draft-only enforcement and citations, draft reopen/edit/submit, review requirement, duplicate submission idempotency, workspace isolation, invalid transitions, hold expiry, adjacent intervals and setup/cleanup conflicts, internal blocks, duplicate resource prevention, shared equipment conflicts, required room counts and equipment quantities, unknown essential conditions, cancellation release, alternative acceptance, checklist idempotence/history, versioned migration and restart persistence, and concurrent approvals through two worker threads with separate SQLite connections.
- Automated end-to-end scenario on an isolated SQLite database — first fictional workshop approved and allocated; a second same-slot workshop was blocked on the shared projector; the host proposed another in-range slot with live demo availability; the organizer explicitly accepted; the second approval allocated the projector at the new time. Both requests reached approved, the calendar held two non-overlapping projector reservations, and both had generated checklists.
- `npm run test:agent` — passed, 29 existing Sanity discovery/provenance regression tests; no discovery or citation code was changed.
- `npm run sanity:validate` — passed: six source-backed profiles and six sources; no demonstration inventory; unsupported real venue capacity, availability, prices, and booking authority remain unknown.
- `npm run sanity:seed:dry-run` — passed: 37 published research documents across six venues; no writes. The demo inventory is separate from the import and Knowledge Base query.
- `npm run lint`, `npm run typecheck`, and `npm run build` — passed. The build produced dynamic `/api/operations` and `/api/venue-discovery` routes and initialized no SQLite database.
- `npm audit --audit-level=moderate` — passed with zero vulnerabilities.
- Production route smoke check — `GET /api/operations` returned 200 with eight workspace venues and six research profiles; the fictional Delhi host returned `sponsored` access separately from `host-approval`, and its selected room carried a named capacity layout. The server issued a private session cookie (value not logged); role switch returned 200, the next workspace read reported `host`, an internal block POST returned 200 and appeared in the calendar, and `/host` returned 200.
- Browser automation tools were not available. The manual desktop/mobile organizer and host workflow checklist is in [operations setup](operations-setup.md).

### Remaining limitations

- Fictional operations are a workflow simulation; no real host can receive an application and no real reservation or external communication occurs. The six sourced leads remain draft-only.
- Cookie workspace scoping is not production identity, organizer/host authentication, or verified host authorization. Add account identity, per-venue role checks, rate limiting, CSRF/abuse monitoring, and production audit controls before external use.
- This single-node SQLite demonstration needs durable writable local storage. Node currently marks `node:sqlite` as a release candidate. Do not put this file on an ephemeral serverless filesystem or shared network storage; production needs managed transactional persistence, backup/restore, and operations monitoring.
- The two demo hosts use explicitly fictional fixed policies and rolling sample availability, not researched commercial terms or real host confirmations. The calendar only reports its operational store.
- At the Milestone 4 commit, browser interaction/layout verification was pending; Milestone 4B below closes that gap. Sanity Knowledge Base contents and the local `/venues` preview were not changed by Milestone 4.

## Milestone 4B — Operational validation and browser journey — 3 October 2026

### Corrections

- Approval now checks each room and equipment requirement against resources selected on that exact application. Room counts and requested room identity/layout must match selected rooms. Equipment aliases use whole documented resource terms and selected quantities; unsupported qualifications such as HDMI remain unresolved. Essential equipment cannot be satisfied merely because the venue owns the item. General food permission does not prove dietary or allergy guarantees; exact supported policy conditions pass, explicit conflicts remain rejected, and all other essential conditions block approval for host confirmation.
- The host queue now has a separate confirmed-events section with the accepted brief snapshot, reservations, shared checklist, and transition history. Both organizer and host can complete only their assigned tasks; the other role sees the persisted state but cannot edit it. Organizer response controls are shown only to organizers, and status-inapplicable host actions are hidden.
- Checklist deadlines now use the accepted event schedule: preparation and information confirmation before arrival, setup by event start, and cleanup/equipment return after the event within the occupied cleanup interval. Fictional hosts publish explicit 30-minute arrival and cleanup buffers, which are included in allocation intervals. Migration 003 repairs only incomplete milestone-4 checklist deadlines and adds the demo cleanup buffer to older demo workspaces; completed timestamps and task history are preserved.
- Calendar copy and the action now say “Withdraw availability.” Expired holds are released before host calendar mutations and do not prevent withdrawal or internal blocks; reservations and unexpired holds remain protected. The homepage now distinguishes live source-grounded leads and private research drafts from fictional host approval/calendar demonstrations.
- Added a production-build Playwright/Chromium journey. It uses fresh contexts, an explicitly shared demo workspace cookie, and a unique SQLite database under the system temp directory; it never opens the normal `.data/backstage.sqlite`.

### Verification

- `npm run test:operations` — passed, 26 tests. New cases cover venue-owned but unselected equipment, HDMI and dietary qualifiers, specific selected-room identity, explicit negative policy preservation, two-role checklist ownership, UTC deadlines against the schedule and cleanup allocation, migration repair without altering completed history, and live/expired-hold protections for availability and internal blocks.
- `npm run test:agent` — passed, 29 existing Sanity discovery/provenance unit tests. These tests are local and do not represent a live provider request.
- `npm run test:e2e` — production build and Chromium organizer-to-host journey passed. The browser exercised required-field validation, local brief save and reload, a Masters’ Union source-linked private draft with submit disabled, fictional request submission, host information request, organizer reply, approval, confirmed-event view, host and organizer checklist updates, shared-projector conflict, an in-range proposed slot explicitly accepted by the organizer, cancellation and calendar release, resource filtering, and availability withdrawal. The suite also passed at a 390px viewport with no document-width overflow on `/host` and `/organizer`.
- Captured and visually inspected ignored screenshots at `.playwright-artifacts/organizer-saved-brief.png`, `.playwright-artifacts/organizer-mobile.png`, `.playwright-artifacts/host-calendar-before-cancel.png`, and `.playwright-artifacts/host-calendar-mobile.png`.
- `npm run lint`, `npm run typecheck`, `npm run sanity:validate`, `npm run sanity:seed:dry-run`, and `npm audit --audit-level=moderate` — passed. The catalog still has six source-backed research profiles; dry run still validates 37 published Sanity research documents and excludes demo inventory; audit reports zero vulnerabilities.
- The browser journey intentionally did not invoke `/api/venue-discovery`, OpenAI, or Sanity. It tests operational UI and API behavior only. The previous live Sanity Context retrieval evidence for the six real venues remains the evidence recorded under Milestone 2B and Milestone 3 above.

### Remaining limitations

- Host/organizer identity and venue authorization remain a simulation. Real venues remain private draft-only research leads, and no real application, booking, or communication is sent.
- The responsive screenshots cover Chromium at desktop and 390px mobile widths; they do not establish behavior in other browser engines or assistive technologies.
- Production still requires authenticated accounts, enforced host permissions, abuse controls, and managed transactional persistence for multi-instance deployment.

## Milestone 5 — Sanity catalog and discovery-to-draft handoff — 3 October 2026

### Implementation

- Replaced the normal `/venues` local-JSON page with request-time server retrieval of published, eligible `research-lead` records from Sanity project `1428jmxu` / dataset `production`. The projection resolves related source references, claims, spaces, equipment/resources, and policies, and excludes demonstration records. The checked-in six-venue catalogue remains only as an explicitly labeled local preview when Sanity configuration or service access is unavailable. Each displayed fact keeps its source’s original `checkedAt` date rather than treating the fetch date as a source review.
- Added a typed one-time browser handoff from each validated recommendation to the existing application builder. It carries the selected venue identity, exact discovery brief, requirement coverage/qualifications, and unanswered requirements. The builder selects the corresponding research lead without a second venue choice. It marks the original discovery brief, flags changes, requires the organizer review checkbox before saving, and keeps research submission disabled.
- Research draft writes now resolve the selected workspace research venue to its stable Sanity document ID and re-fetch the published eligible record on the server. Client source URLs, evidence, and booking authority are not used. The application snapshot stores the Sanity claim/source records, their source-check dates, a separate evidence-capture timestamp, the original discovery brief, and unanswered questions. The existing server-side draft-only restriction remains enforced.
- Added three opt-in examples with dates generated in Asia/Kolkata: an 80-person Delhi NCR hackathon showing capacity/equipment/budget/availability unknowns; a Bengaluru founders gathering that preserves Shifu’s founder-community qualification; and a weekday fictional-host workshop within the sample availability horizon. Loading an example changes only the current and browser-saved brief; it creates no application or reservation.
- Tightened candidate publication so a venue candidate without source IDs verified within that venue’s selected entry path is withheld while independently validated candidates remain eligible. This preserves citation validation and handles a live response that included an uncited SAIACS candidate alongside source-cited Shifu content. Added a regression case for that venue-scoped citation condition.
- Added [the judge walkthrough](judge-guide.md), updated the setup/architecture/README, and added an opt-in real-provider browser test. The deterministic handoff test labels and confines mocked discovery/application endpoints to Playwright; product routes do not use these fixtures. Playwright server output now carries only the application’s bounded sanitized verification events; tokens, MCP endpoint URL, event brief, contact data, and raw provider content are not logged.

### Verification

- `npm run test:agent` — passed, 30 tests, including verified citation scoping for candidates with and without citation source IDs.
- `npm run test:operations` — passed, 26 tests, including research draft-only enforcement, persistence, workspace isolation, resource conflicts, accepted alternatives, and checklists.
- `npm run test:e2e` — passed production build and deterministic Chromium walkthroughs: 3 passed, 1 opt-in live test skipped. Covered mocked recommendation-to-draft handoff, exact venue/brief transfer, source and qualification display, unanswered questions, review-gated save, draft restoration, example loading without operational side effects, the existing organizer/host flow, and desktop/mobile overflow checks. Discovery and save endpoints in the handoff scenario were explicitly mocked test fixtures; they do not count as live verification.
- Opt-in live Chromium run with configured server-side credentials — passed. `/venues` rendered six published Sanity profiles; the city filter returned four Delhi NCR profiles and two Bengaluru profiles, retaining both distinct Ofis locations. Live OpenAI discovery and a follow-up performed real Knowledge Base reads from `kbPFAVeDOOjD`: `venues/bengaluru/shifu_den` and `venues/bengaluru/saiacs_ceo_centre`. The validated recommendation was Shifu Den with citation source ID `source-shifu-den`; the browser opened `https://den.shifuventures.com/`, prepared the matching venue and original brief, reviewed and saved a private research draft, reloaded the page, and verified that the server-stored draft retained its evidence snapshot and original source link. Submission stayed disabled. The response retained seven unknown classifications and three supported classifications; no current booking permission was added. Sanitized evidence at ignored `.playwright-artifacts/live-context-evidence.json` records `2026-10-02T21:40:31Z`, Knowledge Base ID, actual entry path, venue/source IDs, city, and original URL; it contains no credentials, session, or organizer contact values. Desktop and 390px mobile viewports passed; the mobile screenshot was visually inspected and had no horizontal overflow.
- The standalone `npm run sanity:context-check` — passed at `2026-10-02T21:34:30Z`: available tools were `initial_context`, `knowledge_base_read`, and `knowledge_base_search`; all nine outline paths were read and all six venue identities/source URLs verified. Ofis source sharing and locality distinction, Paytm’s historical context, and Shifu’s founder-community qualification remain intact.
- `npm run sanity:validate` — passed, six source-backed profiles and six sources; no demonstration inventory, with unsupported capacities, price, availability, and booking authority left unknown. `npm run sanity:seed:dry-run` — passed, 37 stable-ID research documents validated, no writes.
- `npm run lint`, `npm run typecheck`, and the production build inside `npm run test:e2e` — passed. `npm audit --audit-level=moderate` — passed with zero vulnerabilities.

### Remaining limitations

- `/venues` falls back to checked-in reviewed JSON if the Sanity project read fails. That path is visibly labeled a local preview. A source’s recorded check date can become stale and should be refreshed through research, not by changing it during a fetch.
- Real leads remain research-only, cannot be submitted, and have no Backstage booking authority or operational calendar. Only the two fictional hosts support the workflow simulation. Authentication, real host onboarding, request delivery, production multi-user controls, and deployment remain future work.
- The live provider run exercised one Bengaluru founder scenario and its follow-up. Broader live model outputs may differ; malformed or uncited candidates are intentionally withheld instead of being shown without provenance.

## Milestone 6 — Railway deployment preparation — 3 October 2026

### Implementation

- Added a lockfile-based multi-stage Dockerfile on Node 24 Bookworm. The final runtime uses Next.js standalone output, binds to `0.0.0.0`, and explicitly includes public/static assets, SQL migrations, operation scripts, and the research catalogue required by server code. `.dockerignore` excludes environment files, local databases, session exports, browser output, dependencies, and development output. No private credentials are build arguments.
- Added `.railway/railway.ts` as a named `backstage` partial with one `asia-southeast1` replica, a 512 MiB `/data` volume, `/api/health`, non-secret Sanity project settings, and demo quotas. Railway will supply the volume mount path. Migrations remain lazy and execute only on runtime operations/discovery requests after storage validation. The runtime refuses a Railway database path outside the mounted volume.
- Added a minimal sanitized health route. On Railway it checks mount alignment and write access without opening/creating SQLite, creating a workspace, or calling a provider. Added persisted UTC daily per-session and global discovery quotas; the global cap is cookie-independent, applied before OpenAI/Sanity requests, and responds with 429 and `Retry-After`. Both POST APIs enforce bounded streamed bodies and exact same-origin checks against `APP_ORIGIN`.
- Split hosted Sanity reads onto project-scoped `SANITY_PROJECT_READ_TOKEN`. `SANITY_PROJECT_IMPORT_TOKEN` remains for local seed writes only and is excluded from hosted service settings and the image. Added deployment, volume restart, backup, runtime environment, limits, account setup, and cost documentation; updated README, architecture, Sanity and operations setup, judge guide, and this log.
- Added `npm run verify:standalone`. It assembles the production traced output and explicitly copied runtime assets in an isolated temporary directory, starts the production server with isolated persistent storage, verifies health does not create the database, submits and approves a fictional event, completes a host checklist task, restarts the process, and verifies that the same workspace, reservation, and completed task remain.

### Verification

- `npm run lint` — passed.
- `npm run typecheck` — passed after adding the quota helper's TypeScript declaration.
- `npm run test:agent` — passed, 30 provenance/input/retrieval tests.
- `npm run test:operations` — passed, 26 tests including separate-connection concurrent approvals and storage persistence.
- `npm run test:deployment-controls` — passed, 6 tests covering bounded declared/streamed request bodies, origin checks, configured limits, UTC reset/retry, persisted per-session/global limits, and concurrent global-cap enforcement across separate SQLite connections.
- `npm run sanity:validate` — passed for six source-backed profiles; real venue prices, unsupported capacities, availability, and booking authority remain unknown; demo inventory is absent.
- `npm run sanity:seed:dry-run` — passed, 37 stable-ID research documents validated and no writes performed.
- `npm run build` — passed without Sanity/OpenAI credentials; the generated app contains standalone output and a dynamic health route.
- `npm run verify:standalone` — passed against a staged production artifact with isolated storage; fictional application submission, host approval, reservation, checklist update, and persistence across process restart succeeded. This is not a Docker image execution.
- `npm run test:e2e` — passed deterministic Chromium workflows, 3 passed and the opt-in live-provider test skipped. The first standalone-server rerun exposed missing static/public assets because Next's standalone server was started from its output subdirectory without those files; `npm start` now copies both assets into that output before starting the server. The rerun then passed the recommendation-to-draft fixture, example briefs, and full organizer/fictional-host workflow at desktop and 390px mobile widths. Screenshot evidence was visually inspected. This deterministic fixture does not represent a live provider call.
- `npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --strict .railway/railway.ts` — passed static type validation for the Railway service/volume configuration. Railway's plan itself could not be validated because its IaC engine requires an authenticated Railway CLI 5.42.1 or newer.
- `npm run sanity:context-check` — not a live success. It stopped before contacting the endpoint because `SANITY_PROJECT_READ_TOKEN` is missing from `.env.local`. The Context endpoint and organization token were present (only booleans were inspected); no token or endpoint value was printed. Create/use a project-scoped read-only token and store it locally before a live retrieval test or hosted deployment.
- `npm audit` — returned 13 high findings; `npm audit --omit=dev` returned 11. The vulnerable dependency chain includes Sanity/Studio runtime and CLI tooling. Audit suggests major-version Sanity/Next-Sanity downgrades; registry latest `braces` remains 3.0.3 and is included in the advisory range. No compatible leaf fix was available and no forced downgrade was made. See [deployment notes](deployment.md).

### Deployment status and remaining work

- `docker`, `podman`, and the Railway CLI/account context were unavailable. The bundled Railway IaC command reported that it requires Railway CLI 5.42.1 or newer. No image build, Railway plan/apply, account changes, billable resources, public domain, or public deployment was made. Billing authorization was not available, so no paid plan or resource was selected.
- Before deployment, install/authenticate a current Railway CLI, inspect the intended personal project and billing, review `railway config plan` for the named partial, then apply only after confirming the volume/compute cost. Add the private read-only Sanity project token, Context Viewer token and endpoint, OpenAI key, exact HTTPS `APP_ORIGIN`, and the documented limits as Railway runtime variables. Keep the Sanity write token local. Configure/verify the public domain, then run the catalog, live discovery, fictional operations, restart, and backup/restore checks in `docs/deployment.md`.
- Production account authentication, real host onboarding, real bookings, multi-instance storage, alerting, and deployment verification remain future work. No public URL or deployed commit exists for this milestone.

## Milestone 6B — Runtime dependency review, image smoke workflow, and live retrieval

### Runtime and dependency findings

- The starting audit state was 13 high package-path findings from `npm audit` and 11 from `npm audit --omit=dev`. Every item came from the single `braces` advisory GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 (affected `<=3.0.3`, no patched version listed at review time). The reported paths included `chokidar`, `micromatch`, `fast-glob`, and `globby`; npm's suggested package remedies included major-version downgrades.
- Inspection found `src/app/studio/[[...tool]]/page.tsx` was the only `next-sanity` import. The previous production build contained that Studio route and Sanity Studio server chunks, while the final standalone package did not have a conventional `node_modules/sanity` directory. Removed the embedded route and `next-sanity` dependency. Retained `sanity.config.ts`, `sanity.cli.ts`, and all schema definitions; `npm run sanity:dev` runs the editor locally at `http://localhost:3333/studio`.
- After removal, `npm audit --omit=dev` reported zero findings; full `npm audit` reported 12 high package findings, all still from the same unpatched `braces` advisory in Sanity CLI/schema and Next ESLint development tooling. No forced downgrade, unsupported override, or suppression was added. This is dependency graph separation, not a patch to `braces`.
- The rebuilt Next standalone artifact contains no Studio route, `next-sanity` reference, or Sanity Studio package files (0 path matches in the artifact scan). The production dependency graph contains no `next-sanity` and npm reports zero production-only advisories. `@sanity/client` remains in use by the live published catalog and evidence path; Context MCP and source citation validation remain intact.

### Image packaging and operational verification

- Added `scripts/verify-docker-image.mjs` and `.github/workflows/docker-smoke.yml`. The CI workflow builds the actual Docker image without private credentials, prepares a uniquely named isolated volume, verifies readiness without eager SQLite creation, checks a static CSS asset, submits and approves a fictional event, completes a host checklist task, restarts the container, and verifies the application, reservation, and task completion persisted. The script keeps the cookie in memory, emits no container logs or database contents, and removes only its own test resources.
- The first GitHub image run, `37124965101` for commit `d1759622a45cfaf2bb31ac27d917e8b5520f6282`, failed during the image build because the empty `public/` directory was present locally but absent from a clean Git checkout; the Dockerfile's existing `COPY /app/public` therefore had no source. Added tracked `public/.gitkeep`. Both `.gitignore` and `.dockerignore` permit it, preserving existing public assets and the Dockerfile copy. Other explicit Docker copy inputs (`.next/standalone`, `.next/static`, `db`, seven server modules, and the research catalogue) are generated or tracked in a clean checkout/build.
- The corrected [GitHub Docker image run](https://github.com/diyaavirmani/backstage/actions/runs/37125473296) succeeded for tested commit `bccc987f933e53d57a6d078d900506ad7f0f288c`. Both image build and mounted-volume smoke passed. The actual Node 24 image served `/api/health` without creating SQLite, returned a static CSS asset, accepted and approved a fictional application, persisted a host checklist completion and reservation across container stop/start, and used an isolated named volume that the script removed afterward.
- Local Docker and Podman are unavailable (`command -v` found neither), so local image execution was not possible. `npm run verify:standalone` passed against the assembled Next standalone runtime: required runtime files were present, health did not create the database, and an isolated fictional application, reservation, and checklist completion survived process restart. This is separate from Docker image evidence.

### Live Sanity verification

- Configuration presence was checked without displaying values: `SANITY_PROJECT_READ_TOKEN`, `SANITY_CONTEXT_MCP_URL`, `SANITY_ORGANIZATION_TOKEN`, and `OPENAI_API_KEY` were configured.
- `npm run sanity:context-check` succeeded at 2026-10-03 12:48 UTC against Knowledge Base `kbPFAVeDOOjD`. Tools: `initial_context`, `knowledge_base_read`, `knowledge_base_search`. The actual outline exposed nine paths; the checker read the outline and matched evidence for all six published venues across `venues/delhi_ncr/masters_union`, `venues/delhi_ncr/ofis_square_gurugram`, `venues/delhi_ncr/ofis_square_noida`, `venues/delhi_ncr/paytm_office_noida`, `venues/bengaluru/saiacs_ceo_centre`, and `venues/bengaluru/shifu_den`, with additional facility/history/unknown entries. Citations matched the published source identities: Masters’ Union → `source-masters-union-companies` and `source-masters-union-campus-tour`; both distinct Ofis locations → `source-ofis-events`; Paytm → `source-gdg-thinkfluence-paytm`; SAIACS → `source-saiacs-ceo-centre`; Shifu → `source-shifu-den`. Paytm remained historical evidence, Shifu retained its founder-community qualification, and unsupported capacity, prices, current availability, and booking authority remained unknown.
- The opt-in live browser test passed. It read two real Bengaluru Knowledge Base paths across discovery and follow-up, published only the verified Shifu recommendation, opened the original `source-shifu-den` URL, prepared and saved a research draft, then confirmed its evidence snapshot after reload. One first-pass model candidate was rejected by source validation. Its sanitized evidence artifact is ignored under `.playwright-artifacts/`; no raw provider response, session, cookie, Context endpoint, or credential was recorded in Git.

### Checks

- Passed: `npm run lint`; `npm run typecheck`; `npm run build` (the route table has no `/studio` route); `npm run test:agent` (30); `npm run test:operations` (26, including separate-connection concurrency); `npm run test:deployment-controls` (6); `npm run test:e2e` (3 passed, 1 opt-in live test skipped in the deterministic run); `npm run verify:standalone`; `npm run sanity:validate` (six venues); `npm run sanity:seed:dry-run` (37 stable-ID documents); and `npm run sanity:schema:validate` (zero schema errors). The live browser test was separately run opt-in and passed.
- Audit after Studio separation: full graph 12 high, all one unpatched `braces` advisory; production-only graph zero. Audit evidence JSON was saved outside the repository under `/tmp` for inspection and is not committed.
- No Railway plan could be generated: authenticated Railway CLI 5.63.1 identified the personal account, `railway list --json` returned an empty project list, and `railway status` had no linked project. Read-only `railway config plan --file .railway/railway.ts --json` stopped for that reason. The usage query showed $0 current/estimated usage in the new billing period, but did not disclose the billing tier; no project, resource, billing setting, or payment method was changed. Current target resources remain one app service, one replica, and one 512 MiB `/data` volume. Railway pricing notes are in `docs/deployment.md`.
- Public deployment remains incomplete and no public URL is claimed. Railway configuration was not applied.

## Railway account setup and 512 MB volume limit — 3 October 2026

- Verified the authenticated Railway account without recording its email in the repository. The intended personal workspace is `Diya virmani's Projects` (`829fe1ba-5d8c-4eb9-9274-593588410bd8`). Its project list was empty before setup, so created exactly one project using Railway CLI 5.63.1's supported `railway init --name Backstage --workspace … --json`: project `Backstage` (`1b07915a-2d25-4e72-9d67-cf2ef7aa0136`), production environment `bb8ea621-7244-457c-a8b4-2355fb887bf1`. The CLI linked the repository to it.
- The account billing query reported HOBBY plan state with `isTrialing=true`, 30 days remaining, $5 trial credit, $0 usage, and no active subscription. The general usage limit was unset. Current Railway documentation sets a 500 MB maximum volume on Free/Trial, while `.railway/railway.ts` requests 512 MB.
- Generated a fresh redacted `railway config plan --file .railway/railway.ts --json`. It contains only the Backstage service and `backstage-data` volume. The desired configuration is one replica in `asia-southeast1`, built from the repository Dockerfile, healthchecked at `/api/health`, with a 512 MB volume mounted at `/data`; non-secret settings include `/data/backstage.sqlite` and daily discovery limits 5/session and 50/global. The secrets were redacted/not included in output.
- Attempted the reviewed plan once. Railway rejected the volume with `Max size of 500 MB on current plan. Please select a valid size or upgrade`. The project now has one empty service definition but no environment service instance, volume, deployment, or domain. Follow-up `railway status`, `railway deployment list`, `railway volume list`, and `railway domain list` confirmed these counts are zero. Usage remains $0. No payment or subscription setting changed, and no runtime credentials were transferred.
- Deployment cannot proceed with the checked-in 512 MB target under the current trial. The decision needed is either explicit authorization for Hobby at $5/month (resource use beyond its included amount may add cost) or authorization to change the requested volume to 500 MB. We did not silently reduce storage or retry apply. Because no service is deployed, HTTPS, hosted catalog, hosted OpenAI/Sanity connectivity, workflow, and restart checks have not run. The previous credential-free Docker image and mounted-volume restart workflow remains the verified artifact evidence for commit `bccc987f933e53d57a6d078d900506ad7f0f288c`; it is not a Railway deployment.
- Documentation checks: manually reviewed the redacted plan graph and queried Railway's resulting project, environment, deployment, volume, domain, and usage state. No code or infrastructure setting changed in this update; public URL remains unavailable. The existing Docker workflow is separate from Railway and this documentation commit does not itself configure a Railway deployment.

## Railway trial deployment continuation — 3 October 2026

- Changed `.railway/railway.ts` from 512 MB to 500 MB at the user's direction to stay within the existing trial. No plan or payment changes were made.
- Rechecked the existing project `1b07915a-2d25-4e72-9d67-cf2ef7aa0136` and production environment `bb8ea621-7244-457c-a8b4-2355fb887bf1`. The project has one detached service object named Backstage; the environment still has no service instances or volumes. The existing service ID did not appear in the current-environment service listing, and `railway service link` could not resolve that detached object, so no service-link mutation was made.
- Reviewed a redacted `railway config plan --file .railway/railway.ts --json`: no diagnostics or deletes; planned changes are one Backstage service and one `backstage-data` volume. Desired settings are one replica, repository Dockerfile on `main`, `/api/health`, region `asia-southeast1`, 500 MB volume mounted at `/data`, and database `/data/backstage.sqlite`. Before apply, confirm the CLI reconciles the detached Backstage object rather than creating a duplicate.
- Local `.env.local` presence checks found the project read-only token, Context MCP URL, organization Context Viewer token, OpenAI key, and model configured; the write/import token is also locally present but is excluded from Railway variables. Only configured/missing status was printed. No credentials have been transferred yet.
- At this log update, plan application, hosted variable configuration, domain, deployment, and hosted checks are pending. Continue only with the existing trial; stop if Railway requests a paid plan or billing change. The older failed 512 MB apply entry above is retained as history.

## Railway trial deployment completed — 4 October 2026

- Changed `.railway/railway.ts` to the trial-supported 500 MB volume size. The exact documented region identifier is `asia-southeast1-eqsg3a`; the prior shorthand had deployed to SFO, so the existing attached volume was migrated to Southeast Asia. The plan was reviewed before apply. The same Backstage service and `backstage-data` volume IDs were retained; no duplicate or unrelated resources were created. The final plan has no deletions or volume migration pending. Runtime secret variables use `preserve()` declarations so a future IaC reconciliation does not clear values managed in Railway.
- Railway remains on its existing HOBBY trial, with no paid subscription or billing changes. Usage at the final account check was `$0.00642`, estimated `$0.00813`. The one production replica is running at `asia-southeast1-eqsg3a`; the existing `backstage-data` volume is 500 MB, READY, and mounted at `/data`. The database path is `/data/backstage.sqlite`, healthcheck is `/api/health`, and the generated HTTPS domain targets port 8080. The first generated-domain target used port 3000 and produced an upstream connection refusal; runtime logs showed Railway's injected `PORT=8080`, so the existing domain was corrected to 8080. HTTPS then returned 200.
- Deployed commit `24098898474908b39124299531584ba6e4dee749` is served by Railway deployment `900277de-e718-4091-8333-cf1508243f8e` (SUCCESS), at [`https://backstage-production-0849.up.railway.app`](https://backstage-production-0849.up.railway.app). GitHub Actions Docker build and mounted-volume restart smoke check passed for the same commit: [workflow run 37135382893](https://github.com/diyaavirmani/backstage/actions/runs/37135382893). Local Docker/Podman is unavailable.
- Hosted HTTPS checks returned 200 for `/api/health`, `/`, `/venues`, `/organizer`, and `/host`. `/venues` rendered the published Sanity catalog (six source-backed venue cards), not the local preview. Post-volume-migration application API verification saved and restored a private Shifu Den research draft with six evidence claims and one original source reference (`https://den.shifuventures.com/`); the server rejected a submission attempt and left the researched venue draft-only.
- Real hosted discovery after migration made two successful OpenAI-backed requests through the Knowledge Base-only Sanity Context MCP endpoint. The follow-up selected Shifu Den (`venue-shifu-den-bengaluru`) at Knowledge Base path `venues/bengaluru/shifu_den` and cited source `source-shifu-den` (`https://den.shifuventures.com/`). The source-backed response qualified the public pro-bono description to its founder community and retained unknown room/layout capacity, current availability, price/sponsorship terms, and Backstage booking authority/approval. The follow-up kept the 24-person brief. The response and citation evidence were server-validated.
- Persistence was tested on the post-migration instance with fictional contact details: a fictional Delhi NCR workshop was submitted to the demo host, approved, allocated a room and projector, and had a host-owned checklist task completed. After a Railway service restart, health returned 200 and the same private session retrieved the approved application, both resource allocations, and completed checklist state. An earlier arbitrary-date approval probe correctly received an outside-availability rejection; the successful persistence run selected a date from that session's released calendar availability.
- Credentials were configured as private runtime variables. `SANITY_PROJECT_IMPORT_TOKEN` is not present in Railway. Sanity read access, Context MCP, and OpenAI were exercised through real hosted requests without exposing credentials. The app still uses fictional host operations and simulation role switching; production authentication, real host onboarding, and real booking authority remain future work.
- The final redacted reconciliation plan showed one safe restart-policy update only, no volume or service changes, no deletions, and preserved secret variables. Checks for this deployment record passed: `npm run lint`, `npm run typecheck`, `npm run build`, strict TypeScript validation of `.railway/railway.ts`, and `git diff --check`; plus Railway status/service/volume/domain and billing queries; the redacted IaC plan; HTTPS page and API requests; live OpenAI/Sanity Context discovery and follow-up; research draft persistence and server-enforced submission rejection; fictional approval/resource/checklist persistence after service restart; and the successful Docker workflow above.
- Pushed commit `e70060cbea7a5a97853d5b6c3d71857a01f9ed98` (`docs: record verified Railway trial deployment`) is deployed by Railway as deployment `87aeef83-e5ce-4145-9113-10fa27bae364` (SUCCESS), with one running replica and the same 500 MB volume. All five HTTPS checks (`/api/health`, `/`, `/venues`, `/organizer`, `/host`) returned 200 on this revision. GitHub Actions [workflow 37156074445](https://github.com/diyaavirmani/backstage/actions/runs/37156074445) completed successfully for this exact SHA; both the production Docker image build and mounted-volume restart smoke test passed. Thus the pushed revision and hosted app are verified together. The public URL remains `https://backstage-production-0849.up.railway.app`.

## Sanity Challenge submission package — 4 October 2026

- Rewrote `docs/judge-guide.md` to lead with the live Railway URL and explain the judge's browser-scoped workspace, Bengaluru example, real Context discovery and citations, private research drafts, and fictional host workflow. The local setup is retained as an alternative. Stale deployment-pending language was removed.
- Added `docs/submission.md`, a first-person unpublished DEV draft using the requested Path One headings, live app/repository links, Sanity project details, actual Knowledge Base/MCP behavior, operational boundaries, and the recorded citation-attribution failure and rebuild/validation correction. Only the video recording and public DEV Agent Sessions embed remain as placeholders.
- Added `docs/demo-script.md` with a timed 4–5 minute walkthrough that uses two discovery calls and does not reset or raise the persisted demo limits.
- Updated `docs/session-capture.md` against the current official Codex CLI page. The active Codex session ID matched the session metadata and this repository's working directory; metadata-only scanning found one matching local recording. A redacted JSONL copy was prepared outside the repository with private directory/file permissions and every record parses in the original JSONL format. It has not been uploaded. The copy redacts credentials, private endpoints, cookies, contact details, and local account paths. Useful turn anchors for curation are the Milestone 6 prompt at ordinal 10402, Milestone 6B and Railway continuation prompts at ordinals 11579–14294, and this submission request from ordinal 14295 onward. Preserve surrounding authentic responses and tool activity when curating.
- No application code, discovery counters, or provider configuration changed for this package. No DEV article was published and no session transcript was uploaded.
