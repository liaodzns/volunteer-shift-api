import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

// For edge cases
// If we have an error that doesn't match an existing route, we can pass it off to AppError as NOT_FOUND
export function notFound(req: Request, _res: Response, next: NextFunction) {
  const message = `Route ${req.method} ${req.originalUrl} does not exist.`;
  next(new AppError("NOT_FOUND", 404, message));
}
