// routes/dashboardRoutes.js
import express from 'express';
import {
    getDashboardCounts,
    getTopRatedLocations,
    getTodaysActivities
} from "../controller/dashboardController.js";
import { verifyToken } from '../middlewares/authMiddleware.js';
const dashboardRoutes = express.Router();

dashboardRoutes.get('/counts', verifyToken, getDashboardCounts);
dashboardRoutes.get('/top-locations', verifyToken, getTopRatedLocations);
dashboardRoutes.get('/activities', verifyToken, getTodaysActivities);

export default dashboardRoutes;
