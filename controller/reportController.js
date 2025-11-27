// import prisma from "../config/database.js";
import prisma from "../config/prismaClient.mjs";
import RBACFilterService from "../utils/rbacFilterService.js";

import { serializeBigInt } from "../utils/serializer.js";
export const getZoneWiseReport = async (req, res) => {
    try {
        const {
            company_id,
            type_id,
            start_date,
            end_date,
            fields,
            review_filter,
        } = req.query;

        const user = req.user; // ✅ From verifyToken middleware

        console.log("Report params:", {
            company_id,
            type_id,
            start_date,
            end_date,
            review_filter,
            user_role_id: user?.role_id
        });

        if (!company_id) {
            return res.status(400).json({
                status: "error",
                message: "company_id is required",
            });
        }

        // ✅ BUILD LOCATION WHERE CLAUSE WITH RBAC FILTER
        // This handles both admin (all locations) and supervisor (assigned locations only)
        const locationWhereClause = {
            company_id: BigInt(company_id),
        };

        // ✅ Apply RBAC location filter (same as cleaner_review)
        // For Supervisor (role_id=3): filters to only their assigned locations
        // For Admin/Super-Admin: no filter (all locations)
        const roleFilter = await RBACFilterService.getLocationFilter(user, "location_report");
        Object.assign(locationWhereClause, roleFilter);

        if (type_id) {
            locationWhereClause.type_id = BigInt(type_id);
        }

        const requestedFields = fields ? fields.split(",") : [];

        // Fetch locations with RBAC filtering
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

        console.log(`Found ${locations.length} locations for company ${company_id} (with RBAC filter for role ${user?.role_id})`);

        // Build where clause for cleaner reviews
        // ❌ NO supervisor_id filter needed - location filtering already restricts this
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

        // Get location IDs from RBAC-filtered locations
        const locationIds = locations.map((loc) => loc.id);

        // ✅ Fetch reviews for RBAC-filtered locations only
        // If supervisor: only gets reviews for their assigned cleaners' locations
        // If admin: gets all reviews
        const cleanerReviews = await prisma.cleaner_review.findMany({
            where: {
                ...reviewWhereClause,
                location_id: {
                    in: locationIds,  // ✅ This restricts by RBAC-filtered locations
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

        console.log(`Found ${cleanerReviews.length} cleaner reviews from RBAC-filtered locations`);

        // Fetch hygiene scores for these locations
        const hygieneScoresWhereClause = {
            location_id: {
                in: locationIds,  // ✅ Also filtered by RBAC
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

        // Build report data for ALL RBAC-filtered locations
        const reportData = [];

        for (const location of locations) {
            const locationId = location.id.toString();
            const reviews = reviewsByLocation[locationId] || [];
            const hygieneScores = hygieneScoresByLocation[locationId] || [];

            // Apply review filter logic
            const hasReviews = reviews.length > 0;

            if (review_filter === "with_reviews" && !hasReviews) {
                continue;
            }

            if (review_filter === "without_reviews" && hasReviews) {
                continue;
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
            console.log(uniqueCleaners, "unique cleaners");
            const reportItem = {
                // Location details
                location_id: locationId,
                location_name: location.name || "Unknown",
                address: location.address || "N/A",
                city: location.city || "N/A",
                state: location.state || "N/A",
                district: location.dist || "N/A",
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
                has_reviews: hasReviews,

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

        // ✅ Add user role info to metadata
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

            // ✅ Add RBAC info
            user_role_id: user?.role_id,
            user_role_name: user?.role?.name || "Unknown",
            generated_by_user_id: user?.id,

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

            // Averages
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

const convertBigIntToString = (obj) => {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'bigint') {
        return obj.toString();
    }

    if (Array.isArray(obj)) {
        return obj.map(item => convertBigIntToString(item));
    }

    if (typeof obj === 'object') {
        const converted = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                converted[key] = convertBigIntToString(obj[key]);
            }
        }
        return converted;
    }

    return obj;
};



export const getDailyTaskReport = async (req, res) => {
    console.log('in get daily task report')
    try {
        const { company_id, start_date, end_date, location_id, cleaner_id, status_filter } = req.query;

        if (!company_id) {
            return res.status(400).json({ status: "error", message: "company_id is required" });
        }

        // Build the primary `where` clause for cleaner_review
        const whereClause = { company_id: BigInt(company_id) };
        if (location_id) whereClause.location_id = BigInt(location_id);
        if (cleaner_id) whereClause.cleaner_user_id = BigInt(cleaner_id);
        if (status_filter && status_filter !== "all") whereClause.status = status_filter;
        if (start_date || end_date) {
            whereClause.created_at = {};
            if (start_date) whereClause.created_at.gte = new Date(start_date);
            if (end_date) {
                const endDateTime = new Date(end_date);
                endDateTime.setHours(23, 59, 59, 999);
                whereClause.created_at.lte = endDateTime;
            }
        }

        const company = await prisma.companies.findUnique({
            where: { id: BigInt(company_id) },
            select: { name: true }
        });
        // 1. Fetch all matching cleaner review tasks
        const tasks = await prisma.cleaner_review.findMany({
            where: whereClause,
            include: {
                cleaner_user: { select: { name: true } },
                location: { select: { name: true, location_types: { select: { name: true } } } },
            },
            orderBy: { created_at: "desc" },
        });

        if (tasks.length === 0) {
            return res.status(200).json({
                status: "success", message: "No tasks found", data: [], count: 0, metadata: {
                    report_type: "Daily Task Report",
                    generated_on: new Date().toISOString(),
                    organization: company.name, // ✅ Include organization name even when no tasks
                    date_range: { start: start_date || "Beginning", end: end_date || "Now" },
                    total_tasks: 0,
                    completed_tasks: 0,
                    ongoing_tasks: 0,
                }
            });
        }

        // 2. Get all unique location IDs from the tasks
        const locationIds = [...new Set(tasks.map(task => task.location_id).filter(Boolean))];

        // 3. Fetch all hygiene scores for those locations in a single query
        const hygieneScores = await prisma.hygiene_scores.groupBy({
            by: ['location_id'],
            where: {
                location_id: { in: locationIds },
            },
            _avg: {
                score: true,
            },
        });

        // 4. Create a lookup map for quick access to average scores
        const averageScoresMap = new Map();
        hygieneScores.forEach(group => {
            if (group.location_id) {
                // Prisma returns score as a Decimal, so we convert it to a number
                const avgScore = group._avg.score ? Number(group._avg.score) : 0;
                averageScoresMap.set(group.location_id.toString(), avgScore);
            }
        });

        // 5. Transform the data, now with the average scores available
        const reportData = tasks.map((task) => {
            const durationMinutes = Math.round((new Date(task.updated_at || Date.now()) - new Date(task.created_at)) / 60000);

            const aiScore = task.score || 0;

            // ✅ Get the average hygiene score for the location from our map
            const finalRating = averageScoresMap.get(task.location_id?.toString()) || 0;

            return {
                task_id: task.id.toString(),
                cleaner_name: task.cleaner_user?.name || "Unknown",
                washroom_full_name: `${task.location?.name || "Unknown"}${task.location?.location_types?.name ? ` (${task.location.location_types.name})` : ''}`,
                task_start_time: task.created_at,
                task_end_time: task.status === "completed" ? task.updated_at : null,
                duration_minutes: durationMinutes,
                before_photo: task.before_photo || [],
                after_photo: task.after_photo || [],
                // All scores are on a 0-10 scale
                ai_score: parseFloat(aiScore.toFixed(2)),
                final_rating: parseFloat(finalRating.toFixed(2)),

                status: task.status,
            };
        });

        const { length: total_tasks } = reportData;
        const completed_tasks = reportData.filter(t => t.status === "completed").length;
        const ongoing_tasks = total_tasks - completed_tasks;

        const reportMetadata = {
            report_type: "Daily Task Report",
            generated_on: new Date().toISOString(),
            organization: company.name,
            date_range: { start: start_date || "Beginning", end: end_date || "Now" },
            total_tasks,
            completed_tasks,
            ongoing_tasks,
        };

        console.log(reportMetadata, "metadata")
        res.status(200).json({
            status: "success",
            message: "Daily task report generated successfully",
            metadata: reportMetadata,
            data: reportData,
            count: total_tasks,
        });
    } catch (error) {
        console.error("Error generating daily task report:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to generate daily task report",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


export const getCleanersForReport = async (req, res) => {
    try {
        const { company_id } = req.query;

        console.log(company_id, "company_id")
        if (!company_id) {
            return res.status(400).json({
                status: "error",
                message: "company_id is required",
            });
        }

        const cleaners = await prisma.users.findMany({
            where: {
                company_id: BigInt(company_id),
                role_id: 5, // Cleaner role
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                phone: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        // ✅ Manually convert BigInt to String
        const formattedCleaners = cleaners.map(cleaner => ({
            id: cleaner.id.toString(),
            name: cleaner.name,
            phone: cleaner.phone || "N/A"
        }));

        res.status(200).json({
            status: "success",
            data: formattedCleaners,
            count: formattedCleaners.length
        });

    } catch (error) {
        console.error("Error fetching cleaners:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch cleaners",
        });
    }
};


export const getLocationsForReport = async (req, res) => {
    try {
        const { company_id } = req.query;

        if (!company_id) {
            return res.status(400).json({
                status: "error",
                message: "company_id is required",
            });
        }

        const locations = await prisma.locations.findMany({
            where: {
                company_id: BigInt(company_id),
                status: true,
                deletedAt: null

            },
            select: {
                id: true,
                name: true,
                address: true,
                location_types: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                name: "asc",
            },
        });

        // ✅ Manually convert BigInt to String
        const formattedLocations = locations.map(loc => ({
            id: loc.id.toString(),
            name: loc.name,
            type: loc.location_types?.name || "N/A",
            address: loc.address || "N/A",
            display_name: `${loc.name}${loc.location_types?.name ? ` (${loc.location_types.name})` : ''}`
        }));

        res.status(200).json({
            status: "success",
            data: formattedLocations,
            count: formattedLocations.length
        });

    } catch (error) {
        console.error("Error fetching locations:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch locations",
        });
    }
};



export const getAiScoringReport = async (req, res) => {
    try {
        const { company_id, start_date, end_date, location_id } = req.query;

        if (!company_id) {
            return res.status(400).json({ status: "error", message: "company_id is required" });
        }

        // 1. Build `where` clause for hygiene_scores
        const whereClause = {
            locations: {
                company_id: BigInt(company_id),
            },
        };

        if (location_id) {
            whereClause.location_id = BigInt(location_id);
        }

        if (start_date || end_date) {
            whereClause.inspected_at = {};
            if (start_date) whereClause.inspected_at.gte = new Date(start_date);
            if (end_date) {
                const endDateTime = new Date(end_date);
                endDateTime.setHours(23, 59, 59, 999);
                whereClause.inspected_at.lte = endDateTime;
            }
        }

        // 2. Fetch all relevant scores, ordered by date
        const allScores = await prisma.hygiene_scores.findMany({
            where: whereClause,
            select: {
                location_id: true,
                score: true,
                locations: { // Include location name
                    select: { name: true }
                }
            },
            orderBy: {
                inspected_at: 'asc',
            },
        });

        if (allScores.length === 0) {
            return res.status(200).json({ status: "success", message: "No scores found", data: [], count: 0 });
        }

        // 3. Group scores by location_id
        const scoresByLocation = new Map();
        allScores.forEach(item => {
            const locId = item.location_id.toString();
            if (!scoresByLocation.has(locId)) {
                scoresByLocation.set(locId, {
                    location_name: item.locations.name,
                    scores: []
                });
            }
            // Convert score to a number and push
            scoresByLocation.get(locId).scores.push(Number(item.score));
        });

        // 4. Process each location to calculate average and improvement
        const reportData = [];
        for (const [locationId, { location_name, scores }] of scoresByLocation.entries()) {

            // Calculate overall average score
            const totalScore = scores.reduce((sum, score) => sum + score, 0);
            const averageScore = scores.length > 0 ? totalScore / scores.length : 0;

            // Calculate improvement
            let improvementPercentage = 0;
            if (scores.length >= 2) {
                const midpoint = Math.ceil(scores.length / 2);
                const firstHalf = scores.slice(0, midpoint);
                const secondHalf = scores.slice(midpoint);

                const avgFirstHalf = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
                const avgSecondHalf = secondHalf.length > 0 ? secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length : avgFirstHalf;

                if (avgFirstHalf > 0) {
                    improvementPercentage = ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100;
                }
            }

            reportData.push({
                location_id: locationId,
                location_name: location_name,
                average_score: parseFloat(averageScore.toFixed(2)),
                improvement_percentage: parseFloat(improvementPercentage.toFixed(2)),
                total_inspections: scores.length,
            });
        }

        // 5. Build Metadata
        const overallAverage = reportData.reduce((sum, loc) => sum + loc.average_score, 0) / (reportData.length || 1);

        const reportMetadata = {
            report_type: "AI Scoring Report",
            generated_on: new Date().toISOString(),
            date_range: { start: start_date || "Beginning", end: end_date || "Now" },
            total_locations_inspected: reportData.length,
            overall_average_score: parseFloat(overallAverage.toFixed(2)),
        };

        res.status(200).json({
            status: "success",
            message: "AI Scoring Report generated successfully",
            metadata: reportMetadata,
            data: reportData,
            count: reportData.length,
        });

    } catch (error) {
        console.error("Error generating AI Scoring Report:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to generate AI Scoring Report",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


export const getCleanerPerformanceReport = async (req, res) => {
    try {
        const { company_id, start_date, end_date } = req.query;

        if (!company_id) {
            return res.status(400).json({ status: "error", message: "company_id is required" });
        }

        // 1. Get the total number of checklist items for compliance calculation
        const checklistConfig = await prisma.configurations.findFirst({
            where: { name: "after_cleaning_checklist", company_id: BigInt(company_id) }
        });
        const totalChecklistItems = checklistConfig?.description?.length || 8;

        // 2. Build where clause for fetching cleaner reviews
        const whereClause = { company_id: BigInt(company_id) };
        if (start_date || end_date) {
            whereClause.created_at = {};
            if (start_date) whereClause.created_at.gte = new Date(start_date);
            if (end_date) {
                const endDateTime = new Date(end_date);
                endDateTime.setHours(23, 59, 59, 999);
                whereClause.created_at.lte = endDateTime;
            }
        }

        // 3. Fetch all cleaner reviews within the date range
        const reviews = await prisma.cleaner_review.findMany({
            where: whereClause,
            select: {
                cleaner_user_id: true,
                score: true, // AI Score
                tasks: true, // For compliance
                updated_at: true,
                created_at: true,
                final_comment: true, // For remarks count
            }
        });

        // 4. Group reviews by cleaner
        const cleanerData = new Map();
        for (const review of reviews) {
            if (!review.cleaner_user_id) continue;

            const cleanerId = review.cleaner_user_id.toString();
            if (!cleanerData.has(cleanerId)) {
                cleanerData.set(cleanerId, { scores: [], compliances: [], durations: [], remarks: 0 });
            }

            const data = cleanerData.get(cleanerId);
            if (review.score) data.scores.push(review.score);

            // Compliance
            const compliancePercentage = (review.tasks.length / totalChecklistItems) * 100;
            data.compliances.push(compliancePercentage);

            // Duration
            const duration = Math.round((new Date(review.updated_at || Date.now()) - new Date(review.created_at)) / 60000);
            data.durations.push(duration);

            // Remarks
            if (review.final_comment && review.final_comment.trim() !== "") {
                data.remarks++;
            }
        }

        // 5. Fetch cleaner names
        const cleanerIds = Array.from(cleanerData.keys()).map(id => BigInt(id));
        const cleaners = await prisma.users.findMany({
            where: { id: { in: cleanerIds } },
            select: { id: true, name: true },
        });
        const cleanerNameMap = new Map(cleaners.map(c => [c.id.toString(), c.name]));

        // 6. Calculate final report data for each cleaner
        const reportData = [];
        for (const [cleanerId, data] of cleanerData.entries()) {
            const totalTasks = data.scores.length;
            const avgAiScore = data.scores.reduce((a, b) => a + b, 0) / totalTasks * 10; // Scale to 100
            const avgCompliance = data.compliances.reduce((a, b) => a + b, 0) / totalTasks;
            const avgDuration = data.durations.reduce((a, b) => a + b, 0) / totalTasks;

            // Calculate Grade
            const finalScore = (avgAiScore * 0.5) + (avgCompliance * 0.4) + ((1 / (1 + data.remarks)) * 10); // Remarks bonus scaled to 10
            let grade = "D";
            if (finalScore >= 95) grade = "A+";
            else if (finalScore >= 85) grade = "A";
            else if (finalScore >= 75) grade = "B";
            else if (finalScore >= 60) grade = "C";

            reportData.push({
                cleaner_id: cleanerId,
                cleaner_name: cleanerNameMap.get(cleanerId) || "Unknown Cleaner",
                total_tasks: totalTasks,
                avg_ai_score: parseFloat(avgAiScore.toFixed(2)),
                avg_compliance: parseFloat(avgCompliance.toFixed(2)),
                avg_duration: parseFloat(avgDuration.toFixed(2)),
                remarks_count: data.remarks,
                grade: grade,
            });
        }

        // 7. Metadata and Response
        const metadata = {
            report_type: "Cleaner Performance Report",
            date_range: { start: start_date || "Beginning", end: end_date || "Now" },
            total_cleaners: reportData.length,
        };

        res.status(200).json({ status: "success", data: reportData, metadata });
    } catch (error) {
        console.error("Error generating Cleaner Performance Report:", error);
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
};


export const getPerformanceSummary = async (req, res) => {

    console.log("get performance summary report");
    try {
        const { company_id, start_date, end_date, cleaner_id } = req.query;

        if (!company_id) {
            return res.status(400).json({ status: "error", message: "company_id is required" });
        }

        // 1. Build user (cleaner) filter
        const userWhere = { company_id: BigInt(company_id), role_id: 5 }; // dev - only include cleaners
        if (cleaner_id) userWhere.id = BigInt(cleaner_id);

        const cleanerUsers = await prisma.users.findMany({
            where: userWhere,
            select: { id: true, name: true },
        });
        const cleanerUserIds = cleanerUsers.map(u => u.id);

        // 2. Build review filter
        const reviewWhere = { cleaner_user_id: { in: cleanerUserIds }, status: "completed" };
        if (start_date || end_date) {
            reviewWhere.created_at = {};
            if (start_date) reviewWhere.created_at.gte = new Date(start_date);
            if (end_date) {
                const e = new Date(end_date);
                e.setHours(23, 59, 59, 999);
                reviewWhere.created_at.lte = e;
            }
        }

        // 3. Get checklist config for compliance calculation
        const checklistConfig = await prisma.configurations.findFirst({
            where: { name: "after_cleaning_checklist", company_id: BigInt(company_id) }
        });
        const totalChecklistItems = checklistConfig?.description?.length || 8;

        // 4. Fetch all relevant reviews in one go
        const reviews = await prisma.cleaner_review.findMany({
            where: reviewWhere,
            select: {
                cleaner_user_id: true,
                score: true,
                tasks: true,
                created_at: true,
                updated_at: true,
            }
        });

        // 5. Group & aggregate data for each cleaner
        const statsByCleaner = {

        };
        for (const review of reviews) {
            const cId = review.cleaner_user_id?.toString();
            if (!cId) continue;
            if (!statsByCleaner[cId]) {
                statsByCleaner[cId] = {
                    tasks: 0,
                    aiScoreSum: 0,
                    complianceSum: 0,
                    durationSum: 0,
                    lastTaskDate: null,
                };
            }
            const stats = statsByCleaner[cId];
            stats.tasks += 1;
            stats.aiScoreSum += review.score || 0;
            stats.complianceSum += ((review.tasks?.length || 0) / totalChecklistItems) * 100;
            const created = new Date(review.created_at);
            const updated = review.updated_at ? new Date(review.updated_at) : new Date();
            const duration = Math.round((updated - created) / 60000);
            stats.durationSum += duration;
            if (!stats.lastTaskDate || updated > stats.lastTaskDate) {
                stats.lastTaskDate = updated;
            }
        }

        // 6. Prepare final output
        const data = cleanerUsers.map(u => {
            const stats = statsByCleaner[u.id.toString()] || { tasks: 0, aiScoreSum: 0, complianceSum: 0, durationSum: 0, lastTaskDate: null };
            return {
                cleaner_name: u.name,
                total_tasks: stats.tasks,
                avg_ai_score: stats.tasks ? Number((stats.aiScoreSum / stats.tasks).toFixed(1)) : 0,
                avg_compliance: stats.tasks ? Number((stats.complianceSum / stats.tasks).toFixed(1)) : 0,
                avg_duration: stats.tasks ? Number((stats.durationSum / stats.tasks).toFixed(1)) : 0,
                last_task_date: stats.lastTaskDate ? stats.lastTaskDate.toISOString() : null,
            };
        });

        return res.status(200).json({
            status: "success",
            message: "Cleaner performance summary generated",
            data,
            metadata: {
                report_type: "Cleaner Performance Summary",
                date_range: { start: start_date || "-", end: end_date || "-" },
                total_cleaners: cleanerUsers.length,
            },
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
};
