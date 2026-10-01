# Backstage

Backstage is a venue coordination agent for Delhi NCR and Bengaluru. Its promise is simple: tell Backstage what you’re hosting, and it will find a place where that event can actually work.

The product is designed to help organizers explain their full event setup and help hosts coordinate policies, spaces, equipment, requests, and availability. Venue knowledge will be retrieved from a Sanity Knowledge Base through Sanity Context MCP. Booking actions and operational availability will live in an application backend.

## Milestone 1 status

The responsive product shell, organizer and host navigation, and event brief form are implemented. The brief validates required fields, checks that the end time follows the start time, and saves and restores the draft in browser local storage. The host page clearly shows that requests and availability are not connected yet.

Venue recommendations, Sanity Context retrieval, account profiles, host applications, booking requests, and live calendars are not connected in this milestone. No venue or booking claims are made by this demo.

## Run locally

Requires Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `.env.example` to `.env.local` only when beginning a later integration; credentials are not required to run milestone 1.

## Commands

```bash
npm run dev       # start the local development server
npm run lint      # run ESLint
npm run typecheck # run the TypeScript compiler without emitting files
npm run build     # create a production build
npm start         # serve a production build
```

## Next milestones

1. Model venue knowledge and source references in Sanity, connect a Sanity Context MCP endpoint, and make real retrieval calls from an agent workflow.
2. Match full event setups against source-backed venue policies and explain evidence, unknowns, and permitted alternatives.
3. Add organizer profiles, host applications, operational availability, conflict-safe reservations, host review, and shared preparation checklists.
4. Consider recurring events, attendance conditions, and cancellation recovery after the core flow is reliable.

See [the product brief](docs/product-brief.md), [architecture](docs/architecture.md), [build log](docs/build-log.md), and [session capture guide](docs/session-capture.md).
