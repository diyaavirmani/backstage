# Sanity Studio, research import, and Context Knowledge Base

The `/venues` page still reads local research JSON and remains labelled as a local preview. Sanity project content and live Context MCP retrieval are being connected separately; do not describe the website catalog as live until a server read path is added.

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

The ignored repository-root `.env.local` already has the actual non-secret project ID and dataset. Keep these values and fill in the three remaining settings after creating tokens and the Context MCP endpoint:

```dotenv
NEXT_PUBLIC_SANITY_PROJECT_ID=1428jmxu
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_PROJECT_IMPORT_TOKEN=your-project-scoped-write-token
SANITY_CONTEXT_MCP_URL=https://the-context-mcp-endpoint-you-created
SANITY_ORGANIZATION_TOKEN=your-organization-context-viewer-token
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

The endpoint should expose `initial_context` and `knowledge_base_read`. See [Configure an MCP endpoint](https://www.sanity.io/docs/ai/sanity-context-configure-mcp) and [Context MCP tools](https://www.sanity.io/docs/ai/sanity-context-mcp-tools).

Create an organization token with the **Context Viewer** role from organization API/token settings. Copy the endpoint URL shown for the endpoint into `SANITY_CONTEXT_MCP_URL`, and the organization token into `SANITY_ORGANIZATION_TOKEN` in `.env.local`. Keep both private.

Run the live check:

```bash
npm run sanity:context-check
```

It connects over HTTPS using the supported `@ai-sdk/mcp` client, lists endpoint tools, requires `initial_context` and `knowledge_base_read`, parses every Knowledge Base ID and entry path from the documented outline rows (including extensionless paths and `[core]`/`[peripheral]` tags), and reads paths verbatim with their associated Knowledge Base IDs. It reads each path separately and associates a citation with a venue only when its URL matches that venue’s source references; claim-level sources are printed with their claim descriptions. It requires source-cited venue information for both cities. It fails for absent credentials, auth/tool errors, GROQ-only endpoints, empty content, or missing citations. The check is a live read and makes no writes. Focused parser tests run with `npm run test:context-outline`.

## Official references

- [Sanity Context](https://www.sanity.io/docs/ai/sanity-context)
- [Sanity Context CLI commands](https://www.sanity.io/docs/cli-reference/cli-context)
- [Sanity Context Knowledge Bases](https://www.sanity.io/docs/ai/sanity-context-knowledge-bases)
- [Create a Knowledge Base](https://www.sanity.io/docs/ai/sanity-context-create-knowledge-base)
- [Sanity Context source types](https://www.sanity.io/docs/ai/sanity-context-source-types)
- [Configure Context MCP](https://www.sanity.io/docs/ai/sanity-context-configure-mcp)
- [Context MCP tools](https://www.sanity.io/docs/ai/sanity-context-mcp-tools)
- [Embedding Sanity Studio in Next.js](https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs)
