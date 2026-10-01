# Sanity Studio, research import, and Context Knowledge Base

Milestone 2 prepares the project schema, a validated source catalogue, an idempotent importer, and a live MCP check. It does not imply that a Sanity project or Knowledge Base is connected. The local `/venues` page remains a clearly labelled research preview until a server read path is added.

## 1. Enable Sanity Context

Use an organization where you have administrator access. In the Sanity management interface, open the organization’s **Labs** settings and enable **Sanity Context** and **Knowledge Bases** (Knowledge Bases are currently a beta feature and may require organization opt-in). Review the current [Sanity Context overview](https://www.sanity.io/docs/ai/sanity-context) and [Knowledge Base guide](https://www.sanity.io/docs/ai/sanity-context-knowledge-bases) before enabling organization features.

## 2. Select a project and dataset

Use an existing Sanity project or create one in that organization, then select or create the dataset intended for reviewed venue knowledge. This seed imports published research documents into that dataset. It does not create a project or dataset through an undocumented API.

Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_SANITY_PROJECT_ID=your-real-project-id
NEXT_PUBLIC_SANITY_DATASET=your-real-dataset-name
SANITY_PROJECT_IMPORT_TOKEN=your-project-scoped-write-token
SANITY_CONTEXT_MCP_URL=https://the-context-mcp-endpoint-you-created
SANITY_ORGANIZATION_TOKEN=your-organization-context-viewer-token
```

Keep the two tokens server-side. The project import token should have only the write access needed for the selected dataset. The organization token must have Context Viewer access. Never use either token as a `NEXT_PUBLIC_` variable.

## 3. Review schema and import research records

```bash
npm install
npm run sanity:validate
npm run sanity:seed:dry-run
npm run sanity:seed
npm run sanity:schema:validate
npm run sanity:schema:deploy
npm run dev
```

Open `http://localhost:3000/studio`. Schema validation is local; schema deployment requires an authenticated Sanity CLI account with suitable dataset access. The seed uses stable IDs, validates every relationship and source before connecting, publishes normal (non-draft) records, and skips existing records and drafts to preserve host edits. Re-running is safe. Only source-backed research is seeded; demonstration inventory is excluded. The dry run validates and reports intended document counts without credentials or writes.

Review the venue records, nested evidence claims, references, and `research-lead` status in Studio before creating a Knowledge Base. Research claims are checked on the dates recorded in the documents; review them again before relying on them.

## 4. Create a Knowledge Base from the dataset

In Sanity’s Context application, create a Knowledge Base and add a **dataset** source for this project and dataset. Use this complete GROQ query as the source query (also saved in [`sanity/knowledge-base-query.groq`](../sanity/knowledge-base-query.groq)):

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

Build the Knowledge Base. Review entries, citations, and build issues. Correct source data or the query and rebuild if claims are missing, source URLs are absent, records are stale, or unsupported values appear. Do not treat a published event listing as current availability or Backstage booking permission.

## 5. Create a Knowledge Base-backed Context MCP

In the Sanity Context application, create a Context MCP endpoint and choose the Knowledge Base as its source. Do **not** attach a dataset directly to the MCP endpoint: Sanity documents that a dataset attached directly selects GROQ mode and takes precedence over Knowledge Base sources. The endpoint must expose Knowledge Base mode and its `initial_context` and `knowledge_base_read` tools. See [Configure an MCP endpoint](https://www.sanity.io/docs/ai/sanity-context-configure-mcp) and [Context MCP tools](https://www.sanity.io/docs/ai/sanity-context-mcp-tools).

Create an organization token with the **Context Viewer** role from organization API/token settings. Copy the endpoint URL shown for the endpoint into `SANITY_CONTEXT_MCP_URL`, and the organization token into `SANITY_ORGANIZATION_TOKEN` in `.env.local`. Keep both private.

Run the live check:

```bash
npm run sanity:context-check
```

It connects over HTTPS using the supported `@ai-sdk/mcp` client, lists endpoint tools, requires `initial_context` and `knowledge_base_read`, discovers the Knowledge Base ID and a venue entry path from the returned outline, reads the entry, and prints retrieved source URLs. It fails for absent credentials, auth errors, GROQ-only endpoints, empty content, or missing citations. The check is a live read and makes no writes.

## Official references

- [Sanity Context](https://www.sanity.io/docs/ai/sanity-context)
- [Sanity Context Knowledge Bases](https://www.sanity.io/docs/ai/sanity-context-knowledge-bases)
- [Create a Knowledge Base](https://www.sanity.io/docs/ai/sanity-context-create-knowledge-base)
- [Sanity Context source types](https://www.sanity.io/docs/ai/sanity-context-source-types)
- [Configure Context MCP](https://www.sanity.io/docs/ai/sanity-context-configure-mcp)
- [Context MCP tools](https://www.sanity.io/docs/ai/sanity-context-mcp-tools)
- [Embedding Sanity Studio in Next.js](https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs)
