import { z } from "zod";
import { paginationQuerySchema } from "./common.schema";

// The body of POST /api/shifts. 
// Times arecoerced into Date objects
// The refine at the end rejects a shift that ends before it starts
export const createShiftSchema = z
  .object({
    title: z.string().trim().min(1),
    location: z.string().trim().min(1),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    capacity: z.number().int().min(1),
  })
  .refine((shift) => shift.endTime > shift.startTime, {
    message: "endTime must be after startTime.",
    path: ["endTime"],
  });

export type CreateShiftInput = z.infer<typeof createShiftSchema>;

// The body of PATCH /api/shifts/:id
// Optional fields because a patch may change only one of them
export const updateShiftSchema = z.object({
  title: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  capacity: z.number().int().min(1).optional(),
});

export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;

// The query string of GET /api/shifts: the shared paging fields plus an optional availability filter. 
export const listShiftsQuerySchema = paginationQuerySchema.extend({
  hasAvailability: z.enum(["true", "false"]).optional(), // coercing string -> bool would turn false -> true
});

export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>;
