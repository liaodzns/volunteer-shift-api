// Every error the API returns uses one of these, so the client only ever has to know this one set of strings.
// Add all potential error codes before implementing shifts and signing up
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DUPLICATE_EMAIL"
  | "ALREADY_SIGNED_UP"
  | "SHIFT_FULL"
  | "SHIFT_CANCELLED"
  | "SHIFT_ALREADY_STARTED"
  | "CAPACITY_BELOW_CONFIRMED"
  | "SIGNUP_NOT_ACTIVE"
  | "INTERNAL_ERROR";


// Custom error class for clarity
// Any new error that isn't an AppError will be handled as an unexpected failure/500 internal error
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    statusCode: number,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
