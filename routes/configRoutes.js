// import express from "express";

// import {
//   getConfigurationById,
//   getConfigurationByName,
// } from "../controller/configController.js";

// const configRouter = express.Router();

// configRouter.get("/configurations/:name", getConfigurationByName);
// configRouter.get("/configurations/id/:id", getConfigurationById);

// export default configRouter;


// routes/configurationRoutes.js
import express from 'express';
import {
  getAllConfigurations,
  getConfigurationById,
  getConfigurationByName,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
  toggleConfigurationStatus,
  duplicateConfiguration,
  getConfigurationTemplates
} from "../controller/configController.js"

const router = express.Router();

// GET routes
router.get('/', getAllConfigurations);                    // GET /api/configurations
router.get('/:name', getConfigurationByName);             // GET /api/configurations/Toilet_Features
router.get('/id/:id', getConfigurationById);              // GET /api/configurations/id/1
// Add to your existing configurationRoutes.js
// router.get('/templates', getConfigurationTemplates);  // Add this line

// POST routes
// router.post('/', createConfiguration);                    // POST /api/configurations
// router.post('/:id/duplicate', duplicateConfiguration);    // POST /api/configurations/1/duplicate

// PATCH routes
// router.patch('/:id', updateConfiguration);                // PATCH /api/configurations/1
// router.patch('/:id/toggle-status', toggleConfigurationStatus); // PATCH /api/configurations/1/toggle-status

// DELETE routes
// router.delete('/:id', deleteConfiguration);               // DELETE /api/configurations/1

export default router;
