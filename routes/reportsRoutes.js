import express from "express";
// import {
//     getZoneWiseReport,
//     getAvailableZones,
//     exportReportCSV,
// } from "../controller/reportController.js";
import { verifyToken } from "../middlewares/authMiddleware.js"

import {
    getZoneWiseReport, getAvailableZones, exportReportCSV,
    getDailyTaskReport, getCleanersForReport,
    getLocationsForReport,
    getAiScoringReport,
    getPerformanceSummary, getDetailedCleaningReport,
    getWashroomReport,
    getCleanerReport
} from "../controller/reportController.js";
const reportRouter = express.Router();


reportRouter.get("/zone-wise", verifyToken, getZoneWiseReport);

reportRouter.get("/zones", getAvailableZones);

// ✅ NEW: Daily Task Report routes
reportRouter.get("/daily-task", getDailyTaskReport);
reportRouter.get("/detailed-cleaning", getDetailedCleaningReport);
reportRouter.get("/cleaners", getCleanersForReport);
reportRouter.get("/locations", getLocationsForReport);
reportRouter.get('/ai-scoring', getAiScoringReport)
reportRouter.get("/zone-wise/export", exportReportCSV);
reportRouter.get("/cleaner-performance-summary", getPerformanceSummary)
reportRouter.get("/washroom-report", getWashroomReport)
reportRouter.get("/cleaner-report", getCleanerReport)


export default reportRouter;
