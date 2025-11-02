import express from "express";
// import {
//     getZoneWiseReport,
//     getAvailableZones,
//     exportReportCSV,
// } from "../controller/reportController.js";
import { verifyToken } from "../middlewares/authMiddleware.js"

import { getZoneWiseReport, getAvailableZones, exportReportCSV } from "../controller/reportController.js";
const reportRouter = express.Router();


reportRouter.get("/zone-wise", verifyToken, getZoneWiseReport);

reportRouter.get("/zones", getAvailableZones);


reportRouter.get("/zone-wise/export", exportReportCSV);

export default reportRouter;
