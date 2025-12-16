// uploadRoutes.js - নতুন ভার্সন
import express from 'express'
import { 
  uploadImage, 
  uploadMultipleImages, 
  handleUploadError 
} from '../controllers/uploadController.js'
import upload from '../controllers/uploadController.js'

const router = express.Router()


router.post('/single', upload.single('image'), uploadImage)
router.post(
  '/multiple',
  upload.array('images', 10), 
  uploadMultipleImages
)


export default router