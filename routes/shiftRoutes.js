import express from "express";

import { createShift, getAllShifts, getShiftById, updateShift, deleteShift, toggleShiftStatus } from "../controller/shiftController.js";
const shift_router = express.Router();

shift_router.get("/", getAllShifts);

shift_router.get("/:id", getShiftById);

shift_router.post("/", createShift);

shift_router.put("/:id", updateShift);

shift_router.delete("/:id", deleteShift);

shift_router.patch("/:id/toggle-status", toggleShiftStatus);


export default shift_router;
