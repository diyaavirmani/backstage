# Architecture

## System boundaries

```text
Next.js web app
  ├── event brief and host experiences
  ├── server-side agent workflow
  │     └── Sanity Context MCP → Sanity Knowledge Base
  └── operational API → booking and availability database
```

The Studio schema, local source-backed research catalogue, idempotent import command, and Context retrieval check now exist. A Sanity project and Knowledge Base are still account configuration; the app’s catalogue page currently reads the labelled local research preview.

## Frontend

The Next.js App Router serves the landing, organizer, host, venue catalogue, and embedded Studio routes. The organizer event brief remains a client component and retains its browser-local draft behavior. The `/venues` page filters the local reviewed research catalogue and identifies its data origin. It is not a live Sanity query.

Shared TypeScript types in `src/types` define event briefs, venue knowledge, sources, hosting opportunities, match explanations, booking requests, resources, and checklist items before backend implementation begins.

## Sanity content and Knowledge Base

Sanity schemas model venues and host organizations, venue spaces, equipment/shared resources, hosting policies, hosting opportunities, claims, and source references. Claims include values, evidence type, citations, and checked dates; capacity records require a named space and layout. The seed data separates public documentation and historical events, explicitly marks unknowns, and sets the sample venues as research leads. Stable IDs and `createIfNotExists` imports preserve existing host-edited documents. The Knowledge Base query is documented in `docs/sanity-setup.md` and excludes demonstrations and all operational/user data.

## Agent retrieval

The server-side `sanity:context-check` command uses the supported MCP client and organization Context Viewer token. It lists tools, requires `initial_context` and `knowledge_base_read`, discovers the Knowledge Base ID and entry paths from the live outline, then reads a real entry and source citations. The command exists but has not passed until real credentials and a Knowledge Base-backed endpoint are configured. The website does not yet query Context or present local preview data as live retrieval. MCP access and tokens remain server-side.

## Operational booking backend

Sanity is for reading venue knowledge. The application backend owns live schedules, availability, request state, resource holds, approvals, and conflict-safe reservations. It should re-check availability transactionally when a booking action is submitted; agent retrieval alone cannot reserve a venue. Host approval and access model (paid, sponsored, or pro bono) are separate fields because either access model may require approval.

## Environment configuration

`.env.example` contains placeholder public project/dataset identifiers plus server-only import and Context credentials. The app and local preview build without credentials. `.env.local` is ignored. Project writes use `SANITY_PROJECT_IMPORT_TOKEN`; Context reads use the separate `SANITY_ORGANIZATION_TOKEN`.
