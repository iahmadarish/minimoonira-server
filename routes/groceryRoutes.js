import express from "express"
import {
  getGroceryProducts,
  getGroceryProduct,
  createGroceryProduct,
  updateGroceryProduct,
  deleteGroceryProduct,
  getGroceryProductsByCategory,
  getGroceryProductsByDietary,
} from "../controllers/groceryController.js"

const router = express.Router()

router.route("/category/:categoryId").get(getGroceryProductsByCategory)
router.route("/dietary/:type").get(getGroceryProductsByDietary)
router.route("/").get(getGroceryProducts).post(createGroceryProduct)
router.route("/:id").get(getGroceryProduct).put(updateGroceryProduct).delete(deleteGroceryProduct)

export default router
