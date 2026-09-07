import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError, ErrorCode } from "../utils/AppError";
import { isDuplicateKeyError } from "../utils/isDuplicateKeyError";


function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".");
    fieldErrors[field] = issue.message;
  }

  return fieldErrors;
}

function fieldErrorsFromMongoose(
  error: mongoose.Error.ValidationError
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const [field, fieldError] of Object.entries(error.errors)) {
    fieldErrors[field] = fieldError.message;
  }

  return fieldErrors;
}

/**
 * Every response body has the same shape:
 *
 *   { "error": { "code": "...", "message": "...", "details": {} } }
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  let code: ErrorCode = "INTERNAL_ERROR";
  let statusCode = 500;
  let message = "Something went wrong.";
  let details: Record<string, unknown> = {};

  if (error instanceof AppError) {
    code = error.code;
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    code = "VALIDATION_ERROR";
    statusCode = 400;
    message = "The request body or parameters are invalid.";
    details = fieldErrorsFromZod(error);
  } else if (error instanceof mongoose.Error.ValidationError) {
    code = "VALIDATION_ERROR";
    statusCode = 400;
    message = "The request body or parameters are invalid.";
    details = fieldErrorsFromMongoose(error);
  } else if (error instanceof mongoose.Error.CastError) {
    // Most likely from a malformed ObjectId 
    code = "VALIDATION_ERROR";
    statusCode = 400;
    message = `The value provided for '${error.path}' is not valid.`;
    details = { [error.path]: `Expected a valid ${error.kind}.` };
  } else if (isDuplicateKeyError(error)) {
    code = "DUPLICATE_EMAIL";
    statusCode = 409;
    message = "A volunteer with that email already exists.";
    // Only duplicate emails will hit this condition because of the ALREADY_SIGNED_UP case
  }

  if (statusCode === 500) {
    console.error("Unhandled error:", error);
  }

  res.status(statusCode).json({
    error: {
      code: code,
      message: message,
      details: details,
    },
  });
}
