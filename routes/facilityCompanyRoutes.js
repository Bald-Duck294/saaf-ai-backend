import express from "express";
// import {
//     getAllFacilityCompanies,
//     getFacilityCompanyById,
//     createFacilityCompany,
//     updateFacilityCompany,
//     deleteFacilityCompany,
//     toggleFacilityCompanyStatus,
// } from "../controllers/facilityCompanyController.js";

import {
    getAllFacilityCompanies,
    getFacilityCompanyById
    , createFacilityCompany,
    updateFacilityCompany,
    deleteFacilityCompany,
    toggleFacilityCompanyStatus
} from "../controller/facilityCompanyController.js";

const facility_company_router = express.Router();


facility_company_router.get("/", getAllFacilityCompanies);

facility_company_router.get("/:id", getFacilityCompanyById);

facility_company_router.post("/", createFacilityCompany);

facility_company_router.put("/:id", updateFacilityCompany);

facility_company_router.delete("/:id", deleteFacilityCompany);

facility_company_router.patch("/:id/toggle-status", toggleFacilityCompanyStatus);

export default facility_company_router;
