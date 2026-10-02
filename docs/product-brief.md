# Product brief

## Problem

Organizers often rely on repeated outreach and personal connections to find a venue. A venue can look suitable at first, then fail on an operating rule, room layout, equipment constraint, schedule conflict, setup window, or eligibility condition. Hosts face the reverse problem: policies, schedules, and shared resources are scattered across documents and messages.

Backstage helps both sides coordinate around the complete event setup, with source-backed knowledge and clear next steps.

## Users

### Organizers

Community organizers, educators, independent creators, and teams planning gatherings in Delhi NCR or Bengaluru. They need to express the event, its audience, headcount, budget, timing, space and equipment needs, and which requirements are essential or flexible.

### Hosts

People responsible for venues who want to publish hosting opportunities, permitted activities, eligibility, room and equipment information, and availability, then respond to requests without duplicating coordination work.

## Core features

- An event brief for city, dates and timing, event type, audience, headcount, budget, rooms, equipment, setup and cleanup time, plus essential and flexible requirements.
- Matching the whole setup against permitted activities, eligibility, spaces, shared resources, and operational availability.
- Recommendations that explain fit, cite sources, show what is unknown, and offer only alternatives the host permits.
- Host opportunities with a preferred event profile. Paid, sponsored, and pro bono access are modeled separately from instant booking and host approval.
- A reusable organizer profile and a complete host application.
- Host responses for approval, rejection, requests for information, and alternative-slot proposals.
- Conflict-safe reservations and a shared preparation checklist.

## Later extensions

Recurring events, attendance conditions, cancellation recovery/rebooking, and production multi-party host onboarding are later extensions. The first operational request lifecycle is demonstrated with fictional inventory only.

## Milestone 2 content foundation

The project includes six researched profiles across Delhi NCR and Bengaluru, linked to dated sources. Each is a research lead, not a partner or booking offer. Publicly documented information, the past Paytm office event listing, and explicit unknowns are represented separately. Capacity is not entered without a room and layout pair. Prices, live availability, and Backstage booking authority remain unknown. The `/venues` catalogue is labelled as a local research preview; the organizer discovery route separately reads the live Sanity Knowledge Base.

Sanity schemas cover venues, host organizations, spaces, resources, policies, hosting opportunities, claims, and source references. Claims preserve their value, evidence type, citations, checked date, and optional historical date. The dataset import and Knowledge Base query are documented in [Sanity setup](sanity-setup.md). The organizer’s discovery route now reads the live Knowledge Base, while `/venues` intentionally remains a local JSON preview.

## Milestone 3 organizer discovery

At Milestone 3, the organizer could submit a saved EventBrief to a server-side discovery route. The route reads published Sanity venue/source records, discovers paths from the live Sanity Context Knowledge Base outline, and exposes bounded entry reads as model tools. Recommendations appear only after real entry reads pass venue identity, locality, and citation checks. The server creates original source links from published Sanity references and classifies requirements from structured claims. Follow-up questions reuse the saved brief and refine which leads are selected. The next milestone added an operational demonstration, documented below.

## Milestone 4 operational demonstration

Organizers can save an application draft for a real research lead, with source-backed claims and explicit unanswered questions; submitting it is blocked because Backstage has no verified booking authority at those venues. Two fictional hosts, one in each city, demonstrate request submission, host information requests/decisions, holds, explicit alternative acceptance, calendar allocation, and shared preparation tasks. The simulation is backed by workspace-scoped SQLite data. Its role selector does not authenticate a real organizer or host, and no demo message leaves the application. Real venue availability, prices, policies, or booking permissions are not inferred from the fictional records.

## Milestone 1 boundary

Milestone 1 provides a local-only event brief draft and an honest host empty state. It does not retrieve venue data or submit requests. Mentioned companies in research are potential leads, not partners; Backstage must never make up their prices, capacity, availability, sponsorship policy, or booking permissions. Any future demonstrations of operations must be labeled as demonstrations.
