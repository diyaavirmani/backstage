# Railway deployment preparation

## Status and product boundary

The Railway package is prepared for the Backstage repository and project `1428jmxu`. No Railway account, service, volume, domain, or public deployment has been verified or created in this milestone. Real venues remain research leads: the app may save private drafts but cannot submit requests to them. The approval/calendar workflow uses fictional hosts and role switching remains a simulation.

The package uses the repository Dockerfile and Railway's current TypeScript Infrastructure as Code format at `.railway/railway.ts`. Railway has deprecated `railway.json` / `railway.toml` for new services in favor of IaC. The checked-in configuration is a named `backstage` partial so its plan is scoped to this app's service and volume; inspect the plan and current Railway project before applying it. The Railway CLI/account was not available during Milestone 6. The bundled IaC command reported that it requires Railway CLI 5.42.1 or newer; no plan was applied.

## Build and package locally

The image uses Node 24 on Debian Bookworm, a supported Node release with the built-in `node:sqlite` API. It runs `npm ci` from `package-lock.json`, then `npm run build`, with no private credentials. Only the public Sanity project ID and dataset may be passed as Docker build arguments:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SANITY_PROJECT_ID=1428jmxu \
  --build-arg NEXT_PUBLIC_SANITY_DATASET=production \
  -t backstage:milestone-6 .
```

The runtime is Next standalone output. The Dockerfile also explicitly copies `db/migrations`, `scripts`, and `src/data/research-catalog.json`, because the server reads these from disk. `.dockerignore` excludes `.env*`, Git data, node_modules, SQLite files and sidecars, Playwright output, session exports, and build output. Do not pass a private token as a build argument, Docker `ARG`, `NEXT_PUBLIC_*`, or image layer.

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

Use the UI to submit a fictional demo request, approve it, and complete a checklist task; restart the container against the same `/tmp/backstage-m6-volume`, then verify the same application, allocation, and task remain. Remove only that temporary directory after review. This Docker check was not run because Docker and Podman were unavailable in the implementation environment. `npm run verify:standalone` assembled the traced output plus explicit runtime files in a temporary directory, started the production server with isolated mounted storage, saved and approved a fictional application, completed a host task, restarted the process, and verified that the workspace, reservation, and task completion persisted. It also verified the health route did not initialize SQLite. This validates the standalone files and application behavior, but does not replace an actual image build; see `docs/build-log.md`.

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

On 3 October 2026, `npm audit` reported 13 high-severity findings in the dependency graph; `npm audit --omit=dev` reported 11. The affected chain includes `braces`, `chokidar`, `micromatch`, `fast-glob`, and `globby`, reached through Sanity/Studio packages (`next-sanity`, `sanity`, and CLI/codegen tooling). The reported automated remedies downgrade Sanity CLI, Sanity, and Next-Sanity across major versions. The registry's latest `braces` version is still 3.0.3, which the advisory marks affected, so no compatible patched leaf version was available to pin. No forced or unrelated downgrade was applied. Recheck advisories and compatibility before production use; the findings include the embedded Studio/runtime graph as well as development tooling.

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
