import express from 'express';
import { uploadImage, uploadMultipleImages, handleUploadError, debugEnv } from '../controllers/uploadController.js';
import upload from '../controllers/uploadController.js'; // This imports the multer instance

const router = express.Router();

router.post('/single', upload.single('image'), uploadImage);
router.post(
  '/multiple',
  upload.array('images', 10), // Max 10 files
  handleUploadError,
  uploadMultipleImages
);

router.get('/debug-env', debugEnv);

export default router;