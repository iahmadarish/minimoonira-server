import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || "ecommerce",
    });

    console.log("========================================");
    console.log("✅ [DATABASE] MongoDB Connected");
    console.log(`🔗 Host     : ${conn.connection.host}`);
    console.log(`📂 Database : ${conn.connection.name}`);
    console.log("========================================");
  } catch (error) {
    console.error("❌ [DATABASE] Connection Error:", error.message);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
