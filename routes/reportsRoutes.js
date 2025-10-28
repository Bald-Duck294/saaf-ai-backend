import express from "express";
// import {
//     getZoneWiseReport,
//     getAvailableZones,
//     exportReportCSV,
// } from "../controller/reportController.js";

import { getZoneWiseReport , getAvailableZones , exportReportCSV } from "../controller/reportController.js";
const reportRouter = express.Router();

/**
 * @route   GET /api/reports/zone-wise
 * @desc    Get zone-wise cleaner activity report
 * @access  Private (add auth middleware as needed)
 * @query   company_id (required), type_id, start_date, end_date, fields
 * @example /api/reports/zone-wise?company_id=19&type_id=72&start_date=2025-10-01&end_date=2025-10-28
 */
reportRouter.get("/zone-wise", getZoneWiseReport);

/**
 * @route   GET /api/reports/zones
 * @desc    Get available zones/location types for filtering
 * @access  Private
 * @query   company_id (required)
 * @example /api/reports/zones?company_id=19
 */
reportRouter.get("/zones", getAvailableZones);

/**
 * @route   GET /api/reports/zone-wise/export
 * @desc    Export zone-wise report as CSV
 * @access  Private
 * @query   Same as /zone-wise endpoint
 */
reportRouter.get("/zone-wise/export", exportReportCSV);

export default reportRouter;
