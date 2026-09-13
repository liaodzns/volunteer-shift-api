import { HydratedDocument, QueryFilter } from "mongoose";
import { IShift, Shift } from "../models/Shift";
import { Signup } from "../models/Signup";
import { CreateShiftInput, UpdateShiftInput } from "../schemas/shift.schema";
import { AppError } from "../utils/AppError";
import {
  PaginationMeta,
  buildPaginationMeta,
  skipForPage,
} from "../utils/pagination";

export interface ShiftPage {
  data: HydratedDocument<IShift>[];
  pagination: PaginationMeta;
}

/**
 * Loads one shift by id. Throws NOT_FOUND if it does not exist, so callers
 * never have to handle a null.
 */
export async function getShiftById(
  id: string
): Promise<HydratedDocument<IShift>> {
  const shift = await Shift.findById(id);

  if (shift === null) {
    throw new AppError("NOT_FOUND", 404, `No shift exists with id ${id}.`);
  }

  return shift;
}

/**
 * Creates a shift. confirmedCount and status come from the model defaults, so
 * the caller cannot set them.
 */
export async function createShift(
  input: CreateShiftInput
): Promise<HydratedDocument<IShift>> {
  const shift = await Shift.create(input);
  return shift;
}

/**
 * Returns one page of shifts, soonest first. When onlyWithAvailability is true,
 * only open shifts with a free seat are included. Comparing two fields of the
 * same document needs $expr.
 */
export async function listShifts(
  page: number,
  limit: number,
  onlyWithAvailability: boolean
): Promise<ShiftPage> {
  const filter: QueryFilter<IShift> = {};

  if (onlyWithAvailability) {
    filter.status = "open";
    filter.$expr = { $lt: ["$confirmedCount", "$capacity"] };
  }

  const skip = skipForPage(page, limit);
  const total = await Shift.countDocuments(filter);
  const shifts = await Shift.find(filter)
    .sort({ startTime: 1 })
    .skip(skip)
    .limit(limit);

  return {
    data: shifts,
    pagination: buildPaginationMeta(page, limit, total),
  };
}

/**
 * Returns one shift plus the seats left and the confirmed roster, so the caller
 * does not need a second request for it.
 */
export async function getShiftDetail(id: string) {
  const shift = await getShiftById(id);

  const signups = await Signup.find({
    shiftId: shift._id,
    status: "confirmed",
  })
    .sort({ signedUpAt: 1 })
    .populate("volunteerId", "firstName lastName email")
    .lean();

  const spotsRemaining = shift.capacity - shift.confirmedCount;

  return { ...shift.toObject(), spotsRemaining, signups };
}

/**
 * Applies a partial update to a shift.
 *
 * Two checks live here instead of in the Zod schema because both need the
 * stored values: capacity cannot drop below the seats already claimed, and the
 * shift must still end after it starts once the patch is merged in.
 */
export async function updateShift(
  id: string,
  input: UpdateShiftInput
): Promise<HydratedDocument<IShift>> {
  const shift = await getShiftById(id);

  if (input.capacity !== undefined && input.capacity < shift.confirmedCount) {
    throw new AppError(
      "CAPACITY_BELOW_CONFIRMED",
      422,
      `Capacity cannot be lowered to ${input.capacity} because ${shift.confirmedCount} volunteers are already confirmed.`,
      { capacity: input.capacity, confirmedCount: shift.confirmedCount }
    );
  }

  let startTime = shift.startTime;
  if (input.startTime !== undefined) {
    startTime = input.startTime;
  }

  let endTime = shift.endTime;
  if (input.endTime !== undefined) {
    endTime = input.endTime;
  }

  if (endTime <= startTime) {
    throw new AppError(
      "VALIDATION_ERROR",
      400,
      "The request body or parameters are invalid.",
      { endTime: "endTime must be after startTime." }
    );
  }

  if (input.title !== undefined) {
    shift.title = input.title;
  }

  if (input.location !== undefined) {
    shift.location = input.location;
  }

  if (input.capacity !== undefined) {
    shift.capacity = input.capacity;
  }

  shift.startTime = startTime;
  shift.endTime = endTime;

  await shift.save();
  return shift;
}

/**
 * Cancels a shift and every confirmed signup on it.
 *
 * The document is never deleted, because signups point at it. The shift is
 * cancelled first so no new seat can be claimed while the signups are updated.
 */
export async function cancelShift(
  id: string
): Promise<HydratedDocument<IShift>> {
  const shift = await getShiftById(id);

  shift.status = "cancelled";
  // Every seat is being given back, so the counter goes back to zero.
  shift.confirmedCount = 0;
  await shift.save();

  await Signup.updateMany(
    { shiftId: shift._id, status: "confirmed" },
    { $set: { status: "cancelled", cancelledAt: new Date() } }
  );

  return shift;
}
