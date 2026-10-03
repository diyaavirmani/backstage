# Sanity Studio, research import, and Context Knowledge Base

The `/venues` page now queries published, eligible `research-lead` venue records on the server and resolves their source references, claims, spaces, resources, and policies. The query uses the project ID/dataset and a server-only project token with the `published` perspective; it excludes demonstration venues. If the service is not configured or is unavailable, the page labels the checked-in JSON as a local preview and states that it is not live Sanity content. Organizer discovery separately reads current published records and calls the Knowledge Base-only Context MCP endpoint.

## Operational demo data boundary

Milestone 4 stores fictional demo venues, room/equipment inventory, policies, availability, requests, holds, reservations, and checklists only in the private server-side SQLite workspace. These records are not seeded into Sanity, are not part of `sanity/knowledge-base-query.groq`, and must never be used as real venue claims. The six researched profiles remain research leads and their application action only creates a private draft; Backstage has no verified authority to submit requests to those hosts.

## 1. Enable Sanity Context

The authenticated CLI account had no organizations or projects, so this new Backstage organization and project were created in that account on 2 October 2026. Current non-secret resource identifiers:

- Organization: `Backstage` (`o8mue7lt8`)
- Project: `Backstage` (`1428jmxu`)
- Dataset: private `production`

If browser authentication is needed, run `npx sanity login` and sign into the intended personal Sanity account. Inspect current resources before creating anything:

```bash
npx sanity login
npx sanity organizations list
npx sanity projects list
```

If resources need to be created in a fresh personal account, the documented commands are `npx sanity organizations create --name "Backstage"`, followed by `npx sanity projects create "Backstage" --organization <ORGANIZATION_ID> --dataset production --dataset-visibility private`. Do not create duplicates when the matching resources above are already present. In Sanity Manage, open organization **Backstage → Labs** and enable **Sanity Context** and **Knowledge Bases** where required. This Labs action requires an organization admin. Review the current [Sanity Context overview](https://www.sanity.io/docs/ai/sanity-context) and [Knowledge Base guide](https://www.sanity.io/docs/ai/sanity-context-knowledge-bases).

## 2. Select a project and dataset

Reuse the Backstage project and dataset above. If they are absent in a different account, create them with the documented CLI, selecting a private dataset for reviewed venue content:

```bash
npx sanity projects create backstage --organization <ORGANIZATION_ID> --dataset production --dataset-visibility private
```

The CLI prompts for confirmation/required account setup as applicable. Verify the resulting project and dataset with `npx sanity projects list` and the Sanity dashboard before setting the values below. This uses the documented Sanity CLI; it does not create resources through an undocumented API.

The ignored repository-root `.env.local` contains the actual project ID, dataset, import token, Context MCP URL, and organization Context Viewer token. Never print its contents or stage it. The non-secret identifiers are:

```dotenv
NEXT_PUBLIC_SANITY_PROJECT_ID=1428jmxu
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_PROJECT_IMPORT_TOKEN=<configured locally>
SANITY_CONTEXT_MCP_URL=<configured locally>
SANITY_ORGANIZATION_TOKEN=<configured locally>
```

Keep the two tokens server-side. The project import token should have only the write access needed for the selected dataset. The organization token must have Context Viewer access. Never use either token as a `NEXT_PUBLIC_` variable.

### Token creation and local storage

- **Project import token:** in Sanity Manage, open the Backstage project, then **API → Tokens → Add API token**. Choose a project-scoped role that can read the target dataset’s documents and create documents; do not use this token as an organization token. Save the returned value directly in the ignored repository-root `.env.local` as `SANITY_PROJECT_IMPORT_TOKEN`.
- **Context token:** in Sanity Manage, open the intended organization, then **API → Tokens → Add API token**. Choose **Context Viewer** (Sanity documents Viewer as the least privilege that works for Context). Save the returned value directly in `.env.local` as `SANITY_ORGANIZATION_TOKEN`.
- The organization administrator must also enable Context and Knowledge Bases from that organization’s **Labs** page. Creating tokens and enabling Labs are dashboard actions; keep each token out of chat, terminal output, public variables, and Git.

If a required button is unavailable, ask an organization administrator or project owner for the corresponding membership/permission. The project importer needs project content write permission; Context setup needs organization Context Viewer access. The Sanity CLI’s account authentication is separate from both `.env.local` tokens.

Node scripts and `sanity.cli.ts` explicitly load the ignored `.env.local` file before reading configuration. Existing shell-provided environment variables take precedence. The Studio configuration also receives public `NEXT_PUBLIC_` settings through Next.js environment loading. Values of tokens must never be printed or added to browser code.

## 3. Review schema and import research records

```bash
npm install
npm run sanity:validate
npm run sanity:seed:dry-run
npm run sanity:schema:validate
npm run sanity:schema:deploy
npm run sanity:seed
npm run sanity:verify-seed
npm run dev
```

Open `http://localhost:3000/studio`. Schema validation is local; schema deployment requires an authenticated Sanity CLI account with suitable dataset access. The seed uses stable IDs, validates every relationship and source before connecting, publishes normal (non-draft) records, and skips existing records and drafts to preserve host edits. It writes cyclic venue/space relationships in an atomic Sanity transaction. Re-running is safe. Only source-backed research is seeded; demonstration inventory is excluded. The dry run validates and reports intended document counts without credentials or writes. `sanity:verify-seed` reads back the expected published IDs, checks reference resolution, unknown fields, and demonstration exclusion.

Review the venue records, nested evidence claims, references, and `research-lead` status in Studio before creating a Knowledge Base. Research claims are checked on the dates recorded in the documents; review them again before relying on them.

## 4. Create a Knowledge Base from the dataset

The installed Sanity CLI supports Knowledge Base list/create/import/build commands. First list the Knowledge Bases in the selected organization. Reuse an existing Backstage venue Knowledge Base if present; otherwise create one with the documented CLI:

Current resource: `Backstage Venue Knowledge` (`kbPFAVeDOOjD`) in organization `o8mue7lt8`. Its `Backstage / production` dataset import is complete and its latest build is ready. Inspect its imports before making changes; do not create a duplicate Knowledge Base or import.

```bash
npx sanity context list --organization <ORGANIZATION_ID> --json
npx sanity context create --organization <ORGANIZATION_ID> --title "Backstage venue knowledge" --description "Source-backed potential hosts in Delhi NCR and Bengaluru, with hosting terms and explicit unknowns."
```

Before adding a source, inspect existing imports so the same dataset is not imported twice:

```bash
npx sanity context imports list <KNOWLEDGE_BASE_ID> --json
```

If there is no existing source import for this project and dataset, create one using the complete GROQ query and project/dataset IDs:

```bash
npx sanity context imports create <KNOWLEDGE_BASE_ID> \
  --sanity-project <PROJECT_ID> \
  --sanity-dataset <DATASET_NAME> \
  --query "$(cat sanity/knowledge-base-query.groq)"
```

The installed `sanity context imports create --help` documents `--query`, `--sanity-project`, and `--sanity-dataset`. `sanity/knowledge-base-query.groq` is the complete query source; the copy below is checked to match it (also linked at [`sanity/knowledge-base-query.groq`](../sanity/knowledge-base-query.groq)):

```groq
*[_type == "venue" && knowledgeBaseEligible == true && isDemonstration == false && relationshipStatus != "demonstration"]{
  _id,
  _type,
  name,
  city,
  locality,
  summary,
  relationshipStatus,
  "hostOrganization": hostOrganization->{name, website},
  "sources": sourceReferences[]->{title, url, publisher, sourceType, checkedAt, reviewNote},
  claims[]{
    subject,
    claim,
    value,
    evidenceType,
    checkedAt,
    historicalDate,
    layout,
    qualification,
    "sources": sourceReferences[]->{title, url, publisher, sourceType, checkedAt}
  },
  "spaces": spaces[]->{
    _id,
    name,
    spaceType,
    summary,
    layout,
    "sources": sourceReferences[]->{title, url, publisher, sourceType, checkedAt},
    capacity
  },
  "resources": resources[]->{
    _id,
    name,
    resourceType,
    summary,
    availability,
    "sources": sourceReferences[]->{title, url, publisher, sourceType, checkedAt}
  },
  "policies": policies[]->{
    _id,
    title,
    statement,
    evidenceType,
    checkedAt,
    "sources": sourceReferences[]->{title, url, publisher, sourceType, checkedAt}
  },
  "opportunities": opportunities[]->{
    _id,
    title,
    summary,
    preferredEventTypes,
    accessModel,
    fulfillmentModel,
    availability,
    relationshipStatus,
    "sources": sourceReferences[]->{title, url, publisher, sourceType, checkedAt}
  }
}
```

This query begins with a complete `*[]` GROQ dataset query, includes dereferenced original sources and related venue knowledge, and only selects eligible, non-demonstration venue documents. It does not query organizer profiles, event briefs, applications, availability calendars, or operational bookings. The query follows [Sanity’s documented source types](https://www.sanity.io/docs/ai/sanity-context-source-types) and [Knowledge Base creation guide](https://www.sanity.io/docs/ai/sanity-context-create-knowledge-base).

Use this purpose statement:

> Help event organizers assess potential hosts in Delhi NCR and Bengaluru using source-backed venue facilities, hosting conditions, eligibility, and explicit unknowns. Do not infer current availability, prices, or booking authority.

Start the build and wait for its terminal result. Then inspect the Knowledge Base and imports, and review entries, citations, and issues:

```bash
npx sanity context build <KNOWLEDGE_BASE_ID> --watch
npx sanity context get <KNOWLEDGE_BASE_ID> --json
npx sanity context imports list <KNOWLEDGE_BASE_ID> --json
```

The installed CLI documents `--watch` as waiting and exiting non-zero for build failures. Correct source data or the query and rebuild if claims are missing, source URLs are absent, records are stale, or unsupported values appear. Do not treat a published event listing as current availability or Backstage booking permission.

## 5. Create a Knowledge Base-backed Context MCP

For this project, in the Sanity Dashboard open the **Context app → Create MCP** and configure:

1. Endpoint name: `backstage-venues`.
2. Source mode/type: **Knowledge Bases**.
3. Source selection: **Backstage Venue Knowledge** (`kbPFAVeDOOjD`) only.
4. Do not attach a project or dataset source. A directly attached dataset selects GROQ mode and takes precedence over Knowledge Base sources.
5. Save the endpoint. Copy the endpoint URL shown by the Dashboard directly into `.env.local` as `SANITY_CONTEXT_MCP_URL`.

The endpoint is configured and currently exposes `initial_context`, `knowledge_base_read`, and `knowledge_base_search`. See [Configure an MCP endpoint](https://www.sanity.io/docs/ai/sanity-context-configure-mcp) and [Context MCP tools](https://www.sanity.io/docs/ai/sanity-context-mcp-tools).

Create an organization token with the **Context Viewer** role from organization API/token settings. Copy the endpoint URL shown for the endpoint into `SANITY_CONTEXT_MCP_URL`, and the organization token into `SANITY_ORGANIZATION_TOKEN` in `.env.local`. Keep both private.

Run the live check:

```bash
npm run sanity:context-check
```

It verifies the six published venue/source records through Sanity using the project import token, connects to Context using the organization Context Viewer token, reads every outline path, and checks every venue section against the published source identities and canonical URLs. Numbered footnotes are resolved only through the same entry’s Sources list; an inline URL elsewhere cannot repair a mismatched footnote. It checks all six venue identities, preserves location distinctions for the two Ofis profiles sharing one page, and fails on missing venues, unknown statuses, sources, or mismatched citations. It makes no writes. Focused outline and citation tests run with `npm run test:context-outline`.

### Current live retrieval status (2 October 2026)

The organization-scoped provenance instruction was saved on **Backstage Venue Knowledge** (`kbPFAVeDOOjD`). `npx sanity context build kbPFAVeDOOjD --watch` completed successfully with job `ctx-build-65e4c6c0-2470-4b40-ba3c-b90a958f5ed6-1790948631445`. The job reported `succeeded`, Knowledge Base state `ready`, 12 build entries, zero issues, and all six source records cited. The actual live `initial_context` outline exposed nine paths, all of which were read. The endpoint lists `initial_context`, `knowledge_base_read`, and `knowledge_base_search`.

The live check at `2026-10-02T14:03:13Z` fetched the six published venue records and their dereferenced source identities from project `1428jmxu` / dataset `production`, then matched the MCP content by exact venue identity, entry scope, source record, canonical source URL, and locality. It verified:

- Masters’ Union Campus — `venues/delhi_ncr/masters_union`; both published references (company hosting page and campus tour page) were present.
- Ofis Square — Sohna Road, Gurugram — `venues/delhi_ncr/ofis_square_gurugram`; the shared Ofis events page was present in the Gurugram section.
- Ofis Square — Sector 62, Noida — `venues/delhi_ncr/ofis_square_noida`; the same shared page was present in the separate Noida section.
- Paytm Office, Noida — `venues/delhi_ncr/paytm_office_noida`; the GDG Thinkfluence listing was present and remains historical evidence only.
- SAIACS CEO Centre — `venues/bengaluru/saiacs_ceo_centre`; the SAIACS source page was present.
- Shifu Den — `venues/bengaluru/shifu_den`; the Shifu Den source page was present.

Forensic comparison of the earlier MCP responses found no separate citation annotation, `_meta`, or structured source payload: the MCP tool returned text content and `isError` only. The earlier swapped numbers were present in the generated text itself. The old checker then compounded the problem by stopping after it found any one cited venue per city and by matching URLs across a combined entry. The source-scoped instruction and rebuild produced separately scoped venue material; the corrected checker reads all nine paths and resolves citations within each entry. No dataset query change was needed.

All six entries retain unknown pricing, current availability, and Backstage booking authority. SAIACS approximate capacities remain qualified as unverified without room/layout pairings. Shifu’s publicly stated pro-bono access remains limited to its described founder community and does not establish Backstage eligibility. Published source `checkedAt` dates remain distinct from the time a page or record is fetched. `/venues` now reads the published Sanity catalog when available; its checked-in fallback is clearly labeled.

## 6. Configure organizer discovery

Add the model key to the ignored repository-root `.env.local` file:

```dotenv
OPENAI_API_KEY=<your server-side OpenAI API key>
OPENAI_MODEL=gpt-4.1-mini
```

Create or use an OpenAI API key in your OpenAI project settings, then paste it directly into `.env.local`; do not put it in chat, terminal commands, public environment variables, or Git. `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`. Restart `npm run dev` after changing the file. The production build does not need this key; it is checked only when a discovery request arrives.

The organizer submits its locally saved EventBrief and a small bounded conversation. The server fetches published non-demonstration venue records and source references, connects with the organization Context Viewer token, calls `initial_context`, and lets the model select paths from that live outline through a read tool. It requires successful `knowledge_base_read` calls before creating recommendations. The model returns only venue IDs, localities, and paths it read. The server derives requirement classifications from published structured claims and validates exact venue/locality identity, citation/source associations, and critical capacity claims. Output is withheld when a selected Knowledge Base section cannot be verified. Returned links come from published source records; a valid link alone does not prove a claim.

The organizer UI can display sourced venue notes and requirement statuses and accept follow-up questions. Each recommendation hands its venue identity, exact EventBrief, qualifications, and requirement-derived questions to the existing application builder. When a research draft is saved, the application API resolves that venue and its claims/sources again from published Sanity records using the project token; browser-supplied citations and authority are not used. The draft records the trusted evidence capture time separately from the original source-check dates and cannot be submitted. It does not check operational availability, confirm an unknown price or policy, or make a reservation. Paytm remains historical evidence; Shifu’s pro-bono statement retains its founder-community condition; the two Ofis Square locations remain distinct.

The agent uses the Vercel AI SDK Core `generateText` structured-output/tool loop, the OpenAI provider package, and `@ai-sdk/mcp` request-scoped client. See the current [AI SDK tool calling guide](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling), [structured output guide](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), and [MCP client reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/create-mcp-client). The Next.js 16.3 App Router endpoint follows the installed [Route Handler documentation](https://nextjs.org/docs/app/getting-started/route-handlers); secrets remain inside server-side code as described in the installed [Server and Client Components guide](https://nextjs.org/docs/app/getting-started/server-and-client-components).

Use `npm run test:agent` for input-boundary and provenance regression tests. These tests do not substitute for an actual model run. The live scenarios (80-person Delhi NCR hackathon, Bengaluru founder gathering/sponsored access, immediate Paytm booking request, and Noida/Gurugram follow-up) must be run only after `OPENAI_API_KEY` is configured. Record actual tool-call/read/citation outcomes in `docs/build-log.md`; never describe a credential-free check as a live agent success.

## Official references

- [Sanity Context](https://www.sanity.io/docs/ai/sanity-context)
- [Sanity Context CLI commands](https://www.sanity.io/docs/cli-reference/cli-context)
- [Sanity Context Knowledge Bases](https://www.sanity.io/docs/ai/sanity-context-knowledge-bases)
- [Create a Knowledge Base](https://www.sanity.io/docs/ai/sanity-context-create-knowledge-base)
- [Sanity Context source types](https://www.sanity.io/docs/ai/sanity-context-source-types)
- [Configure Context MCP](https://www.sanity.io/docs/ai/sanity-context-configure-mcp)
- [Context MCP tools](https://www.sanity.io/docs/ai/sanity-context-mcp-tools)
- [Embedding Sanity Studio in Next.js](https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs)
