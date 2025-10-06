import express from 'express';
import { 
  calculateCheckoutData, 
  getDistricts, 
  getUpazilas 
} from '../controllers/checkoutController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ✅ Public routes - কোনো authentication লাগবে না
router.get('/districts', getDistricts);
router.get('/upazilas/:district', getUpazilas);

// ✅ Calculate route - Guest এবং Registered উভয়ের জন্য
router.post('/calculate', optionalProtect, calculateCheckoutData);

export default router;