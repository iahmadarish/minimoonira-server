import express from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  addReview,
  getFeaturedProducts,
  updateStock
} from "../controllers/product.controller.js";

import { body } from "express-validator";

const router = express.Router();

// Validation rules
const productValidationRules = [
  body("name").notEmpty().withMessage("Product name is required"),
  body("category").isMongoId().withMessage("Valid category ID is required"),
  body("basePrice").isNumeric().withMessage("Base price must be a number"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer")
];

const reviewValidationRules = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5")
];

// Public routes
router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/:id", getProductById);
router.get("/slug/:slug", getProductBySlug);

// Reviews
router.post("/:id/reviews", reviewValidationRules, addReview);

// Product CRUD
router.post("/", productValidationRules, createProduct);
router.put("/:id", productValidationRules, updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", updateStock);

export default router;