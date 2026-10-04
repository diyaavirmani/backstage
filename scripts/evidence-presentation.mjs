import {parseAudience} from "./brief-controls.mjs";

const normalize = (value) => String(value ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const ignoredTerms = new Set(["with", "from", "that", "this", "event", "events", "other", "space", "spaces", "room", "rooms", "need", "needs", "community", "audience", "mixed", "reliable", "access", "permission"]);

// Official hosting information first, then historical hosting, documented facilities, and audience terms.
const factTier = (fact) => fact.evidenceType === "historical-event" ? 1
  : ({"hosting-conditions": 0, equipment: 2, eligibility: 3, "access-model": 3, location: 4})[fact.subject] ?? 5;

function briefTerms(brief) {
  if (!brief) return [];
  const audience = parseAudience(brief.audience || "");
  const text = [brief.eventType, brief.title, audience.choice === "Other" ? audience.details : audience.choice, ...(brief.equipmentRequirements || []), ...(brief.essentialRequirements || []), ...(brief.roomRequirements || [])].join(" ");
  return [...new Set(normalize(text).split(" ").filter((word) => word.length > 3 && !ignoredTerms.has(word)).map((word) => word.replace(/s$/, "")))];
}

export function factIsRelevant(fact, brief) {
  const text = normalize(`${fact.claim} ${fact.value} ${fact.qualification || ""}`);
  return briefTerms(brief).some((term) => text.includes(term));
}

/** Stable ordering of documented facts for “Why consider this venue”. Nothing is removed, so qualifications stay visible. */
export function orderVenueFacts(facts, brief) {
  return (facts || []).map((fact, index) => ({fact, index, tier: factTier(fact), relevant: factIsRelevant(fact, brief) ? 0 : 1}))
    .sort((a, b) => a.tier - b.tier || a.relevant - b.relevant || a.index - b.index)
    .map(({fact}) => fact);
}

/**
 * Orders leads by evidence relevant to this brief: documented mismatches last, then supported essentials,
 * other supported requirements, current official hosting evidence and brief-relevant facts. A published
 * contact route only breaks ties. Source counts, photos and percentages are deliberately not used.
 */
export function orderVenueLeads(leads, brief) {
  const essential = new Set([...(brief.essentialRequirements || []), ...(brief.equipmentRequirements || []), ...(brief.roomRequirements || [])]);
  const rank = (lead) => {
    const coverage = lead.requirementCoverage || [];
    const facts = lead.documentedFacts || [];
    const contacts = lead.contacts || [];
    return [
      -coverage.filter((item) => item.status === "contradicted" && essential.has(item.requirement)).length,
      coverage.filter((item) => item.status === "supported" && essential.has(item.requirement)).length,
      coverage.filter((item) => item.status === "supported" && !essential.has(item.requirement)).length,
      facts.some((fact) => fact.evidenceType === "public-documentation" && fact.subject === "hosting-conditions") ? 1 : 0,
      facts.some((fact) => factIsRelevant(fact, brief)) ? 1 : 0,
      contacts.some((contact) => contact.scope === "venue-specific") ? 2 : contacts.length ? 1 : 0,
    ];
  };
  return leads.map((lead, index) => ({lead, index, rank: rank(lead)}))
    .sort((a, b) => a.rank.reduce((result, value, position) => result || b.rank[position] - value, 0) || a.index - b.index)
    .map(({lead}) => lead);
}

const sourceTopics = {
  "hosting-conditions": ["Official hosting information", "Hosting information"],
  equipment: ["Venue facilities", "Venue facilities"],
  eligibility: ["Official audience and access terms", "Audience and access terms"],
  "access-model": ["Official audience and access terms", "Audience and access terms"],
  location: ["Official location details", "Location details"],
};

/** Readable link label; “Official” is used only when the source itself is an official page. */
export function sourceLabel(subject, source, evidenceType) {
  if (evidenceType === "historical-event" || source?.sourceType === "historical-event-listing") return "Previous event listing";
  const labels = sourceTopics[subject];
  return labels ? labels[source?.sourceType === "official-page" ? 0 : 1] : "Original source";
}

/** Direct links to the precise cited pages, labelled by the strongest fact each one supports. */
export function labelledSources(facts, fallbackSources = [], brief) {
  const links = new Map();
  for (const fact of orderVenueFacts(facts, brief)) {
    for (const source of fact.sourceReferences || []) {
      const key = source.id || source.url;
      if (key && source.url && !links.has(key)) links.set(key, {...source, label: sourceLabel(fact.subject, source, fact.evidenceType)});
    }
  }
  for (const source of fallbackSources) {
    const key = source.id || source.url;
    if (key && source.url && !links.has(key)) links.set(key, {...source, label: sourceLabel(null, source)});
  }
  return [...links.values()];
}

const briefSummaryRequirement = /^(?:Event type:|Event date |Budget of |Setup buffer:|Clear-up buffer:|Capacity for )/;

/** Unresolved items for a recommendation, most important first. */
export function confirmationQuestions(venue) {
  return [...new Set([
    ...(venue.requirementCoverage || []).filter((item) => item.status === "contradicted").map((item) => `${item.requirement} — sources show a mismatch or conflict`),
    ...(venue.documentedConflicts || []).map((item) => `${item.claim} — sources conflict`),
    ...(venue.importantUnknowns || []).map((item) => item.claim.replace(/\.$/, "")),
    ...(venue.requirementCoverage || []).filter((item) => item.status === "unknown" && !briefSummaryRequirement.test(item.requirement)).map((item) => item.requirement.replace(/^Audience: /, "Whether the venue is open to this audience: ")),
  ])];
}

export function audienceLabel(value) {
  const audience = parseAudience(value || "");
  const name = audience.choice === "Other" ? audience.details : audience.choice;
  return audience.community ? `${name} (${audience.community})` : name;
}

/** Editable enquiry text. Backstage never sends it; the organizer copies it into a route of their choosing. */
export function composeEnquiry({venueName, brief, questions = []}) {
  const list = (items, empty) => (items?.length ? items.join("; ") : empty);
  const asks = [...new Set([
    `Availability on ${brief.date}, ${brief.startTime}–${brief.endTime} IST, plus ${brief.setupMinutes} minutes of setup and ${brief.cleanupMinutes} minutes of clear-up`,
    `Which room and layout would suit ${brief.headcount} attendees, and its documented capacity`,
    ...questions,
    "Price or sponsorship terms, and the right way to make a booking request",
  ])];
  return [
    `Hello ${venueName} team,`,
    "",
    `I’m researching venues for “${brief.title}”, a ${brief.eventType.toLowerCase()} for ${brief.headcount} attendees (audience: ${audienceLabel(brief.audience)}), on ${brief.date} from ${brief.startTime} to ${brief.endTime} IST. Venue budget: ${brief.currency || "INR"} ${Number(brief.budgetAmount).toLocaleString("en-IN")}.`,
    "",
    `Spaces: ${list(brief.roomRequirements, "we would welcome your suggestion of a suitable room and layout")}.`,
    `Equipment: ${list(brief.equipmentRequirements, "none specified")}.`,
    `Essential: ${list(brief.essentialRequirements, "none specified")}.`,
    `Nice to have (optional): ${list(brief.flexibleRequirements, "none")}.`,
    "",
    "Could you please confirm:",
    ...asks.map((item) => `- ${item}`),
    "",
    "This is an initial enquiry, not a booking request or confirmation.",
    "",
    "Thank you,",
  ].join("\n");
}
