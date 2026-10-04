const normalize = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\bwi fi\b/g, "wifi")
  .trim();

const sourceList = (venue) => {
  const byId = new Map((venue.sources || []).filter(Boolean).map((source) => [source._id, source]));
  for (const claim of venue.claims || []) for (const source of claim.sources || []) if (source) byId.set(source._id, source);
  return [...byId.values()];
};

function requirementKind(requirement) {
  const text = normalize(requirement);
  if (/^event type\b/.test(text)) return "hosting-conditions";
  if (/\b(capacity|people|guests|attendees|headcount|crowd|seats?)\b/.test(text)) return "capacity";
  if (/\b(setup|cleanup|clear up|move in|load in)\b/.test(text)) return "hosting-conditions";
  if (/\b(availability|available|date|slot|calendar|timing|time|hours|schedule)\b/.test(text)) return "availability";
  if (/\b(pro bono|free access|free venue|complimentary|paid access|sponsored access|sponsorship)\b/.test(text)) return "access-model";
  if (/\b(price|pricing|budget|cost|paid)\b/.test(text)) return "price";
  if (/\b(book|booking|reserve|reservation|backstage)\b/.test(text)) return "booking-authority";
  if (/\b(eligible|eligibility|community|founder|audience)\b/.test(text)) return "eligibility";
  if (/\b(projectors?|microphones?|mics?|screens?|displays?|audio|av|sound|speakers?|equipment|chairs?|wifi|whiteboards?|power outlets?)\b/.test(text)) return "equipment";
  if (/\b(room|space|breakout|terrace|classroom|auditorium|meeting|food|catering|alcohol|activity|permitted|access hours|parking|lawns?|accessible|accessibility|wheelchair)\b/.test(text)) return "hosting-conditions";
  return null;
}

function claimIsRelevant(claim, requirement, kind) {
  if (!kind) return false;
  // Facilities are often listed inside a general hosting claim, so equipment may be documented there too.
  if (claim.subject !== kind && !(kind === "equipment" && claim.subject === "hosting-conditions")) return false;
  const claimText = normalize(`${claim.claim || ""} ${claim.value || ""} ${claim.qualification || ""}`);
  const requestedWords = normalize(requirement).split(" ").filter((word) => word.length > 3);
  if (["capacity", "availability", "price", "booking-authority", "eligibility", "access-model"].includes(kind)) return true;
  return requestedWords.some((word) => claimText.includes(word));
}

function claimStatesUnknown(claim) {
  return claim.evidenceType === "unknown" || claim.evidenceType === "conflicting" || /\bunknown\b|not (?:stated|specified|established|published|documented|confirmed|authorized)|do(?:es)? not (?:establish|authorize)|must be checked|sources? conflict/i.test(`${claim.claim || ""} ${claim.value || ""} ${claim.qualification || ""}`);
}

function claimText(claim) {
  return normalize(`${claim.claim || ""} ${claim.value || ""} ${claim.qualification || ""}`);
}

const caveat = /\bunknown\b|not (?:stated|specified|established|published|documented|confirmed|authorized)|do(?:es)? not (?:establish|authorize|confirm)|must be checked|sources? conflict/;
const genericWords = new Set(["event", "events", "type", "need", "needs", "have", "with", "space", "spaces", "room", "rooms", "available", "venue"]);
const clauses = (claim) => [claim.claim, claim.value, claim.qualification].flatMap((text) => String(text || "").split(/[;.]|\s—\s|\bbut\b/)).map(normalize).filter(Boolean);
// Whole words only (with simple plurals), so "main" never matches "remain".
const hasTerm = (clause, term) => clause.split(" ").some((word) => word === term || word === `${term}s` || word === `${term}es` || term === `${word}s` || term === `${word}es`);
const requirementTerms = (requirement) => normalize(requirement.replace(/^(?:Event type|Audience):\s*/i, "")).split(" ").filter((word) => word.length > 3 && !genericWords.has(word) && !/^\d+$/.test(word));

/**
 * Caveats are scoped to their own clause: "AV systems and display screens are described; exact inventory is unknown"
 * documents display screens but not inventory. An event type matches any of its words; other requirements need all
 * of their key terms in one uncaveated clause. Subject-level kinds may not repeat the requirement's own words.
 */
function claimDocuments(claim, requirement, kind) {
  if (["unknown", "conflicting", "demonstration"].includes(claim.evidenceType)) return false;
  const terms = requirementTerms(requirement);
  const anyTerm = /^event type\b/i.test(requirement);
  const naming = clauses(claim).filter((clause) => terms.length && (anyTerm ? terms.some((term) => hasTerm(clause, term)) : terms.every((term) => hasTerm(clause, term))));
  if (naming.length) return naming.some((clause) => !caveat.test(clause));
  // High-stakes subjects stay strict: any caveat anywhere keeps them unknown.
  return ["capacity", "availability", "price", "booking-authority"].includes(kind) && !clauses(claim).some((clause) => caveat.test(clause));
}

function explicitlyProhibits(claim, requirement) {
  if (requirement !== undefined) {
    const terms = requirementTerms(requirement);
    const naming = clauses(claim).filter((clause) => terms.some((term) => hasTerm(clause, term)));
    return naming.some((clause) => !caveat.test(clause) && explicitlyProhibits({claim: clause}));
  }
  const text = claimText(claim);
  if (claimStatesUnknown(claim)) return false;
  return /\b(?:not permitted|prohibited|forbidden|disallowed|not allowed|not permit(?:ted)?|does not permit|does not allow|do not allow|cannot be used|may not|not open to|not eligible for|not available to|not permitted for|not for)\b/.test(text)
    || /\bno (?:outside )?(?:food|catering|alcohol|workshops|screenings|events?) (?:is )?allowed\b/.test(text);
}

function requestedQuantity(requirement) {
  const words = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10};
  const match = normalize(requirement).match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  if (!match) return null;
  return Number(match[1]) || words[match[1]] || null;
}

function claimQuantityFor(requirement, claim) {
  const numberWords = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10};
  const requiredWords = normalize(requirement).split(" ").filter((word) => !/^\d+$/.test(word) && !Object.hasOwn(numberWords, word) && !["for", "with", "need", "have", "at", "least", "more", "than", "room", "rooms", "space", "spaces", "equipment"].includes(word));
  const terms = requiredWords.length ? requiredWords : normalize(requirement).split(" ").filter((word) => ["room", "rooms", "space", "spaces"].includes(word));
  const words = claimText(claim).split(" ");
  const matches = [];
  words.forEach((word, index) => {
    if (!/^\d+$/.test(word) && !Object.hasOwn(numberWords, word)) return;
    const count = Number(word) || numberWords[word];
    const nearby = words.slice(Math.max(0, index - 3), index + 4);
    if (!terms.length || terms.some((term) => nearby.includes(term))) matches.push(count);
  });
  return matches.length ? Math.max(...matches) : null;
}

function claimMeetsAudienceCondition(claim, audience) {
  const text = claimText(claim);
  const condition = text.match(/\b(?:for|among|open to|serving) ([a-z0-9 ]{3,80})/);
  if (!condition) return false;
  const conditionWords = new Set(condition[1].split(" ").filter((word) => word.length > 3 && !["community", "people", "groups", "events", "event"].includes(word)));
  if (!conditionWords.size) return true;
  const audienceWords = new Set(normalize(audience).split(" ").filter((word) => word.length > 3 && !["general", "community", "people", "group", "groups", "event", "events"].includes(word)));
  return [...conditionWords].some((word) => audienceWords.has(word) || (word.endsWith("s") && audienceWords.has(word.slice(0, -1))) || (audienceWords.has(`${word}s`)));
}

function claimSupportsRequirement(claim, requirement, kind, brief) {
  if (kind === "eligibility" || kind === "access-model") {
    if (["unknown", "conflicting", "demonstration"].includes(claim.evidenceType) || explicitlyProhibits(claim)) return false;
    return claimMeetsAudienceCondition(claim, brief.audience);
  }
  if (!claimDocuments(claim, requirement, kind) || explicitlyProhibits(claim, requirement)) return false;
  const quantity = requestedQuantity(requirement);
  if (quantity !== null && ["equipment", "hosting-conditions"].includes(kind)) {
    const count = claimQuantityFor(requirement, claim);
    if (count === null || count < quantity) return false;
  }
  return true;
}

function capacityIsVerified(claim, venue) {
  if (claim.subject !== "capacity" || !claim.appliesToSpaceId || !claim.layout) return false;
  const space = (venue.spaces || []).find((item) => item._id === claim.appliesToSpaceId || item.id === claim.appliesToSpaceId);
  if (!space || space.name === "" || space.layout !== claim.layout) return false;
  const count = Number(String(claim.value || "").match(/\d+/)?.[0]);
  return Number.isFinite(count) && count > 0;
}

/**
 * Server-side allowlist and evidence gate for the model's structured output.
 * Unknown/unsupported claims are downgraded to unknown; invalid identities,
 * localities, and untrusted citation paths are rejected.
 */
export function validateAgentRecommendations({ output, venues, brief, evidence }) {
  const venueById = new Map(venues.map((venue) => [venue._id, venue]));
  const pathChecks = evidence?.checks || [];
  const issues = [];
  const recommendations = [];
  const requested = [
    ...brief.essentialRequirements,
    ...brief.flexibleRequirements,
    ...brief.roomRequirements,
    ...brief.equipmentRequirements,
    `Event type: ${brief.eventType}`,
    `Audience: ${brief.audience}`,
    `Capacity for ${brief.headcount} guests`,
    `Event date ${brief.date} and time ${brief.startTime}–${brief.endTime}`,
    `Setup buffer: ${brief.setupMinutes} minutes`,
    `Clear-up buffer: ${brief.cleanupMinutes} minutes`,
    `Budget of ${brief.currency} ${brief.budgetAmount}`,
  ].map((item) => item.trim()).filter(Boolean);

  for (const candidate of output.recommendations || []) {
    const venue = venueById.get(candidate.venueId);
    if (!venue) {
      issues.push(`The model returned a venue outside the published researched catalog: ${candidate.venueId}`);
      continue;
    }
    if (venue.city !== brief.city) {
      issues.push(`The model returned ${venue.name} from ${venue.city} for a ${brief.city} brief.`);
      continue;
    }
    if (candidate.locality !== venue.locality) {
      issues.push(`The model returned a locality that does not match ${venue.name}.`);
      continue;
    }

    const venueChecks = pathChecks.filter((check) => check.venue._id === venue._id && check.valid);
    const checkedPaths = new Set(venueChecks.map((check) => check.path));
    const candidatePaths = candidate.entryPaths || [];
    if (!candidatePaths.length || candidatePaths.some((path) => !checkedPaths.has(path))) {
      issues.push(`The selected Knowledge Base paths do not provide validated evidence for ${venue.name}.`);
      continue;
    }

    const claims = venue.claims || [];
    const venueSources = sourceList(venue);
    const sourceVerifiedClaims = claims.filter((claim) => {
      const ids = (claim.sources || []).filter(Boolean).map((source) => source._id);
      return ids.length > 0 && ids.every((id) => venueSources.some((source) => source._id === id));
    });
    const classifications = [];
    for (const requirement of [...new Set(requested)]) {
      const kind = requirementKind(requirement);
      const relatedClaims = sourceVerifiedClaims.filter((claim) => claimIsRelevant(claim, requirement, kind));
      const audienceKind = ["eligibility", "access-model"].includes(kind);
      const documentedClaims = relatedClaims.filter((claim) => audienceKind ? !["unknown", "conflicting", "demonstration"].includes(claim.evidenceType) : claimDocuments(claim, requirement, kind) || explicitlyProhibits(claim, requirement));
      const prohibitions = documentedClaims.filter((claim) => audienceKind ? explicitlyProhibits(claim) : explicitlyProhibits(claim, requirement));
      const supportedClaims = kind === "capacity"
        ? documentedClaims.filter((claim) => capacityIsVerified(claim, venue) && Number(String(claim.value).match(/\d+/)?.[0]) >= Number(brief.headcount))
        : documentedClaims.filter((claim) => claimSupportsRequirement(claim, requirement, kind, brief));
      let status = "unknown";
      let supportingClaims = [];
      if (prohibitions.length) {
        status = "contradicted";
        supportingClaims = prohibitions;
      } else if (supportedClaims.length) {
        status = "supported";
        supportingClaims = supportedClaims;
      }

      if (status === "unknown") {
        supportingClaims = relatedClaims.filter((claim) => !supportedClaims.includes(claim));
      }
      classifications.push({
        requirement,
        status,
        evidence: supportingClaims.map((claim) => ({claim: claim.claim, value: claim.value, evidenceType: claim.evidenceType, qualification: claim.qualification || null})),
      });
    }

    const matchingChecks = venueChecks.filter((check) => candidatePaths.includes(check.path));
    const matchedSourceIds = new Set(matchingChecks.flatMap((check) => [...check.citationLabels.flatMap((citation) => citation.sourceIds || []), ...(check.inlineSourceIds || [])]));
    const sources = sourceList(venue).filter((source) => matchedSourceIds.has(source._id));
    if (!sources.length) {
      issues.push(`No published citation could be associated with the selected entry for ${venue.name}.`);
      continue;
    }
    recommendations.push({
      venueId: venue._id,
      name: venue.name,
      city: venue.city,
      locality: venue.locality,
      relationshipStatus: venue.relationshipStatus,
      historical: (venue.claims || []).some((claim) => claim.evidenceType === "historical-event"),
      requirementCoverage: classifications,
      documentedFacts: claims.filter((claim) => claim.evidenceType !== "unknown" && claim.evidenceType !== "conflicting" && claim.evidenceType !== "demonstration" && (claim.subject !== "capacity" || capacityIsVerified(claim, venue))).map((claim) => ({subject: claim.subject, claim: claim.claim, value: claim.value, evidenceType: claim.evidenceType, checkedAt: claim.checkedAt || null, historicalDate: claim.historicalDate || null, qualification: claim.qualification || null, sourceReferences: (claim.sources || []).filter((source) => source && sources.some((verified) => verified._id === source._id)).map((source) => ({id: source._id, title: source.title, url: source.url, sourceType: source.sourceType}))})),
      importantUnknowns: claims.filter((claim) => ["capacity", "availability", "price", "booking-authority", "access-model"].includes(claim.subject) && (claim.evidenceType === "unknown" || claim.evidenceType === "conflicting")).map((claim) => ({claim: claim.claim, value: claim.value, evidenceType: claim.evidenceType})),
      documentedConflicts: claims.filter((claim) => claim.evidenceType === "conflicting").map((claim) => ({claim: claim.claim, value: claim.value})),
      sourceReferences: sources.map((source) => ({id: source._id, title: source.title, url: source.url})),
      evidencePaths: matchingChecks.map((check) => check.path),
      nextStep: claims.some((claim) => claim.evidenceType === "historical-event")
        ? "The record only shows a past event. Find a current host contact and ask whether the venue is open to a new request."
        : "Ask the host to confirm date availability, room and layout, access terms, and whether they accept requests through Backstage.",
    });
  }

  if (issues.length) throw new Error(issues.join(" "));
  if (!recommendations.length) return {recommendations: [], requestedRequirements: [...new Set(requested)]};
  return {recommendations, requestedRequirements: [...new Set(requested)]};
}
