import { HydratedDocument } from "mongoose";
import { IShift, Shift } from "../models/Shift";
import { ISignup, Signup } from "../models/Signup";
import { AppError } from "../utils/AppError";
import { isDuplicateKeyError } from "../utils/isDuplicateKeyError";
import {
  PaginationMeta,
  buildPaginationMeta,
  skipForPage,
} from "../utils/pagination";
import { getShiftById } from "./shift.service";
import { getVolunteerById } from "./volunteer.service";

export interface SignupPage {
  data: unknown[];
  pagination: PaginationMeta;
}

/**
 * Takes one seat on a shift, but only if a seat is free.
 *
 * Claude input: The check and the increment are one update of one document, and MongoDB runs
 * that atomically. So if two requests race for the last seat, one matches the
 * filter and gets the shift back and the other gets null. Reading the count and
 * then writing it would let both requests see the same free seat.
 */
async function reserveSeat(
  shiftId: string
): Promise<HydratedDocument<IShift> | null> {
  const reservedShift = await Shift.findOneAndUpdate(
    {
      _id: shiftId,
      status: "open",
      $expr: { $lt: ["$confirmedCount", "$capacity"] },
    },
    { $inc: { confirmedCount: 1 } },
    { returnDocument: "after" }
  );

  return reservedShift;
}

// Gives a reserved seat back
async function releaseSeat(shiftId: string): Promise<void> {
  await Shift.updateOne(
    { _id: shiftId, confirmedCount: { $gt: 0 } },
    { $inc: { confirmedCount: -1 } }
  );
}

/**
 * Works out which error to report when the reserve matched nothing. Full,
 * cancelled and missing all look the same to the reserve, so the shift is
 * re-read to tell them apart.
 */
async function explainFailedReserve(shiftId: string): Promise<never> {
  const shift = await getShiftById(shiftId);

  if (shift.status === "cancelled") {
    throw new AppError(
      "SHIFT_CANCELLED",
      409,
      "This shift has been cancelled."
    );
  }

  throw new AppError("SHIFT_FULL", 409, "This shift has no remaining seats.");
}

/**
 * Claims a seat on a shift for a volunteer, enforcing every signup rule.
 * Returns the confirmed signup.
 */
export async function createSignup(
  shiftId: string,
  volunteerId: string
): Promise<HydratedDocument<ISignup>> {
  // Both throw NOT_FOUND if the id does not exist.
  await getVolunteerById(volunteerId);
  const shift = await getShiftById(shiftId);

  if (shift.status === "cancelled") {
    throw new AppError(
      "SHIFT_CANCELLED",
      409,
      "This shift has been cancelled."
    );
  }

  if (shift.startTime <= new Date()) {
    throw new AppError(
      "SHIFT_ALREADY_STARTED",
      422,
      "This shift has already started."
    );
  }

  // The unique index allows only one row per pair, so a volunteer who
  // cancelled and is signing up again reuses that row.
  const existingSignup = await Signup.findOne({ shiftId, volunteerId });

  if (existingSignup !== null && existingSignup.status === "confirmed") {
    throw new AppError(
      "ALREADY_SIGNED_UP",
      409,
      "This volunteer already holds a seat on this shift."
    );
  }

  const reservedShift = await reserveSeat(shiftId);

  if (reservedShift === null) {
    await explainFailedReserve(shiftId);
  }

  // The seat is already reserved, so every failure has to give it back.
  try {
    if (existingSignup !== null) {
      existingSignup.status = "confirmed";
      existingSignup.signedUpAt = new Date();
      existingSignup.cancelledAt = undefined;
      await existingSignup.save();
      return existingSignup;
    }

    const signup = await Signup.create({ shiftId, volunteerId });
    return signup;
  } catch (error) {
    await releaseSeat(shiftId);

    // Another request inserted the same pair after the check above, and the
    // index caught it.
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "ALREADY_SIGNED_UP",
        409,
        "This volunteer already holds a seat on this shift."
      );
    }

    throw error;
  }
}

/**
 * Cancels a signup and frees its seat.
 *
 * The status change is one conditional update rather than a read then a save,
 * so two cancellations of the same signup cannot both decrement the counter.
 */
export async function cancelSignup(
  id: string
): Promise<HydratedDocument<ISignup>> {
  const cancelledSignup = await Signup.findOneAndUpdate(
    { _id: id, status: "confirmed" },
    { $set: { status: "cancelled", cancelledAt: new Date() } },
    { returnDocument: "after" }
  );

  if (cancelledSignup === null) {
    // Nothing matched, so the signup is either missing or already cancelled.
    // Re-reading tells which.
    const signup = await Signup.findById(id);

    if (signup === null) {
      throw new AppError("NOT_FOUND", 404, `No signup exists with id ${id}.`);
    }

    throw new AppError(
      "SIGNUP_NOT_ACTIVE",
      422,
      "This signup has already been cancelled."
    );
  }

  // The seat is freed only after the signup is cancelled. The other order
  // could free a seat somebody still holds and overbook the shift.
  await releaseSeat(cancelledSignup.shiftId.toString());

  return cancelledSignup;
}

/**
 * Returns one page of a volunteer's signups, newest first, with each shift's
 * details filled in.
 */
export async function listSignupsForVolunteer(
  volunteerId: string,
  page: number,
  limit: number
): Promise<SignupPage> {
  // Throws NOT_FOUND for a missing volunteer, which otherwise would look the
  // same as a volunteer with no signups.
  await getVolunteerById(volunteerId);

  const skip = skipForPage(page, limit);
  const total = await Signup.countDocuments({ volunteerId });
  const signups = await Signup.find({ volunteerId })
    .sort({ signedUpAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("shiftId", "title location startTime endTime status")
    .lean();

  return {
    data: signups,
    pagination: buildPaginationMeta(page, limit, total),
  };
}
