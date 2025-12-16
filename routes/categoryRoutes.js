import express from "express"
import {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryPath,
  deleteCategoryImage,
} from "../controllers/categoryController.js"
import { uploadCategoryImage } from "../utils/uploadCategoryImage.js"

const router = express.Router()

router.route("/tree").get(getCategoryTree)
router.route("/:id/path").get(getCategoryPath)
router.route("/").get(getCategories).post(uploadCategoryImage, createCategory)
router.route("/:id").get(getCategory).put(uploadCategoryImage, updateCategory).delete(deleteCategory)
router.route("/:id/image").delete(deleteCategoryImage)

export default router
