import {z} from "zod";

const eventBriefSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(100),
  city: z.enum(["Delhi NCR", "Bengaluru"]),
  eventType: z.string().trim().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  audience: z.string().trim().min(1).max(120),
  headcount: z.number().int().min(1).max(10000),
  budgetAmount: z.number().min(0).max(100000000),
  currency: z.literal("INR"),
  roomRequirements: z.array(z.string().trim().min(1).max(120)).max(12),
  equipmentRequirements: z.array(z.string().trim().min(1).max(120)).max(20),
  essentialRequirements: z.array(z.string().trim().min(1).max(200)).max(20),
  flexibleRequirements: z.array(z.string().trim().min(1).max(200)).max(20),
  setupMinutes: z.number().int().min(0).max(1440),
  cleanupMinutes: z.number().int().min(0).max(1440),
  savedAt: z.string().max(40),
}).strict().superRefine((brief, context) => {
  const parsedDate = new Date(`${brief.date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== brief.date) {
    context.addIssue({code: "custom", path: ["date"], message: "Choose a valid event date."});
  }
  if (brief.endTime <= brief.startTime) {
    context.addIssue({code: "custom", path: ["endTime"], message: "The event must end after it starts."});
  }
});

export const discoveryBodySchema = z.object({
  brief: eventBriefSchema,
  conversation: z.array(z.object({role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1800)}).strict()).max(8),
}).strict().superRefine(({conversation}, context) => {
  if (!conversation.length || conversation[conversation.length - 1]?.role !== "user") {
    context.addIssue({code: "custom", path: ["conversation"], message: "Add a follow-up question to continue."});
  }
  if (conversation.reduce((sum, message) => sum + message.content.length, 0) > 6000) {
    context.addIssue({code: "custom", path: ["conversation"], message: "The conversation is too long. Start a fresh discovery question."});
  }
});
