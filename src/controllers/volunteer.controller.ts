import { Request, Response } from "express";
import { idParamSchema, paginationQuerySchema } from "../schemas/common.schema";
import { createVolunteerSchema } from "../schemas/volunteer.schema";
import * as signupService from "../services/signup.service";
import * as volunteerService from "../services/volunteer.service";


// POST /api/volunteers: validates the body of the call and creates the volunteer
export async function createVolunteer(req: Request, res: Response) {
  const input = createVolunteerSchema.parse(req.body);
  const volunteer = await volunteerService.createVolunteer(input);
  res.status(201).json(volunteer);
}

// GET /api/volunteers: validates the paging query and returns one page ofvolunteers with its paging metadata
export async function listVolunteers(req: Request, res: Response) {
  const query = paginationQuerySchema.parse(req.query);
  const page = await volunteerService.listVolunteers(query.page, query.limit);
  res.json(page);
}

// GET /api/volunteers/:id: validates the id and returns the one associated volunteer
export async function getVolunteerById(req: Request, res: Response) {
  const params = idParamSchema.parse(req.params);
  const volunteer = await volunteerService.getVolunteerById(params.id);
  res.json(volunteer);
}

// GET /api/volunteers/:id/signups: returns a page of the shifts the volunteer has signed up for
export async function listVolunteerSignups(req: Request, res: Response) {
  const params = idParamSchema.parse(req.params);
  const query = paginationQuerySchema.parse(req.query);
  const page = await signupService.listSignupsForVolunteer(
    params.id,
    query.page,
    query.limit
  );
  res.json(page);
}
