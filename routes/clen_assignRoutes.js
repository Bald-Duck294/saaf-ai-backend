import express from "express";


import { getAllAssignments , getAssignmentByCleanerUserId , createAssignment , updateAssignment , deleteAssignment } from "../controller/clenAssignController.js";
                                                                                                                              
const clen_assign_router = express.Router();

// CRUD routes
clen_assign_router.get("/assignments", getAllAssignments);       // Get all
clen_assign_router.get("/assignments/:id", getAssignmentByCleanerUserId);   // Get one
clen_assign_router.post("/assignments", createAssignment);       // Create
clen_assign_router.post("/assignments/:id", updateAssignment);    // Update
clen_assign_router.delete("/assignments/:id", deleteAssignment); // Delete

export default clen_assign_router;
