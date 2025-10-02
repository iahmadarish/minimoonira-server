import express from "express"
import {
  getClothingProducts,
  getClothingProduct,
  createClothingProduct,
  updateClothingProduct,
  deleteClothingProduct,
  getClothingProductsByCategory,
  getClothingProductsByGender,
} from "../controllers/clothingController.js"

const router = express.Router()

router.route("/category/:categoryId").get(getClothingProductsByCategory)
router.route("/gender/:gender").get(getClothingProductsByGender)
router.route("/").get(getClothingProducts).post(createClothingProduct)
router.route("/:id").get(getClothingProduct).put(updateClothingProduct).delete(deleteClothingProduct)

export default router
