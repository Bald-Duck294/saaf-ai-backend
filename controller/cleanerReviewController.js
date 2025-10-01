import prisma from "../config/prismaClient.mjs";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

// =========================================================
// 1️⃣ GET all cleaner reviews (with filters)
// =========================================================

// const BASE_URL = process.env.BASE_URL || "https://safai-index-backend.onrender.com";

export async function getCleanerReview(req, res) {
  console.log("request made");

  const { cleaner_user_id, status, date, company_id } = req.query;

  console.log(company_id, "company_id from get cleaner review");

  try {
    const whereClause = {};

    if (cleaner_user_id) {
      whereClause.cleaner_user_id = BigInt(cleaner_user_id);
    }
    if (company_id) {
      whereClause.company_id = company_id
    }

    if (status) {
      whereClause.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);

      whereClause.created_at = {
        gte: startDate,
        lt: endDate,
      };
    }

    const reviews = await prisma.cleaner_review.findMany({
      where: whereClause,
    });

    // console.log('befor serilize')
    const serialized = reviews.map((r) => {
      const safeReview = {};
      for (const [key, value] of Object.entries(r)) {
        safeReview[key] = typeof value === "bigint" ? value.toString() : value;
      }
      return safeReview;
    });

    console.log(serialized.length, "data");
    res.json(serialized);
  } catch (err) {
    console.error("Fetch Cleaner Reviews Error:", err);
    res.status(500).json({
      error: "Failed to fetch cleaner reviews",
      detail: err.message,
    });
  }
}

// =========================================================
// 2️⃣ GET reviews by cleaner ID
// =========================================================
export const getCleanerReviewsById = async (req, res) => {
  const { cleaner_user_id } = req.params;

  try {
    const reviews = await prisma.cleaner_review.findMany({
      where: {
        cleaner_user_id: BigInt(cleaner_user_id),
      },
    });

    const serialized = reviews.map((r) => {
      const safeReview = {};
      for (const [key, value] of Object.entries(r)) {
        safeReview[key] = typeof value === "bigint" ? value.toString() : value;
      }
      return safeReview;
    });

    res.json({
      status: "success",
      data: serialized,
      message: "Data retrieved Successfully!",
    });
  } catch (err) {
    console.error("Fetch Reviews by ID Error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch cleaner reviews by ID",
      detail: err.message,
    });
  }
};

// =========================================================
// 3️⃣ CREATE review (before photos)
// =========================================================
export async function createCleanerReview(req, res) {
  try {
    const {
      name,
      // phone,
      location_id,
      // remarks,
      latitude,
      longitude,
      address,
      cleaner_user_id,
      tasks,
      initial_comment,
    } = req.body;

    // ✅ Collect uploaded before photos
    const beforePhotos = req.files?.before_photo
      ? req.files.before_photo.map((f) => f.filename)
      : [];

    const parsedTaskIds = Array.isArray(tasks)
      ? tasks.map(String)
      : tasks
        ? tasks.split(",").map((id) => String(id).trim())
        : [];

    const review = await prisma.cleaner_review.create({
      data: {
        name,
        // phone,
        location_id: location_id ? BigInt(location_id) : null,
        // remarks,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        address,
        cleaner_user_id: cleaner_user_id ? BigInt(cleaner_user_id) : null,
        tasks: parsedTaskIds,
        initial_comment: initial_comment || null,
        before_photo: beforePhotos,
        after_photo: [],
        status: "ongoing",
      },
    });

    const serializedData = {
      ...review,
      id: review?.id.toString(),
      location_id: review?.location_id?.toString(),
      cleaner_user_id: review?.cleaner_user_id?.toString(),
    };

    res.status(201).json({ status: "success", data: serializedData });
  } catch (err) {
    console.error("Create Review Error:", err);
    res.status(400).json({ status: "error", detail: err.message });
  }
}

// =========================================================
// 4️⃣ COMPLETE review (after photos + AI scoring)
// =========================================================
// export async function completeCleanerReview(req, res) {
//   try {
//     const { final_comment, id } = req.body;

//     // ✅ Collect after photos
//     const afterPhotos = req.files?.after_photo
//       ? req.files.after_photo.map((f) => f.filename)
//       : [];

//     // Update DB
//     const review = await prisma.cleaner_review.update({
//       where: { id: BigInt(id) },
//       data: {
//         after_photo: afterPhotos,
//         final_comment: final_comment || null,
//         status: "completed",
//       },
//     });

//     const serializedData = {
//       ...review,
//       id: review?.id.toString(),
//       location_id: review?.location_id?.toString(),
//       cleaner_user_id: review?.cleaner_user_id?.toString(),
//     };

//     // Send response immediately
//     res.json({
//       status: "success",
//       message: "Review completed successfully",
//       data: serializedData,
//     });

//     // ✅ AI scoring (background job)
//     (async () => {
//       try {
//         const formData = new FormData();

//         afterPhotos.forEach((photo) => {
//           const filePath = path.join("uploads", photo);
//           formData.append("images", fs.createReadStream(filePath));
//         });

//         const aiResponse = await axios.post(
//           "https://pugarch-c-score-369586418873.europe-west1.run.app/predict",
//           formData,
//           { headers: { ...formData.getHeaders() } }
//         );

//         console.log(aiResponse.data, "AI response");

//         // Save AI results
//         for (const item of aiResponse.data) {
//           await prisma.hygiene_scores.create({
//             data: {
//               location_id: review.location_id,
//               score: item.score,
//               details: item.metadata,
//               image_url: item.filename
//                 ? `http://your-server-domain/uploads/${item.filename}`
//                 : null,
//               inspected_at: new Date(),
//               created_by: review.cleaner_user_id,
//             },
//           });
//         }

//         console.log("✅ Hygiene scores saved for review:", review.id);
//       } catch (aiError) {
//         console.error("AI Scoring failed:", aiError.message);
//       }
//     })();
//   } catch (err) {
//     console.error("Error completing review:", err.message);
//     res.status(400).json({ status: "error", detail: err.message });
//   }
// }




export async function completeCleanerReview(req, res) {
  try {
    const { final_comment, id } = req.body;

    // ✅ Collect after photos and build absolute URLs
    const afterPhotos = req.files?.after_photo
      ? req.files.after_photo.map((f) => `${BASE_URL}/uploads/${f.filename}`)
      : [];

    // Update DB
    const review = await prisma.cleaner_review.update({
      where: { id: BigInt(id) },
      data: {
        after_photo: afterPhotos,
        final_comment: final_comment || null,
        status: "completed",
      },
    });

    const serializedData = {
      ...review,
      id: review?.id.toString(),
      location_id: review?.location_id?.toString(),
      cleaner_user_id: review?.cleaner_user_id?.toString(),
    };

    res.json({
      status: "success",
      message: "Review completed successfully",
      data: serializedData,
    });

    // ✅ AI scoring (background job)
    (async () => {
      try {
        console.log('Ai scoring started')
        const formData = new FormData();

        // append local file paths (not URLs) for AI service
        req.files?.after_photo?.forEach((photo) => {
          const filePath = path.join("uploads", photo.filename);
          formData.append("images", fs.createReadStream(filePath));
        });

        const aiResponse = await axios.post(
          "https://pugarch-c-score-369586418873.europe-west1.run.app/predict",
          formData,
          { headers: { ...formData.getHeaders() } }
        );

        console.log(aiResponse.data, "AI response");

        // Save AI results
        for (const item of aiResponse.data) {
          await prisma.hygiene_scores.create({
            data: {
              location_id: review.location_id,
              score: item.score,
              details: item.metadata,
              image_url: item.filename
                ? `${BASE_URL}/uploads/${item.filename}`
                : null,
              inspected_at: new Date(),
              created_by: review.cleaner_user_id,
            },
          });
        }

        console.log("✅ Hygiene scores saved for review:", review.id);
      } catch (aiError) {
        console.error("AI Scoring failed:", aiError.message);
      }
    })();
  } catch (err) {
    console.error("Error completing review:", err.message);
    res.status(400).json({ status: "error", detail: err.message });
  }
}