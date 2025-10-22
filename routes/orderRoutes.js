// routes/orderRoutes.js
import express from 'express';
import { 
  createOrder, 
  getOrderById, 
  getMyOrders ,
  updateOrderDetails,
  getOrderByIdAdmin
} from '../controllers/orderController.js';
import { optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(optionalProtect, createOrder)
  .get(optionalProtect, getMyOrders);

router.route('/:id')
  .get(optionalProtect, getOrderById);

router.route('/admin/orders/:id')
  .get(optionalProtect, getOrderByIdAdmin)
  .put(optionalProtect, updateOrderDetails);


export default router;