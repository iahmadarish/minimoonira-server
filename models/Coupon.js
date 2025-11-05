import mongoose from "mongoose"

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true, 
      trim: true,
    },
    description: {
      type: String,
      maxlength: [200, "Description cannot exceed 200 characters"],
      trim: true,
    },
    couponType: {
      type: String,
      enum: ["percentage", "fixed_amount", "free_shipping"],
      required: [true, "Coupon type is required"],
    },
    value: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [1, "Discount value must be at least 1"],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, "Minimum order amount cannot be negative"],
    },
    maxUsage: {
      type: Number,
      default: 0, 
    },
    usedCount: {
      type: Number,
      default: 0,
      select: false, 
    },
    usagePerCustomer: {
      type: Number,
      default: 1,
    },
    appliesTo: {
      type: String,
      enum: ["all", "products", "categories"],
      default: "all",
    },
    productRestrictions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    categoryRestrictions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)
couponSchema.pre("save", function (next) {
  if (this.startDate && this.expiryDate) {
    if (this.startDate >= this.expiryDate) {
      const error = new Error("Start date must be before expiry date")
      error.name = "ValidationError"
      return next(error)
    }
  }
  if (this.couponType === "percentage" && this.value > 100) {
    const error = new Error("Percentage discount value cannot exceed 100")
    error.name = "ValidationError"
    return next(error)
  }

  next()
})
couponSchema.virtual("isExpired").get(function () {
  return this.expiryDate < new Date()
})

const Coupon = mongoose.model("Coupon", couponSchema)
export default Coupon