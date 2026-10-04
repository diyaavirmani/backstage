# Backstage backend evaluation, regression, and stress report

**Run date:** 4 October 2026
**Starting revision:** `47431a41eba2417a093d7489aaf77f5f38f9ccaf`
**Runtime:** Node 24.21.0, Next.js 16.3.8, Playwright Chromium, isolated temporary SQLite files
**Scope:** Evaluation only. No application or backend implementation was changed. Added tests and this report preserve the reproduced failures as diagnostics.

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
