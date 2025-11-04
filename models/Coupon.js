import mongoose from "mongoose"

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true, // কুপন কোড সবসময় বড় হাতের অক্ষর হবে (যেমন: FLAT500)
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
      // ডিসকাউন্ট এর পরিমাণ (যেমন: 20% বা 500 টাকা)
      type: Number,
      required: [true, "Discount value is required"],
      min: [1, "Discount value must be at least 1"],
    },
    minOrderAmount: {
      // এই কুপন ব্যবহার করার জন্য নূন্যতম কার্ট ভ্যালু
      type: Number,
      default: 0,
      min: [0, "Minimum order amount cannot be negative"],
    },
    maxUsage: {
      // এই কুপনটি সর্বমোট কতবার ব্যবহার করা যাবে
      type: Number,
      default: 0, // 0 মানে Unlimited
    },
    usedCount: {
      // কুপনটি কতবার ব্যবহার করা হয়েছে
      type: Number,
      default: 0,
      select: false, // এটি ডেটাবেস থেকে লোড হবে না যদি না স্পষ্টভাবে চাওয়া হয়
    },
    usagePerCustomer: {
      // একজন কাস্টমার সর্বোচ্চ কতবার ব্যবহার করতে পারবে
      type: Number,
      default: 1,
    },
    // কুপনটি নির্দিষ্ট পণ্য বা ক্যাটাগরির জন্য সীমাবদ্ধ করার জন্য
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
    // toJSON: { virtuals: true },
    // toObject: { virtuals: true },
  }
)

// কুপন সেভ হওয়ার আগে এর মেয়াদ শেষ হওয়ার তারিখ যাচাই (Discount date validation)
couponSchema.pre("save", function (next) {
  if (this.startDate && this.expiryDate) {
    // নিশ্চিত করা যে শুরু তারিখ শেষ তারিখের আগে
    if (this.startDate >= this.expiryDate) {
      const error = new Error("Start date must be before expiry date")
      error.name = "ValidationError"
      return next(error)
    }
  }

  // নিশ্চিত করা যে কুপন টাইপ 'percentage' হলে ভ্যালু 100-এর বেশি না হয়
  if (this.couponType === "percentage" && this.value > 100) {
    const error = new Error("Percentage discount value cannot exceed 100")
    error.name = "ValidationError"
    return next(error)
  }

  next()
})

// কুপন মডেলে 'isExpired' ভার্চুয়াল ফিল্ড যোগ করা হলো
couponSchema.virtual("isExpired").get(function () {
  return this.expiryDate < new Date()
})

const Coupon = mongoose.model("Coupon", couponSchema)
export default Coupon