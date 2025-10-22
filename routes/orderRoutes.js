// routes/orderRoutes.js
import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  updatePaymentStatus,
  addAdminNote,
  deleteOrder,
  getOrderByIdAdmin,
  updateOrderDetails // ✅ নতুন ফাংশন import করুন
} from '../controllers/orderController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public/User routes
router.route('/')
  .post(protect, createOrder)
  .get(protect, getMyOrders);

router.route('/:id')
  .get(protect, getOrderById);

// Admin routes
router.route('/admin/orders')
  .get(protect, admin, getAllOrders);

router.route('/admin/orders/stats')
  .get(protect, admin, getOrderStats);

// ✅ এই route গুলো নিশ্চিত করুন
router.route('/admin/orders/:id')
  .get(protect, admin, getOrderByIdAdmin)
  .put(protect, admin, updateOrderDetails); // ✅ নতুন route যোগ করুন

router.route('/admin/orders/:id/status')
  .put(protect, admin, updateOrderStatus);

router.route('/admin/orders/:id/payment')
  .put(protect, admin, updatePaymentStatus);

router.route('/admin/orders/:id/notes')
  .post(protect, admin, addAdminNote);

router.route('/admin/orders/:id')
  .delete(protect, admin, deleteOrder);

export default router;