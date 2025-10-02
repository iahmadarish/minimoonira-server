import express from "express"
import {
  getFurnitureProducts,
  getFurnitureProduct,
  createFurnitureProduct,
  updateFurnitureProduct,
  deleteFurnitureProduct,
  getFurnitureProductsByCategory,
  getFurnitureProductsByStyle,
} from "../controllers/furnitureController.js"

const router = express.Router()

router.route("/category/:categoryId").get(getFurnitureProductsByCategory)
router.route("/style/:style").get(getFurnitureProductsByStyle)
router.route("/").get(getFurnitureProducts).post(createFurnitureProduct)
router.route("/:id").get(getFurnitureProduct).put(updateFurnitureProduct).delete(deleteFurnitureProduct)

export default router
