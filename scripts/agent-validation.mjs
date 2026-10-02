const normalize = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const sourceList = (venue) => {
  const byId = new Map((venue.sources || []).filter(Boolean).map((source) => [source._id, source]));
  for (const claim of venue.claims || []) for (const source of claim.sources || []) if (source) byId.set(source._id, source);
  return [...byId.values()];
};

function requirementKind(requirement) {
  const text = normalize(requirement);
  if (/\b(capacity|people|guests|attendees|headcount|crowd|seats?)\b/.test(text)) return "capacity";
  if (/\b(setup|cleanup|clear up|move in|load in)\b/.test(text)) return "hosting-conditions";
  if (/\b(availability|available|date|slot|calendar|timing|time|hours|schedule)\b/.test(text)) return "availability";
  if (/\b(pro bono|free access|free venue|complimentary|paid access|sponsored access|sponsorship)\b/.test(text)) return "access-model";
  if (/\b(price|pricing|budget|cost|paid)\b/.test(text)) return "price";
  if (/\b(book|booking|reserve|reservation|backstage)\b/.test(text)) return "booking-authority";
  if (/\b(eligible|eligibility|community|founder|audience)\b/.test(text)) return "eligibility";
  if (/\b(projector|microphone|mic|screen|audio|av|equipment|chairs?|wifi|whiteboard)\b/.test(text)) return "equipment";
  if (/\b(room|space|breakout|terrace|classroom|auditorium|meeting|food|catering|alcohol|activity|permitted|access hours)\b/.test(text)) return "hosting-conditions";
  return null;
}

function claimIsRelevant(claim, requirement, kind) {
  if (!kind) return false;
  if (claim.subject !== kind) return false;
  const claimText = normalize(`${claim.claim || ""} ${claim.value || ""} ${claim.qualification || ""}`);
  const requestedWords = normalize(requirement).split(" ").filter((word) => word.length > 3);
  if (["capacity", "availability", "price", "booking-authority", "eligibility"].includes(kind)) return true;
  return requestedWords.some((word) => claimText.includes(word));
}

function claimStatesUnknown(claim) {
  return /\bunknown\b|not (?:stated|specified|established|published|documented|confirmed|authorized)|do(?:es)? not (?:establish|authorize)|must be checked/i.test(`${claim.claim || ""} ${claim.value || ""} ${claim.qualification || ""}`);
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
      const conflictingClaims = relatedClaims.filter((claim) => claim.evidenceType === "conflicting");
      const documentedClaims = relatedClaims.filter((claim) => !["unknown", "conflicting", "demonstration"].includes(claim.evidenceType) && !claimStatesUnknown(claim));
      const supportedClaims = kind === "capacity"
        ? documentedClaims.filter((claim) => capacityIsVerified(claim, venue) && Number(String(claim.value).match(/\d+/)?.[0]) >= Number(brief.headcount))
        : documentedClaims;
      let status = "unknown";
      let supportingClaims = [];
      if (conflictingClaims.length) {
        status = "contradicted";
        supportingClaims = conflictingClaims;
      } else if (supportedClaims.length) {
        status = "supported";
        supportingClaims = supportedClaims;
      }

      if (status === "unknown") {
        supportingClaims = relatedClaims.filter((claim) => claim.evidenceType === "unknown" || claim.evidenceType === "conflicting" || claimStatesUnknown(claim));
      }
      classifications.push({
        requirement,
        status,
        evidence: supportingClaims.map((claim) => ({claim: claim.claim, value: claim.value, evidenceType: claim.evidenceType, qualification: claim.qualification || null})),
      });
    }

    const matchingChecks = venueChecks.filter((check) => candidatePaths.includes(check.path));
    const matchedSourceIds = new Set(matchingChecks.flatMap((check) => check.citationLabels.flatMap((citation) => citation.sourceIds || [])));
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
      documentedFacts: claims.filter((claim) => claim.evidenceType !== "unknown" && claim.evidenceType !== "conflicting" && claim.evidenceType !== "demonstration" && (claim.subject !== "capacity" || capacityIsVerified(claim, venue))).map((claim) => ({claim: claim.claim, value: claim.value, evidenceType: claim.evidenceType, historicalDate: claim.historicalDate || null, qualification: claim.qualification || null})),
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
