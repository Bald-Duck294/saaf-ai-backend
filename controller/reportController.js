// import prisma from "../config/database.js";
import prisma from "../config/prismaClient.mjs";
// import { serializeBigInt } from "../utils/serializeBigInt.js";


// export const getZoneWiseReport = async (req, res) => {
//   try {
//     const {
//       company_id,
//       type_id, // location_type_id (zone/area)
//       start_date,
//       end_date,
//       fields, // Optional: comma-separated list of additional fields
//     } = req.query;

//     console.log("Report params:", { company_id, type_id, start_date, end_date });

//     // Validate required parameters
//     if (!company_id) {
//       return res.status(400).json({
//         status: "error",
//         message: "company_id is required",
//       });
//     }

//     // Build where clause for cleaner reviews
//     const reviewWhereClause = {
//       company_id: BigInt(company_id),
//       status: "completed", // Only completed reviews for reports
//     };

//     // Filter by date range for cleaner reviews
//     if (start_date || end_date) {
//       reviewWhereClause.created_at = {};
//       if (start_date) {
//         reviewWhereClause.created_at.gte = new Date(start_date);
//       }
//       if (end_date) {
//         // Include the entire end date (till 23:59:59)
//         const endDateTime = new Date(end_date);
//         endDateTime.setHours(23, 59, 59, 999);
//         reviewWhereClause.created_at.lte = endDateTime;
//       }
//     }

//     // Build location where clause for zone filtering
//     const locationWhereClause = {
//       company_id: BigInt(company_id),
//     };

//     if (type_id) {
//       locationWhereClause.type_id = BigInt(type_id);
//     }

//     // Parse additional fields requested
//     const requestedFields = fields ? fields.split(",") : [];

//     // Dynamic select object for locations
//     const locationSelect = {
//       id: true,
//       name: true,
//       address: true,
//       city: true,
//       state: true,
//       latitude: true,
//       longitude: true,
//       type_id: true,
//       location_types: {
//         select: {
//           id: true,
//           name: true,
//         },
//       },
//     };

//     // Add optional location fields if requested
//     if (requestedFields.includes("pincode")) {
//       locationSelect.pincode = true;
//     }
//     if (requestedFields.includes("status")) {
//       locationSelect.status = true;
//     }
//     if (requestedFields.includes("images")) {
//       locationSelect.images = true;
//     }

//     // Dynamic select for cleaner user
//     const cleanerUserSelect = {
//       id: true,
//       name: true,
//       phone: true,
//       email: true,
//     };

//     // Add optional cleaner fields if requested
//     if (requestedFields.includes("cleaner_age")) {
//       cleanerUserSelect.age = true;
//     }
//     if (requestedFields.includes("cleaner_role")) {
//       cleanerUserSelect.role = {
//         select: {
//           name: true,
//         },
//       };
//     }

//     // Fetch cleaner reviews with related data
//     const cleanerReviews = await prisma.cleaner_review.findMany({
//       where: reviewWhereClause,
//       include: {
//         location: {
//           select: locationSelect,
//         },
//         cleaner_user: {
//           select: cleanerUserSelect,
//         },
//         company: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//       },
//       orderBy: {
//         created_at: "desc",
//       },
//     });

//     // Filter reviews by zone if type_id is provided
//     const filteredReviews = type_id
//       ? cleanerReviews.filter(
//           (review) => review.location?.type_id?.toString() === type_id
//         )
//       : cleanerReviews;

//     // Get unique location IDs from filtered reviews
//     const locationIds = [
//       ...new Set(filteredReviews.map((r) => r.location_id).filter(Boolean)),
//     ];

//     // Fetch hygiene scores for these locations to calculate average rating
//     const hygieneScoresData = await prisma.hygiene_scores.findMany({
//       where: {
//         location_id: {
//           in: locationIds,
//         },
//         // Optionally filter hygiene scores by date range too
//         ...(start_date || end_date
//           ? {
//               inspected_at: {
//                 ...(start_date && { gte: new Date(start_date) }),
//                 ...(end_date && {
//                   lte: (() => {
//                     const endDateTime = new Date(end_date);
//                     endDateTime.setHours(23, 59, 59, 999);
//                     return endDateTime;
//                   })(),
//                 }),
//               },
//             }
//           : {}),
//       },
//       select: {
//         location_id: true,
//         score: true,
//         inspected_at: true,
//       },
//       orderBy: {
//         inspected_at: "desc",
//       },
//     });

//     // Group hygiene scores by location
//     const hygieneScoresByLocation = {};
//     for (const hygieneScore of hygieneScoresData) {
//       const locationId = hygieneScore.location_id?.toString();
//       if (!locationId) continue;

//       if (!hygieneScoresByLocation[locationId]) {
//         hygieneScoresByLocation[locationId] = [];
//       }
//       hygieneScoresByLocation[locationId].push(
//         parseFloat(hygieneScore.score || 0)
//       );
//     }

//     // Calculate statistics for each location
//     const locationStats = {};

//     for (const review of filteredReviews) {
//       const locationId = review.location_id?.toString();

//       if (!locationId) continue;

//       if (!locationStats[locationId]) {
//         locationStats[locationId] = {
//           location: review.location,
//           company: review.company,
//           reviews: [],
//           cleaners: new Set(),
//         };
//       }

//       locationStats[locationId].reviews.push(review);
//       locationStats[locationId].cleaners.add(
//         review.cleaner_user_id?.toString()
//       );
//     }

//     // Build report data with calculated metrics
//     const reportData = [];

//     for (const [locationId, stats] of Object.entries(locationStats)) {
//       const latestReview = stats.reviews[0]; // Most recent review (already sorted)

//       // Calculate average rating from hygiene_scores
//       const hygieneScores = hygieneScoresByLocation[locationId] || [];
//       const avgRating =
//         hygieneScores.length > 0
//           ? hygieneScores.reduce((sum, score) => sum + score, 0) /
//             hygieneScores.length
//           : 0;

//       // Current score from latest cleaner_review
//       const currentScore = latestReview.score || 0;

//       const reportItem = {
//         // Location details
//         location_id: locationId,
//         location_name: stats.location?.name || "Unknown",
//         address: stats.location?.address || "N/A",
//         city: stats.location?.city || "N/A",
//         state: stats.location?.state || "N/A",
//         zone: stats.location?.location_types?.name || "N/A",
//         latitude: stats.location?.latitude || null,
//         longitude: stats.location?.longitude || null,

//         // Cleaner details (from latest review)
//         cleaner_id: latestReview.cleaner_user_id?.toString() || null,
//         cleaner_name: latestReview.cleaner_user?.name || "Unknown",
//         cleaner_phone: latestReview.cleaner_user?.phone || "N/A",

//         // Scores
//         current_score: parseFloat(currentScore.toFixed(2)), // From cleaner_review.score
//         average_rating: parseFloat(avgRating.toFixed(2)), // From hygiene_scores
//         hygiene_score_count: hygieneScores.length, // Number of hygiene inspections

//         // Review details
//         review_status: latestReview.status || "N/A",
//         last_review_date: latestReview.created_at || null,
//         total_reviews: stats.reviews.length,
//         unique_cleaners: stats.cleaners.size,

//         // Company details
//         company_name: stats.company?.name || "N/A",
//         facility_company: "Facility Management Co.", // Hardcoded as requested

//         // Additional optional fields
//         ...(requestedFields.includes("pincode") && {
//           pincode: stats.location?.pincode || "N/A",
//         }),
//         ...(requestedFields.includes("tasks") && {
//           tasks: latestReview.tasks || [],
//         }),
//         ...(requestedFields.includes("comments") && {
//           initial_comment: latestReview.initial_comment || "",
//           final_comment: latestReview.final_comment || "",
//         }),
//         ...(requestedFields.includes("photos") && {
//           before_photos: latestReview.before_photo || [],
//           after_photos: latestReview.after_photo || [],
//         }),
//       };

//       reportData.push(reportItem);
//     }

//     // Sort by current score (descending) for better presentation
//     reportData.sort((a, b) => b.current_score - a.current_score);

//     // Prepare report header/metadata
//     const reportMetadata = {
//       organization: reportData[0]?.company_name || "N/A",
//       zone: type_id ? reportData[0]?.zone || "All Zones" : "All Zones",
//       date_range: {
//         start: start_date || "Beginning",
//         end: end_date || "Now",
//       },
//       report_type: "Zone-wise Cleaner Activity Report",
//       generated_on: new Date().toISOString(),
//       total_locations: reportData.length,
//       total_reviews: reportData.reduce(
//         (sum, item) => sum + item.total_reviews,
//         0
//       ),
//       average_score_overall:
//         reportData.length > 0
//           ? parseFloat(
//               (
//                 reportData.reduce((sum, item) => sum + item.current_score, 0) /
//                 reportData.length
//               ).toFixed(2)
//             )
//           : 0,
//       average_rating_overall:
//         reportData.length > 0
//           ? parseFloat(
//               (
//                 reportData.reduce((sum, item) => sum + item.average_rating, 0) /
//                 reportData.length
//               ).toFixed(2)
//             )
//           : 0,
//     };

//     res.status(200).json({
//       status: "success",
//       message: "Report generated successfully",
//       metadata: reportMetadata,
//       data: reportData,
//       count: reportData.length,
//     });
//   } catch (error) {
//     console.error("Error generating zone-wise report:", error);
//     res.status(500).json({
//       status: "error",
//       message: "Failed to generate report",
//       error: process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// };

export const getZoneWiseReport = async (req, res) => {
    try {
        const {
            company_id,
            type_id,
            start_date,
            end_date,
            fields,
            review_filter, // New parameter: "all", "with_reviews", "without_reviews"
        } = req.query;

        console.log("Report params:", { company_id, type_id, start_date, end_date, review_filter });

        if (!company_id) {
            return res.status(400).json({
                status: "error",
                message: "company_id is required",
            });
        }

        // Build location where clause
        const locationWhereClause = {
            company_id: BigInt(company_id),
        };

        if (type_id) {
            locationWhereClause.type_id = BigInt(type_id);
        }

        const requestedFields = fields ? fields.split(",") : [];

        // Fetch ALL locations first
        const locations = await prisma.locations.findMany({
            where: locationWhereClause,
            include: {
                location_types: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                facility_companies: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },

            orderBy: {
                name: "asc",
            },
        });

        console.log(`Found ${locations.length} locations for company ${company_id}`);

        // Build where clause for cleaner reviews
        const reviewWhereClause = {
            company_id: BigInt(company_id),
            status: "completed",
        };

        // Filter by date range
        if (start_date || end_date) {
            reviewWhereClause.created_at = {};
            if (start_date) {
                reviewWhereClause.created_at.gte = new Date(start_date);
            }
            if (end_date) {
                const endDateTime = new Date(end_date);
                endDateTime.setHours(23, 59, 59, 999);
                reviewWhereClause.created_at.lte = endDateTime;
            }
        }

        // Get location IDs to filter reviews
        const locationIds = locations.map((loc) => loc.id);

        // Fetch cleaner reviews for these locations
        const cleanerReviews = await prisma.cleaner_review.findMany({
            where: {
                ...reviewWhereClause,
                location_id: {
                    in: locationIds,
                },
            },
            include: {
                cleaner_user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                created_at: "desc",
            },
        });

        console.log(`Found ${cleanerReviews.length} cleaner reviews`);

        // Fetch hygiene scores for these locations
        const hygieneScoresWhereClause = {
            location_id: {
                in: locationIds,
            },
        };

        if (start_date || end_date) {
            hygieneScoresWhereClause.inspected_at = {};
            if (start_date) {
                hygieneScoresWhereClause.inspected_at.gte = new Date(start_date);
            }
            if (end_date) {
                const endDateTime = new Date(end_date);
                endDateTime.setHours(23, 59, 59, 999);
                hygieneScoresWhereClause.inspected_at.lte = endDateTime;
            }
        }

        const hygieneScoresData = await prisma.hygiene_scores.findMany({
            where: hygieneScoresWhereClause,
            select: {
                location_id: true,
                score: true,
                inspected_at: true,
            },
            orderBy: {
                inspected_at: "desc",
            },
        });

        console.log(`Found ${hygieneScoresData.length} hygiene scores`);

        // Group data by location
        const reviewsByLocation = {};
        const hygieneScoresByLocation = {};

        // Group cleaner reviews
        for (const review of cleanerReviews) {
            const locationId = review.location_id?.toString();
            if (!locationId) continue;

            if (!reviewsByLocation[locationId]) {
                reviewsByLocation[locationId] = [];
            }
            reviewsByLocation[locationId].push(review);
        }

        // Group hygiene scores
        for (const hygieneScore of hygieneScoresData) {
            const locationId = hygieneScore.location_id?.toString();
            if (!locationId) continue;

            if (!hygieneScoresByLocation[locationId]) {
                hygieneScoresByLocation[locationId] = [];
            }
            hygieneScoresByLocation[locationId].push(
                parseFloat(hygieneScore.score || 0)
            );
        }

        // Build report data for ALL locations
        const reportData = [];

        for (const location of locations) {
            const locationId = location.id.toString();
            const reviews = reviewsByLocation[locationId] || [];
            const hygieneScores = hygieneScoresByLocation[locationId] || [];

            // Apply review filter logic
            const hasReviews = reviews.length > 0;

            // review_filter options:
            // "all" or undefined: show all locations (default)
            // "with_reviews": only show locations that have reviews
            // "without_reviews": only show locations without reviews

            if (review_filter === "with_reviews" && !hasReviews) {
                continue; // Skip locations without reviews
            }

            if (review_filter === "without_reviews" && hasReviews) {
                continue; // Skip locations with reviews
            }

            // Get latest review (if exists)
            const latestReview = reviews[0];

            // Calculate average rating from hygiene scores
            const avgRating =
                hygieneScores.length > 0
                    ? hygieneScores.reduce((sum, score) => sum + score, 0) /
                    hygieneScores.length
                    : 0;

            // Current score from latest cleaner review
            const currentScore = latestReview?.score || 0;

            // Get unique cleaners
            const uniqueCleaners = new Set(
                reviews.map((r) => r.cleaner_user_id?.toString()).filter(Boolean)
            );

            const reportItem = {
                // Location details
                location_id: locationId,
                location_name: location.name || "Unknown",
                address: location.address || "N/A",
                city: location.city || "N/A",
                state: location.state || "N/A",
                zone: location.location_types?.name || "N/A",
                latitude: location.latitude || null,
                longitude: location.longitude || null,

                // Cleaner details (from latest review if exists)
                cleaner_id: latestReview?.cleaner_user_id?.toString() || null,
                cleaner_name: latestReview?.cleaner_user?.name || "Not Assigned",
                cleaner_phone: latestReview?.cleaner_user?.phone || "N/A",

                // Scores
                current_score: parseFloat(currentScore.toFixed(2)),
                average_rating: parseFloat(avgRating.toFixed(2)),
                hygiene_score_count: hygieneScores.length,

                // Review details
                review_status: latestReview?.status || "No Reviews",
                last_review_date: latestReview?.created_at || null,
                total_reviews: reviews.length,
                unique_cleaners: uniqueCleaners.size,
                has_reviews: hasReviews, // Add flag to indicate if location has reviews

                // Company details
                company_name: latestReview?.company?.name || location.companies?.name || "N/A",
                facility_company: location.facility_companies?.name || "Not Assigned",
                facility_company_id: location.facility_companies?.id?.toString() || null,
                facility_company_phone: location.facility_companies?.phone || null,
                facility_company_email: location.facility_companies?.email || null,
                // Optional fields
                ...(requestedFields.includes("pincode") && {
                    pincode: location.pincode || "N/A",
                }),
                ...(requestedFields.includes("tasks") && {
                    tasks: latestReview?.tasks || [],
                }),
                ...(requestedFields.includes("comments") && {
                    initial_comment: latestReview?.initial_comment || "",
                    final_comment: latestReview?.final_comment || "",
                }),
                ...(requestedFields.includes("photos") && {
                    before_photos: latestReview?.before_photo || [],
                    after_photos: latestReview?.after_photo || [],
                }),
            };

            reportData.push(reportItem);
        }

        // Sort by current score (descending)
        reportData.sort((a, b) => b.current_score - a.current_score);

        // Get company name
        const companyName = await prisma.companies.findUnique({
            where: { id: BigInt(company_id) },
            select: { name: true },
        });

        // Prepare metadata with filter information
        const reportMetadata = {
            organization: companyName?.name || "N/A",
            zone: type_id
                ? locations[0]?.location_types?.name || "Selected Zone"
                : "All Zones",
            date_range: {
                start: start_date || "Beginning",
                end: end_date || "Now",
            },
            report_type: "Zone-wise Cleaner Activity Report",
            generated_on: new Date().toISOString(),

            // Filter information
            review_filter: review_filter || "all",
            filter_description:
                review_filter === "with_reviews" ? "Showing only locations with reviews" :
                    review_filter === "without_reviews" ? "Showing only locations without reviews" :
                        "Showing all locations",

            // Statistics
            total_locations: reportData.length,
            total_reviews: reportData.reduce(
                (sum, item) => sum + item.total_reviews,
                0
            ),
            locations_with_reviews: reportData.filter(item => item.has_reviews).length,
            locations_without_reviews: reportData.filter(item => !item.has_reviews).length,

            // Averages (only calculate for locations with scores)
            average_score_overall:
                reportData.length > 0
                    ? parseFloat(
                        (
                            reportData.reduce((sum, item) => sum + item.current_score, 0) /
                            reportData.length
                        ).toFixed(2)
                    )
                    : 0,
            average_rating_overall:
                reportData.length > 0
                    ? parseFloat(
                        (
                            reportData.reduce((sum, item) => sum + item.average_rating, 0) /
                            reportData.length
                        ).toFixed(2)
                    )
                    : 0,
        };

        res.status(200).json({
            status: "success",
            message: "Report generated successfully",
            metadata: reportMetadata,
            data: reportData,
            count: reportData.length,
        });
    } catch (error) {
        console.error("Error generating zone-wise report:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to generate report",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get available zones/areas for filter
 */
export const getAvailableZones = async (req, res) => {
    try {
        const { company_id } = req.query;

        if (!company_id) {
            return res.status(400).json({
                status: "error",
                message: "company_id is required",
            });
        }

        const zones = await prisma.location_types.findMany({
            where: {
                company_id: BigInt(company_id),
            },
            select: {
                id: true,
                name: true,
                is_toilet: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        const serialized = zones.map((zone) => ({
            id: zone.id.toString(),
            name: zone.name,
            is_toilet: zone.is_toilet,
        }));

        res.status(200).json({
            status: "success",
            data: serialized,
        });
    } catch (error) {
        console.error("Error fetching zones:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch zones",
        });
    }
};

/**
 * Export report as CSV (optional utility)
 */
export const exportReportCSV = async (req, res) => {
    // Implementation for CSV export
    // You can add this later if needed
    res.status(501).json({
        status: "info",
        message: "CSV export coming soon",
    });
};

