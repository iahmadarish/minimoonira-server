import express from 'express';
import { handleSuccess, handleFailure, handleIPN } from '../controllers/paymentController.js';

const router = express.Router();


router.post('/success', handleSuccess);
router.post('/fail', handleFailure);
router.post('/cancel', handleFailure); 
router.post('/ipn', handleIPN);

export default router;