import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";

import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";

// Routes
import categoryRoutes from "./routes/categoryRoutes.js";
import electronicsRoutes from "./routes/electronicsRoutes.js";
import clothingRoutes from "./routes/clothingRoutes.js";
import furnitureRoutes from "./routes/furnitureRoutes.js";
import groceryRoutes from "./routes/groceryRoutes.js";
import homeKitchenRoutes from "./routes/homeKitchenRoutes.js";
import stationeryRoutes from "./routes/stationeryRoutes.js";
import productRoutes from "./routes/product.routes.js";
import uploadRoutes from './routes/uploadRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || "v1";

// ===== Database Connection =====
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); // ⚡ useNewUrlParser & useUnifiedTopology আর লাগবে না
    console.log("==========================================");
    console.log("✅ Database Connection: Successful 🎉");
    console.log(`📡 Connected to MongoDB at: ${mongoose.connection.host}`);
    console.log("==========================================");
  } catch (err) {
    console.error("❌ Database Connection Failed:", err.message);
    process.exit(1); // Fatal error হলে server বন্ধ হবে
  }
};
connectDB();

// ===== Security Middlewares =====
app.use(helmet());
// app.use(cors());

app.use(cors({
  origin: 'http://localhost:5173', // আপনার React app এর URL
  credentials: true
}));

// Body parser for JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));



// Logging middleware (only in dev)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP
  message: "⚠️ Too many requests from this IP, please try again later.",
});





app.use("/api/", limiter);

// ===== Body Parsers =====
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===== API Routes =====
app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/products/electronics`, electronicsRoutes);
app.use(`/api/${API_VERSION}/products/clothing`, clothingRoutes);
app.use(`/api/${API_VERSION}/products/furniture`, furnitureRoutes);
app.use(`/api/${API_VERSION}/products/grocery`, groceryRoutes);
app.use(`/api/${API_VERSION}/products/homekitchen`, homeKitchenRoutes);
app.use(`/api/${API_VERSION}/products/stationery`, stationeryRoutes);
app.use(`/api/${API_VERSION}/products`, productRoutes);
app.use(`/api/${API_VERSION}/upload`, uploadRoutes);

// app.use(`/api/${API_VERSION}/products"`, productRoutes);
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
