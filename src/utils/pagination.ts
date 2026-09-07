export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Builds the paging block that every list endpoint returns alongside its data,
 * so the caller can tell how many pages exist without counting rows itself.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages };
}

/**
 * Converts a page number into the number of documents to skip.
 */
export function skipForPage(page: number, limit: number): number {
  return (page - 1) * limit;
}
