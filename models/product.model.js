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
    name: { type: String, trim: true, required: true },
    value: { type: String, trim: true, required: true },
    basePrice: { type: Number, min: 0 },
    discountPercentage: { type: Number, min: 0, max: 100, default: 0 },
    discountStart: { type: Date },
    discountEnd: { type: Date },
    price: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    imageGroupName: { type: String, trim: true },
    sku: { type: String, sparse: true }, // Remove unique constraint for variants
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
      // Remove required: true, let pre-save hook handle it
    },
    description: { type: String, trim: true },
    brand: { type: String, trim: true, default: "Generic" },
    sku: { type: String, unique: true, sparse: true },
    category: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Category", 
      required: [true, "Category is required"] 
    },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    basePrice: { 
      type: Number, 
      required: [true, "Base price is required"], 
      min: [0, "Price cannot be negative"] 
    },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    discountStart: { type: Date },
    discountEnd: { type: Date },
    price: { type: Number, min: 0 },
    currency: { type: String, default: "USD" },
    stock: { 
      type: Number, 
      required: [true, "Stock is required"], 
      min: [0, "Stock cannot be negative"] 
    },
    lowStockAlert: { type: Number, default: 5, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    imageGroups: [
      {
        name: { type: String, required: true, trim: true },
        images: [imageSchema],
      },
    ],
    videos: [{ url: String, public_id: String }],
    attributes: [
      {
        key: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
      },
    ],
    hasVariants: { type: Boolean, default: false },
    variants: [variantSchema],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    weight: { type: Number, default: 0, min: 0 },
    dimensions: { 
      length: { type: Number, default: 0, min: 0 },
      width: { type: Number, default: 0, min: 0 },
      height: { type: Number, default: 0, min: 0 }
    },
    shippingClass: { 
      type: String, 
      default: "Standard",
      enum: ["Standard", "Express", "Overnight", "Free"]
    },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: [{ type: String, trim: true }],
    extraData: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { 
    timestamps: true,
    // Add this to avoid issues with subdocument _id
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate slug from name
productSchema.pre("save", function (next) {
  if (this.isModified("name") && this.name) {
    // Make slug generation more robust
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
    
    // Ensure slug is not empty
    if (!this.slug) {
      this.slug = "product-" + Date.now();
    }
  }
  next();
});

// Pricing Calculation Middleware
// In product.model.js, replace the calculatePrice function and pre-save hook:

function calculatePrice(basePrice, discountPercentage, discountStart, discountEnd) {
  const now = new Date();
  const startDate = discountStart ? new Date(discountStart) : null;
  const endDate = discountEnd ? new Date(discountEnd) : null;
  
  // Check if discount is currently active
  const isDiscountActive = discountPercentage > 0 && 
                          startDate && 
                          endDate &&
                          now >= startDate && 
                          now <= endDate;
  
  if (isDiscountActive) {
    return Math.max(0, basePrice - (basePrice * discountPercentage) / 100);
  }
  return basePrice;
}

// Pre-save hook
productSchema.pre("save", function (next) {
  // Calculate main product price
  this.price = calculatePrice(
    this.basePrice,
    this.discountPercentage,
    this.discountStart,
    this.discountEnd
  );

  // Calculate variant prices
  if (this.hasVariants && this.variants && this.variants.length > 0) {
    this.variants = this.variants.map((variant) => {
      const variantBasePrice = variant.basePrice || this.basePrice;
      const variantDiscountPercentage = variant.discountPercentage || this.discountPercentage;
      const variantDiscountStart = variant.discountStart || this.discountStart;
      const variantDiscountEnd = variant.discountEnd || this.discountEnd;
      
      variant.price = calculatePrice(
        variantBasePrice,
        variantDiscountPercentage,
        variantDiscountStart,
        variantDiscountEnd
      );
      return variant;
    });
  }

  next();
});
// Validate discount dates
productSchema.pre('save', function(next) {
  if (this.discountStart && this.discountEnd) {
    if (this.discountStart >= this.discountEnd) {
      const error = new Error('Discount start date must be before end date');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

// Index for better search performance
productSchema.index({ name: "text", description: "text", brand: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });

// Virtual for computed fields
productSchema.virtual('discountAmount').get(function() {
  if (this.discountPercentage > 0) {
    return this.basePrice - this.price;
  }
  return 0;
});

productSchema.virtual('isOnSale').get(function() {
  const now = new Date();
  return this.discountPercentage > 0 && 
         this.discountStart && 
         this.discountEnd &&
         now >= this.discountStart && 
         now <= this.discountEnd;
});


productSchema.index({ 
    name: "text", 
    description: "text", 
    brand: "text", 
    slug: "text" 
}, { 
    weights: {
        name: 10,
        slug: 5,
        description: 2,
        brand: 3
    }
});

export default mongoose.model("Product", productSchema);