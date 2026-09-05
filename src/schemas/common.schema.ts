import { z } from "zod";

// Ensure the objectID is a 24 char hexadecimal string (MongoDB required)
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a 24 character hexadecimal ObjectId.");

export const idParamSchema = z.object({
  id: objectIdSchema,
});

// Return query values as integers and cap the limit at 100 so a caller cannot ask for the whole collection.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
