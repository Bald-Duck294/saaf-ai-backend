import express from "express";
// import {
//     getZoneWiseReport,
//     getAvailableZones,
//     exportReportCSV,
// } from "../controller/reportController.js";
import { verifyToken } from "../middlewares/authMiddleware.js"

import {
    getZoneWiseReport, getAvailableZones, exportReportCSV,
    getDailyCleaningReport, getCleanersForReport,
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
reportRouter.get("/daily-task", verifyToken, getDailyCleaningReport);
reportRouter.get("/detailed-cleaning", verifyToken, getDetailedCleaningReport);
reportRouter.get("/washroom-report", verifyToken, getWashroomReport)
reportRouter.get("/cleaner-report", verifyToken, getCleanerReport)



///////////////////////////////// CLEANERS & LOCATIONS FOR REPORT FILTERS //////////////////////////////////
reportRouter.get("/cleaners", verifyToken, getCleanersForReport);
reportRouter.get("/locations", verifyToken, getLocationsForReport);

/////////////////////////////////////////////  Not In Use //////////////////////////////////////////////////////////////
reportRouter.get('/ai-scoring', getAiScoringReport)  // not in use
reportRouter.get("/zone-wise/export", exportReportCSV); // not in use
reportRouter.get("/cleaner-performance-summary", getPerformanceSummary) // not in use





export default reportRouter;
