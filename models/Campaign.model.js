import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
      maxlength: [200, "Campaign name cannot exceed 200 characters"],
    },
    // Campaign Type: FLAT (for flat discount)
    type: {
      type: String,
      enum: ["FLAT", "PERCENTAGE"], // You can add more types like 'BUY_X_GET_Y' later
      default: "FLAT", // Based on your request for flat discount
      required: true,
    },
    // Discount value (flat amount or percentage)
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },
    // Duration
    startDate: {
      type: Date,
      required: [true, "Campaign start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Campaign end date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // 🎯 Targets - Choose one or both
    
    // Target Category: If a category is selected, all products in it (and its subcategories, if desired) are affected.
    targetCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    // Target Products: For specific products, regardless of category.
    targetProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    // Priority: Higher number means higher priority.
    // Useful if a product/category falls under multiple campaigns.
    priority: {
      type: Number,
      default: 0,
      min: 0,
    },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// Validate discount dates
campaignSchema.pre("save", function (next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    const error = new Error("Campaign start date must be before end date");
    error.name = "ValidationError";
    return next(error);
  }

  // Ensure 'isActive' is set based on dates upon save
  const now = new Date();
  this.isActive = now >= this.startDate && now <= this.endDate;

  next();
});

// Index for better performance
campaignSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
campaignSchema.index({ targetCategory: 1, isActive: 1 });
campaignSchema.index({ targetProducts: 1, isActive: 1 });

export default mongoose.model("Campaign", campaignSchema);