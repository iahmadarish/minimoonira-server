import express from "express";
import cors from "cors";
import helmet from "helmet";
// import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
import heroContentRoutes from "./routes/heroContentRoutes.js";

// Routes
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/product.routes.js";
import uploadRoutes from './routes/uploadRoutes.js';
import authRoutes from "./routes/authRoutes.js"
import cartRoutes from "./routes/cartRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from "./routes/paymentRoutes.js"

import checkoutRoutes from "./routes/checkoutRoutes.js"
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import reviewRoutes from "./routes/review.routes.js";
import heroRoutes from "./routes/heroRoutes.js";

import promotionRoutes from "./routes/promotionRoutes.js";
import adminCartRoutes from "./routes/adminCartRoutes.js";
import couponRoutes from './routes/couponRoutes.js';


// import adminRoutes from './routes/adminRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || "v1";

// ===== Database Connection =====
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("==========================================");
    console.log("✅ Database Connection: Successful 🎉");
    console.log(`📡 Connected to MongoDB at: ${mongoose.connection.host}`);
    console.log("==========================================");
  } catch (err) {
    console.error("❌ Database Connection Failed:", err.message);
    process.exit(1);
  }
};
connectDB();

// ===== Security Middlewares =====
app.use(helmet());

const allowedOrigins = ['https://minimoonira.vercel.app', 'http://localhost:5173', 'http://localhost:5174', 'https://sandbox.sslcommerz.com','https://securepay.sslcommerz.com', 'https://conqueric.com', 'https://conqueric.com/ecommerce' ];

app.use(cors({
  origin: function (origin, callback) {
    
    // 🚀 সমাধান: যদি Origin 'null' হয় (পেমেন্ট গেটওয়ে বা IPN এর ক্ষেত্রে ঘটে), তবে অনুমতি দাও
    if (!origin || origin === 'null') {
      return callback(null, true);
    } 
    
    // যদি OriginallowedOrigins এ থাকে, তবে অনুমতি দাও
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log the blocked origin for debugging
      console.log(`CORS Error: Blocked origin ${origin}`); 
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'], 
}));

// Body parser for JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware (only in dev)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ===== API Routes =====
app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/products`, productRoutes);
app.use(`/api/${API_VERSION}/upload`, uploadRoutes);
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/cart`, cartRoutes);
app.use(`/api/${API_VERSION}/orders`, orderRoutes);
app.use(`/api/${API_VERSION}/payment`, paymentRoutes);
app.use(`/api/${API_VERSION}/checkout`, checkoutRoutes);
app.use('/api/v1/admin/orders', adminOrderRoutes);
app.use('/api/v1/admin/analytics', analyticsRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use(`/api/${API_VERSION}/hero`, heroContentRoutes);
app.use(`/api/${API_VERSION}/hero`, heroRoutes);

app.use(`/api/${API_VERSION}/promotions`, promotionRoutes);
app.use('/api/v1/admin/cart-campaigns', adminCartRoutes);
app.use('/api/v1/coupons', couponRoutes);

// web store CMS - Hero Content 

// app.use('/api/v1/admin', adminRoutes);
// ===== Health Check =====
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "✅ E-commerce API is running smoothly!",
    environment: process.env.NODE_ENV || "development",
    version: API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// ===== Error Handling =====
app.use(notFound);
app.use(errorHandler);

// ===== Start Server =====
app.listen(PORT, () => {
  console.log("==========================================");
  console.log(`🚀 Server is Live!`);
  console.log(`🌐 URL: http://localhost:${PORT}/api/${API_VERSION}`);
  console.log(`⚙️ Mode: ${process.env.NODE_ENV || "development"}`);
  console.log("==========================================");
});
