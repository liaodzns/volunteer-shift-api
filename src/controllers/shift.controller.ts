import { Request, Response } from "express";
import { idParamSchema } from "../schemas/common.schema";
import {
  createShiftSchema,
  listShiftsQuerySchema,
  updateShiftSchema,
} from "../schemas/shift.schema";
import * as shiftService from "../services/shift.service";

// POST /api/shifts: validates the reqeuest body, creates the shift, and returns 201
export async function createShift(req: Request, res: Response) {
  const input = createShiftSchema.parse(req.body);
  const shift = await shiftService.createShift(input);
  res.status(201).json(shift);
}

// GET /api/shifts: validates the query and returns one page of shifts
// can choose to only return shifts that still have a seat free.
export async function listShifts(req: Request, res: Response) {
  const query = listShiftsQuerySchema.parse(req.query);
  const onlyWithAvailability = query.hasAvailability === "true";
  const page = await shiftService.listShifts(
    query.page,
    query.limit,
    onlyWithAvailability
  );
  res.json(page);
}

// GET /api/shifts/:id: returns one shift with its remaining seats and the roster of confirmed volunteers
export async function getShiftById(req: Request, res: Response) {
  const params = idParamSchema.parse(req.params);
  const shift = await shiftService.getShiftDetail(params.id);
  res.json(shift);
}

// PATCH /api/shifts/:id: validates the partial body and returns the updated shift
export async function updateShift(req: Request, res: Response) {
  const params = idParamSchema.parse(req.params);
  const input = updateShiftSchema.parse(req.body);
  const shift = await shiftService.updateShift(params.id, input);
  res.json(shift);
}

// DELETE /api/shifts/:id: cancels the shift and its signups, and returns the cancelled shift so the caller can see the new status
export async function cancelShift(req: Request, res: Response) {
  const params = idParamSchema.parse(req.params);
  const shift = await shiftService.cancelShift(params.id);
  res.json(shift);
}
