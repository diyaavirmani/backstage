# Backstage backend evaluation, regression, and stress report

**Run date:** 4 October 2026
**Starting revision:** `47431a41eba2417a093d7489aaf77f5f38f9ccaf`
**Runtime:** Node 24.21.0, Next.js 16.3.8, Playwright Chromium, isolated temporary SQLite files
**Scope:** Evaluation only. No application or backend implementation was changed. Added tests and this report preserve the reproduced failures as diagnostics.

The original report below records the baseline defects. The correction pass and post-fix results are recorded at the end; they supersede the earlier “follow-up order” and pre-fix status.

## Findings first

### Moderate — concurrent first requests can fail while SQLite migrations initialize

**Affected feature:** first operations or discovery requests after an empty database is created, including startup after a deployment with a new database file.

**Reproduction:** `npm run test:backend-startup-diagnostic` starts 12 independent Node workers together against one fresh SQLite database. In the diagnostic run, 7 opened successfully and 5 failed: two with `UNIQUE constraint failed: schema_migrations.version` and three with `database is locked`.

**Expected:** all callers wait for the migration transaction and then open the initialized database.

**Actual:** callers that checked a migration version before another worker committed can attempt the same insert. Some callers also fail on SQLite lock contention. The database was not shown to be corrupt; this can surface as a failed first request, after which a later retry may work.

**Suggested follow-up:** make each migration's version check and insert one serialized operation, recheck the version after acquiring the write lock, and make fresh-database/WAL initialization tolerate simultaneous openers. No implementation change was made in this QA pass. The failing diagnostic is intentionally excluded from the normal passing test command.

### Moderate — an exclusion in a Gurugram follow-up can produce no leads

**Affected feature:** Delhi NCR locality refinement.

**Reproduction:** `npm run test:backend-live-locality-diagnostic` (one real local OpenAI/Context request) supplied a Noida turn followed by: “Exclude Noida; show only Gurugram-locality leads.” The request returned HTTP 200 and successfully read `venues/delhi_ncr/ofis_square_gurugram`, but the candidate was rejected and the response contained no recommendations.

**Expected:** retain the saved event brief, return supported Gurugram-locality leads, and exclude Noida.

**Actual:** no lead was returned. No false booking or unsupported recommendation was emitted. The sanitized MCP server log recorded one successful read of the Gurugram Ofis entry and one rejected model candidate.

**Likely cause from code inspection:** `localityHint` chooses Noida when “Noida” appears anywhere in the latest question, including after “Exclude”; it does not parse negative locality conditions. The outline-to-venue matcher can also consider both Ofis paths relevant because their identity shares the `Ofis Square` words. The server-side venue allowlist rejected the mismatched candidate, which failed closed but lost the desired lead. Fixing the filter and tightening path identity are follow-up implementation work and were deliberately not done here.

## Agent scenario matrix

| Scenario | Independent expected outcome | Evidence and result |
| --- | --- | --- |
| Bengaluru founders asking about Shifu’s pro-bono description | Preserve founder-community qualification; do not promise access | Unit regression passed. Two live requests read `venues/bengaluru/shifu_den`; `venue-shifu-den-bengaluru` was returned with source `source-shifu-den`. Requirement counts were 3 supported and 7 unknown. The browser check saw the founder qualification and unknowns. |
| General student gathering | Shifu eligibility stays unknown unless sources establish that audience | Agent regression passed; pro-bono is not classified as supported for “general university students.” No separate live student request was made. |
| Delhi NCR, 80-person hackathon | Room/layout capacity, two-room fit, equipment, availability, price remain unknown absent source-backed claims | Live broad discovery read four Delhi Knowledge Base entries and returned the two Ofis locations separately. Each card had 16 unknown requirement classifications. Unit regressions cover capacity needing room/layout evidence and missing room/equipment requirements. |
| Request to book Paytm immediately | Past event evidence is historical; availability and Backstage booking authority remain unknown; no booking | Validator and operations tests passed: booking authority stays unknown and research leads reject submission. The live Noida response read `venues/delhi_ncr/paytm_office_noida`, cited `source-gdg-thinkfluence-paytm`, and classified the requested requirements unknown. A separate live natural-language “book now” prompt was not sent within the five-call limit. |
| Noida then Gurugram follow-up | Keep the brief, include only the requested locality, and change locality on follow-up | Noida live follow-up returned the Noida Ofis and Paytm IDs. The next Gurugram-only request exposed the zero-result defect above. A prior browser assertion that searched the entire Noida card for “Gurgaon” was a false positive because the shared source title mentions both locations; the test was corrected to assert the API’s structured venue localities. The corrected five-call browser sequence was not rerun after the live-call budget was reached. |
| Two Ofis locations using one public source URL | Preserve distinct location identities and scope evidence to each location | Live broad discovery returned `venue-ofis-gurugram-sohna-road` at `venues/delhi_ncr/ofis_square_gurugram` and `venue-ofis-noida-sector-62` at `venues/delhi_ncr/ofis_square_noida`; both cited `source-ofis-events`. Citation/location regression passed. |
| Contradictory source claims | Mark the requirement unknown/conflicting, not automatically prohibited | Agent validation regression passed. |
| Equipment quantity versus a room requirement | Equipment claims cannot satisfy room identity/count | Operations tests passed for selected room identities, room count, equipment quantity, and shared resource allocation. |
| User instructions or retrieved text attempting to invent citations, eligibility, or booking | Treat text as untrusted; only published records and validated reads can support returned citations | Input schema, retrieved-tool, locality, citation-scope, and operations authorization regressions passed. Prompt-injection text was not sent as an additional live request. |

### Live retrieval record

The live browser requests used the configured Backstage Context Knowledge Base `kbPFAVeDOOjD`. Five sequential discovery requests were made in total against the local production server and its temporary SQLite directory; the Railway app and hosted quota counters were not contacted.

- Bengaluru founder discovery and follow-up read Shifu Den and SAIACS entries; Shifu’s verified result cited `source-shifu-den` and retained unknowns.
- Delhi NCR discovery read four entries: Masters’ Union, both Ofis location paths, and Paytm. The returned Ofis location records remained separate and cited `source-ofis-events`.
- Noida refinement read the Noida Ofis and Paytm paths; returned source IDs were `source-ofis-events` and `source-gdg-thinkfluence-paytm`.
- The fifth Gurugram-only follow-up read the Gurugram Ofis path successfully but returned no validated recommendation. The diagnostic failed as expected and left a sanitized artifact under ignored `.playwright-artifacts/`.

The original live test run stopped after four calls at the overbroad card-text assertion described above. The assertion was narrowed to structured locality evidence; its full five-call sequence remains unverified because the permitted five live calls had been consumed. The separate one-call diagnostic provided the fifth result. A successful Knowledge Base read alone is not counted as a successful recommendation.

## Regression and API coverage

Added `npm run test:backend-api-qa`, which calls the actual local production route handlers with a fresh browser context and isolated Playwright database. It verifies:

- Missing/mismatched Origin, malformed JSON, missing required fields, invalid calendar date/time, negative headcount/budget, and oversized **chunked/streamed** request bodies on discovery and operations routes.
- Forged venue/resource IDs, client-supplied fake evidence, research submission denial, cross-workspace application access, and forged checklist IDs.
- Two simultaneous retries using one idempotency key create one application and one transition to submitted.
- No credentials, bearer tokens, or private service variables appear in tested error text.

Existing agent and operations regressions additionally cover missing Context tools, empty outlines, failed/empty reads, swapped citations, invalid venue identities/localities, unknown/conflicting facts, untrusted client fields, transitions, checklist ownership, hold expiry, setup/cleanup buffers, cancellation, persistence, and idempotency.

Added separate-connection races for approval against an internal block, approval against cancellation, and two distinct rooms competing for one shared projector. Each completed with atomic state and no duplicate resource allocation. Existing tests continue to cover overlapping room approvals, global quota concurrency, and workspace scoping. Role changes remain a simulation; these checks do not establish production user authentication.

## Bounded localhost load and restart

`npm run test:backend-stress` starts the actual Next standalone server on `127.0.0.1`, uses a fresh temporary SQLite file, and omits provider credentials intentionally. Each valid request stops at the missing OpenAI configuration check, so no external provider is contacted. It ran 100 requests at each concurrency level (1, 5, 20, 50), restarted the same isolated server/database, then ran another 100 at concurrency 50: **500 requests total**. A missing-configuration 503 is the expected outcome in this load profile; this is not a provider-throughput benchmark.

| Concurrency | Requests | p50 | p95 | p99 | Throughput | Peak sampled server RSS |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 100 | 5.4 ms | 9.9 ms | 11.8 ms | 143.42 req/s | 135.6 MiB |
| 5 | 100 | 20.7 ms | 35.0 ms | 40.2 ms | 227.20 req/s | 139.9 MiB |
| 20 | 100 | 53.5 ms | 316.9 ms | 450.0 ms | 216.39 req/s | 156.9 MiB |
| 50 | 100 | 161.2 ms | 362.9 ms | 371.9 ms | 219.60 req/s | 178.3 MiB |
| Restart, 50 | 100 | 138.8 ms | 592.4 ms | 609.4 ms | 161.67 req/s | 140.9 MiB |

All 500 responses were the expected missing-configuration 503; there were 0 unexpected transport/HTTP errors and 0 business conflicts in this discovery-only profile. The persisted global quota count was 400 before restart and 500 after. `PRAGMA integrity_check` returned `ok`, and `PRAGMA foreign_key_check` returned 0 rows before and after restart. Separate operations races supply business-conflict coverage outside this HTTP load profile.

## Checks

Node 24 commands used for the final credential-free checks:

```bash
npm run test:agent
npm run test:operations
npm run test:deployment-controls
npm run test:backend-api-qa
npm run test:backend-stress # after test:e2e has created .next/standalone
npm run lint
npm run typecheck
npm run test:e2e
npm run sanity:validate
npm run sanity:seed:dry-run
```

Results: agent 30/30 passed; operations 29/29 passed; deployment controls and quota tests 6/6 passed; API route suite 2/2 passed; deterministic browser suite 5 passed and 2 opt-in live tests skipped; lint, TypeScript, and the production build embedded in `test:e2e` passed; catalog validation found 6 source-backed venues and 6 sources; seed dry run validated 37 stable-ID published documents and performed no writes. The live discovery and locality diagnostics were run separately, as described above.

The QA harness commit `a84ae9f16a4c43d09fc2010464c372347fde9ffa` was pushed to `main`. GitHub Actions [Docker image smoke run 37188578805](https://github.com/diyaavirmani/backstage/actions/runs/37188578805) passed for that exact SHA; the production image build and mounted-volume restart check both completed successfully. This verifies packaging/CI only, not a new Railway deployment or production backend behavior.

These diagnostics intentionally fail while the defects remain visible:

```bash
npm run test:backend-startup-diagnostic
npm run test:backend-live-locality-diagnostic
```

The latter requires credentials in ignored `.env.local` and sends one live local discovery request. The full five-request browser journey is opt-in with `BACKSTAGE_LIVE_BROWSER=1`; its safe loading command is documented in `docs/operations-setup.md`. Do not run both opt-in suites together if limiting live calls to five.

## Not exercised and limitations

- OpenAI authentication failure, provider rate limit, timeout/cancellation, malformed model tool output, Context authorization failure, and MCP transport failure were not injected into the real route. Its provider clients are instantiated directly in the route, with no dedicated test transport seam. Validator/retrieval unit tests cover selected invalid content and tool-result cases, not those provider transport branches.
- The full live five-request browser test did not reach a passing terminal result after its selector correction because the five-call cap was reached. The fifth isolated real request is recorded separately and reproduced the zero-result locality failure.
- Immediate Paytm booking was tested through server-side draft-only/booking-authority guards, but not as a separate live model prompt.
- Production authentication and real host identities are not provided by the cookie workspace or role simulation.
- No public Railway service, hosted quota, or production database was used for stress or mutation tests.

## Follow-up order

1. Fix and retain concurrent migration-start coverage before changing SQLite migration code.
2. Parse positive and excluded locality constraints explicitly and strengthen outline path identity; preserve a regression for the Gurugram-only follow-up.
3. Add injectable provider transports for deterministic timeout, authentication, rate-limit, malformed-output, and MCP failure tests.
4. Rerun the opt-in discovery browser journey with no more than five sequential provider requests and verify a positive Gurugram-only result plus the brief snapshot.

## Correction and verification pass — 4 October 2026

**Tested revision:** working tree based on `c76f9f0d0021e8f3ba444e2da89ea5c0df8561da` before the correction commit. **Runtime:** Node 24.21.0, Next.js production standalone on localhost, isolated temporary SQLite, Playwright Chromium. No load, mutation, or quota traffic was sent to Railway.

### SQLite startup correction

The required pre-fix reproduction was run first: the former single-database/12-worker diagnostic failed with 6/12 openers returning duplicate `schema_migrations.version` errors. This reproduces the earlier lock/version race.

Migration checking now takes place after `BEGIN IMMEDIATE`, so each waiting opener sees the version ledger after it owns the write transaction. Fresh-database WAL setup, migration table creation, and migration application retry only `SQLITE_BUSY`/`SQLITE_LOCKED` contention under one bounded deadline. Exhaustion returns `PERSISTENT_STORAGE_UNAVAILABLE`; the discovery and operations HTTP handlers return a sanitized 503. Active migrations roll back on failure, and failed store connections close. The existing store call shape remains unchanged; the optional initialization-time override is an internal test seam.

Post-fix `npm run test:operations` passed its 12-worker test against **10 separate fresh database files (120 successful opens)**. Each file has exactly one row for each of migration versions 1–4, `integrity_check=ok`, and zero foreign-key violations. A held exclusive lock exhausted a shortened test deadline; the API integration test verified the production operations handler returned a sanitized 503, then recovered after the lock was released. An upgrade test re-applied migration ledger versions 2–4 and confirmed the pre-existing application and accepted brief, active allocations, transition history, completed checklist timestamp/history, and daily quota counters were byte-for-byte unchanged.

### Locality and entry-path correction

Locality parsing now records explicit inclusions and exclusions. Exclusions win contradictory mentions; Gurgaon and Gurugram map to one locality; `not only Noida, but also Gurugram` includes both. Six requested phrases plus contradictory ambiguity regressions pass. Entry matching still uses dynamically discovered outline paths, but when a path identifies Noida or Gurugram/Gurgaon its location discriminator must agree with the structured venue locality. The two Ofis Square records remain distinct even though both cite `source-ofis-events` and its shared original URL.

The five-request real browser journey ran once against localhost with actual OpenAI and Sanity Context. All five API requests returned source-validated recommendations and successful reads from Knowledge Base `kbPFAVeDOOjD`:

| Request | Returned venue(s) | Actual entry path(s) | Source IDs / result |
| --- | --- | --- | --- |
| Bengaluru founder discovery | `venue-shifu-den-bengaluru` | `venues/bengaluru/shifu_den` | `source-shifu-den`; 3 supported and 7 unknown requirement statuses; founder-community condition remained visible. |
| Founder follow-up | `venue-shifu-den-bengaluru` | `venues/bengaluru/shifu_den` | `source-shifu-den`; exact same saved brief was sent. |
| 80-person Delhi NCR hackathon | `venue-ofis-noida-sector-62` | `venues/delhi_ncr/ofis_square_noida` | `source-ofis-events`; capacity, breakout rooms, equipment, schedule/availability, and budget remained unknown. |
| Noida refinement | Noida Ofis and historical Paytm lead | `venues/delhi_ncr/ofis_square_noida`, `venues/delhi_ncr/paytm_office_noida` | `source-ofis-events`, `source-gdg-thinkfluence-paytm`; Paytm stayed historical. |
| Exclude Noida; Gurugram only | `venue-ofis-gurugram-sohna-road` | `venues/delhi_ncr/ofis_square_gurugram` | `source-ofis-events`; no Noida venue identity/locality or Noida-specific Ofis/Paytm entry was returned; all 16 requested requirement classifications stayed unknown. The brief sent on this request equaled the brief sent on the 80-person discovery. |

The browser journey opened Shifu's original `https://den.shifuventures.com/` source, saved its private research draft, reloaded the page, and restored the evidence snapshot before continuing the three Delhi NCR turns. The terminal test initially failed only because it searched the entire Gurugram recommendation card for the text “Noida”; the common Ofis source title itself mentions both locations. The assertion is now based on the venue's structured locality, candidate identity, and selected entry path. **That selector correction was not rerun live** because the five permitted provider calls had already completed. Live server output and its sanitized ignored artifact show the above successful final Gurugram result; the corrected final DOM selector remains not rechecked live.

### Provider failures

The route's provider boundary is now an internal server-side dependency seam, not a public endpoint or client flag. `npm run test:provider-failures` makes 11 bounded scenarios using in-process mocks: OpenAI HTTP 401 and 429, generation timeout, request cancellation, Context authorization failure, MCP outline transport failure, Knowledge Base entry-read failure, missing Knowledge Base tools, empty outline, malformed model output, plus one mocked source-validated success. Failure responses contain no provider messages/tokens, no recommendations, applications, or allocations; Context clients close when created. The expected discovery quota increment is the only persisted failure-side effect. These cases are mocked and do not establish provider reliability or live authentication.

### Load and regression results

The existing missing-configuration benchmark remains separately labeled and unchanged in purpose. It ran 500 localhost discovery requests at concurrency 1/5/20/50 plus restart, each stopping before provider egress with the expected missing-OpenAI 503. It had zero unexpected errors; quota state was 400 before restart and 500 after, with clean integrity and foreign-key checks. Final run metrics:

| Concurrency | Requests | p50 | p95 | p99 | Throughput | Peak RSS |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 100 | 6.6 ms | 11.7 ms | 13.1 ms | 114.56 req/s | 128.1 MiB |
| 5 | 100 | 26.4 ms | 43.5 ms | 55.1 ms | 184.09 req/s | 131.8 MiB |
| 20 | 100 | 64.0 ms | 348.1 ms | 541.1 ms | 179.96 req/s | 149.3 MiB |
| 50 | 100 | 238.2 ms | 485.8 ms | 551.9 ms | 176.14 req/s | 172.0 MiB |
| Restart, 50 | 100 | 190.1 ms | 729.0 ms | 750.5 ms | 130.25 req/s | 132.7 MiB |

New `npm run test:backend-operations-stress` ran 371 requests against a separate temporary production standalone server and database:

| Concurrency | Action / count | p50 | p95 | p99 | Throughput | Outcomes |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Workspace reads / 90 | 8.9 ms | 14.0 ms | 17.6 ms | 105.03 req/s | 90 successful |
| 5 | Draft saves / 90 | 26.7 ms | 46.5 ms | 52.7 ms | 168.49 req/s | 90 successful |
| 20 | Submissions / 90 | 63.6 ms | 422.7 ms | 519.5 ms | 169.29 req/s | 90 successful |
| 50 | Competing approvals / 90 | 173.4 ms | 401.7 ms | 425.2 ms | 205.18 req/s | 1 successful approval, 89 exact shared-room conflicts |

The profile also switched organizer/host simulations, completed both role-owned checklist tasks, and made one expected no-credentials discovery call to record a quota. Peak sampled server RSS was 144.1 MiB. After restarting the isolated server, the same session restored all 90 applications, the approved allocation, both checklist completions, and the quota. Before and after restart, SQLite integrity was `ok` and foreign-key checks returned zero rows. No errors outside explicitly expected missing-provider and shared-resource outcomes occurred.

The earlier missing-configuration profile and this operations profile each stayed below the 500-request limit; they were separate isolated runs. Neither contacted Railway.

### Checks and remaining gaps

The post-fix check set is: `npm run test:agent` (33 passed), `npm run test:operations` (32 passed, including the 10-database startup race), `npm run test:deployment-controls` (6 passed), `npm run test:provider-failures` (4 test groups covering 11 scenarios), `npm run test:backend-api-qa` (3 passed), deterministic Playwright workflow tests (passed; live tests skipped in deterministic mode), lint, typecheck, production build, catalog validation (six venues), and seed dry run (37 documents; no writes). Final production build and deterministic-browser counts are recorded in the matching build-log entry after the last rerun.

Remaining limits: provider failure tests are mocks; the five-call live test's corrected card-locality assertion was not rerun; no separate live “book Paytm now” prompt was sent; and production authentication/real host identity remain out of scope. Local stress used fictional organizer contacts and temporary SQLite only. Do not reset or load-test the Railway database.

## Follow-up browser verification — 4 October 2026

This is a new one-attempt localhost run after the earlier five-request run documented above. It used Node 24.21.0, Playwright Chromium, the configured server-side providers, and the Playwright config's isolated temporary SQLite database. The separate live locality diagnostic was not run. Exactly **one** organizer discovery request was sent; no retry followed the test failure.

Before that live call, `tests/e2e/locality-browser.spec.ts` passed with deterministic fixtures. The Gurugram Ofis record uses venue ID `venue-ofis-gurugram-sohna-road` and rendered locality “Sohna Road, Gurugram”; its shared source title explicitly names both Noida and Gurugram. The locality predicate accepts that record and rejects an actual Noida fixture (`venue-ofis-noida-sector-62`, “Sector 62, Noida”). The test inspects structured venue identity and `.venue-locality`, not whole-card text.

The updated live test registers `waitForResponse` before each discovery button click and awaits the parsed response before checking results or taking another action. On this run, the first live response succeeded: Context read `venues/bengaluru/shifu_den` and `venues/bengaluru/saiacs_ceo_centre`; the returned Shifu lead cited `source-shifu-den`, with 3 supported and 7 unknown requirements. The rendered card displayed that Shifu is described as pro bono/free for its founder community, while detailed eligibility and application criteria remain unknown and Backstage access is not established.

The live test then failed at an overly specific assertion that expected the founder-community qualification in `documentedFacts[].qualification`. The rendered recommendation showed that qualification in its claim evidence, but this run did not verify the expected JSON field placement. The assertion now checks the visible card text instead. **That corrected assertion was not rerun live.** Since the test stopped after the first response, follow-up, source opening, research draft persistence, unchanged brief, and positive Gurugram-only follow-up were not exercised in this run. The earlier five-request live result remains historical evidence for the preceding revision; it is not evidence that this latest complete browser journey passed.

The live artifact `live-agent-matrix-evidence.json` preserves the single successful response summary under ignored `.playwright-artifacts/live-verification-20261004/`; the Playwright failure context is also ignored. It contains no provider credentials or endpoint URL. The deterministic browser suite subsequently passed **7 tests**, with the 2 opt-in live tests skipped; lint, typecheck, and the production build passed. No provider call was made by the deterministic suite.

## Green workspace verification — 4 October 2026

The feature branch `feat/green-saas-redesign` preserves the backend corrections and does not deploy them again. The final redesigned production browser suite passed 18 tests (2 opt-in live tests skipped), including existing API QA. Agent 33, operations/startup/concurrency 32, deployment controls 6, and mocked provider-failure 4 tests passed. Backend/provenance/security/storage code is unchanged by this presentation task.

The one localhost live journey now completed successfully: five attempted sequential discovery calls, five successful source-verified responses, original Shifu source opened, authoritative research draft saved and restored, unknowns and founder qualification retained, and a positive Ofis Gurugram-only result with no Noida identity/locality/path and the original hackathon brief unchanged. KB `kbPFAVeDOOjD`; final supporting path `venues/delhi_ncr/ofis_square_gurugram`, source `source-ofis-events`, original URL `https://ofissquare.com/events-spaces/`. Bounded verification timestamp: `2026-10-04T12:34:02.105Z`. No automatic retry, separate live locality diagnostic, hosted quota reset, production mutation or Railway traffic was used. Earlier failed/partial live records above remain historical evidence; this result is a distinct new run. Sanitized local evidence is ignored at `.playwright-artifacts/green-live/`.
