export const audienceChoices = [
  "Students",
  "Developers",
  "Founders",
  "Designers",
  "Working professionals",
  "Educators",
  "Mixed audience",
  "Other",
];
export function parseAudience(value) {
  const [audience, ...rest] = value.split("; community: ");
  return {
    choice: audienceChoices.includes(audience)
      ? audience
      : value
        ? "Other"
        : "",
    details: audienceChoices.includes(audience) ? "" : audience,
    community: rest.join("; community: "),
  };
}
export function serializeAudience({ choice, details, community }) {
  const audience = choice === "Other" ? details || "Other" : choice;
  return audience
    ? `${audience}${community ? `; community: ${community}` : ""}`
    : "";
}
export function deduplicateRequirements(items) {
  const seen = new Set();
  return items
    .map((s) => s.trim())
    .filter((s) => {
      const key = s.toLowerCase().replace(/\s+/g, " ");
      if (!s || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export function suggestEventSetup(brief) {
  const activities = `${brief.eventType} ${brief.title} ${brief.essentialRequirements.join(" ")}`;
  const handsOn = /hackathon|coding|workshop|hands.on/i.test(activities);
  const parallel = /parallel|simultaneous|breakout/i.test(activities);
  const layout = handsOn
    ? "classroom or grouped-table layout for laptop work"
    : /talk|panel|screening/i.test(activities)
      ? "seated presentation layout"
      : "mixed seating layout for discussion and networking";
  return {
    rooms: [
      `Main space for ${brief.headcount} attendees in a ${layout}`,
      ...(parallel
        ? ["Separate breakout area for the stated parallel activities"]
        : []),
    ],
    reason: handsOn
      ? "The stated hands-on activities benefit from usable table space and sightlines for demonstrations."
      : "The stated gathering benefits from a main shared space with clear sightlines and room for discussion.",
    equipmentPlacement: brief.equipmentRequirements.length
      ? "Check the selected equipment in the main space. Shared units cannot serve simultaneous rooms unless the host confirms the arrangement."
      : "Confirm presentation, connectivity and power needs with the host.",
    assumptions: [
      "This is an organizer proposal, not documented venue inventory.",
      "Room/layout capacity, accessible routes, equipment quantities and date-specific availability require confirmation.",
      ...(parallel
        ? [
            "Confirm which activities really run simultaneously before requiring a separate room.",
          ]
        : ["No breakout room is inferred from headcount alone."]),
    ],
  };
}
