

// import express from "express";
// import {
//   createProduct,
//   getProducts,
//   getAdminProducts,
//   getProductById,
//   getProductBySlug,
//   updateProduct,
//   deleteProduct,
//   addReview,
//   getFeaturedProducts,
//   updateStock,
//   getProductsByAttributes,
//   getProductAttributes,
//   getProductsByMultipleAttributes,
//   getProductsForDynamicSection,
//   getHomepageSections,
//   createDynamicSection,
//   updateDynamicSection,
//   deleteDynamicSection,
//   getAllDynamicSections,
//   toggleSectionStatus,
//   searchProductsForAdmin
// } from "../controllers/product.controller.js";


// import { 
//   setUploadDir, 
//   uploadSingle, 
//   uploadMultiple 
// } from "../utils/upload.js";



// import { body } from "express-validator";
// import { protect, admin } from "../middlewares/authMiddleware.js";

// const router = express.Router();

// // Validation rules
// const productValidationRules = [
//   body("name").notEmpty().withMessage("Product name is required"),
//   body("category").isMongoId().withMessage("Valid category ID is required"),
//   body("basePrice").isNumeric().withMessage("Base price must be a number"),
//   body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer")
// ];

// // ✅ Review validation rules যোগ করুন
// const reviewValidationRules = [
//   body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
//   body("comment").optional().isLength({ max: 500 }).withMessage("Comment cannot exceed 500 characters")
// ];

// const sectionValidationRules = [
//   body("title").notEmpty().withMessage("Section title is required"),
//   body("attributeKey").notEmpty().withMessage("Attribute key is required"),
//   body("attributeValue").notEmpty().withMessage("Attribute value is required")
// ];

// // ✅ Public routes
// router.get("/", getProducts);
// router.get("/featured", getFeaturedProducts);
// router.get("/attributes", getProductAttributes);
// router.get("/filter/attributes", getProductsByAttributes);
// router.get("/filter/multiple-attributes", getProductsByMultipleAttributes);
// router.get("/homepage-sections", getHomepageSections); // ✅ হোমপেজের সকল সেকশন
// router.get("/dynamic-section/:sectionId", getProductsForDynamicSection); // ✅ স্পেসিফিক সেকশন
// router.get("/:id", getProductById);
// router.get("/slug/:slug", getProductBySlug);

// // ✅ Admin dashboard route
// router.get("/admin/dashboard", getAdminProducts);

// // ✅ Dynamic Sections Management (Admin only)
// router.get("/admin/sections", protect, admin, getAllDynamicSections);
// router.get("/admin/search", protect, admin, searchProductsForAdmin);
// router.post("/admin/sections", protect, admin, sectionValidationRules, createDynamicSection);
// router.put("/admin/sections/:sectionId", protect, admin, updateDynamicSection);
// router.delete("/admin/sections/:sectionId", protect, admin, deleteDynamicSection);
// router.patch("/admin/sections/:sectionId/toggle", protect, admin, toggleSectionStatus);


// // Existing routes
// router.post("/", protect, admin, productValidationRules, createProduct);
// router.put("/:id", protect, admin, productValidationRules, updateProduct);
// router.delete("/:id", protect, admin, deleteProduct);
// router.patch("/:id/stock", protect, admin, updateStock);

// // ✅ Reviews route - এখন reviewValidationRules ডিফাইন করা আছে
// router.post("/:id/reviews", protect, reviewValidationRules, addReview);

// export default router;

import express from "express";
import {
  createProduct,
  getProducts,
  getAdminProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  addReview,
  getFeaturedProducts,
  updateStock,
  getProductsByAttributes,
  getProductAttributes,
  getProductsByMultipleAttributes,
  getProductsForDynamicSection,
  getHomepageSections,
  createDynamicSection,
  updateDynamicSection,
  deleteDynamicSection,
  getAllDynamicSections,
  toggleSectionStatus,
  searchProductsForAdmin
} from "../controllers/product.controller.js";

import { body } from "express-validator";
import { protect, admin } from "../middlewares/authMiddleware.js";


import { 
  setUploadDir, 
  uploadSingle, 
  uploadMultiple 
} from "../utils/upload.js";

const router = express.Router();

// Validation rules
const productValidationRules = [
  body("name").notEmpty().withMessage("Product name is required"),
  body("category").isMongoId().withMessage("Valid category ID is required"),
  body("basePrice").isNumeric().withMessage("Base price must be a number"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer")
];

const reviewValidationRules = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").optional().isLength({ max: 500 }).withMessage("Comment cannot exceed 500 characters")
];

const sectionValidationRules = [
  body("title").notEmpty().withMessage("Section title is required"),
  body("attributeKey").notEmpty().withMessage("Attribute key is required"),
  body("attributeValue").notEmpty().withMessage("Attribute value is required")
];


router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/attributes", getProductAttributes);
router.get("/filter/attributes", getProductsByAttributes);
router.get("/filter/multiple-attributes", getProductsByMultipleAttributes);
router.get("/homepage-sections", getHomepageSections);
router.get("/dynamic-section/:sectionId", getProductsForDynamicSection);
router.get("/:id", getProductById);
router.get("/slug/:slug", getProductBySlug);

//  Admin dashboard route
router.get("/admin/dashboard", getAdminProducts);

// Dynamic Sections Management (Admin only)
router.get("/admin/sections", protect, admin, getAllDynamicSections);
router.get("/admin/search", protect, admin, searchProductsForAdmin);
router.post("/admin/sections", protect, admin, sectionValidationRules, createDynamicSection);
router.put("/admin/sections/:sectionId", protect, admin, updateDynamicSection);
router.delete("/admin/sections/:sectionId", protect, admin, deleteDynamicSection);
router.patch("/admin/sections/:sectionId/toggle", protect, admin, toggleSectionStatus);

//  Product Management Routes with Local Upload
router.post(
  "/",
  protect,
  admin,
  setUploadDir("products"), 
  uploadSingle,              
  productValidationRules,
  createProduct
);

router.put(
  "/:id",
  protect,
  admin,
  setUploadDir("products"), 
  uploadSingle,              
  productValidationRules,
  updateProduct
);

router.delete("/:id", protect, admin, deleteProduct);
router.patch("/:id/stock", protect, admin, updateStock);


router.post("/:id/reviews", protect, reviewValidationRules, addReview);

export default router;