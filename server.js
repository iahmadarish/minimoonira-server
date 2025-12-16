// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// // import rateLimit from "express-rate-limit";
// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import morgan from "morgan";
// import cookieParser from 'cookie-parser';
// import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
// import heroContentRoutes from "./routes/heroContentRoutes.js";

// // Routes
// import categoryRoutes from "./routes/categoryRoutes.js";
// import productRoutes from "./routes/product.routes.js";
// import uploadRoutes from './routes/uploadRoutes.js';
// import authRoutes from "./routes/authRoutes.js"
// import cartRoutes from "./routes/cartRoutes.js"
// import orderRoutes from "./routes/orderRoutes.js"
// import adminRoutes from './routes/adminRoutes.js';
// import paymentRoutes from "./routes/paymentRoutes.js"

// import checkoutRoutes from "./routes/checkoutRoutes.js"
// import adminOrderRoutes from './routes/adminOrderRoutes.js';
// import analyticsRoutes from './routes/analyticsRoutes.js';
// import reviewRoutes from "./routes/review.routes.js";
// import heroRoutes from "./routes/heroRoutes.js";

// import promotionRoutes from "./routes/promotionRoutes.js";
// import adminCartRoutes from "./routes/adminCartRoutes.js";
// import couponRoutes from './routes/couponRoutes.js';

// import navbarRoutes from './routes/navbarRoutes.js';

// import path from "path"
// import { fileURLToPath } from "url"
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)


// dotenv.config();

// const app = express();

// // ===== STATIC FILE SERVING CONFIGURATION (এই অংশটি যোগ করুন) =====
// // Make the 'uploads' folder publicly accessible via the '/uploads' URL path
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// const PORT = process.env.PORT || 5000;
// const API_VERSION = process.env.API_VERSION || "v1";

// // ===== Database Connection =====
// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("==========================================");
//     console.log("✅ Database Connection: Successful 🎉");
//     console.log(`📡 Connected to MongoDB at: ${mongoose.connection.host}`);
//     console.log("==========================================");
//   } catch (err) {
//     console.error("❌ Database Connection Failed:", err.message);
//     process.exit(1);
//   }
// };
// connectDB();

// // ===== Security Middlewares =====
// app.use(helmet());

// const allowedOrigins = ['https://minimoonira.vercel.app', 'http://localhost:5173', 'http://localhost:5174', 'https://sandbox.sslcommerz.com','https://securepay.sslcommerz.com', 'https://conqueric.com','https://shop.conqueric.com', ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || origin === 'null') {
//       return callback(null, true);
//     } 
//         if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       console.log(`CORS Error: Blocked origin ${origin}`); 
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   allowedHeaders: ['Content-Type', 'Authorization'], 
// }));

// // Body parser for JSON
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// // Logging middleware (only in dev)
// if (process.env.NODE_ENV !== "production") {
//   app.use(morgan("dev"));
// }

// // ===== API Routes =====
// app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
// app.use(`/api/${API_VERSION}/products`, productRoutes);
// app.use(`/api/${API_VERSION}/upload`, uploadRoutes);
// app.use(`/api/${API_VERSION}/auth`, authRoutes);
// app.use(`/api/${API_VERSION}/cart`, cartRoutes);
// app.use(`/api/${API_VERSION}/orders`, orderRoutes);
// app.use(`/api/${API_VERSION}/payment`, paymentRoutes);
// app.use(`/api/${API_VERSION}/checkout`, checkoutRoutes);
// app.use('/api/v1/admin/orders', adminOrderRoutes);
// app.use('/api/v1/admin/analytics', analyticsRoutes);
// app.use("/api/v1/reviews", reviewRoutes);
// app.use('/api/v1/admin', adminRoutes);
// app.use(`/api/${API_VERSION}/hero`, heroContentRoutes);
// app.use(`/api/${API_VERSION}/hero`, heroRoutes);  
 
// app.use(`/api/${API_VERSION}/promotions`, promotionRoutes);
// app.use(`/api/${API_VERSION}/navbar`, navbarRoutes);
// app.use('/api/v1/admin/cart-campaigns', adminCartRoutes);
// app.use('/api/v1/coupons', couponRoutes);
// // app.use('/api/v1/navbar', navbarRoutes);
// // web store CMS - Hero Content 

// // app.use('/api/v1/admin', adminRoutes);
// // ===== Health Check =====
// app.get("/health", (req, res) => {
//   res.status(200).json({
//     status: "OK",
//     message: "✅ E-commerce API is running smoothly!",
//     environment: process.env.NODE_ENV || "development",
//     version: API_VERSION,
//     timestamp: new Date().toISOString(),
//   });
// });

// // ===== Error Handling =====
// app.use(notFound);
// app.use(errorHandler);

// // ===== Start Server =====
// app.listen(PORT, () => {
//   console.log("==========================================");
//   console.log(`🚀 Server is Live!`);
//   console.log(`🌐 URL: http://localhost:${PORT}/api/${API_VERSION}`);
//   console.log(`⚙️ Mode: ${process.env.NODE_ENV || "development"}`);
//   console.log("==========================================");
// });
import fs from 'fs';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";
import cookieParser from 'cookie-parser';
import path from "path";
import { fileURLToPath } from "url";

// Middlewares
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";

// Routes
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/product.routes.js";
import uploadRoutes from './routes/uploadRoutes.js';
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from "./routes/paymentRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import reviewRoutes from "./routes/review.routes.js";
import heroRoutes from "./routes/heroRoutes.js";
import heroContentRoutes from "./routes/heroContentRoutes.js";
import promotionRoutes from "./routes/promotionRoutes.js";
import adminCartRoutes from "./routes/adminCartRoutes.js";
import couponRoutes from './routes/couponRoutes.js';
import navbarRoutes from './routes/navbarRoutes.js';

// ES Module friendly __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || "v1";
const NODE_ENV = process.env.NODE_ENV || "development";

// ===== STATIC FILE SERVING CONFIGURATION =====
// Make the 'uploads' folder publicly accessible via the '/uploads' URL path
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ✅ OPTIONAL: Additional security for static files
app.use('/uploads', (req, res, next) => {
  // Prevent directory listing in production
  if (NODE_ENV === 'production' && req.path.endsWith('/')) {
    return res.status(403).json({ error: 'Directory access forbidden' });
  }
  next();
});

// ✅ OPTIONAL: Serve public folder for other static assets
app.use('/public', express.static(path.join(__dirname, 'public')));

// ===== DATABASE CONNECTION =====
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("==========================================");
    console.log("✅ Database Connection: Successful 🎉");
    console.log(`📡 Connected to MongoDB at: ${mongoose.connection.host}`);
    console.log(`📊 Database Name: ${mongoose.connection.name}`);
    console.log("==========================================");
  } catch (err) {
    console.error("❌ Database Connection Failed:", err.message);
    process.exit(1);
  }
};


app.get('/check-file', (req, res) => {
  const testPath = path.join(__dirname, 'uploads/products/product-1765876193678-246001276.jpg');
  
  if (fs.existsSync(testPath)) {
    res.send("✅ ফাইলটি এই পাথে পাওয়া গেছে: " + testPath);
  } else {
    res.send("❌ ফাইলটি ফোল্ডারে নেই! চেক করা পাথ: " + testPath);
  }
});


// ===== SECURITY MIDDLEWARES =====
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" } // For static files
}));

// CORS Configuration
const allowedOrigins = [
  'https://minimoonira.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://sandbox.sslcommerz.com',
  'https://securepay.sslcommerz.com',
  'https://conqueric.com',
  'https://shop.conqueric.com',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || origin === 'null') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log blocked origins in development
      if (NODE_ENV !== 'production') {
        console.log(`⚠️ CORS Warning: Blocked origin ${origin}`);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id']
}));

// Cookie parser
app.use(cookieParser());

// Body parser with increased limits for image uploads
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// ===== LOGGING MIDDLEWARE =====
if (NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  // Production logging
  app.use(morgan("combined", {
    skip: (req, res) => req.path.startsWith('/uploads') // Skip static file logs
  }));
}

// ===== API ROUTES =====
app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/products`, productRoutes);
app.use(`/api/${API_VERSION}/upload`, uploadRoutes);
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/cart`, cartRoutes);
app.use(`/api/${API_VERSION}/orders`, orderRoutes);
app.use(`/api/${API_VERSION}/payment`, paymentRoutes);
app.use(`/api/${API_VERSION}/checkout`, checkoutRoutes);
app.use(`/api/${API_VERSION}/admin/orders`, adminOrderRoutes);
app.use(`/api/${API_VERSION}/admin/analytics`, analyticsRoutes);
app.use(`/api/${API_VERSION}/reviews`, reviewRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/hero`, heroContentRoutes);
app.use(`/api/${API_VERSION}/hero`, heroRoutes);
app.use(`/api/${API_VERSION}/promotions`, promotionRoutes);
app.use(`/api/${API_VERSION}/navbar`, navbarRoutes);
app.use(`/api/${API_VERSION}/admin/cart-campaigns`, adminCartRoutes);
app.use(`/api/${API_VERSION}/coupons`, couponRoutes);

// ===== HEALTH CHECK & SERVER INFO =====
app.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    status: "OK",
    message: "✅ E-commerce API is running smoothly!",
    environment: NODE_ENV,
    version: API_VERSION,
    serverTime: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memoryUsage: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    },
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

// API Documentation/Info endpoint
app.get("/api", (req, res) => {
  res.json({
    api: "E-commerce API",
    version: API_VERSION,
    endpoints: {
      products: `/api/${API_VERSION}/products`,
      categories: `/api/${API_VERSION}/categories`,
      auth: `/api/${API_VERSION}/auth`,
      orders: `/api/${API_VERSION}/orders`,
      upload: `/api/${API_VERSION}/upload`,
      documentation: "https://github.com/your-username/ecommerce-api"
    },
    staticFiles: {
      uploads: "/uploads/{folder}/{filename}",
      example: "/uploads/products/product-12345.jpg"
    }
  });
});

// ===== ERROR HANDLING =====
app.use(notFound);
app.use(errorHandler);

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// ===== START SERVER =====
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log("==========================================");
      console.log(`🚀 Server is Live!`);
      console.log(`🌐 Environment: ${NODE_ENV}`);
      console.log(`🔗 Base URL: http://localhost:${PORT}`);
      console.log(`📁 Static Files: http://localhost:${PORT}/uploads/`);
      console.log(`📚 API Version: ${API_VERSION}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/health`);
      console.log("==========================================");
    });
    
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();

export default app;