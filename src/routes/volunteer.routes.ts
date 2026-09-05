import { Router } from "express";
import * as volunteerController from "../controllers/volunteer.controller";

const router = Router();

router.post("/", volunteerController.createVolunteer);
router.get("/", volunteerController.listVolunteers);
router.get("/:id", volunteerController.getVolunteerById);
router.get("/:id/signups", volunteerController.listVolunteerSignups);

export default router;
