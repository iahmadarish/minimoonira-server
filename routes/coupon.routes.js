// routes/admin/coupon.routes.js
import express from 'express';
import {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  getCouponStats,
  getRecentCouponUsage,
} from '../../controllers/admin/coupon.controller.js';
import { protect, admin } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
  .post(protect, admin, createCoupon)
  .get(protect, admin, getCoupons);

router.get('/stats', protect, admin, getCouponStats);
router.get('/recent-usage', protect, admin, getRecentCouponUsage);

router.route('/:id')
  .put(protect, admin, updateCoupon)
  .delete(protect, admin, deleteCoupon);

export default router;