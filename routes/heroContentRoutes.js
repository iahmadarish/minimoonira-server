// routes/heroContentRoutes.js (FINAL CHECK)

import express from 'express';
const router = express.Router();
import {
  getActiveHeroContent,
  getAllHeroContent,
  createHeroContent,
  updateHeroContent,
  deleteHeroContent,
} from '../controllers/heroContentController.js';

// 🚨 No Auth Middleware is called here!
// Make sure you do not have 'import { protect, admin }' here either!

// Public Read Route
router.route('/').get(getActiveHeroContent);

// CRUD Routes (Calling /api/v1/hero/admin/hero from the client)
router.route('/admin/hero')
  .get(getAllHeroContent)    
  .post(createHeroContent);  

router.route('/admin/hero/:id')
  .put(updateHeroContent)    
  .delete(deleteHeroContent); 

export default router;