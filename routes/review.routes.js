import express from "express";
import {
  addReview,
  getProductReviews,
  getPendingReviews,
  updateReviewStatus,
  getUserReviews,
  updateReview,
  deleteReview
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

// Public routes - anyone can see approved reviews
router.get("/product/:productId", getProductReviews);

// User routes (authenticated) - require login
router.post("/", protect, reviewValidationRules, addReview);
router.get("/my-reviews", protect, getUserReviews); 
router.put("/:reviewId", protect, updateReviewValidationRules, updateReview);
router.delete("/:reviewId", protect, deleteReview);

// Admin routes - require both login and admin role
router.get("/admin/pending", protect, admin, getPendingReviews);
router.patch("/admin/:reviewId/status", protect, admin, updateReviewStatus);

export default router;