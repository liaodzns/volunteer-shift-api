import { HydratedDocument } from "mongoose";
import { IVolunteer, Volunteer } from "../models/Volunteer";
import { CreateVolunteerInput } from "../schemas/volunteer.schema";
import { AppError } from "../utils/AppError";
import {
  PaginationMeta,
  buildPaginationMeta,
  skipForPage,
} from "../utils/pagination";

export interface VolunteerPage {
  data: HydratedDocument<IVolunteer>[];
  pagination: PaginationMeta;
}


// Saves a new volunteer 
// Note: let error handler handle duplicate emails
export async function createVolunteer(
  input: CreateVolunteerInput
): Promise<HydratedDocument<IVolunteer>> {
  const volunteer = await Volunteer.create(input);
  return volunteer;
}

// Returns a page of volunteers + location of the page in the collection
export async function listVolunteers(
  page: number,
  limit: number
): Promise<VolunteerPage> {
  const skip = skipForPage(page, limit);
  const total = await Volunteer.countDocuments();
  const volunteers = await Volunteer.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    data: volunteers,
    pagination: buildPaginationMeta(page, limit, total),
  };
}

// Fetch a volunteer
export async function getVolunteerById(
  id: string
): Promise<HydratedDocument<IVolunteer>> {
  const volunteer = await Volunteer.findById(id);

  if (volunteer === null) {
    throw new AppError("NOT_FOUND", 404, `No volunteer exists with id ${id}`);
  }

  return volunteer;
}
