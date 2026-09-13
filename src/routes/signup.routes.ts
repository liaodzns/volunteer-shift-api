import { Router } from "express";
import * as signupController from "../controllers/signup.controller";

/**
 * Mounted at /api/shifts/:shiftId/signups. mergeParams is what lets this router
 * read the :shiftId belonging to the path it is mounted on.
 */
export const shiftSignupRouter = Router({ mergeParams: true });

shiftSignupRouter.post("/", signupController.createSignup);

/**
 * Mounted at /api/signups.
 *
 * Cancelling is a PATCH to /:id/cancel rather than a DELETE because a
 * cancellation is history the organisation wants to keep, not a row that should
 * disappear. The verb in the path signals a state transition with side effects,
 * namely that a seat is given back to the shift.
 */
export const signupRouter = Router();

signupRouter.patch("/:id/cancel", signupController.cancelSignup);
