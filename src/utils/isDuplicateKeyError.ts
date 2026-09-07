/**
 * Tells whether an unknown thrown value is MongoDB's duplicate key error, which
 * is reported as error code 11000. The driver throws a plain object rather than
 * a typed class, so the shape has to be sniffed.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === 11000;
}
