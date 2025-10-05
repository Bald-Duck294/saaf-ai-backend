import express, { Router } from "express";
import {
  getAllToilets,
  getToiletById,
  createLocation,
  getZonesWithToilets,
  getNearbyLocations,
  
  getSearchToilet,
  updateLocationById
} from "../controller/LocationsController.js";

console.log('in get location rutes');
const getLocationRoutes = express.Router();

// getLocationRoutes.get("/getUsers", getUser);
// getLocationRoutes.get('/getLocations' , getLocation);
getLocationRoutes.get("/", getAllToilets);
getLocationRoutes.post("/", createLocation);

getLocationRoutes.get("/zones", getZonesWithToilets);
getLocationRoutes.get('/nearby', getNearbyLocations);
getLocationRoutes.get("/:id", getToiletById);
getLocationRoutes.get("/search", getSearchToilet);
getLocationRoutes.post("/update/:id", updateLocationById);



// -------------- old routes ---------------

// getLocationRoutes.get("/getUsers", getUser);
// // getLocationRoutes.get('/getLocations' , getLocation);
// getLocationRoutes.get("/locations", getAllToilets);
// getLocationRoutes.post("/locations", createLocation);
// getLocationRoutes.get("/locations/:id", getToiletById);
// getLocationRoutes.get("/zones", getZonesWithToilets);
// getLocationRoutes.get('/nearby', getNearbyLocations);

export default getLocationRoutes;
