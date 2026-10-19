import { z } from "zod";

export const CONTACT_RECIPIENT = "insightsettle@gmail.com";
export const contactRequestSchema = z.object({
  email: z.string().trim().email().max(200),
  consent: z.literal(true),
  website: z.string().max(0),
  requestId: z.string().uuid(),
}).strict();