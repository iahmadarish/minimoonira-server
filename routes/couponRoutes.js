import express from "express"
import {
  createCoupon,
  getAllCoupons,
  applyCoupon,
} from "../controllers/couponController.js"
// **ধরে নিলাম আপনার কাছে একটি authMiddleware আছে**
// import { isAdmin, protect } from "../middleware/authMiddleware.js"

const router = express.Router()

// অ্যাডমিন রুট (Admin Routes)
// router.route('/').post(protect, isAdmin, createCoupon).get(protect, isAdmin, getAllCoupons)
router.route("/").post(createCoupon).get(getAllCoupons) // আপাতত auth ছাড়া

// কাস্টমার রুট (Customer Route) - চেকআউট পেজে কুপন প্রয়োগ করতে
// router.post('/apply', protect, applyCoupon)
router.post("/apply", applyCoupon) // আপাতত auth ছাড়া

export default router