import { z } from "zod";
import { objectIdSchema } from "./common.schema";

// The body of POST /api/shifts/:shiftId/signups
// Because the shift comes from the URL, the body only has to say who is claiming the seat
export const createSignupSchema = z.object({
  volunteerId: objectIdSchema,
});

export type CreateSignupInput = z.infer<typeof createSignupSchema>;

// The `:shiftId` path parameter of the nested signup route.
export const shiftIdParamSchema = z.object({
  shiftId: objectIdSchema,
});
