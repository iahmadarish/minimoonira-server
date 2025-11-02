import express from 'express';
import { 
  createAbandonedCartPromotion, 
  getUserCampaigns 
} from '../controllers/promotionController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/abandoned-cart', protect, adminOnly, createAbandonedCartPromotion);
router.get('/my-campaigns', protect, getUserCampaigns);

export default router;