import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String },
    filename: { type: String },
    alt: { type: String, trim: true },
    size: { type: Number },
    mimetype: { type: String }
  },
  { _id: false }
)

const optionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Color'
    },
    values: [{ type: String, trim: true, required: true }],
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    options: [
      {
        name: { type: String, trim: true, required: true },
        value: { type: String, trim: true, required: true },
        _id: false
      }
    ],
    basePrice: { type: Number, min: 0 },
    discountType: {
      type: String,
      enum: ["none", "percentage", "fixed"],
      default: "none"
    },
    discountValue: { 
      type: Number, 
      default: 0, 
      min: 0,
      validate: {
        validator: function(value) {
          if (this.discountType === "percentage") {
            return value <= 100;
          }
          return true;
        },
        message: "Percentage discount cannot exceed 100%"
      }
    },
    price: { type: Number, min: 0, default: 0 },
    stock: { type: Number, min: 0, default: 0 },
    imageGroupName: { type: String, trim: true },
    sku: { type: String, sparse: true },
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
    },
    description: { type: String, trim: true },
    aplusContent: {
      type: String,
      trim: true
    },
    bulletPoints: [{
      type: String,
      trim: true,
      maxlength: [1700, "Bullet point cannot exceed 1700 characters"]
    }],
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
    discountType: {
      type: String,
      enum: ["none", "percentage", "fixed"],
      default: "none"
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function(value) {
          if (this.discountType === "percentage") {
            return value <= 100;
          }
          return true;
        },
        message: "Percentage discount cannot exceed 100%"
      }
    },
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
    variantOptions: [optionSchema],
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Slug generation middleware
productSchema.pre("save", function (next) {
  if (this.isModified("name") && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!this.slug) {
      this.slug = "product-" + Date.now();
    }
  }
  next();
});

// Updated static method to use new discount fields
productSchema.statics.generateAllVariants = function (variantOptions, baseVariantData = {}) {
  if (!variantOptions || variantOptions.length === 0) return [];

  const generateCombinations = (options, currentIndex = 0, currentCombination = []) => {
    if (currentIndex === options.length) {
      return [currentCombination];
    }

    const currentOption = options[currentIndex];
    const combinations = [];

    for (const value of currentOption.values) {
      const newCombination = [
        ...currentCombination,
        { name: currentOption.name, value: value }
      ];
      combinations.push(...generateCombinations(options, currentIndex + 1, newCombination));
    }

    return combinations;
  };

  const allCombinations = generateCombinations(variantOptions);

  return allCombinations.map((combination, index) => ({
    options: combination,
    basePrice: baseVariantData.basePrice || 0,
    discountType: baseVariantData.discountType || "none",
    discountValue: baseVariantData.discountValue || 0,
    stock: 0,
    imageGroupName: baseVariantData.imageGroupName || '',
    sku: baseVariantData.sku ? `${baseVariantData.sku}-${index + 1}` : `VAR-${index + 1}`
  }));
};

// Pricing Calculation Middleware
function calculatePrice(basePrice, discountType, discountValue) {
  if (discountType === "percentage") {
    return Math.max(0, basePrice - (basePrice * discountValue) / 100);
  } else if (discountType === "fixed") {
    return Math.max(0, basePrice - discountValue);
  }
  return basePrice;
}

// Main pre-save hook for price calculation
productSchema.pre("save", function (next) {
  // Main product price calculation
  if (this.discountType !== "none" && this.discountValue > 0) {
    this.price = calculatePrice(this.basePrice, this.discountType, this.discountValue);
  } else {
    this.price = this.basePrice;
  }

  // Variant price calculation - IMPORTANT
  if (this.hasVariants && this.variants && this.variants.length > 0) {
    this.variants = this.variants.map((variant) => {
      const variantBasePrice = variant.basePrice || this.basePrice;
      let variantPrice = variantBasePrice; // Default price
      // Use variant discount if available
      if (variant.discountType && variant.discountType !== "none" && variant.discountValue > 0) {
        variantPrice = calculatePrice(
          variantBasePrice,
          variant.discountType,
          variant.discountValue
        );
      } 
      // Otherwise use product discount if available 
      else if (this.discountType !== "none" && this.discountValue > 0) {
        variantPrice = calculatePrice(
          variantBasePrice,
          this.discountType,
          this.discountValue
        );
      }
      // Return variant with calculated price
      return {
        ...variant,
        price: variantPrice
      };
    });
  }

  next();
});

productSchema.index({ name: "text", description: "text", brand: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ discountType: 1, discountValue: 1 });

// Text index with weights
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

// Virtual fields
productSchema.virtual('discountAmount').get(function() {
  if (this.discountType === "percentage") {
    return (this.basePrice * this.discountValue) / 100;
  } else if (this.discountType === "fixed") {
    return this.discountValue;
  }
  return 0;
});

productSchema.virtual('isOnSale').get(function() {
  return this.discountType !== "none" && this.discountValue > 0;
});

// Final price calculation method (for manual use if needed)
productSchema.methods.calculateFinalPrice = function() {
  return calculatePrice(this.basePrice, this.discountType, this.discountValue);
};

// Variant final price calculation method
variantSchema.methods.calculateFinalPrice = function(productDiscountType, productDiscountValue) {
  const variantBasePrice = this.basePrice;
  
  if (this.discountType !== "none" && this.discountValue > 0) {
    return calculatePrice(variantBasePrice, this.discountType, this.discountValue);
  } else if (productDiscountType && productDiscountType !== "none" && productDiscountValue > 0) {
    return calculatePrice(variantBasePrice, productDiscountType, productDiscountValue);
  }
  
  return variantBasePrice;
};

export default mongoose.model("Product", productSchema);