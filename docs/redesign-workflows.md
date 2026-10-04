# Green workspace integration map

This redesign is on `feat/green-saas-redesign`. Its illustrated UI source revision `c8ff4f1` was deployed directly to the existing Railway service on 4 October 2026 after explicit user authorization. No external PR was merged. The public app now supports the navigation below.

| Control or journey | Data and persistence | Supported action and recovery |
| --- | --- | --- |
| Event details → requirements → review | One client form; unchanged `EventBrief` format | Step validation focuses the first invalid field. Back and URL views preserve mounted values. |
| Load example | Future Asia/Kolkata dates and existing fictional buffer rules | Explicitly fills the form only; does not save or create operational state. |
| Save event brief | `backstage.event-brief.v1` in this browser | Manual save; older recoverable fields restored with raw export available; corrupt data is retained until explicitly replaced. |
| Find suitable venues / refine | `POST /api/venue-discovery`, exact brief snapshot and bounded existing conversation | Explicit request, duplicate lock, abort deadline, validated server results only. Failures preserve the brief. A different brief clears previous leads; edits alone retain their identified snapshot. |
| Create private draft | Existing one-time session handoff and workspace event | Carries selected stable venue identity, discovery brief, evidence qualifications and unanswered coverage questions into the builder. |
| Catalog filters / evidence | Existing published Sanity loader; explicit local-preview fallback | City/search/selected venue in URL. Native modal details preserve filters, source-check dates, original URLs and claim scope. |
| Save private application | `POST /api/operations`: `save-application` | Server re-resolves published venue evidence; required review and idempotency unchanged. Research submission remains rejected server-side. |
| Simulation role / workspace refresh | Cookie-scoped `GET /api/operations`; `switch-role` | Role simulation visibly labeled. Refresh reads canonical state after an uncertain response, without repeating a mutation. |
| Fictional request review | `request-information`, `respond-information`, `reject`, `hold`, `approve`, `propose-alternative`, `accept-alternative`, `cancel-application` | Existing transitions, selected-resource validation and atomic allocation. UI announces success after confirmed server state; no optimistic booking effects. |
| Resource calendar | Existing availability, blocks, holds, pending requests and reservations | Month/resource URL filters, entry details, `withdraw-availability`, focused `add-internal-block` form. UTC storage and IST display unchanged. |
| Preparation | Shared persisted checklist and history | `toggle-checklist`; assigned role/status controls enforced by server. Requests and Preparation show the same tasks. |

The three organizer views are **Event brief**, **Venue research**, and **Private drafts**. Host views are **Requests**, **Resource calendar**, and **Preparation**. Existing routes and legacy application/research anchors remain supported. Native history integration follows the installed Next.js guidance; views retain form state and work on refresh/back/forward. Dialogs use native modal focus containment, Escape, and trigger focus restoration. No provider or operational calls run from the static homepage preview.

The API contracts, Sanity retrieval/provenance rules, SQLite schema, migrations, operational transitions, quota limits, role scoping and origin/body protections are unchanged. Presentation and client coordination are separate from server-only provider/storage code.
