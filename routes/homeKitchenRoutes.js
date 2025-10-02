import express from "express"
import {
  getHomeKitchenProducts,
  getHomeKitchenProduct,
  createHomeKitchenProduct,
  updateHomeKitchenProduct,
  deleteHomeKitchenProduct,
  getHomeKitchenProductsByCategory,
  getHomeKitchenProductsByRoom,
} from "../controllers/homeKitchenController.js"

const router = express.Router()

router.route("/category/:categoryId").get(getHomeKitchenProductsByCategory)
router.route("/room/:roomType").get(getHomeKitchenProductsByRoom)
router.route("/").get(getHomeKitchenProducts).post(createHomeKitchenProduct)
router.route("/:id").get(getHomeKitchenProduct).put(updateHomeKitchenProduct).delete(deleteHomeKitchenProduct)

export default router
