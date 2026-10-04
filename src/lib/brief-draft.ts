import type { City, EventBrief } from "@/types";

export const BRIEF_STORAGE_KEY = "backstage.event-brief.v1";
export const emptyBriefForm = {
  title: "",
  city: "Delhi NCR" as City,
  eventType: "",
  audience: "",
  date: "",
  headcount: "",
  startTime: "10:00",
  endTime: "12:00",
  budgetAmount: "",
  rooms: "",
  equipment: "",
  essential: "",
  flexible: "",
  setupMinutes: "30",
  cleanupMinutes: "30",
};
export type BriefFormValues = typeof emptyBriefForm;
export type BriefField = keyof BriefFormValues;
export const requirementList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const basic: BriefField[] = [
  "title",
  "city",
  "eventType",
  "audience",
  "date",
  "headcount",
  "startTime",
  "endTime",
];
export function validateBriefForm(
  values: BriefFormValues,
  step: 1 | 2 | 3 = 3,
) {
  const errors: Partial<Record<BriefField, string>> = {};
  for (const [key, max] of [
    ["title", 100],
    ["eventType", 80],
    ["audience", 120],
  ] as const) {
    if (!values[key].trim()) errors[key] = "This field is required.";
    else if (values[key].trim().length > max)
      errors[key] = `Use ${max} characters or fewer.`;
  }
  if (!["Delhi NCR", "Bengaluru"].includes(values.city))
    errors.city = "Choose a supported city.";
  const date = new Date(`${values.date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(values.date) ||
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== values.date
  )
    errors.date = "Choose a valid event date.";
  for (const key of ["startTime", "endTime"] as const)
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(values[key]))
      errors[key] = "Choose a valid time.";
  if (
    !errors.startTime &&
    !errors.endTime &&
    values.endTime <= values.startTime
  )
    errors.endTime = "End time must be after start time on the same day.";
  const headcount = Number(values.headcount);
  if (
    !values.headcount ||
    !Number.isInteger(headcount) ||
    headcount < 1 ||
    headcount > 10000
  )
    errors.headcount = "Enter a whole number from 1 to 10,000.";
  if (step !== 1) {
    const budget = Number(values.budgetAmount);
    if (
      values.budgetAmount === "" ||
      !Number.isFinite(budget) ||
      budget < 0 ||
      budget > 100000000
    )
      errors.budgetAmount = "Enter an INR budget from 0 to 100,000,000.";
    for (const key of ["setupMinutes", "cleanupMinutes"] as const)
      if (
        values[key] === "" ||
        !Number.isInteger(Number(values[key])) ||
        Number(values[key]) < 0 ||
        Number(values[key]) > 1440
      )
        errors[key] = "Enter whole minutes from 0 to 1,440.";
    for (const [key, count, length] of [
      ["rooms", 12, 120],
      ["equipment", 20, 120],
      ["essential", 20, 200],
      ["flexible", 20, 200],
    ] as const) {
      const items = requirementList(values[key]);
      if (items.length > count || items.some((item) => item.length > length))
        errors[key] =
          `Use up to ${count} comma-separated requirements, ${length} characters each.`;
    }
  }
  return step === 2
    ? (Object.fromEntries(
        Object.entries(errors).filter(
          ([key]) => !basic.includes(key as BriefField),
        ),
      ) as typeof errors)
    : errors;
}
export function briefFromValues(
  values: BriefFormValues,
  id: string,
  savedAt: string,
): EventBrief {
  return {
    id,
    title: values.title.trim(),
    city: values.city,
    eventType: values.eventType,
    audience: values.audience.trim(),
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    headcount: Number(values.headcount),
    budgetAmount: Number(values.budgetAmount),
    currency: "INR",
    roomRequirements: requirementList(values.rooms),
    equipmentRequirements: requirementList(values.equipment),
    essentialRequirements: requirementList(values.essential),
    flexibleRequirements: requirementList(values.flexible),
    setupMinutes: Number(values.setupMinutes),
    cleanupMinutes: Number(values.cleanupMinutes),
    savedAt,
  };
}
export function valuesFromStoredBrief(value: unknown): {
  values: BriefFormValues;
  complete: boolean;
} {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Unreadable stored brief");
  const brief = value as Record<string, unknown>;
  const values = { ...emptyBriefForm };
  for (const key of [
    "title",
    "eventType",
    "audience",
    "date",
    "startTime",
    "endTime",
  ] as const)
    if (typeof brief[key] === "string") values[key] = brief[key];
  if (brief.city === "Delhi NCR" || brief.city === "Bengaluru")
    values.city = brief.city;
  for (const key of [
    "headcount",
    "budgetAmount",
    "setupMinutes",
    "cleanupMinutes",
  ] as const)
    if (typeof brief[key] === "number" || typeof brief[key] === "string")
      values[key] = String(brief[key]);
  for (const [key, stored] of [
    ["rooms", "roomRequirements"],
    ["equipment", "equipmentRequirements"],
    ["essential", "essentialRequirements"],
    ["flexible", "flexibleRequirements"],
  ] as const) {
    if (Array.isArray(brief[stored]))
      values[key] = (brief[stored] as unknown[])
        .filter((item) => typeof item === "string")
        .join(", ");
    else if (typeof brief[stored] === "string") values[key] = brief[stored];
  }
  const complete =
    Object.keys(validateBriefForm(values)).length === 0 &&
    brief.currency === "INR" &&
    typeof brief.id === "string" &&
    typeof brief.savedAt === "string";
  return { values, complete };
}
export function sameBriefContents(a: EventBrief, b: EventBrief) {
  const content = (brief: EventBrief) =>
    JSON.stringify(
      Object.keys(brief)
        .filter((key) => key !== "id" && key !== "savedAt")
        .sort()
        .map((key) => [key, brief[key as keyof EventBrief]]),
    );
  return content(a) === content(b);
}
