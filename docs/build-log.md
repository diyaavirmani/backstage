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
