# Architecture

## System boundaries

```text
Next.js web app
  ├── event brief and host experiences
  ├── server-side agent workflow
  │     └── Sanity Context MCP → Sanity Knowledge Base
  └── operational API → booking and availability database
```

The Studio schema, local source-backed research catalogue, idempotent import command, and Context retrieval check are in place. The organizer discovery route uses the configured Knowledge Base-only MCP endpoint at request time; the `/venues` catalogue page still reads the clearly labelled local research preview.

## Frontend

The Next.js App Router serves the landing, organizer, host, venue catalogue, and embedded Studio routes. The organizer event brief remains a client component and retains its browser-local draft behavior. The `/venues` page filters the local reviewed research catalogue and identifies its data origin. It is not a live Sanity query.

Shared TypeScript types in `src/types` define event briefs, venue knowledge, sources, hosting opportunities, match explanations, booking requests, resources, and checklist items before backend implementation begins.

## Sanity content and Knowledge Base

Sanity schemas model venues and host organizations, venue spaces, equipment/shared resources, hosting policies, hosting opportunities, claims, and source references. Claims include values, evidence type, citations, and checked dates; capacity records require a named space and layout. The seed data separates public documentation and historical events, explicitly marks unknowns, and sets the sample venues as research leads. Stable IDs and `createIfNotExists` imports preserve existing host-edited documents. The Knowledge Base query is documented in `docs/sanity-setup.md` and excludes demonstrations and all operational/user data.

## Agent retrieval

`POST /api/venue-discovery` lazily initializes the OpenAI provider and validates the stored event brief plus bounded user/assistant conversation history. It fetches the current published, research-only venue records from Sanity with a server-side project token. A request-scoped MCP client requires `initial_context` and `knowledge_base_read`, discovers paths from the current outline, and gives the model a tool that can read only those discovered paths. The call has input, read-count, deadline, and cancellation bounds and always closes the MCP client.

The model selects potential leads and paths from the current outline. It cannot return citation URLs or requirement classifications. The server derives requirement coverage from published claim records and validates exact venue/locality identity, entry path, source IDs, and original URLs before publishing a card. Unsupported requirements stay unknown; conflicts require claims explicitly marked conflicting. Capacity can be supported only with a known guest count tied to a named room and layout, with enough capacity. Citation links are constructed from verified Sanity records, never from model output. Historical event evidence, Shifu’s access qualification, and distinct Ofis locations are preserved. Neither MCP retrieval nor this agent checks availability, confirms exact prices, or authorizes Backstage booking.

Provider setup is isolated in `src/lib/ai-provider.ts`. It reads server-only `OPENAI_API_KEY` and optional `OPENAI_MODEL` only when discovery is requested; the latter defaults to `gpt-4.1-mini`, so production builds do not require an OpenAI secret. Client-supplied system/tool/citation fields are rejected. Organizer conversation history is bounded and treated as untrusted reference material. The response is rendered only after validation succeeds. The live OpenAI scenarios remain unverified until a key is configured; the Sanity endpoint and tokens are already configured privately. The website’s `/venues` page remains a local preview and does not imply a live Sanity catalog connection.

## Operational booking backend

Sanity is for reading venue knowledge. The application backend owns live schedules, availability, request state, resource holds, approvals, and conflict-safe reservations. It should re-check availability transactionally when a booking action is submitted; agent retrieval alone cannot reserve a venue. Host approval and access model (paid, sponsored, or pro bono) are separate fields because either access model may require approval.

## Environment configuration

`.env.example` contains placeholder project/dataset identifiers and server-only import, Context, and OpenAI values. The public site, local preview, and production build work without credentials, while agent requests return an actionable configuration error if required secrets are absent. `.env.local` is ignored. Project data reads use `SANITY_PROJECT_IMPORT_TOKEN`; Context reads use the separate organization `SANITY_ORGANIZATION_TOKEN`; model calls use `OPENAI_API_KEY`. None are exposed to browser code.
