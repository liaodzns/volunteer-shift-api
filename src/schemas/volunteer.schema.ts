import { z } from "zod";

// POST /api/volunteers body
export const createVolunteerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export type CreateVolunteerInput = z.infer<typeof createVolunteerSchema>;
