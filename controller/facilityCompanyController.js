// import { serializeBigInt } from "../utils/serializeBigInt.js";
import { serializeBigInt } from "../utils/serializer.js";
import prisma from "../config/prismaClient.mjs";
import { json } from "express";


export const getAllFacilityCompanies = async (req, res) => {
    try {
        const { company_id, include_inactive, facility_company_id } = req.query;

        console.log("Fetching facility companies:", { company_id, include_inactive });
        const whereClause = {};
        // Validate company_id
        // if (!company_id) {
        //     return res.status(400).json({
        //         status: "error",
        //         message: "company_id is required",
        //     });
        // }

        // Build where clause
        if (company_id) {
            whereClause.company_id = BigInt(company_id),
                whereClause.deletedAt = null
        }


        // By default, only show active facility companies
        // Unless explicitly requested to include inactive ones
        if (include_inactive !== "true") {
            whereClause.status = true;
        }

        // Add facility company filter if provided
        if (facility_company_id) {
            whereClause.facility_company_id = BigInt(facility_company_id);
        }
        const facilityCompanies = await prisma.facility_companies.findMany({
            where: whereClause,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                locations: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        // Update active_locations count for each facility company
        const facilityCompaniesWithCounts = facilityCompanies.map((fc) => ({
            ...fc,
            active_locations: fc.locations.length,
        }));

        res.status(200).json({
            status: "success",
            message: "Facility companies retrieved successfully",
            data: serializeBigInt(facilityCompaniesWithCounts),
            count: facilityCompanies.length,
        });
    } catch (error) {
        console.error("Error fetching facility companies:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch facility companies",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


export const getFacilityCompanyById = async (req, res) => {
    try {
        const { id } = req.params;

        const facilityCompany = await prisma.facility_companies.findUnique({
            where: {
                id: BigInt(id),
                deletedAt: null,
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                locations: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true,
                    },
                },
            },
        });

        if (!facilityCompany) {
            return res.status(404).json({
                status: "error",
                message: "Facility company not found",
            });
        }

        res.status(200).json({
            status: "success",
            message: "Facility company retrieved successfully",
            data: serializeBigInt(facilityCompany),
        });
    } catch (error) {
        console.error("Error fetching facility company:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch facility company",
        });
    }
};


export const createFacilityCompany = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            contact_person_name,
            contact_person_phone,
            contact_person_email,
            address,
            city,
            state,
            pincode,
            country,
            registration_number,
            pan_number,
            license_number,
            license_expiry_date,
            contract_start_date,
            contract_end_date,
            rating,
            description,
            company_id,
            status,
        } = req.body;

        console.log(req.body, "registration number")
        // Validate required fields
        if (!name || !phone || !contact_person_name || !company_id) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields: name, phone, contact_person_name, company_id",
            });
        }

        const existingPhone = await prisma.facility_companies.findFirst({
            where: {
                phone: phone
            }
        })
        if (existingPhone) { return res.status(500).json({ status: 'error', message: 'phone number alredy exist' }) }
        // Check if registration number already exists
        if (registration_number) {
            // console.log('inside registration company');
            const existing = await prisma.facility_companies.findUnique({
                where: { registration_number },
            });

            if (existing) {
                return res.status(400).json({
                    status: "error",
                    message: "Facility company with this registration number already exists",
                });
            }
        }

        // Create facility company
        const facilityCompany = await prisma.facility_companies.create({
            data: {
                name,
                email,
                phone,
                contact_person_name,
                contact_person_phone,
                contact_person_email,
                address,
                city,
                state,
                pincode,
                country: country || "India",
                registration_number: registration_number && registration_number.trim() !== ""
                    ? registration_number
                    : null,
                pan_number,
                license_number,
                license_expiry_date: license_expiry_date
                    ? new Date(license_expiry_date)
                    : null,
                contract_start_date: contract_start_date
                    ? new Date(contract_start_date)
                    : null,
                contract_end_date: contract_end_date
                    ? new Date(contract_end_date)
                    : null,
                rating: rating || 0,
                description,
                company_id: BigInt(company_id),
                status: status !== undefined ? status : true,
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        res.status(201).json({
            status: "success",
            message: "Facility company created successfully",
            data: serializeBigInt(facilityCompany),
        });
    } catch (error) {
        console.error("Error creating facility company:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to create facility company",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


export const updateFacilityCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Check if facility company exists
        const existing = await prisma.facility_companies.findUnique({
            where: {
                id: BigInt(id),
                deletedAt: null,
            },
        });

        if (!existing) {
            return res.status(404).json({
                status: "error",
                message: "Facility company not found",
            });
        }

        // Check if updating registration number and it conflicts
        if (
            updateData.registration_number &&
            updateData.registration_number !== existing.registration_number
        ) {
            const conflict = await prisma.facility_companies.findUnique({
                where: { registration_number: updateData.registration_number },
            });

            if (conflict) {
                return res.status(400).json({
                    status: "error",
                    message: "Facility company with this registration number already exists",
                });
            }
        }

        // Prepare update data
        const dataToUpdate = {
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.email !== undefined && { email: updateData.email }),
            ...(updateData.phone && { phone: updateData.phone }),
            ...(updateData.contact_person_name && {
                contact_person_name: updateData.contact_person_name,
            }),
            ...(updateData.contact_person_phone !== undefined && {
                contact_person_phone: updateData.contact_person_phone,
            }),
            ...(updateData.contact_person_email !== undefined && {
                contact_person_email: updateData.contact_person_email,
            }),
            ...(updateData.address !== undefined && { address: updateData.address }),
            ...(updateData.city !== undefined && { city: updateData.city }),
            ...(updateData.state !== undefined && { state: updateData.state }),
            ...(updateData.pincode !== undefined && { pincode: updateData.pincode }),
            ...(updateData.country !== undefined && { country: updateData.country }),
            ...(updateData.registration_number !== undefined && {
                registration_number: updateData.registration_number,
            }),
            ...(updateData.pan_number !== undefined && {
                pan_number: updateData.pan_number,
            }),
            ...(updateData.license_number !== undefined && {
                license_number: updateData.license_number,
            }),
            ...(updateData.license_expiry_date !== undefined && {
                license_expiry_date: updateData.license_expiry_date
                    ? new Date(updateData.license_expiry_date)
                    : null,
            }),
            ...(updateData.contract_start_date !== undefined && {
                contract_start_date: updateData.contract_start_date
                    ? new Date(updateData.contract_start_date)
                    : null,
            }),
            ...(updateData.contract_end_date !== undefined && {
                contract_end_date: updateData.contract_end_date
                    ? new Date(updateData.contract_end_date)
                    : null,
            }),
            ...(updateData.rating !== undefined && { rating: updateData.rating }),
            ...(updateData.description !== undefined && {
                description: updateData.description,
            }),
            ...(updateData.status !== undefined && { status: updateData.status }),
            ...(updateData.total_locations_managed !== undefined && {
                total_locations_managed: updateData.total_locations_managed,
            }),
            ...(updateData.active_locations !== undefined && {
                active_locations: updateData.active_locations,
            }),
        };

        // Update facility company
        const updatedFacilityCompany = await prisma.facility_companies.update({
            where: {
                id: BigInt(id),
            },
            data: dataToUpdate,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                locations: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        res.status(200).json({
            status: "success",
            message: "Facility company updated successfully",
            data: serializeBigInt(updatedFacilityCompany),
        });
    } catch (error) {
        console.error("Error updating facility company:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to update facility company",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


export const deleteFacilityCompany = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if facility company exists
        const existing = await prisma.facility_companies.findUnique({
            where: {
                id: BigInt(id),
                deletedAt: null,
            },
            include: {
                locations: true,
            },
        });

        if (!existing) {
            return res.status(404).json({
                status: "error",
                message: "Facility company not found",
            });
        }

        // Check if facility company has active locations
        if (existing.locations.length > 0) {
            return res.status(400).json({
                status: "error",
                message: `Cannot delete facility company. It has ${existing.locations.length} location(s) assigned.`,
                locations_count: existing.locations.length,
            });
        }

        // Soft delete (set deletedAt timestamp)
        const deletedFacilityCompany = await prisma.facility_companies.update({
            where: {
                id: BigInt(id),
            },
            data: {
                deletedAt: new Date(),
                status: false, // Also mark as inactive
            },
        });

        res.status(200).json({
            status: "success",
            message: "Facility company deleted successfully",
            data: serializeBigInt(deletedFacilityCompany),
        });
    } catch (error) {
        console.error("Error deleting facility company:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to delete facility company",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


export const toggleFacilityCompanyStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const facilityCompany = await prisma.facility_companies.findUnique({
            where: {
                id: BigInt(id),
                deletedAt: null,
            },
        });

        if (!facilityCompany) {
            return res.status(404).json({
                status: "error",
                message: "Facility company not found",
            });
        }

        const updatedFacilityCompany = await prisma.facility_companies.update({
            where: {
                id: BigInt(id),
            },
            data: {
                status: !facilityCompany.status,
            },
        });

        res.status(200).json({
            status: "success",
            message: `Facility company ${updatedFacilityCompany.status ? "activated" : "deactivated"
                } successfully`,
            data: serializeBigInt(updatedFacilityCompany),
        });
    } catch (error) {
        console.error("Error toggling facility company status:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to toggle facility company status",
        });
    }
};
