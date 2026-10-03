# Railway deployment preparation

## Status and product boundary

The Railway package is prepared for the Backstage repository and Sanity project `1428jmxu`. The account is authenticated, but no Railway project, service, volume, domain, or public deployment is available or created. Real venues remain research leads: the app may save private drafts but cannot submit requests to them. The approval/calendar workflow uses fictional hosts and role switching remains a simulation.

The package uses the repository Dockerfile and Railway's current TypeScript Infrastructure as Code format at `.railway/railway.ts`. Railway has deprecated `railway.json` / `railway.toml` for new services in favor of IaC. The checked-in configuration is a named `backstage` partial so its plan is scoped to this app's service and volume; inspect the plan and current Railway project before applying it. The repository's npm package `railway@3.12.0` is the IaC SDK, separate from the installed executable Railway CLI 5.63.1. On 3 October 2026, the CLI authenticated as the existing GitHub/repository owner, but `railway list --json` returned no projects, `railway status` reported no linked project, and the read-only `railway config plan --file .railway/railway.ts --json` could not proceed without a linked project. No resources were planned or changed. The account's usage query showed $0 current/estimated usage for the newly opened billing period, but did not expose the billing plan. No plan, payment settings, or billable resources were changed.

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

1. Sign in to the intended Railway account, open the existing Backstage project/environment if present, and inspect its services, variables, domains, volumes, region, and billing plan. Reuse a matching Backstage service. Do not apply an IaC plan that proposes unrelated deletes or unreviewed billable resources.
2. Install the project's locked dependencies and use a current Railway CLI. Link the existing project and environment. If it already has config-as-code, follow Railway's supported migration/import process before using IaC.
3. Run `railway config plan` from the repository root. Review every planned service, volume, region, variable, and deletion. The intended service is one replica, built with the root `Dockerfile`, in `asia-southeast1`; it has `/api/health` as its healthcheck and an attached 512 MiB volume mounted at `/data`.
4. Create or attach the volume only after reviewing its plan and budget. Volume storage persists across restarts/deployments; Railway does not mount it during image build or pre-deploy. The SQLite schema migrations therefore run lazily on the first runtime operations/discovery request, after the volume has mounted.
5. Configure public HTTPS networking and generate/reuse the service domain. Set `APP_ORIGIN` to the exact canonical origin (for example, `https://<generated-domain>` with no path or trailing slash). Same-origin POST routes reject missing or mismatched `Origin` values.
6. Add private values through Railway's Variables UI. Never put them in this file or command-line output. Set `RAILWAY_RUN_UID=0` because Railway volumes are mounted root-owned while the image defaults to the unprivileged `node` user.
7. Confirm `BACKSTAGE_DB_PATH=/data/backstage.sqlite`, `RAILWAY_VOLUME_MOUNT_PATH=/data` (Railway supplies the latter when the volume is attached), one replica, public networking, and healthcheck `/api/health`. Do not add a pre-deploy migration command.
8. Apply only the reviewed plan, deploy the intended pushed commit, wait for the healthcheck, and then perform the live checks listed below.

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

## Post-deploy verification

After applying credentials and a public domain:

1. Check `/api/health`, `/`, `/venues`, `/organizer`, and `/host` over HTTPS. `/venues` must identify published Sanity content, not the fallback preview.
2. Run a real event discovery and follow-up. Verify returned source links and qualifications, then save a researched lead as a draft; confirm research submission remains disabled.
3. Submit and approve a fictional demo-host request, update organizer and host checklist items, restart/redeploy, and verify its workspace/application/allocation/checklist still persist.
4. Record the public URL, deployed commit SHA, and sanitized check results in `docs/build-log.md`. Do not call a build or healthcheck alone a completed deployment.

## Cost notes

Railway pricing is usage-based and can change. On 3 October 2026, Railway listed Free at $0/month with $1 of resource credit, Hobby at $5/month, Pro at $20/month, RAM at $10/GB-month, CPU at $20/vCPU-month, egress at $0.05/GB, and volume storage at $0.15/GB-month. A 512 MiB volume is roughly $0.075/month at that rate, before compute and any plan subscription. Compute is billed by minute, and actual service cost depends on CPU/RAM use, egress, and runtime. Check the current [Railway pricing page](https://docs.railway.com/pricing) and the account's billing page before creating resources. No plan, payment method, or billable Railway resource was changed in this milestone.
