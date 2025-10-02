import express from 'express';
import { createOrder, getOrderById, getMyOrders } from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(createOrder) //
    .get(protect, getMyOrders); 

router.route('/:id').get(getOrderById);

export default router;