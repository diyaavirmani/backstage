# Railway deployment preparation

## Status and product boundary

The Railway deployment is live at [`https://backstage-production-0849.up.railway.app`](https://backstage-production-0849.up.railway.app). It runs project `Backstage` (`1b07915a-2d25-4e72-9d67-cf2ef7aa0136`) in production environment `bb8ea621-7244-457c-a8b4-2355fb887bf1`, under personal workspace `Diya virmani's Projects` (`829fe1ba-5d8c-4eb9-9274-593588410bd8`). The account is on its existing HOBBY trial; no paid subscription or billing setting was changed. The service uses one replica in Railway region `asia-southeast1-eqsg3a` (Southeast Asia), with the existing `backstage-data` volume (ID `4fa56d2d-fb4a-4651-a2ad-0cc3cfe754a1`) sized at 500 MB and mounted at `/data`. SQLite is `/data/backstage.sqlite`; `/api/health` is the configured deployment healthcheck. The public domain routes to container port 8080, matching Railway's injected `PORT`. The exact deployed commit and live verification are recorded in `docs/build-log.md`. The previous 512 MB apply failure remains in the historical log. Real venues remain research leads: the app may save private drafts but cannot submit requests to them. The approval/calendar workflow uses fictional hosts and role switching remains a simulation.

The package uses the repository Dockerfile and Railway's current TypeScript Infrastructure as Code format at `.railway/railway.ts`. Railway has deprecated `railway.json` / `railway.toml` for new services in favor of IaC. The checked-in configuration is a named `backstage` partial so its plan is scoped to this app's service and volume; inspect the plan and linked Railway project before applying it. The repository's npm package `railway@3.12.0` is the IaC SDK, separate from the installed executable Railway CLI 5.63.1. On 3 October 2026, the CLI authenticated as the intended account; the Backstage project was created in its personal workspace and linked to this directory. The current plan and resulting resources are recorded below. No subscription or payment settings were changed.

## Build and package locally

The image uses Node 24 on Debian Bookworm, a supported Node release with the built-in `node:sqlite` API. It runs `npm ci` from `package-lock.json`, then `npm run build`, with no private credentials. Only the public Sanity project ID and dataset may be passed as Docker build arguments:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SANITY_PROJECT_ID=1428jmxu \
  --build-arg NEXT_PUBLIC_SANITY_DATASET=production \
  -t backstage:milestone-6b .
```

The runtime is Next standalone output. Sanity Studio is run locally with `npm run sanity:dev` on `http://localhost:3333/studio`; its schemas and config remain in the repository. The public Next.js runtime does not embed Studio. The only `next-sanity` import was the embedded Studio route, and the production standalone output included Studio route chunks. That route and package are removed; public catalog and evidence reads still use `@sanity/client`, and discovery still uses Context MCP. The Dockerfile explicitly copies `db/migrations`, the seven server-side script modules it uses, and `src/data/research-catalog.json`. `.dockerignore` excludes `.env*`, Git data, node_modules, SQLite files and sidecars, Playwright output, session exports, and build output. Do not pass a private token as a build argument, Docker `ARG`, `NEXT_PUBLIC_*`, or image layer.

The credential-free GitHub Actions workflow `.github/workflows/docker-smoke.yml` builds the actual image and runs `scripts/verify-docker-image.mjs` with an isolated named volume. It checks startup/readiness without DB creation, a returned static CSS asset, a fictional request, host approval, checklist completion, and persistence across a container stop/start. Run the same image check locally with `BACKSTAGE_DOCKER_IMAGE=backstage:milestone-6b npm run verify:docker-image` after building the image. The script cleans up only the uniquely named container and volume it created.

After Docker is installed, the isolated volume/restart check is:

```bash
mkdir -p /tmp/backstage-m6-volume
docker run --rm -d --name backstage-m6 \
  -p 3000:3000 \
  -e PORT=3000 \
  -e APP_ORIGIN=http://localhost:3000 \
  -e BACKSTAGE_DB_PATH=/data/backstage.sqlite \
  -v /tmp/backstage-m6-volume:/data \
  backstage:milestone-6
```

`npm run verify:standalone` separately assembles the traced output plus explicit runtime files in a temporary directory and validates the application and persistence behavior without Docker. It does not replace an actual image build. Local Docker availability and the GitHub Actions image result are recorded in `docs/build-log.md`.

## Railway resources and service settings

1. Sign in to the intended Railway account and inspect the Backstage project/environment, services, variables, domains, volumes, region, and billing plan. The current project IDs and trial restriction are recorded above. Reuse this project; do not create another.
2. The repository is linked to the Backstage production project. Use the current Railway CLI and check its command help before administrative actions.
3. Run `railway config plan --file .railway/railway.ts --json` and review every planned service, volume, region, variable, and deletion. The deployed graph is one Backstage service replica in `asia-southeast1-eqsg3a`, built from the root `Dockerfile`, healthchecked at `/api/health`, with one 500 MB `backstage-data` volume mounted at `/data`. For future reconciliation, check for resource duplication, secret deletion, or unintended volume migration. The `preserve()` declarations in `.railway/railway.ts` preserve values entered through Railway's private variable interface.
4. The plan has been applied within the existing trial; no paid subscription was activated. Railway volumes persist across restarts/deployments and are not mounted during image build or pre-deploy. SQLite migrations run lazily on the first runtime operation/discovery request after the volume mounts.
5. Public HTTPS is configured at `https://backstage-production-0849.up.railway.app`, with `APP_ORIGIN` set to that exact origin. Same-origin POST routes reject missing or mismatched `Origin` values. The generated domain targets port 8080, the running container port injected by Railway.
6. Private values were entered as Railway runtime variables, not build arguments. `RAILWAY_RUN_UID=0` is set because Railway volumes are mounted root-owned while the image defaults to the unprivileged `node` user.
7. The service has `BACKSTAGE_DB_PATH=/data/backstage.sqlite`, the mounted path `/data`, one replica, public HTTPS networking, and healthcheck `/api/health`. There is no pre-deploy migration command.
8. The pushed revision deployed successfully and passed the hosted checks recorded in the build log. After future code changes, verify the actual deployment SHA and repeat health, provider, and persistence checks before describing the deployment as current.

## Railway variables

Set these service variables. Project ID and dataset are public identifiers; the Dockerfile accepts them as the only build-time settings. All tokens and the OpenAI key are runtime-only.

| Variable | Value/source | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `1428jmxu` | No; Docker build setting |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` | No; Docker build setting |
| `SANITY_PROJECT_READ_TOKEN` | Project-scoped, read-only dataset token | Yes; runtime only |
| `SANITY_CONTEXT_MCP_URL` | Existing Knowledge Base-only Context MCP endpoint | Treat as private configuration; runtime only |
| `SANITY_ORGANIZATION_TOKEN` | Organization-scoped Context Viewer token | Yes; runtime only |
| `OPENAI_API_KEY` | OpenAI project API key | Yes; runtime only |
| `OPENAI_MODEL` | `gpt-4.1-mini` | No; runtime only |
| `BACKSTAGE_DB_PATH` | `/data/backstage.sqlite` | No; runtime only |
| `APP_ORIGIN` | Exact public HTTPS origin | No; runtime only |
| `DEMO_DISCOVERY_DAILY_PER_SESSION` | `5` default | No; runtime only |
| `DEMO_DISCOVERY_DAILY_GLOBAL` | `50` default | No; runtime only |
| `RAILWAY_RUN_UID` | `0` for mounted-volume write permissions | No; Railway runtime setting |

Keep `SANITY_PROJECT_IMPORT_TOKEN` off Railway. It is only for local content seed tooling; the hosted catalog and evidence reads use the separate read-only token. Do not put any private credential in a `NEXT_PUBLIC_` variable or Docker build argument.

The persisted daily discovery quota applies per hashed application session cookie and to one global counter in SQLite. Requests without a known session share the anonymous per-session bucket. A fresh cookie cannot reset the global cap. Limits are checked before any OpenAI or Sanity provider request; a rejected request returns HTTP 429 with `Retry-After` seconds until the next UTC day. This is a bounded hackathon demo control, not a substitute for identity, bot detection, billing alerts, or a distributed abuse-control service.

## Dependency audit status

Before separating Studio, the full audit reported 13 high findings and the production-only audit reported 11. They all traced to the same advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (CVE-2026-93687), for `braces` versions `<=3.0.3`; the advisory listed no patched version when checked on 3 October 2026. The affected transitive package paths include `chokidar`, `micromatch`, `fast-glob`, and `globby`, through Sanity tooling and Next ESLint tooling. The only reported remediation was a major-version downgrade; no forced downgrade, unsupported override, or suppression was applied.

After removing the public embedded Studio route and `next-sanity`, `npm audit --omit=dev` reports zero findings, and the full audit reports 12 high package findings from that same single `braces` advisory. `sanity`, `@sanity/cli`, and `eslint-config-next` remain development dependencies and retain the affected paths. This does not patch the vulnerable package: it removes the Studio/Sanity development graph from the deployed production dependency graph. The production standalone artifact must also be inspected and the Docker image smoke workflow must pass before claiming runtime package separation has been verified. Recheck the advisory and fixes before upgrading tooling.

The full audit's affected installed versions and representative dependency paths are:

| Affected package | Installed version | Path to the advisory package |
| --- | --- | --- |
| `braces` | 3.0.3 | Advisory root; affected range is `<=3.0.3` |
| `chokidar` | 3.6.0 | `@sanity/cli@8.13.0` → `@sanity/codegen@8.1.1` → `chokidar` → `braces` |
| `micromatch` | 4.0.8 | Next ESLint and Sanity `globby` → `fast-glob@3.3.1` → `micromatch` → `braces` |
| `fast-glob` | 3.3.1 | `@next/eslint-plugin-next@16.3.8` and `globby@11.1.0` → `fast-glob` → `micromatch` → `braces` |
| `globby` | 11.1.0 | `@sanity/cli@8.13.0` → `@sanity/codegen@8.1.1` → `globby` → `fast-glob` → `micromatch` → `braces` |
| `@sanity/codegen` | 8.1.1 | Sanity CLI dependency; brings `chokidar` and `globby` paths above |
| `@sanity/cli` | 8.13.0 | Direct development tool; includes codegen/runtime CLI paths above |
| `sanity` | 6.17.0 | Direct development tool; includes the Sanity CLI build path |
| `@sanity/cli-build` | 6.4.2 | `@sanity/cli@8.13.0` → `sanity@6.17.0` optional peer/runtime tool graph |
| `@sanity/runtime-cli` | 17.14.0 | `@sanity/cli@8.13.0` → runtime CLI → CLI build → Sanity tool graph |
| `@next/eslint-plugin-next` | 16.3.8 | `eslint-config-next@16.3.8` → plugin → `fast-glob` → `micromatch` → `braces` |
| `eslint-config-next` | 16.3.8 | Direct development lint config; includes the Next ESLint path above |

These are npm's multiple affected-package rows and paths for one advisory, not twelve distinct vulnerabilities. Production-only audit and standalone artifact checks are separate from the still-vulnerable development-tool graph.

## Health, storage, backups, and restarts

`GET /api/health` returns only `{ "status": "ready" }`. On Railway it checks that the injected mount path matches the parent of `BACKSTAGE_DB_PATH` and that the mounted directory is writable; it does not open or create SQLite, create a workspace, contact Sanity, or call OpenAI. On a failed/missing mount it returns a generic 503 readiness response. Railway healthchecks run at deployment activation, not as continuous monitoring.

There must be exactly one service replica while using this SQLite volume. Railway volumes cannot be shared across replicas. Restarts and redeployments preserve the SQLite file, but a deployment with a mounted volume has a brief handoff downtime. Back up SQLite using an online SQLite backup operation or stop the app first; account for WAL/SHM state rather than copying an active main database file alone. Test restore into a separate volume before relying on backups. Never use a network-mounted shared SQLite file.

## Current illustrated release — 4 October 2026

At the user's explicit request, the clean, pushed source revision `c8ff4f190c59e86ebd174bbbce50527f3afb8784` was uploaded from `feat/green-saas-redesign` to the existing service with the installed Railway CLI 5.63.1:

```bash
railway up --detach \
  --project 1b07915a-2d25-4e72-9d67-cf2ef7aa0136 \
  --service 8a29edfb-5a23-45b2-9144-29ad4b53645d \
  --environment bb8ea621-7244-457c-a8b4-2355fb887bf1 \
  --message "Deploy verified illustrated UI c8ff4f190c59e86ebd174bbbce50527f3afb8784"
```

Deployment `4a4411db-6436-4821-b49b-647c399d80d2` reached `SUCCESS`. This was a CLI source upload; Railway metadata records the deployment message and image digest rather than a GitHub `commitHash`. The source SHA identifies the clean checkout that was uploaded. Docker image smoke CI [37223983906](https://github.com/diyaavirmani/backstage/actions/runs/37223983906) passed for that exact source commit before deployment.

The existing service, HTTPS domain, one replica and volume `4fa56d2d-fb4a-4651-a2ad-0cc3cfe754a1` (500 MB at `/data`) were reused. No IaC apply, credentials transfer, quota reset, billing change or database manipulation was performed. Health, homepage, catalog, organizer, host and mural asset each returned HTTP 200. Catalog showed **Published Sanity content**. Cache-disabled Chromium at 1440px and 390px passed 16 direct-navigation/refresh document checks with no console/runtime/asset errors or horizontal overflow. The new illustrated landing was visibly verified and the public URL was opened in the user's default browser.

No hosted provider calls, new applications or mutation tests were performed during this cosmetic release; the pre-release regression suite and Docker restart tests provide separate evidence. The previous intermittent reload complaint still has no reproduced cause. Browser evidence remains private/ignored under `.playwright-artifacts/railway-illustrated/`.

## Post-deploy verification

On 4 October 2026, the original cream-and-teal presentation from `0c3b4c5fc8389ad85207bd5bc242eb128558c271` was restored in commit `f178eaf24ce3037790f5300ea1f62826e32b4dfe` and deployed successfully to the existing service. Docker CI passed its image and volume restart checks. The Railway volume, replica count, variables, quotas, and trial billing configuration were preserved.

The reported reload problem was checked before and after restoration. Chromium direct navigation and refresh on `/`, `/organizer`, `/venues`, and `/host` succeeded at 1440px and 390px; the post-deployment check disabled browser caching. Each run had 16 HTTP 200 document responses, loaded CSS/JavaScript, no browser console/runtime errors, and no horizontal overflow. The published Sanity catalog remained visible. Canceled background Next.js RSC/prefetch requests were observed, but page loads and catalog navigation completed; no routing/cache configuration change was justified. The earlier/intermittent cause remains unconfirmed.

The credential-free regression is included in `npm run test:e2e` as `tests/e2e/presentation-restoration.spec.ts`. It uses the suite's isolated temporary SQLite, checks page refresh and original design elements, and makes no discovery calls. Private screenshots and sanitized reload diagnostics are under the ignored `.playwright-artifacts/` directory. The actual deployment and CI identifiers are recorded in the build log.

After applying credentials and a public domain:

1. Check `/api/health`, `/`, `/venues`, `/organizer`, and `/host` over HTTPS. `/venues` must identify published Sanity content, not the fallback preview.
2. Run a real event discovery and follow-up. Verify returned source links and qualifications, then save a researched lead as a draft; confirm research submission remains disabled.
3. Submit and approve a fictional demo-host request, update organizer and host checklist items, restart/redeploy, and verify its workspace/application/allocation/checklist still persist.
4. Record the public URL, deployed commit SHA, and sanitized check results in `docs/build-log.md`. Do not call a build or healthcheck alone a completed deployment.

## Cost notes and current account gate

Railway pricing is usage-based and can change. The earlier 512 MB apply was rejected with `Max size of 500 MB on current plan`; that historical attempt did not change billing. The deployment was completed with a 500 MB volume inside the existing trial. On 4 October 2026, the authenticated account remained in its HOBBY trial with no paid subscription, and Railway reported current-period usage of `$0.00642` and estimated usage of `$0.00813`. No payment or subscription settings were changed. Continue to use the existing trial only; stop if a future operation asks to upgrade, purchase resources, or change billing. Check the current [Railway pricing page](https://docs.railway.com/pricing) and account billing page.
