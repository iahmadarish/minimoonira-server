import express from "express";
import {
  addReview,
  getProductReviews,
  getPendingReviews,
  updateReviewStatus,
  getUserReviews,
  updateReview,
  deleteReview,
  addBulkDemoReviews, // <-- NEW: Feature 1 Controller
  getAllReviewsAndStats // <-- NEW: Feature 2 Controller
} from "../controllers/review.controller.js";
import { body } from "express-validator";
import { protect, admin, optionalProtect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Validation rules
const reviewValidationRules = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  body("comment").optional().isLength({ max: 1000 }).withMessage("Comment too long")
];

const updateReviewValidationRules = [
  body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").optional().isLength({ max: 1000 }).withMessage("Comment too long")
];

// NEW: Validation rule for bulk demo reviews (Feature 1)
const bulkReviewValidationRules = [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    // Check if 'reviews' is an array of objects
    body('reviews').isArray({ min: 1 }).withMessage('Must provide an array of at least one review'),
    // Validate each item in the 'reviews' array
    body('reviews.*.rating').isInt({ min: 1, max: 5 }).withMessage("Each review rating must be between 1 and 5"),
    body('reviews.*.comment').optional().isLength({ max: 1000 }).withMessage("Each review comment is too long")
];


// Public routes - anyone can see approved reviews
router.get("/product/:productId", getProductReviews);

// User routes (authenticated) - require login
router.post("/", protect, reviewValidationRules, addReview);
router.get("/my-reviews", protect, getUserReviews); 
router.put("/:reviewId", protect, updateReviewValidationRules, updateReview);
router.delete("/:reviewId", protect, deleteReview);

// Admin routes - require both login and admin role
router.get("/admin/pending", protect, admin, getPendingReviews);

// NEW ADMIN ROUTE: Get all reviews with star analysis (Feature 2)
router.get("/admin/all", protect, admin, getAllReviewsAndStats); 

// NEW ADMIN ROUTE: Bulk add demo reviews for a product (Feature 1)
router.post("/admin/bulk", protect, admin, bulkReviewValidationRules, addBulkDemoReviews); 

router.patch("/admin/:reviewId/status", protect, admin, updateReviewStatus);

export default router;