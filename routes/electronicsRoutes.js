import express from "express"
import {
  getElectronicsProducts,
  getElectronicsProduct,
  createElectronicsProduct,
  updateElectronicsProduct,
  deleteElectronicsProduct,
  getElectronicsProductsByCategory,
} from "../controllers/electronicsController.js"

const router = express.Router()

router.route("/category/:categoryId").get(getElectronicsProductsByCategory)
router.route("/").get(getElectronicsProducts).post(createElectronicsProduct)
router.route("/:id").get(getElectronicsProduct).put(updateElectronicsProduct).delete(deleteElectronicsProduct)

export default router
