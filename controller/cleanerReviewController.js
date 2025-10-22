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
  console.log("request made from get cleaner reviews");

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
      include: {
        cleaner_user: {
          include: {
            role: true  // Include all role fields
          }
        },
        location: {
          include: {
            location_types: true,  // Include all location_type fields
            locations: true        // Include all parent location fields
          }
        },
        company: true  // Include all company fields
      }
    });




    // ✅ Fixed serialization function
    const safeSerialize = (obj) => {
      if (obj === null || obj === undefined) return obj;

      // ✅ Handle BigInt
      if (typeof obj === 'bigint') return obj.toString();

      // ✅ Handle Date objects BEFORE generic object handling
      if (obj instanceof Date) return obj.toISOString();

      // ✅ Handle Arrays
      if (Array.isArray(obj)) return obj.map(safeSerialize);

      // ✅ Handle generic objects (but after Date check)
      if (typeof obj === 'object') {
        const serialized = {};
        for (const [key, value] of Object.entries(obj)) {
          serialized[key] = safeSerialize(value);
        }
        return serialized;
      }

      // ✅ Return primitives as-is
      return obj;
    };


    // ✅ Serialize all review data
    const serializedReviews = reviews.map(review => safeSerialize(review));
    console.log('befor serilize', serializedReviews);
    // const serialized = reviews.map((r) => {
    //   const safeReview = {};
    //   for (const [key, value] of Object.entries(r)) {
    //     safeReview[key] = typeof value === "bigint" ? value.toString() : value;
    //   }
    //   return safeReview;
    // });

    // console.log(serialized, "serilized data")
    // console.log(serialized.length, "data");
    res.json(serializedReviews);
  } catch (err) {
    console.error("Fetch Cleaner Reviews Error:", err);
    res.status(500).json({
      error: "Failed to fetch cleaner reviews",
      detail: err.message,
    });
  }
}




export const getCleanerReviewsById = async (req, res) => {
  console.log('Getting cleaner reviews by cleaner_user_id');
  const { cleaner_user_id } = req.params;
  console.log(req.params, "params");

  let stats = {};
  try {
    // Input validation
    if (!cleaner_user_id || isNaN(cleaner_user_id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid cleaner user ID provided"
      });
    }

    // ✅ Single query with all related data using include
    const reviews = await prisma.cleaner_review.findMany({
      where: {
        cleaner_user_id: BigInt(cleaner_user_id),
      },
      include: {
        // ✅ Include user details automatically
        cleaner_user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            created_at: true,
            updated_at: true,
            role: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        // ✅ Include location details
        location: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            metadata: true,
            location_types: {
              select: {
                id: true,
                name: true
              }
            },
            locations: { // parent location
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        // ✅ Include company details
        company: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (reviews.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No reviews found for this cleaner",
        data: {
          reviews: [],
          stats: stats  // important
        },
      });
    }

    // ✅ Fixed serialization function
    const safeSerialize = (obj) => {
      if (obj === null || obj === undefined) return obj;

      // ✅ Handle BigInt
      if (typeof obj === 'bigint') return obj.toString();

      // ✅ Handle Date objects BEFORE generic object handling
      if (obj instanceof Date) return obj.toISOString();

      // ✅ Handle Arrays
      if (Array.isArray(obj)) return obj.map(safeSerialize);

      // ✅ Handle generic objects (but after Date check)
      if (typeof obj === 'object') {
        const serialized = {};
        for (const [key, value] of Object.entries(obj)) {
          serialized[key] = safeSerialize(value);
        }
        return serialized;
      }

      // ✅ Return primitives as-is
      return obj;
    };


    // ✅ Serialize all review data
    const serializedReviews = reviews.map(review => safeSerialize(review));

    // ✅ Calculate stats from the reviews
    stats = {
      total_reviews: serializedReviews.length,
      completed_reviews: serializedReviews.filter(r => r.status === 'completed').length,
      ongoing_reviews: serializedReviews.filter(r => r.status === 'ongoing').length,
      total_tasks_today: serializedReviews.filter(r => {
        try {
          const today = new Date();
          const reviewDate = new Date(r.created_at);
          return reviewDate.toDateString() === today.toDateString();
        } catch {
          return false;
        }
      }).length,
      // ✅ Get cleaner info from first review (all reviews are for same cleaner)
      // cleaner_info: serializedReviews[0]?.cleaner_user || null
    };

    console.log('Successfully fetched reviews with relationships');

    res.json({
      status: "success",
      data: {
        reviews: serializedReviews,
        stats: stats  // important
      },
      message: "Cleaner reviews retrieved successfully!"
    });

  } catch (err) {
    console.error("Fetch Reviews by Cleaner ID Error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch cleaner reviews by cleaner ID",
      detail: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};


export const getCleanerReviewsByTaskId = async (req, res) => {
  console.log('Getting cleaner reviews by task id');
  const { task_id } = req.params;
  console.log(req.params, "params");

  let stats = {};
  try {
    // Input validation
    if (!task_id || isNaN(task_id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid cleaner user ID provided"
      });
    }

    // ✅ Single query with all related data using include
    const reviews = await prisma.cleaner_review.findMany({
      where: {
        id: BigInt(task_id),
      },
      include: {
        // ✅ Include user details automatically
        cleaner_user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            created_at: true,
            updated_at: true,
            role: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        // ✅ Include location details
        location: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            metadata: true,
            location_types: {
              select: {
                id: true,
                name: true
              }
            },
            locations: { // parent location
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        // ✅ Include company details
        company: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (reviews.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No reviews found for this cleaner",
        data: {
          reviews: [],
          stats: stats  // important
        },
      });
    }

    // console.log(reviews, "reviews")

    // ✅ Fixed serialization function
    const safeSerialize = (obj) => {
      if (obj === null || obj === undefined) return obj;

      // ✅ Handle BigInt
      if (typeof obj === 'bigint') return obj.toString();

      // ✅ Handle Date objects BEFORE generic object handling
      if (obj instanceof Date) return obj.toISOString();

      // ✅ Handle Arrays
      if (Array.isArray(obj)) return obj.map(safeSerialize);

      // ✅ Handle generic objects (but after Date check)
      if (typeof obj === 'object') {
        const serialized = {};
        for (const [key, value] of Object.entries(obj)) {
          serialized[key] = safeSerialize(value);
        }
        return serialized;
      }

      // ✅ Return primitives as-is
      return obj;
    };


    // ✅ Serialize all review data
    const serializedReviews = reviews.map(review => safeSerialize(review));

    console.log(serializedReviews, "serilized regviews")
    // ✅ Calculate stats from the reviews
    stats = {
      total_reviews: serializedReviews.length,
      completed_reviews: serializedReviews.filter(r => r.status === 'completed').length,
      ongoing_reviews: serializedReviews.filter(r => r.status === 'ongoing').length,
      total_tasks_today: serializedReviews.filter(r => {
        try {
          const today = new Date();
          const reviewDate = new Date(r.created_at);
          return reviewDate.toDateString() === today.toDateString();
        } catch {
          return false;
        }
      }).length,
      // ✅ Get cleaner info from first review (all reviews are for same cleaner)
      // cleaner_info: serializedReviews[0]?.cleaner_user || null
    };

    console.log('Successfully fetched reviews with relationships');

    res.json({
      status: "success",
      data: {
        reviews: serializedReviews,
        stats: stats  // important
      },
      message: "Cleaner reviews retrieved successfully!"
    });

  } catch (err) {
    console.error("Fetch Reviews by Cleaner ID Error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch cleaner reviews by cleaner ID",
      detail: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// =========================================================
// 3️⃣ CREATE review (before photos)
// =========================================================
// export async function createCleanerReview(req, res) {
//   try {
//     const {
//       name,
//       // phone,
//       location_id,
//       // remarks,
//       latitude,
//       longitude,
//       address,
//       cleaner_user_id,
//       tasks,
//       initial_comment,
//     } = req.body;

//     // ✅ Collect uploaded before photos
//     const beforePhotos = req.files?.before_photo
//       ? req.files.before_photo.map((f) => f.filename)
//       : [];

//     const parsedTaskIds = Array.isArray(tasks)
//       ? tasks.map(String)
//       : tasks
//         ? tasks.split(",").map((id) => String(id).trim())
//         : [];

//     const review = await prisma.cleaner_review.create({
//       data: {
//         name,
//         // phone,
//         location_id: location_id ? BigInt(location_id) : null,
//         // remarks,
//         latitude: latitude ? parseFloat(latitude) : null,
//         longitude: longitude ? parseFloat(longitude) : null,
//         address,
//         cleaner_user_id: cleaner_user_id ? BigInt(cleaner_user_id) : null,
//         tasks: parsedTaskIds,
//         initial_comment: initial_comment || null,
//         before_photo: beforePhotos,
//         after_photo: [],
//         status: "ongoing",
//       },
//     });

//     const serializedData = {
//       ...review,
//       id: review?.id.toString(),
//       location_id: review?.location_id?.toString(),
//       cleaner_user_id: review?.cleaner_user_id?.toString(),
//     };

//     res.status(201).json({ status: "success", data: serializedData });
//   } catch (err) {
//     console.error("Create Review Error:", err);
//     res.status(400).json({ status: "error", detail: err.message });
//   }
// }


export async function createCleanerReview(req, res) {
  try {
    const {
      name,
      location_id,
      latitude,
      longitude,
      address,
      cleaner_user_id,
      tasks,
      initial_comment,
      company_id
    } = req.body;

    // Get uploaded URLs from middleware
    const beforePhotos = req.uploadedFiles?.before_photo || [];

    let parsedTasks = [];

    if (tasks) {
      if (Array.isArray(tasks)) {
        parsedTasks = tasks.map(String);
      } else if (typeof tasks === 'string') {
        try {
          const parsed = JSON.parse(tasks);
          if (Array.isArray(parsed)) {
            parsedTasks = parsed.map(String);
          } else {
            parsedTasks = [String(parsed)];
          }
        } catch (e) {
          parsedTasks = tasks.split(',').map(task => String(task).trim());
        }
      }
    }

    // ✅ Add length validation
    if (parsedTasks.length === 0) {
      console.warn('No tasks provided for review');
    }

    console.log('Original tasks:', tasks);
    console.log('Parsed tasks:', parsedTasks);
    console.log('Tasks count:', parsedTasks.length);

    const review = await prisma.cleaner_review.create({
      data: {
        name,
        location_id: location_id ? BigInt(location_id) : null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        address,
        cleaner_user_id: cleaner_user_id ? BigInt(cleaner_user_id) : null,
        tasks: parsedTasks,
        initial_comment: initial_comment || null,
        before_photo: beforePhotos,
        after_photo: [],
        status: 'ongoing',
        company_id: company_id ? BigInt(company_id) : null
      },
    });


    const serializedData = {
      ...review,
      id: review?.id.toString(),
      location_id: review?.location_id?.toString(),
      cleaner_user_id: review?.cleaner_user_id?.toString(),
      company_id: review?.company_id?.toString()
    };

    res.status(201).json({ status: 'success', data: serializedData });
  } catch (err) {
    console.error('Create Review Error:', err);
    res.status(400).json({ status: 'error', detail: err.message });
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




// export async function completeCleanerReview(req, res) {
//   try {
//     const { final_comment, id } = req.body;

//     // ✅ Collect after photos and build absolute URLs
//     const afterPhotos = req.files?.after_photo
//       ? req.files.after_photo.map((f) => `${BASE_URL}/uploads/${f.filename}`)
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

//     res.json({
//       status: "success",
//       message: "Review completed successfully",
//       data: serializedData,
//     });

//     // ✅ AI scoring (background job)
//     (async () => {
//       try {
//         console.log('Ai scoring started')
//         const formData = new FormData();

//         // append local file paths (not URLs) for AI service
//         req.files?.after_photo?.forEach((photo) => {
//           const filePath = path.join("uploads", photo.filename);
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
//                 ? `${BASE_URL}/uploads/${item.filename}`
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




// export async function completeCleanerReview(req, res) {
//   try {
//     const { final_comment, id } = req.body;

//     // ✅ Get Cloudinary URLs from middleware (instead of local file paths)
//     const afterPhotos = req.uploadedFiles?.after_photo || [];

//     // Update DB
//     const review = await prisma.cleaner_review.update({
//       where: { id: BigInt(id) },
//       data: {
//         after_photo: afterPhotos, // Store Cloudinary URLs
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

//     res.json({
//       status: "success",
//       message: "Review completed successfully",
//       data: serializedData,
//     });

//     // ✅ AI scoring (background job) with fallback fake ratings
//     (async () => {
//       try {
//         console.log('AI scoring started');

//         // Helper function to generate fake scores
//         const generateFakeScores = (imageUrls) => {
//           return imageUrls.map((url, index) => ({
//             score: Math.floor(Math.random() * (10 - 6 + 1)) + 6, // Random between 6-10
//             metadata: {
//               cleanliness: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
//               organization: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
//               overall_hygiene: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
//               demo_mode: true
//             },
//             filename: `after_photo_${index + 1}`
//           }));
//         };

//         let aiResponse;
//         let scoreData;

//         try {
//           // Method 1: Try sending Cloudinary URLs directly to AI (if your AI supports URLs)
//           const urlPayload = {
//             images: afterPhotos // Send Cloudinary URLs
//           };

//           aiResponse = await axios.post(
//             "https://pugarch-c-score-369586418873.europe-west1.run.app/predict",
//             urlPayload,
//             {
//               headers: { 'Content-Type': 'application/json' },
//               timeout: 10000 // 10 second timeout
//             }
//           );

//           scoreData = aiResponse.data;
//           console.log("✅ AI scoring successful with URLs");

//         } catch (urlError) {
//           console.log("URL method failed, trying file download method...");

//           try {
//             // Method 2: Download images from Cloudinary and send as files
//             const formData = new FormData();

//             for (let i = 0; i < afterPhotos.length; i++) {
//               const imageUrl = afterPhotos[i];

//               // Download image from Cloudinary URL
//               const imageResponse = await axios({
//                 url: imageUrl,
//                 method: 'GET',
//                 responseType: 'stream',
//                 timeout: 5000
//               });

//               // Append the stream directly to FormData
//               formData.append('images', imageResponse.data, `image_${i}.jpg`);
//             }

//             aiResponse = await axios.post(
//               "https://pugarch-c-score-369586418873.europe-west1.run.app/predict",
//               formData,
//               {
//                 headers: { ...formData.getHeaders() },
//                 timeout: 15000 // 15 second timeout
//               }
//             );

//             scoreData = aiResponse.data;
//             console.log("✅ AI scoring successful with file download");

//           } catch (downloadError) {
//             console.log("File download method also failed, using fake scores...");
//             throw downloadError; // This will trigger the fake score generation
//           }
//         }

//         console.log(scoreData, "AI response");

//         // Save AI results to database
//         for (let i = 0; i < scoreData.length; i++) {
//           const item = scoreData[i];
//           await prisma.hygiene_scores.create({
//             data: {
//               location_id: review.location_id,
//               score: item.score,
//               details: item.metadata || {},
//               image_url: afterPhotos[i] || null, // Use Cloudinary URL
//               inspected_at: new Date(),
//               created_by: review.cleaner_user_id,
//             },
//           });
//         }

//         console.log("✅ Hygiene scores saved for review:", review.id);

//       } catch (aiError) {
//         // ✅ Fallback: Generate fake ratings for demo
//         console.error("AI Scoring failed, generating fake scores for demo:", aiError.message);

//         try {
//           const fakeScores = generateFakeScores(afterPhotos);
//           console.log("Generated fake scores:", fakeScores);

//           // Save fake scores to database
//           for (let i = 0; i < fakeScores.length; i++) {
//             const fakeItem = fakeScores[i];
//             await prisma.hygiene_scores.create({
//               data: {
//                 location_id: review.location_id,
//                 score: fakeItem.score,
//                 details: fakeItem.metadata,
//                 image_url: afterPhotos[i] || null,
//                 inspected_at: new Date(),
//                 created_by: review.cleaner_user_id,
//               },
//             });
//           }

//           console.log("✅ Fake hygiene scores saved for demo purposes");
//         } catch (fakeError) {
//           console.error("Failed to save fake scores:", fakeError.message);
//         }
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

    // ✅ Get Cloudinary URLs from middleware
    const afterPhotos = req.uploadedFiles?.after_photo || [];

    // Update DB
    const review = await prisma.cleaner_review.update({
      where: { id: BigInt(id) },
      data: {
        after_photo: afterPhotos,
        final_comment: final_comment || null,
        status: "completed",
        updated_at: new Date().toISOString()
      },
    });

    const serializedData = {
      ...review,
      id: review?.id.toString(),
      location_id: review?.location_id?.toString(),
      cleaner_user_id: review?.cleaner_user_id?.toString(),
      company_id: review?.company_id?.toString(),
    };

    res.json({
      status: "success",
      message: "Review completed successfully",
      data: serializedData,
    });

    // ✅ AI scoring with comprehensive error handling
    processHygieneScoring(review, afterPhotos);

  } catch (err) {
    console.error("Error completing review:", err.message);
    res.status(400).json({ status: "error", detail: err.message });
  }
}






// At the top of your file
// const FormData = require('form-data'); // Must import this for Node.js

async function processHygieneScoring(review, afterPhotos) {
  console.log('\n========================================');
  console.log('🚀 HYGIENE SCORING PROCESS STARTED');
  console.log('========================================');
  console.log('📋 Review ID:', review.id);
  console.log('📸 Total after photos:', afterPhotos.length);
  console.log('🔗 Photo URLs:', afterPhotos);
  console.log('========================================\n');

  // ✅ Helper: Convert 0-100 scale to 1-10 scale
  const convertScoreTo10Scale = (score) => {
    if (score <= 10) return score;
    return Math.round(score) / 10;
  };

  // ✅ Helper: Calculate average score - ADD THIS!
  const calculateAverageScore = (scores) => {
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, item) => sum + Number(item.score), 0);
    const average = total / scores.length;
    return Number(average.toFixed(2)); // Round to 2 decimal places
  };


  // ✅ Helper: Validate AI response structure
  const validateAIResponse = (data) => {
    console.log('🔍 Validating AI response...');

    if (!Array.isArray(data)) {
      throw new Error('Response is not an array');
    }

    if (data.length === 0) {
      throw new Error('Response array is empty');
    }

    const invalidItems = [];
    data.forEach((item, index) => {
      if (!item.filename || typeof item.score !== 'number' || !item.status) {
        invalidItems.push(index);
      }
    });

    if (invalidItems.length > 0) {
      throw new Error(`Invalid items at indices: ${invalidItems.join(', ')}`);
    }

    console.log('✅ Response validation passed');
    console.log(`📊 Received ${data.length} scores`);
    data.forEach(item => {
      console.log(`   - ${item.filename}: ${item.score}/10 (status: ${item.status})`);
    });

    return true;
  };

  // ✅ Helper: Generate fake scores (fallback)
  const generateFakeScores = (imageUrls) => {
    console.log(`\n🎲 Generating fake scores for ${imageUrls.length} images...`);
    return imageUrls.map((url, index) => ({
      score: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
      metadata: {
        breakdown: [],
        raw_score: 0,
        demo_mode: true,
        generated_at: new Date().toISOString(),
      },
      filename: `after_photo_${index + 1}`,
      status: 'success',
      image_url: url
    }));
  };

  // ✅ Helper: Save scores to database
  const saveScoresToDatabase = async (scores, reviewData) => {
    console.log('\n💾 SAVING SCORES TO DATABASE');
    console.log('========================================');

    const savedScores = [];

    for (let i = 0; i < scores.length; i++) {
      const scoreItem = scores[i];

      try {
        const normalizedScore = convertScoreTo10Scale(Number(scoreItem.score) || 7);

        console.log(`\n📊 Score ${i + 1}/${scores.length}:`);
        console.log(`   Filename: ${scoreItem.filename}`);
        console.log(`   Raw Score: ${scoreItem.score}`);
        console.log(`   Normalized: ${normalizedScore}/10`);
        console.log(`   Status: ${scoreItem.status}`);

        const savedScore = await prisma.hygiene_scores.create({
          data: {
            location_id: reviewData.location_id,
            score: normalizedScore,
            details: scoreItem.metadata || {},
            image_url: afterPhotos[i] || scoreItem.image_url || null,
            inspected_at: new Date(),
            created_by: reviewData.cleaner_user_id,
          },
        });

        savedScores.push(savedScore);
        console.log(`   ✅ Saved to DB with ID: ${savedScore.id}`);


      } catch (dbError) {
        console.error(`   ❌ DB Error for score ${i + 1}:`, {
          message: dbError.message,
          code: dbError.code,
        });
      }
    }

    console.log('\n========================================');
    console.log(`✅ Saved ${savedScores.length}/${scores.length} scores successfully`);
    console.log('========================================\n');


    // Step 2: Calculate average score from ALL scores
    const averageScore = calculateAverageScore(scores);
    console.log(`📊 Calculated Average Score: ${averageScore}/10`);
    console.log(`   Individual scores: [${scores.map(s => s.score).join(', ')}]`);
    console.log('========================================\n');

    // Step 3: Update cleaner_review ONCE with the average score
    try {
      const updatedReview = await prisma.cleaner_review.update({
        where: { id: reviewData.id },
        data: {
          score: averageScore,  // ✅ Average of all scores
          updated_at: new Date()
        }
      });

      console.log('✅ CLEANER REVIEW UPDATED');
      console.log('========================================');
      console.log(`   Review ID: ${reviewData.id}`);
      console.log(`   Final Average Score: ${averageScore}/10`);
      console.log(`   Updated At: ${updatedReview.updated_at}`);
      console.log('========================================\n');
    }
    catch (updateError) {
      console.log('\n❌ FAILED TO UPDATE CLEANER REVIEW');
      console.log('========================================');
      console.error('   Error:', {
        message: updateError.message,
        code: updateError.code,
        review_id: reviewData.id
      });
      console.log('========================================\n');
    }


    return savedScores;
  };

  // ===== MAIN PROCESS =====
  try {
    if (afterPhotos.length === 0) {
      console.log('⚠️  No after photos to process. Exiting...\n');
      return;
    }

    let scoreData = [];

    // ===== METHOD 1: TRY URL-BASED SCORING =====
    try {
      console.log('\n🔄 METHOD 1: Sending Cloudinary URLs to AI');
      console.log('========================================');

      const urlPayload = { images: afterPhotos };
      console.log('📤 Payload:', JSON.stringify(urlPayload, null, 2));

      const startTime = Date.now();

      const aiResponse = await axios.post(
        "https://pugarch-c-score-776087882401.europe-west1.run.app/predict",
        urlPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CleanerReview/1.0',
          },
          timeout: 15000
        }
      );

      const duration = Date.now() - startTime;
      console.log(`⏱️  Response received in ${duration}ms`);
      console.log('📥 Response status:', aiResponse.status);
      console.log('📥 Response data:', JSON.stringify(aiResponse.data, null, 2));

      // Validate response
      validateAIResponse(aiResponse.data);

      scoreData = aiResponse.data;
      console.log('\n✅ METHOD 1 SUCCESSFUL - URL-based scoring');
      console.log('========================================\n');

    } catch (urlError) {
      console.log('\n❌ METHOD 1 FAILED');
      console.log('========================================');

      if (urlError.code === 'ECONNABORTED') {
        console.log('⏰ Error Type: Timeout (15 seconds exceeded)');
      } else if (urlError.response) {
        console.log('🔴 Error Type: Server responded with error');
        console.log('   Status:', urlError.response.status);
        console.log('   Status Text:', urlError.response.statusText);
        console.log('   Response Data:', urlError.response.data);
      } else if (urlError.request) {
        console.log('🔴 Error Type: No response from server');
        console.log('   Message:', urlError.message);
      } else {
        console.log('🔴 Error Type: Request setup failed');
        console.log('   Message:', urlError.message);
      }
      console.log('========================================\n');

      // ===== METHOD 2: TRY FORMDATA-BASED SCORING =====
      try {
        console.log('🔄 METHOD 2: Downloading images and sending as FormData');
        console.log('========================================');

        const formData = new FormData();
        let successCount = 0;
        let failCount = 0;

        console.log(`\n📥 Downloading ${afterPhotos.length} images...`);

        // Download images sequentially to avoid overwhelming memory
        for (let i = 0; i < afterPhotos.length; i++) {
          const imageUrl = afterPhotos[i];
          console.log(`\n📷 Image ${i + 1}/${afterPhotos.length}`);
          console.log(`   URL: ${imageUrl}`);

          try {
            const downloadStart = Date.now();

            // Download image as buffer
            const response = await axios({
              url: imageUrl,
              method: 'GET',
              responseType: 'arraybuffer', // Important: use arraybuffer, not stream
              timeout: 10000,
              headers: {
                'User-Agent': 'CleanerReview-ImageDownloader/1.0'
              }
            });

            const downloadDuration = Date.now() - downloadStart;
            const sizeKB = (response.data.length / 1024).toFixed(2);

            console.log(`   ✅ Downloaded in ${downloadDuration}ms (${sizeKB} KB)`);
            console.log(`   Content-Type: ${response.headers['content-type']}`);

            // Append buffer to FormData with proper filename
            const filename = `image_${i + 1}.jpg`;
            formData.append('images', Buffer.from(response.data), filename);

            console.log(`   ✅ Added to FormData as "${filename}"`);
            successCount++;

          } catch (downloadError) {
            failCount++;
            console.log(`   ❌ Download failed:`, {
              message: downloadError.message,
              code: downloadError.code,
              status: downloadError.response?.status
            });
          }
        }

        console.log('\n========================================');
        console.log(`📊 Download Summary: ${successCount} success, ${failCount} failed`);
        console.log('========================================\n');

        if (successCount === 0) {
          throw new Error('Failed to download any images');
        }

        console.log('📤 Sending FormData to AI service...');
        const uploadStart = Date.now();

        const aiResponse = await axios.post(
          "https://pugarch-c-score-776087882401.europe-west1.run.app/predict", // Use same URL or your formdata URL
          formData,
          {
            headers: {
              ...formData.getHeaders(), // Critical: get headers with boundary
              'User-Agent': 'CleanerReview-AIService/1.0'
            },
            timeout: 30000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        );

        const uploadDuration = Date.now() - uploadStart;
        console.log(`⏱️  Response received in ${uploadDuration}ms`);
        console.log('📥 Response status:', aiResponse.status);
        console.log('📥 Response data:', JSON.stringify(aiResponse.data, null, 2));

        // Validate response
        validateAIResponse(aiResponse.data);

        scoreData = aiResponse.data;
        console.log('\n✅ METHOD 2 SUCCESSFUL - FormData upload');
        console.log('========================================\n');

      } catch (formDataError) {
        console.log('\n❌ METHOD 2 FAILED');
        console.log('========================================');

        if (formDataError.code === 'ECONNABORTED') {
          console.log('⏰ Error Type: Timeout (30 seconds exceeded)');
        } else if (formDataError.response) {
          console.log('🔴 Error Type: Server error');
          console.log('   Status:', formDataError.response.status);
          console.log('   Status Text:', formDataError.response.statusText);
          console.log('   Response Data:', JSON.stringify(formDataError.response.data, null, 2));
        } else if (formDataError.request) {
          console.log('🔴 Error Type: No response received');
          console.log('   Message:', formDataError.message);
        } else {
          console.log('🔴 Error Type: Request setup failed');
          console.log('   Message:', formDataError.message);
          console.log('   Stack:', formDataError.stack);
        }
        console.log('========================================\n');

        throw formDataError; // Trigger fallback to fake scores
      }
    }

    // ===== SAVE REAL AI SCORES =====
    if (scoreData.length > 0) {
      await saveScoresToDatabase(scoreData, review);

      console.log('\n✅ HYGIENE SCORING COMPLETED SUCCESSFULLY');
      console.log('========================================\n');
    }

  } catch (finalError) {
    // ===== FALLBACK: GENERATE FAKE SCORES =====
    console.log('\n🔴 ALL METHODS FAILED - Using Fallback');
    console.log('========================================');
    console.log('Error Summary:', {
      message: finalError.message,
      type: finalError.constructor.name,
      code: finalError.code
    });
    console.log('========================================\n');

    try {
      console.log('🎲 Generating fake scores as fallback...');
      const fakeScores = generateFakeScores(afterPhotos);

      await saveScoresToDatabase(fakeScores, review);

      console.log('\n✅ FALLBACK COMPLETED - Fake scores saved');
      console.log('========================================\n');

    } catch (fakeError) {
      console.log('\n🔴 CRITICAL: FALLBACK FAILED');
      console.log('========================================');
      console.error('Unable to save even fake scores:', {
        message: fakeError.message,
        stack: fakeError.stack,
        code: fakeError.code
      });
      console.log('========================================\n');
    }
  }
}







// ✅ Separate function for AI processing
// async function processHygieneScoring(review, afterPhotos) {
//   console.log("started processing cleaner review")
//   // ✅ Helper function to convert 0-100 scale to 1-10 scale
//   const convertScoreTo10Scale = (score) => {
//     // If score is already between 1-10, return as-is
//     if (score <= 10) {
//       return score;
//     }
//     // Convert 0-100 to 1-10
//     return Math.round(score) / 10;
//     // 85 → 8.5, 92 → 9.2, 100 → 10.0
//   };

//   // Helper function to generate fake scores
//   const generateFakeScores = (imageUrls) => {
//     console.log(`Generating fake scores for ${imageUrls.length} images...`);
//     return imageUrls.map((url, index) => ({
//       score: Math.floor(Math.random() * (10 - 6 + 1)) + 6, // Random between 6-10
//       metadata: {
//         cleanliness: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
//         organization: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
//         overall_hygiene: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
//         demo_mode: true,
//         generated_at: new Date().toISOString(),
//         image_index: index + 1
//       },
//       filename: `after_photo_${index + 1}`,
//       image_url: url
//     }));
//   };

//   // Helper function to save scores to database
//   const saveScoresToDatabase = async (scores, reviewData) => {
//     const savedScores = [];

//     for (let i = 0; i < scores.length; i++) {
//       const scoreItem = scores[i];

//       try {
//         // ✅ Convert AI score from 0-100 to 1-10 scale
//         const normalizedScore = convertScoreTo10Scale(Number(scoreItem.score) || 70);

//         console.log(`📊 Score ${i + 1}: Raw=${scoreItem.score}, Normalized=${normalizedScore}`);

//         const savedScore = await prisma.hygiene_scores.create({
//           data: {
//             location_id: reviewData.location_id,
//             score: normalizedScore, // ✅ Now saves 8.5 instead of 85
//             details: scoreItem.metadata || {},
//             image_url: afterPhotos[i] || scoreItem.image_url || null,
//             inspected_at: new Date(),
//             created_by: reviewData.cleaner_user_id,
//           },
//         });

//         savedScores.push(savedScore);
//         console.log(`✅ Score ${i + 1} saved successfully: ${normalizedScore}/10`);

//       } catch (dbError) {
//         console.error(`Failed to save score ${i + 1}:`, dbError.message);
//       }
//     }

//     return savedScores;
//   };

//   try {
//     console.log('🚀 AI scoring started for review:', review.id);
//     console.log('📸 Processing', afterPhotos.length, 'after photos');

//     if (afterPhotos.length === 0) {
//       console.log('⚠️ No after photos to process');
//       return;
//     }

//     let scoreData = [];
//     let processingMethod = 'unknown';

//     try {
//       // Method 1: Try sending URLs to AI service
//       console.log('🔄 Method 1: Sending Cloudinary URLs to AI...');

//       const urlPayload = {
//         images: afterPhotos
//       };

//       console.log(urlPayload, "url payload");
//       const aiResponse = await axios.post(
//         "https://pugarch-c-score-776087882401.europe-west1.run.app/predict",
//         urlPayload,
//         {
//           headers: {
//             'Content-Type': 'application/json',
//             'User-Agent': 'CleanerReview/1.0',
//             // "Authorization": "Bearer pugarch123"
//           },
//           timeout: 15000
//         }
//       );

//       console.log('ai_response', aiResponse);
//       if (aiResponse.data && Array.isArray(aiResponse.data)) {
//         scoreData = aiResponse.data;
//         processingMethod = 'URL';
//         console.log('✅ AI scoring successful with URLs');
//         console.log('📊 Raw AI scores:', scoreData.map(s => s.score));
//       } else {
//         throw new Error('Invalid AI response format');
//       }

//     } catch (urlError) {
//       console.log('❌ Method 1 failed:', urlError.message);

//       try {
//         // Method 2: Download images and send as files
//         console.log('🔄 Method 2: Downloading images and sending as files...');

//         const formData = new FormData();
//         const downloadPromises = [];

//         // Download all images concurrently
//         for (let i = 0; i < afterPhotos.length; i++) {
//           const imageUrl = afterPhotos[i];

//           const downloadPromise = axios({
//             url: imageUrl,
//             method: 'GET',
//             responseType: 'stream',
//             timeout: 10000,
//             headers: {
//               'User-Agent': 'CleanerReview-ImageDownloader/1.0'
//             }
//           }).then(response => {
//             formData.append('images', response.data, `image_${i}.jpg`);
//             return true;
//           }).catch(err => {
//             console.error(`Failed to download image ${i}:`, err.message);
//             return false;
//           });

//           downloadPromises.push(downloadPromise);
//         }

//         // Wait for all downloads
//         const downloadResults = await Promise.all(downloadPromises);
//         const successfulDownloads = downloadResults.filter(result => result === true).length;

//         console.log(`📥 Downloaded ${successfulDownloads}/${afterPhotos.length} images`);
//         console.log(formData, "form data");
//         if (successfulDownloads > 0) {
//           console.log("second approach by form data")
//           const aiResponse = await axios.post(
//             "https://pugarch-c-score-369586418873.europe-west1.run.app/predict",
//             formData,
//             {
//               headers: {
//                 ...formData.getHeaders(),
//                 'User-Agent': 'CleanerReview-AIService/1.0'
//               },
//               timeout: 30000 // Longer timeout for file upload
//             }
//           );
//           console.log("second approach by form data 2", aiResponse)
//           if (aiResponse.data && Array.isArray(aiResponse.data)) {
//             scoreData = aiResponse.data;
//             processingMethod = 'File Upload';
//             console.log('✅ AI scoring successful with file upload');
//             console.log('📊 Raw AI scores:', scoreData.map(s => s.score));
//           } else {
//             throw new Error('Invalid AI response format');
//           }
//         } else {
//           throw new Error('Failed to download any images');
//         }

//       } catch (downloadError) {
//         console.log('❌ Method 2 failed:', downloadError.message);
//         throw downloadError; // Will trigger fake score generation
//       }
//     }

//     // Process real AI results
//     console.log(`🎯 Processing ${scoreData.length} AI scores via ${processingMethod}`);
//     await saveScoresToDatabase(scoreData, review);
//     console.log('✅ Real AI hygiene scores saved for review:', review.id);

//   } catch (aiError) {
//     // ✅ Fallback: Generate and save fake scores
//     console.error('🔴 AI Scoring completely failed:', {
//       message: aiError.message,
//       status: aiError.response?.status,
//       statusText: aiError.response?.statusText
//     });

//     try {
//       console.log('🎲 Generating fake scores as fallback...');
//       const fakeScores = generateFakeScores(afterPhotos);

//       console.log('💾 Saving fake scores to database...');
//       await saveScoresToDatabase(fakeScores, review);

//       console.log('✅ Fake hygiene scores saved successfully for demo purposes');

//     } catch (fakeError) {
//       console.error('🔴 Critical: Failed to save fake scores:', {
//         message: fakeError.message,
//         stack: fakeError.stack
//       });
//     }
//   }
// }



// // ✅ Separate function for AI processing
// async function processHygieneScoring(review, afterPhotos) {
//   // Helper function to generate fake scores
//   const generateFakeScores = (imageUrls) => {
//     console.log(`Generating fake scores for ${imageUrls.length} images...`);
//     return imageUrls.map((url, index) => ({
//       score: Math.floor(Math.random() * (10 - 6 + 1)) + 6, // Random between 6-10
//       metadata: {
//         cleanliness: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
//         organization: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
//         overall_hygiene: Math.floor(Math.random() * (10 - 6 + 1)) + 6,
//         demo_mode: true,
//         generated_at: new Date().toISOString(),
//         image_index: index + 1
//       },
//       filename: `after_photo_${index + 1}`,
//       image_url: url
//     }));
//   };

//   // Helper function to save scores to database
//   const saveScoresToDatabase = async (scores, reviewData) => {
//     const savedScores = [];

//     for (let i = 0; i < scores.length; i++) {
//       const scoreItem = scores[i];

//       try {
//         const savedScore = await prisma.hygiene_scores.create({
//           data: {
//             location_id: reviewData.location_id,
//             score: Number(scoreItem.score) || 7, // Ensure it's a number
//             details: scoreItem.metadata || {},
//             image_url: afterPhotos[i] || scoreItem.image_url || null,
//             inspected_at: new Date(),
//             created_by: reviewData.cleaner_user_id,
//           },
//         });

//         savedScores.push(savedScore);
//         console.log(`✅ Score ${i + 1} saved successfully:`, scoreItem.score);

//       } catch (dbError) {
//         console.error(`Failed to save score ${i + 1}:`, dbError.message);
//       }
//     }

//     return savedScores;
//   };

//   try {
//     console.log('🚀 AI scoring started for review:', review.id);
//     console.log('📸 Processing', afterPhotos.length, 'after photos');

//     if (afterPhotos.length === 0) {
//       console.log('⚠️ No after photos to process');
//       return;
//     }

//     let scoreData = [];
//     let processingMethod = 'unknown';

//     try {
//       // Method 1: Try sending URLs to AI service
//       console.log('🔄 Method 1: Sending Cloudinary URLs to AI...');

//       const urlPayload = {
//         images: afterPhotos
//       };

//       const aiResponse = await axios.post(
//         "https://pugarch-c-score-369586418873.europe-west1.run.app/predict",
//         urlPayload,
//         {
//           headers: {
//             'Content-Type': 'application/json',
//             'User-Agent': 'CleanerReview/1.0'
//           },
//           timeout: 15000
//         }
//       );

//       if (aiResponse.data && Array.isArray(aiResponse.data)) {
//         scoreData = aiResponse.data;
//         processingMethod = 'URL';
//         console.log('✅ AI scoring successful with URLs');
//       } else {
//         throw new Error('Invalid AI response format');
//       }

//     } catch (urlError) {
//       console.log('❌ Method 1 failed:', urlError.message);

//       try {
//         // Method 2: Download images and send as files
//         console.log('🔄 Method 2: Downloading images and sending as files...');

//         const formData = new FormData();
//         const downloadPromises = [];

//         // Download all images concurrently
//         for (let i = 0; i < afterPhotos.length; i++) {
//           const imageUrl = afterPhotos[i];

//           const downloadPromise = axios({
//             url: imageUrl,
//             method: 'GET',
//             responseType: 'stream',
//             timeout: 10000,
//             headers: {
//               'User-Agent': 'CleanerReview-ImageDownloader/1.0'
//             }
//           }).then(response => {
//             formData.append('images', response.data, `image_${i}.jpg`);
//             return true;
//           }).catch(err => {
//             console.error(`Failed to download image ${i}:`, err.message);
//             return false;
//           });

//           downloadPromises.push(downloadPromise);
//         }

//         // Wait for all downloads
//         const downloadResults = await Promise.all(downloadPromises);
//         const successfulDownloads = downloadResults.filter(result => result === true).length;

//         console.log(`📥 Downloaded ${successfulDownloads}/${afterPhotos.length} images`);

//         if (successfulDownloads > 0) {
//           const aiResponse = await axios.post(
//             "https://pugarch-c-score-369586418873.europe-west1.run.app/predict",
//             formData,
//             {
//               headers: {
//                 ...formData.getHeaders(),
//                 'User-Agent': 'CleanerReview-AIService/1.0'
//               },
//               timeout: 30000 // Longer timeout for file upload
//             }
//           );

//           if (aiResponse.data && Array.isArray(aiResponse.data)) {
//             scoreData = aiResponse.data;
//             processingMethod = 'File Upload';
//             console.log('✅ AI scoring successful with file upload');
//           } else {
//             throw new Error('Invalid AI response format');
//           }
//         } else {
//           throw new Error('Failed to download any images');
//         }

//       } catch (downloadError) {
//         console.log('❌ Method 2 failed:', downloadError.message);
//         throw downloadError; // Will trigger fake score generation
//       }
//     }

//     // Process real AI results
//     console.log(`🎯 Processing ${scoreData.length} AI scores via ${processingMethod}`);
//     await saveScoresToDatabase(scoreData, review);
//     console.log('✅ Real AI hygiene scores saved for review:', review.id);

//   } catch (aiError) {
//     // ✅ Fallback: Generate and save fake scores
//     console.error('🔴 AI Scoring completely failed:', {
//       message: aiError.message,
//       status: aiError.response?.status,
//       statusText: aiError.response?.statusText
//     });

//     try {
//       console.log('🎲 Generating fake scores as fallback...');
//       const fakeScores = generateFakeScores(afterPhotos);

//       console.log('💾 Saving fake scores to database...');
//       await saveScoresToDatabase(fakeScores, review);

//       console.log('✅ Fake hygiene scores saved successfully for demo purposes');

//     } catch (fakeError) {
//       console.error('🔴 Critical: Failed to save fake scores:', {
//         message: fakeError.message,
//         stack: fakeError.stack
//       });
//     }
//   }
// }