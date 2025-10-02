import express from 'express';
import { calculateCheckoutData } from '../controllers/checkoutController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/calculate', protect, calculateCheckoutData); 

export default router;