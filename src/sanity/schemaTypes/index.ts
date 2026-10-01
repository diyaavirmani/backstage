import {defineField, defineType} from "sanity";

const sourceRefs = () => defineField({name: "sourceReferences", title: "Source references", type: "array", of: [{type: "reference", to: [{type: "sourceReference"}]}]});

const claimFields = [
  defineField({name: "subject", type: "string", validation: (r) => r.required()}),
  defineField({name: "claim", type: "text", rows: 3, validation: (r) => r.required()}),
  defineField({name: "value", type: "text", rows: 3, validation: (r) => r.required()}),
  defineField({name: "evidenceType", type: "string", options: {list: ["public-documentation", "host-confirmed", "historical-event", "unknown", "conflicting", "demonstration"]}, validation: (r) => r.required()}),
  sourceRefs(),
  defineField({name: "checkedAt", type: "date", validation: (r) => r.required()}),
  defineField({name: "historicalDate", type: "date"}),
  defineField({name: "appliesToSpace", type: "reference", to: [{type: "venueSpace"}]}),
  defineField({name: "layout", type: "string"}),
  defineField({name: "qualification", type: "text", rows: 3}),
];

export const schemaTypes = [
  defineType({name: "sourceReference", title: "Source reference", type: "document", fields: [
    defineField({name: "title", type: "string", validation: (r) => r.required()}),
    defineField({name: "url", type: "url", validation: (r) => r.required().uri({scheme: ["http", "https"]})}),
    defineField({name: "publisher", type: "string"}),
    defineField({name: "sourceType", type: "string", options: {list: ["official-page", "historical-event-listing", "host-confirmation", "other"]}, validation: (r) => r.required()}),
    defineField({name: "checkedAt", type: "date", validation: (r) => r.required()}),
    defineField({name: "reviewNote", type: "text", rows: 3}),
  ]}),
  defineType({name: "hostOrganization", title: "Host organization", type: "document", fields: [
    defineField({name: "name", type: "string", validation: (r) => r.required()}),
    defineField({name: "website", type: "url"}), sourceRefs(),
  ]}),
  defineType({name: "venue", title: "Venue", type: "document", fields: [
    defineField({name: "name", type: "string", validation: (r) => r.required()}),
    defineField({name: "city", type: "string", options: {list: ["Delhi NCR", "Bengaluru"]}, validation: (r) => r.required()}),
    defineField({name: "locality", type: "string"}),
    defineField({name: "summary", type: "text", rows: 4, validation: (r) => r.required()}),
    defineField({name: "hostOrganization", type: "reference", to: [{type: "hostOrganization"}]}),
    defineField({name: "relationshipStatus", type: "string", options: {list: ["research-lead", "host-confirmed", "demonstration"]}, validation: (r) => r.required()}),
    defineField({name: "isDemonstration", type: "boolean", initialValue: false}),
    defineField({name: "knowledgeBaseEligible", type: "boolean", initialValue: true}),
    sourceRefs(),
    defineField({name: "claims", type: "array", of: [{type: "claim"}]}),
    defineField({name: "spaces", type: "array", of: [{type: "reference", to: [{type: "venueSpace"}]}]}),
    defineField({name: "resources", type: "array", of: [{type: "reference", to: [{type: "venueResource"}]}]}),
    defineField({name: "policies", type: "array", of: [{type: "reference", to: [{type: "hostingPolicy"}]}]}),
    defineField({name: "opportunities", type: "array", of: [{type: "reference", to: [{type: "hostingOpportunity"}]}]}),
  ]}),
  defineType({name: "claim", title: "Evidence-backed claim", type: "object", fields: claimFields}),
  defineType({name: "venueSpace", title: "Venue space", type: "document", fields: [
    defineField({name: "name", type: "string", validation: (r) => r.required()}),
    defineField({name: "venue", type: "reference", to: [{type: "venue"}], validation: (r) => r.required()}),
    defineField({name: "spaceType", type: "string"}),
    defineField({name: "summary", type: "text", rows: 3, validation: (r) => r.required()}),
    defineField({name: "layout", type: "string"}),
    defineField({name: "capacity", type: "object", fields: [
      defineField({name: "guestCount", type: "number", validation: (r) => r.required().min(1)}),
      defineField({name: "layout", type: "string", validation: (r) => r.required()}),
      defineField({name: "sourceReferences", title: "Source references", type: "array", of: [{type: "reference", to: [{type: "sourceReference"}]}], validation: (r) => r.required().min(1)}),
      defineField({name: "checkedAt", type: "date", validation: (r) => r.required()}),
    ]}), sourceRefs(),
  ]}),
  defineType({name: "venueResource", title: "Equipment or shared resource", type: "document", fields: [
    defineField({name: "name", type: "string", validation: (r) => r.required()}),
    defineField({name: "venue", type: "reference", to: [{type: "venue"}], validation: (r) => r.required()}),
    defineField({name: "resourceType", type: "string"}),
    defineField({name: "summary", type: "text", rows: 3, validation: (r) => r.required()}),
    defineField({name: "availability", type: "string", options: {list: ["documented", "unknown", "conflicting"]}, initialValue: "unknown"}),
    sourceRefs(),
  ]}),
  defineType({name: "hostingPolicy", title: "Hosting policy", type: "document", fields: [
    defineField({name: "title", type: "string", validation: (r) => r.required()}),
    defineField({name: "venue", type: "reference", to: [{type: "venue"}], validation: (r) => r.required()}),
    defineField({name: "statement", type: "text", rows: 3, validation: (r) => r.required()}),
    defineField({name: "evidenceType", type: "string", options: {list: ["public-documentation", "host-confirmed", "unknown", "conflicting"]}, validation: (r) => r.required()}), sourceRefs(),
    defineField({name: "checkedAt", type: "date", validation: (r) => r.required()}),
  ]}),
  defineType({name: "hostingOpportunity", title: "Hosting opportunity", type: "document", fields: [
    defineField({name: "title", type: "string", validation: (r) => r.required()}),
    defineField({name: "venue", type: "reference", to: [{type: "venue"}], validation: (r) => r.required()}),
    defineField({name: "summary", type: "text", rows: 3, validation: (r) => r.required()}),
    defineField({name: "preferredEventTypes", type: "array", of: [{type: "string"}]}),
    defineField({name: "accessModel", type: "string", options: {list: ["paid", "sponsored", "pro-bono", "unknown"]}, validation: (r) => r.required()}),
    defineField({name: "fulfillmentModel", type: "string", options: {list: ["instant-booking", "host-approval", "unknown"]}, validation: (r) => r.required()}),
    defineField({name: "availability", type: "string", options: {list: ["documented", "unknown", "conflicting"]}, initialValue: "unknown"}),
    defineField({name: "relationshipStatus", type: "string", options: {list: ["research-lead", "host-confirmed", "demonstration"]}, validation: (r) => r.required()}), sourceRefs(),
  ]}),
];
