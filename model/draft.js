import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String },
    alt: { type: String, trim: true },
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },  // Example: "Size"
    value: { type: String, trim: true, required: true }, // Example: "XL"

    // ✅ Variant Level Pricing
    basePrice: { type: Number, min: 0 }, 
    discountPercentage: { type: Number, min: 0, max: 100, default: 0 },
    discountStart: { type: Date },
    discountEnd: { type: Date },

    // auto-calculated later (discount logic)
    price: { type: Number, min: 0 },

    stock: { type: Number, min: 0, default: 0 },

    // Reference to image group
    imageGroupName: { type: String, trim: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: { type: String, trim: true },
    brand: { type: String, trim: true, default: "Generic" },
    sku: { type: String, unique: true, sparse: true },

    // Category
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },

    // ✅ Product Level Pricing
    basePrice: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    discountStart: { type: Date },
    discountEnd: { type: Date },

    // auto-calculated later
    price: { type: Number, min: 0 },

    currency: { type: String, default: "USD" },

    // Inventory
    stock: { type: Number, required: true, min: 0 },
    lowStockAlert: { type: Number, default: 5 },

    // Status
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // ✅ Media (Grouped Images)
    imageGroups: [
      {
        name: { type: String, required: true, trim: true }, // "Group-Red", "Gallery-1"
        images: [imageSchema],
      },
    ],

    videos: [{ url: String, public_id: String }],

    // Attributes
    attributes: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],

    // ✅ Variants
    hasVariants: { type: Boolean, default: false },
    variants: [variantSchema],

    // Reviews
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Shipping
    weight: { type: Number, default: 0 },
    dimensions: { length: Number, width: Number, height: Number },
    shippingClass: { type: String, default: "Standard" },

    // SEO
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: [{ type: String }],

    // Extra Data
    extraData: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// ✅ Pricing Calculation Middleware
function calculatePrice(basePrice, discountPercentage, discountStart, discountEnd) {
  const now = new Date();
  if (
    discountPercentage > 0 &&
    discountStart &&
    discountEnd &&
    now >= discountStart &&
    now <= discountEnd
  ) {
    return Math.max(0, basePrice - (basePrice * discountPercentage) / 100);
  }
  return basePrice;
}

// Product pre-save hook
productSchema.pre("save", function (next) {
  this.price = calculatePrice(
    this.basePrice,
    this.discountPercentage,
    this.discountStart,
    this.discountEnd
  );

  if (this.hasVariants && this.variants.length > 0) {
    this.variants = this.variants.map((variant) => {
      variant.price = calculatePrice(
        variant.basePrice || this.basePrice, // fallback to product basePrice
        variant.discountPercentage || this.discountPercentage,
        variant.discountStart || this.discountStart,
        variant.discountEnd || this.discountEnd
      );
      return variant;
    });
  }

  next();
});

export default mongoose.model("Product", productSchema);
