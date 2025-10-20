import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js'; // Assuming you have these
import { getAdminAnalytics } from '../controllers/adminController.js'; 
import { getOrders, getOrderByIdAdmin, deleteOrder, updateOrderAdmin } from '../controllers/orderController.js'; 

const router = express.Router();

router.use(protect); // All admin routes protected

// Analytics Route
router.get('/analytics', getAdminAnalytics); 

// Existing order routes
router.route('/orders')
    .get(getOrders); 
// ... other admin routes

export default router;