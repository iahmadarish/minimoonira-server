import cloudinary from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.v2.config({
  cloud_name: 'dm6lzpfxp',
  api_key: '946663465526379',
  api_secret: 'vI3UkQ4CkJNc6TuQYJ46FliBPuQ'
});

console.log("Cloudinary configured with:", {
  cloud_name: cloudinary.v2.config().cloud_name,
  api_key: cloudinary.v2.config().api_key
});

// Configure multer storage for Cloudinary with explicit credentials
const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: 'ecommerce-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto' }
    ],
    public_id: (req, file) => {
      return `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    }
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      image: {
        url: req.file.path,
        public_id: req.file.filename
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image'
    });
  }
};

export const uploadMultipleImages = async (req, res) => {
  try {
    console.log("Cloudinary config check:", {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
    });

    // Verify Cloudinary is configured
    if (!process.env.CLOUDINARY_API_KEY) {
      console.error("Cloudinary API key is missing!");
      return res.status(500).json({
        success: false,
        message: 'Cloudinary not configured properly'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Test Cloudinary connection
    try {
      // Simple test to verify Cloudinary works
      await cloudinary.v2.api.ping();
      console.log("Cloudinary connection test passed");
    } catch (testError) {
      console.error("Cloudinary connection test failed:", testError);
      return res.status(500).json({
        success: false,
        message: 'Cloudinary connection failed: ' + testError.message
      });
    }

    const uploadedImages = req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
      originalname: file.originalname
    }));

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      images: uploadedImages
    });

  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error uploading images: ' + error.message
    });
  }
};

// Error handling middleware
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }
  
  if (error.message === 'Not an image! Please upload only images.') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  console.error('Upload error:', error);
  res.status(500).json({
    success: false,
    message: 'Upload failed: ' + error.message
  });
};

// Add this to your uploadController.js or create a new route
export const debugEnv = async (req, res) => {
  console.log("Environment variables:", {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '***SET***' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV
  });

  res.status(200).json({
    success: true,
    env: {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET ? '***SET***' : 'MISSING'
    }
  });
};


// Export the multer instance as default
export default upload;