import express, { Router } from "express";
import { registeredUsersController } from "../controller/registerUserController.js";
const registered_users_router = express.Router();

// Admin routes for managing registered users
registered_users_router.get("/registered-users", registeredUsersController.getAllRegisteredUsers);
registered_users_router.post("/registered-users", registeredUsersController.createRegisteredUser);

// Auth routes for user registration flow
registered_users_router.post("/auth/verify-phone", registeredUsersController.verifyPhone);
registered_users_router.post("/auth/set-password", registeredUsersController.setPassword);

export default registered_users_router;
