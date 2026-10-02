# Backstage

Backstage is a venue coordination agent for Delhi NCR and Bengaluru. Its promise is simple: tell Backstage what you’re hosting, and it will find a place where that event can actually work.

The product is designed to help organizers explain their full event setup and help hosts coordinate policies, spaces, equipment, requests, and availability. Venue knowledge will be retrieved from a Sanity Knowledge Base through Sanity Context MCP. Booking actions and operational availability will live in an application backend.

## Implemented status

The responsive product shell, organizer and host navigation, and event brief form are implemented. The brief validates required fields, checks that the end time follows the start time, and saves and restores the draft in browser local storage. The host page clearly shows that requests and availability are not connected yet. A source-linked six-profile venue research preview, Sanity schemas and Studio route, validated seed/import tools, and live Sanity Context MCP retrieval check are also included.

The venue page is a local research preview and does not claim a live Sanity connection. Sanity Context retrieval is implemented as a command but remains unverified until a Knowledge Base, MCP endpoint, and organization token are configured. Conversational recommendations, account profiles, host applications, booking requests, and live calendars are not implemented. Catalog entries are research leads, not partners or bookable inventory.

Sanity project `1428jmxu` is configured locally with a private `production` dataset in organization `o8mue7lt8`. The schema is deployed. Dataset import, Knowledge Base build, and live MCP retrieval remain pending the organization Labs enablement and server-only tokens/endpoint setup; `/venues` remains a local JSON preview.

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
npm run sanity:schema:validate # validate Sanity Studio schema locally
npm run sanity:schema:deploy   # deploy schema with an authenticated Sanity CLI
npm run sanity:context-check  # verify real Knowledge Base MCP retrieval
npm run test:context-outline  # test Context outline parsing
```

## Next milestones

1. Connect/configure the Sanity Knowledge Base and Context MCP, run the live retrieval check, and serve reviewed catalogue data from Sanity.
2. Build a grounded organizer agent that matches full room, equipment, timing, access, eligibility, and policy constraints with citations and unknowns.
3. Add host onboarding, organizer profiles, operational availability, conflict-safe reservations, host review, and shared preparation checklists.
4. Consider recurring events, attendance conditions, and cancellation recovery after the core flow is reliable.

See [the product brief](docs/product-brief.md), [architecture](docs/architecture.md), [Sanity setup](docs/sanity-setup.md), [build log](docs/build-log.md), and [session capture guide](docs/session-capture.md).
