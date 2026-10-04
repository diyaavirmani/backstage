---
title: "Backstage: source-backed venue discovery with Sanity"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

# Backstage: venue discovery grounded in structured Sanity knowledge

## What I Built

I built Backstage for organizers in Delhi NCR and Bengaluru who are tired of stitching together venue details through repeated outreach and personal connections. An organizer describes an event once: its audience, date, headcount, rooms, equipment, timing, budget, and which requirements are essential. Backstage then finds potential hosts whose documented conditions may fit, explains what the evidence supports, and calls out what still needs confirmation.

The organizer can ask follow-up questions while keeping the same event brief, open source links, and prepare a private application draft from a recommendation. Saving the draft snapshots the published venue evidence and unanswered questions. The six researched venues are leads, not partners; Backstage has no verified authority to contact or book them, so their drafts cannot be submitted.

I also built an operational demonstration for hosts: incoming requests, review and approval, finite room and equipment allocation, a monthly calendar, and a shared preparation checklist. Those workflows use two explicitly fictional hosts and fictional inventory. Role switching is a workflow simulation, not production authentication.

Structured content matters because a venue name alone cannot tell an organizer whether they have found the right place. Backstage checks venue identity and locality, ties claims to sources, keeps qualifications attached to claims, and tests eligibility against the organizer’s audience. Capacity is meaningful only when it names a room and layout. Missing availability, price, access terms, or booking authority stays unknown. This structure also keeps the two Ofis Square locations distinct even though they share a source page, and preserves Paytm as historical event evidence rather than present-day availability.

## Demo

**Live app:** [https://backstage-production-0849.up.railway.app](https://backstage-production-0849.up.railway.app)

**Recording:** <!-- PLACEHOLDER: add the public walkthrough recording URL or embed after recording. -->

The live organizer flow uses the deployed app and real Sanity Context retrieval. Fictional host operations are clearly labeled in the app.

## Code

**Repository:** [github.com/diyaavirmani/backstage](https://github.com/diyaavirmani/backstage)

The project uses Next.js App Router and TypeScript. Published venue knowledge lives in Sanity. The organizer agent reads Sanity Context Knowledge Base entries and validates their claims and citations against published Sanity records. Operational applications and allocations are handled separately by the application’s SQLite backend.

## How I Used Sanity

I modeled venues, host organizations, spaces, shared resources, policies, hosting opportunities, claims, and source references in Sanity. A claim carries its value, evidence type, source, and date checked; room capacity also identifies its room and layout. The catalog query reads published research records and their related claims and sources. It excludes drafts, demonstration inventory, private organizer information, and operational bookings.

Backstage uses two distinct Sanity read paths:

- The server-rendered `/venues` catalog queries eligible published dataset records with the project-scoped read-only Sanity client. It resolves source references and structured venue details for filtering and display.
- The organizer agent connects to the Knowledge Base-only Sanity Context MCP endpoint. It calls `initial_context`, discovers current entry paths, and calls `knowledge_base_read` on selected entries before it can publish recommendations. The configured endpoint also exposes `knowledge_base_search`; the current recommendation flow uses outline discovery and actual entry reads. OpenAI selects relevant paths, while the server verifies venue IDs, locality, claim support, source identity, citation scope, and original URLs against published records.

I encountered a real citation-attribution failure in generated Knowledge Base content. In the raw MCP entry text, numbered source references were assigned to the wrong venue sections; for example, the Shifu Den footnote pointed to SAIACS. The MCP response carried text but no structured citation metadata, and independent reads of the published Sanity records showed that the source relationships themselves were correct. That established the problem as generated entry content, not response formatting or our parser. I added a source-scoped provenance instruction and rebuilt the Knowledge Base. Then I strengthened validation to require all six venues, match source IDs and canonical URLs within the correct venue and claim scope, resolve footnotes only within their entry section, and preserve separate Ofis locations. Regression cases cover swapped citations, missing venues, valid original URLs inside footnotes, and shared source URLs across distinct locations. A live checker subsequently verified all six venue profiles against the rebuilt entries and the published source records.

SQLite owns demo applications, resource allocations, holds, reservations, checklist items, and transition history. Approval and allocation run transactionally there; Sanity remains the read-only knowledge layer. Demo inventory is never added to the real Knowledge Base.

## Sanity Project Details

- **Project:** `1428jmxu`
- **Organization:** `o8mue7lt8`
- **Dataset:** private `production`
- **Knowledge Base:** `kbPFAVeDOOjD` — Backstage Venue Knowledge
- **Context MCP:** `backstage-venues`, configured with the Knowledge Base as its only source
- **Tools available:** `initial_context`, `knowledge_base_read`, `knowledge_base_search`

The project contains 37 published research documents. A verified outline path for Shifu Den is `venues/bengaluru/shifu_den`; its source identity is `source-shifu-den`, linked to [the original source](https://den.shifuventures.com/). The Knowledge Base also contains the distinct Delhi NCR venue entries and preserves historical evidence, eligibility qualifications, and explicit unknowns.

Backstage is deployed on Railway with a single 500 MB persistent SQLite volume. Hosted discovery uses separate server-side Sanity read and Context credentials plus an OpenAI key; the content-import token is not present in the runtime. Real venue availability, prices, partnerships, and booking permissions are not inferred from the public evidence.

## Agent Session

<!-- PLACEHOLDER: upload and review the redacted native Codex recording in DEV Agent Sessions, make the session public, then insert its public embed here. -->
