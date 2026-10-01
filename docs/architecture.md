# Architecture

## System boundaries

```text
Next.js web app
  ├── event brief and host experiences
  ├── server-side agent workflow
  │     └── Sanity Context MCP → Sanity Knowledge Base
  └── operational API → booking and availability database
```

This diagram describes the intended architecture. The Sanity and operational integrations are not connected in milestone 1.

## Frontend

The Next.js App Router serves the landing, organizer, and host pages. Most content is rendered as server components. The event brief form is a client component because it needs browser storage and form state. It stores one versioned draft in `localStorage`; that draft stays on the current browser and is not sent to a server.

Shared TypeScript types in `src/types` define event briefs, venue knowledge, sources, hosting opportunities, match explanations, booking requests, resources, and checklist items before backend implementation begins.

## Sanity content and Knowledge Base

Sanity is the future source of venue knowledge: venue profiles, locations, rooms, equipment, policies, permitted activities, eligibility, host preferences, and relationships among them. Records need maintained source references so a recommendation can explain where its claims came from. A Knowledge Base must be configured from this structured content for Sanity Context retrieval.

## Agent retrieval

The planned server-side agent will query the Sanity Context MCP endpoint using the event brief and retrieve relevant venue knowledge. It must make real Context retrieval calls, then ground its explanations in returned records and sources. No local fixture search, keyword-only matching, or generic chatbot response should be presented as venue retrieval. Secrets and MCP access remain server-side. This integration is not implemented or connected yet.

## Operational booking backend

Sanity is for reading venue knowledge. The application backend owns live schedules, availability, request state, resource holds, approvals, and conflict-safe reservations. It should re-check availability transactionally when a booking action is submitted; agent retrieval alone cannot reserve a venue. Host approval and access model (paid, sponsored, or pro bono) are separate fields because either access model may require approval.

## Environment configuration

`.env.example` contains placeholders for a future Sanity Context endpoint and model provider credential. Milestone 1 does not require either credential and does not call those services.
