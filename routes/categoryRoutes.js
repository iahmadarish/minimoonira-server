import express from "express"
import {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryPath,
} from "../controllers/categoryController.js"

const router = express.Router()

router.route("/tree").get(getCategoryTree)
router.route("/:id/path").get(getCategoryPath)
router.route("/").get(getCategories).post(createCategory)
router.route("/:id").get(getCategory).put(updateCategory).delete(deleteCategory)

export default router
