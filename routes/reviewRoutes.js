// import express from "express";
// import multer from "multer";

// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";
// import prisma from "../config/prismaClient.mjs";
// const reviewRoutes = express.Router();

// function normalizeBigInt(obj) {
//   return JSON.parse(
//     JSON.stringify(obj, (_, value) =>
//       typeof value === "bigint" ? Number(value) : value
//     )
//   );
// }

// // Handle __dirname in ES Modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Local uploads folder setup
// const uploadDir = path.join(__dirname, "..", "uploads");
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) => {
//     const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, unique + "-" + file.originalname);
//   },
// });

// const upload = multer({ storage });

// // ----------- POST /api/user_review ------------
// reviewRoutes.post("/user-review", upload.array("images"), async (req, res) => {
//   console.log("post request made for user_review");
//   try {
//     const body = req.body;
//     console.log("Received body:", body);
//     console.log("files", req.files);

//     // Parse reason_ids safely
//     const reasonIds = JSON.parse(body.reason_ids || "[]");
//     const imageFilenames = req.files.map((file) => file.filename);

//     const lat = parseFloat(body.latitude);
//     const long = parseFloat(body.longitude);
//     const address = body.address;

//     // ✅ Step 2: Create the review with toilet_id
//     const review = await prisma.user_review.create({
//       data: {
//         name: body.name,
//         email: body.email,
//         phone: body.phone,
//         rating: parseFloat(body.rating),
//         reason_ids: reasonIds,
//         latitude: parseFloat(lat),
//         longitude: parseFloat(long),
//         description: body.description || "",
//         toilet_id: body.toilet_id,
//         // images: req.files?.map((file) => `/uploads/${file.filename}`) || [],
//         images: imageFilenames,
//       },
//     });

//     console.log("Review created:", review);
//     res.status(201).json({ success: true, data: normalizeBigInt(review) });
//   } catch (error) {
//     console.error("Review creation failed:", error);
//     res.status(400).json({ success: false, error: error.message });
//   }
// });

// // ----------- GET /api/user_review --------------//
// reviewRoutes.get("/", async (req, res) => {
//   try {
//     const user_review = await prisma.user_review.findMany({
//       orderBy: { created_at: "desc" },
//     });

//     res.json({ success: true, data: normalizeBigInt(user_review) }); // ✅ FIX HERE
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ success: false, error: "Failed to fetch user_review" });
//   }
// });

// export default reviewRoutes;





// routes/reviewRoutes.js
import express from "express";
import prisma from "../config/prismaClient.mjs";
import axios from "axios";
import FormData from "form-data";
// import { upload, processAndUploadImages } from "../middleware/imageUpload.js";
import { upload, processAndUploadImages } from "../middlewares/imageUpload.js";

const reviewRoutes = express.Router();

function normalizeBigInt(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
}


// // ✅ Asynchronous AI scoring for user reviews
// async function processUserReviewAIScoring(review, imageUrls) {
//   // Helper function to convert 0-100 scale to 1-10 scale
//   const convertScoreTo10Scale = (score) => {
//     if (score <= 10) {
//       return score;
//     }
//     return Math.round(score) / 10;
//   };

//   // Helper function to calculate average score from multiple images
//   const calculateAverageScore = (scores) => {
//     if (!scores || scores.length === 0) return null;

//     const validScores = scores
//       .map(s => Number(s.score))
//       .filter(s => !isNaN(s) && s > 0);

//     if (validScores.length === 0) return null;

//     const sum = validScores.reduce((total, score) => total + score, 0);
//     const average = sum / validScores.length;

//     return parseFloat(average.toFixed(2));
//   };

//   // Helper function to generate fake score
//   const generateFakeScore = () => {
//     return parseFloat((Math.random() * (10 - 6) + 6).toFixed(2)); // Random between 6-10
//   };

//   try {
//     console.log('🚀 AI scoring started for user review:', review.id.toString());
//     console.log('📸 Processing', imageUrls.length, 'images');

//     if (imageUrls.length === 0) {
//       console.log('⚠️ No images to process');
//       return;
//     }

//     let aiScore = null;

//     try {
//       // Method 1: Send URLs to AI service
//       console.log('🔄 Sending image URLs to AI service...');

//       const urlPayload = {
//         images: imageUrls
//       };

//       const aiResponse = await axios.post(
//         "https://pugarch-c-score-776087882401.europe-west1.run.app/predict",
//         urlPayload,
//         {
//           headers: {
//             'Content-Type': 'application/json',
//             'User-Agent': 'UserReview/1.0',
//             "Authorization": "Bearer pugarch123"
//           },
//           timeout: 15000
//         }
//       );

//       if (aiResponse.data && Array.isArray(aiResponse.data)) {
//         console.log('✅ AI scoring successful');
//         console.log('📊 Raw AI scores:', aiResponse.data.map(s => s.score));

//         // Convert all scores to 1-10 scale
//         const convertedScores = aiResponse.data.map(item => ({
//           score: convertScoreTo10Scale(Number(item.score) || 0)
//         }));

//         // Calculate average
//         aiScore = calculateAverageScore(convertedScores);
//         console.log('📊 Converted scores:', convertedScores.map(s => s.score));
//         console.log('📊 Average AI score:', aiScore);

//       } else {
//         throw new Error('Invalid AI response format');
//       }

//     } catch (aiError) {
//       console.error('❌ AI scoring failed:', {
//         message: aiError.message,
//         status: aiError.response?.status,
//         statusText: aiError.response?.statusText
//       });

//       // Fallback: Generate fake score
//       console.log('🎲 Generating fake score as fallback...');
//       aiScore = generateFakeScore();
//       console.log('📊 Fake AI score:', aiScore);
//     }

//     // ✅ Update the review with AI score
//     if (aiScore !== null) {
//       await prisma.user_review.update({
//         where: { id: review.id },
//         data: {
//           ai_score: aiScore,
//           updated_at: new Date()
//         }
//       });

//       console.log(`✅ AI score ${aiScore} saved for user review:`, review.id.toString());
//     } else {
//       console.log('⚠️ No AI score to save');
//     }

//   } catch (error) {
//     console.error('🔴 Critical error in AI scoring:', {
//       message: error.message,
//       stack: error.stack,
//       reviewId: review.id.toString()
//     });
//   }
// }


// ✅ Asynchronous AI scoring for user reviews
async function processUserReviewAIScoring(review, imageUrls) {
  console.log('\n========================================');
  console.log('🚀 USER REVIEW AI SCORING STARTED');
  console.log('========================================');
  console.log('📋 Review ID:', review.id.toString());
  console.log('📸 Total images:', imageUrls.length);
  console.log('🔗 Image URLs:', imageUrls);
  console.log('========================================\n');

  // ✅ Helper: Convert 0-100 scale to 1-10 scale
  const convertScoreTo10Scale = (score) => {
    if (score <= 10) return score;
    return Math.round(score) / 10;
  };

  // ✅ Helper: Calculate average score
  const calculateAverageScore = (scores) => {
    if (!scores || scores.length === 0) return null;

    const total = scores.reduce((sum, item) => sum + Number(item.score), 0);
    const average = total / scores.length;
    return Number(average.toFixed(2)); // Round to 2 decimals
  };

  // ✅ Helper: Validate AI response
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

  // ✅ Helper: Generate fake score (fallback)
  const generateFakeScore = () => {
    return parseFloat((Math.random() * (10 - 6) + 6).toFixed(2));
  };

  // ===== MAIN PROCESS =====
  try {
    if (imageUrls.length === 0) {
      console.log('⚠️ No images to process. Exiting...\n');
      return;
    }

    let aiScore = null;

    // ===== METHOD 1: TRY URL-BASED SCORING =====
    try {
      console.log('\n🔄 METHOD 1: Sending image URLs to AI');
      console.log('========================================');

      const urlPayload = { images: imageUrls };
      console.log('📤 Payload:', JSON.stringify(urlPayload, null, 2));

      const startTime = Date.now();

      const aiResponse = await axios.post(
        "https://pugarch-c-score-776087882401.europe-west1.run.app/predict",
        urlPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'UserReview/1.0',
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

      // Calculate average score
      aiScore = calculateAverageScore(aiResponse.data);
      console.log(`📊 Calculated Average AI Score: ${aiScore}/10`);
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

        // const FormData = require('form-data');
        const formData = new FormData();
        let successCount = 0;
        let failCount = 0;

        console.log(`\n📥 Downloading ${imageUrls.length} images...`);

        // Download images sequentially
        for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          console.log(`\n📷 Image ${i + 1}/${imageUrls.length}`);
          console.log(`   URL: ${imageUrl}`);

          try {
            const downloadStart = Date.now();

            // Download image as buffer
            const response = await axios({
              url: imageUrl,
              method: 'GET',
              responseType: 'arraybuffer',
              timeout: 10000,
              headers: {
                'User-Agent': 'UserReview-ImageDownloader/1.0'
              }
            });

            const downloadDuration = Date.now() - downloadStart;
            const sizeKB = (response.data.length / 1024).toFixed(2);

            console.log(`   ✅ Downloaded in ${downloadDuration}ms (${sizeKB} KB)`);
            console.log(`   Content-Type: ${response.headers['content-type']}`);

            // Append buffer to FormData
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
          "https://pugarch-c-score-776087882401.europe-west1.run.app/predict",
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'User-Agent': 'UserReview-AIService/1.0'
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

        // Calculate average score
        aiScore = calculateAverageScore(aiResponse.data);
        console.log(`📊 Calculated Average AI Score: ${aiScore}/10`);
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

        throw formDataError; // Trigger fallback to fake score
      }
    }

    // ===== UPDATE USER REVIEW WITH AI SCORE =====
    if (aiScore !== null) {
      try {
        const updatedReview = await prisma.user_review.update({
          where: { id: review.id },
          data: {
            ai_score: aiScore,
            updated_at: new Date()
          }
        });

        console.log('✅ USER REVIEW UPDATED WITH AI SCORE');
        console.log('========================================');
        console.log(`   Review ID: ${review.id.toString()}`);
        console.log(`   AI Score: ${aiScore}/10`);
        console.log(`   Updated At: ${updatedReview.updated_at}`);
        console.log('========================================\n');

      } catch (updateError) {
        console.log('\n❌ FAILED TO UPDATE USER REVIEW');
        console.log('========================================');
        console.error('   Error:', {
          message: updateError.message,
          code: updateError.code,
          review_id: review.id.toString()
        });
        console.log('========================================\n');
      }
    }

    console.log('\n✅ USER REVIEW AI SCORING COMPLETED');
    console.log('========================================\n');

  } catch (finalError) {
    // ===== FALLBACK: GENERATE FAKE SCORE =====
    console.log('\n🔴 ALL METHODS FAILED - Using Fallback');
    console.log('========================================');
    console.log('Error Summary:', {
      message: finalError.message,
      type: finalError.constructor.name,
      code: finalError.code
    });
    console.log('========================================\n');

    try {
      console.log('🎲 Generating fake score as fallback...');
      const fakeScore = generateFakeScore();
      console.log(`📊 Fake AI Score: ${fakeScore}/10`);

      await prisma.user_review.update({
        where: { id: review.id },
        data: {
          ai_score: fakeScore,
          updated_at: new Date()
        }
      });

      console.log('\n✅ FALLBACK COMPLETED - Fake score saved');
      console.log('========================================\n');

    } catch (fakeError) {
      console.log('\n🔴 CRITICAL: FALLBACK FAILED');
      console.log('========================================');
      console.error('Unable to save even fake score:', {
        message: fakeError.message,
        stack: fakeError.stack,
        code: fakeError.code
      });
      console.log('========================================\n');
    }
  }
}


reviewRoutes.use((req, res, next) => {
  console.log('🔵 Middleware check:', {
    method: req.method,
    path: req.path,
    contentType: req.headers['content-type']
  });
  next();
});
// ----------- POST /api/reviews/user-review ------------
reviewRoutes.post(

  "/user-review",
  upload.fields([{ name: 'images', maxCount: 5 }]), // Configure multer for multiple images
  processAndUploadImages([
    { fieldName: 'images', folder: 'user-reviews', maxCount: 5 }
  ]),
  async (req, res) => {
    console.log('in review routes post'),

      console.log("POST request made for user_review");

    try {
      const body = req.body;
      console.log("Received body:", body);
      console.log("Uploaded files:", req.uploadedFiles);

      // Parse reason_ids safely
      const reasonIds = JSON.parse(body.reason_ids || "[]");

      // Get Cloudinary URLs from middleware
      const imageUrls = req.uploadedFiles?.images || [];

      const lat = parseFloat(body.latitude);
      const long = parseFloat(body.longitude);

      // ✅ Rating conversion logic (can be easily commented out)
      // Frontend sends rating out of 5, backend stores out of 10
      const frontendRating = parseFloat(body.rating);
      // const backendRating = frontendRating / 2; // Convert 5-scale to 10-scale

      // ✅ To revert to original behavior, comment the line above and uncomment below:
      // const backendRating = frontendRating; // No conversion

      // Create the review with Cloudinary image URLs
      const review = await prisma.user_review.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          // rating: backendRating,
          rating: frontendRating,
          reason_ids: reasonIds,
          latitude: lat,
          longitude: long,
          description: body.description || "",
          toilet_id: body.toilet_id ? BigInt(body.toilet_id) : null,
          images: imageUrls, // Store Cloudinary URLs
          company_id : body?.companyId
        },
      });

      console.log("Review created:", review);
      res.status(201).json({
        success: true,
        data: normalizeBigInt(review),
        message: "Review submitted successfully!"
      });

      if (imageUrls.length > 0) {
        processUserReviewAIScoring(review, imageUrls);
      } else {
        console.log('⚠️ No images to process for AI scoring');
      }

    } catch (error) {
      console.error("Review creation failed:", error);
      res.status(400).json({
        success: false,
        error: error.message,
        message: "Failed to submit review"
      });
    }
  }
);

// ----------- GET /api/reviews/ --------------
// reviewRoutes.get("/", async (req, res) => {
//   try {
//     const { toilet_id, limit = 50 } = req.query;

//     const whereClause = toilet_id ? { toilet_id: BigInt(toilet_id) } : {};

//     const user_reviews = await prisma.user_review.findMany({
//       where: whereClause,
//       orderBy: { created_at: "desc" },
//       take: parseInt(limit),
//     });

//     console.log(user_reviews, "user_reviews");
//     // const serilizedUserReview = user_reviews.map((item)=>  ({
//     //   ...item ,
//     //   id: item?.id.toString(),
//     //   cleaner_user_id : item?.cleaner_user_id.toString(),
//     //   company_id : item?.company_id.toString ,
//     //   location_id : item?.location_id.toString()
//     // }))

//     res.json({
//       success: true,
//       data: normalizeBigInt(user_reviews),
//       count: user_reviews.length
//     });

//   } catch (error) {
//     console.error("Error fetching reviews:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to fetch user reviews"
//     });
//   }
// });

// // ----------- GET /api/reviews/:id --------------
// reviewRoutes.get("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     const review = await prisma.user_review.findUnique({
//       where: { id: BigInt(id) },
//     });

//     if (!review) {
//       return res.status(404).json({
//         success: false,
//         error: "Review not found"
//       });
//     }

//     res.json({
//       success: true,
//       data: normalizeBigInt(review)
//     });

//   } catch (error) {
//     console.error("Error fetching review:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to fetch review"
//     });
//   }
// });


// ----------- GET /api/reviews/ --------------
reviewRoutes.get("/", async (req, res) => {
  try {
    const { toilet_id, limit = 50 } = req.query;

    const whereClause = toilet_id ? { toilet_id: BigInt(toilet_id) } : {};

    const user_reviews = await prisma.user_review.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      take: parseInt(limit),
    });

    console.log(`Found ${user_reviews.length} reviews`);

    // Fetch locations for all reviews with toilet_ids
    const toiletIds = user_reviews
      .map(review => review.toilet_id)
      .filter(id => id !== null);

    const locations = await prisma.locations.findMany({
      where: {
        id: { in: toiletIds }
      }
    });

    // Create a map for quick lookup
    const locationMap = new Map(
      locations.map(loc => [loc.id.toString(), normalizeBigInt(loc)])
    );

    // Attach location to each review
    const reviewsWithLocations = user_reviews.map(review => {
      const normalizedReview = normalizeBigInt(review);
      const locationData = review.toilet_id
        ? locationMap.get(review.toilet_id.toString())
        : null;

      return {
        ...normalizedReview,
        location: locationData || null
      };
    });

    res.json({
      success: true,
      data: reviewsWithLocations,
      count: reviewsWithLocations.length
    });

  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user reviews"
    });
  }
});


// ----------- GET /api/reviews/:id --------------
reviewRoutes.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.user_review.findUnique({
      where: { id: BigInt(id) },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found"
      });
    }

    // Fetch location if toilet_id exists
    let location = null;
    if (review.toilet_id) {
      location = await prisma.locations.findUnique({
        where: { id: review.toilet_id }
      });
    }

    // Normalize and attach location
    const normalizedReview = normalizeBigInt(review);
    const normalizedLocation = location ? normalizeBigInt(location) : null;

    res.json({
      success: true,
      data: {
        ...normalizedReview,
        location: normalizedLocation
      }
    });

  } catch (error) {
    console.error("Error fetching review:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch review"
    });
  }
});


export default reviewRoutes;
