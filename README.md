# Backstage

Backstage is a venue coordination agent for Delhi NCR and Bengaluru. Its promise is simple: tell Backstage what you’re hosting, and it will find a place where that event can actually work.

The product is designed to help organizers explain their full event setup and help hosts coordinate policies, spaces, equipment, requests, and availability. Venue knowledge will be retrieved from a Sanity Knowledge Base through Sanity Context MCP. Booking actions and operational availability will live in an application backend.

## Implemented status

The responsive product shell, organizer and host navigation, and event brief form are implemented. The brief validates required fields, checks that the end time follows the start time, and saves and restores the draft in browser local storage. The host page clearly shows that requests and availability are not connected yet. A source-linked six-profile venue research preview, Sanity schemas and Studio route, validated seed/import tools, and live Sanity Context MCP retrieval check are also included.

The venue page is a local research preview and does not claim a live Sanity connection. A real Knowledge Base-only Context MCP endpoint is configured. After a source-scoped provenance instruction and rebuild, the live check verified source identities and canonical URLs for all six venue leads in both cities. The check cross-validates Knowledge Base text against published Sanity venue/source records; run it with the credentials in `.env.local`. Conversational recommendations, account profiles, host applications, booking requests, and live calendars are not implemented. Catalog entries are research leads, not partners or bookable inventory.

Sanity project `1428jmxu` in organization `o8mue7lt8` has a private `production` dataset with 37 published research documents and Knowledge Base `kbPFAVeDOOjD`. The schema is deployed, and `backstage-venues` exposes `initial_context`, `knowledge_base_read`, and `knowledge_base_search`. Live source-grounded retrieval passed for all six venues on 2 October 2026. `/venues` remains a local JSON preview.

## Run locally

Requires Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sanity credentials are not required for the app or local research preview. For Studio and live imports/retrieval, follow [docs/sanity-setup.md](docs/sanity-setup.md) and keep real credentials in the ignored `.env.local` file.

## Commands

```bash
npm run dev       # start the local development server
npm run lint      # run ESLint
npm run typecheck # run the TypeScript compiler without emitting files
npm run build     # create a production build
npm start         # serve a production build
npm run sanity:validate       # validate source records and unknowns
npm run sanity:seed:dry-run   # validate intended import without credentials/writes
npm run sanity:seed           # publish records, skipping existing docs/drafts
npm run sanity:verify-seed    # verify published records and reference integrity
npm run sanity:schema:validate # validate Sanity Studio schema locally
npm run sanity:schema:deploy   # deploy schema with an authenticated Sanity CLI
npm run sanity:context-check  # verify real Knowledge Base MCP retrieval
npm run test:context-outline  # test Context outline and citation parsing
```

## Next milestones

1. Correct Knowledge Base citation attribution, rerun the live check, and serve reviewed catalogue data from Sanity.
2. Build a grounded organizer agent that matches full room, equipment, timing, access, eligibility, and policy constraints with citations and unknowns.
3. Add host onboarding, organizer profiles, operational availability, conflict-safe reservations, host review, and shared preparation checklists.
4. Consider recurring events, attendance conditions, and cancellation recovery after the core flow is reliable.

See [the product brief](docs/product-brief.md), [architecture](docs/architecture.md), [Sanity setup](docs/sanity-setup.md), [build log](docs/build-log.md), and [session capture guide](docs/session-capture.md).
