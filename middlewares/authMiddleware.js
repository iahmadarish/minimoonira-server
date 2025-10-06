// middlewares/authMiddleware.js

import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// ✅ Protect Middleware - লগইন করা ইউজারদের জন্য (বাধ্যতামূলক)
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, token failed' 
    });
  }
};

// ✅ Optional Protect Middleware - Guest এবং Registered User উভয়ের জন্য
// Token থাকলে user set করবে, না থাকলে skip করবে
export const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // যদি token না থাকে, তাহলে guest হিসেবে চলতে দাও
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    // User না পেলেও next করো, guest হিসেবে proceed করবে
    next();
  } catch (error) {
    console.error('Optional token verification failed:', error);
    // Error হলেও guest হিসেবে চলতে দাও
    next();
  }
};

// ✅ Admin Middleware - শুধু Admin দের জন্য
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Not authorized as admin' 
    });
  }
};