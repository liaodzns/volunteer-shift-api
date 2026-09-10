import { Router } from "express";
import * as shiftController from "../controllers/shift.controller";

const router = Router();

router.post("/", shiftController.createShift);
router.get("/", shiftController.listShifts);
router.get("/:id", shiftController.getShiftById);
router.patch("/:id", shiftController.updateShift);
router.delete("/:id", shiftController.cancelShift);

export default router;
