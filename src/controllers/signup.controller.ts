import { Request, Response } from "express";
import { idParamSchema } from "../schemas/common.schema";
import {
  createSignupSchema,
  shiftIdParamSchema,
} from "../schemas/signup.schema";
import * as signupService from "../services/signup.service";

// POST /api/shifts/:shiftId/signups: claims a seat on the shift for the volunteer named in the body 
// returns the signup with 201
export async function createSignup(req: Request, res: Response) {
  const params = shiftIdParamSchema.parse(req.params);
  const input = createSignupSchema.parse(req.body);
  const signup = await signupService.createSignup(
    params.shiftId,
    input.volunteerId
  );
  res.status(201).json(signup);
}

// PATCH /api/signups/:id/cancel: gives the seat back and returns the cancelled signup.
export async function cancelSignup(req: Request, res: Response) {
  const params = idParamSchema.parse(req.params);
  const signup = await signupService.cancelSignup(params.id);
  res.json(signup);
}
