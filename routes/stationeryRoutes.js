import express from "express"
import {
  getStationeryProducts,
  getStationeryProduct,
  createStationeryProduct,
  updateStationeryProduct,
  deleteStationeryProduct,
  getStationeryProductsByCategory,
  getStationeryProductsByType,
  getStationeryProductsByAge,
} from "../controllers/stationeryController.js"

const router = express.Router()

router.route("/category/:categoryId").get(getStationeryProductsByCategory)
router.route("/type/:productType").get(getStationeryProductsByType)
router.route("/age/:minAge/:maxAge").get(getStationeryProductsByAge)
router.route("/").get(getStationeryProducts).post(createStationeryProduct)
router.route("/:id").get(getStationeryProduct).put(updateStationeryProduct).delete(deleteStationeryProduct)

export default router
