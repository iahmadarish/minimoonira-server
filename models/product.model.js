import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String }, // Optional for Cloudinary
    filename: { type: String }, // ✅ Add filename for local storage
    alt: { type: String, trim: true },
    size: { type: Number }, // Optional
    mimetype: { type: String } // Optional
  },
  { _id: false }
)


const optionSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true, 
      // enum: ['Color', 'Size', 'Material', 'Style', 'Bundle'], 
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
        name: { type: String, trim: true, required: true }, // e.g., "Color" 
        value: { type: String, trim: true, required: true }, // e.g., "Red"
        _id: false
      }
    ],
    basePrice: { type: Number, min: 0 },
    discountPercentage: { type: Number, min: 0, max: 100, default: 0 },
    discountStart: { type: Date },
    discountEnd: { type: Date },
    price: { type: Number, min: 0 },
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
      maxlength: [200, "Bullet point cannot exceed 200 characters"]
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

// Generate slug from name
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

productSchema.statics.generateAllVariants = function(variantOptions, baseVariantData = {}) {
  if (!variantOptions || variantOptions.length === 0) return [];

  // Recursive function to generate all combinations
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
  
  // Convert to variant objects
  return allCombinations.map((combination, index) => ({
    options: combination,
    basePrice: baseVariantData.basePrice || 0,
    discountPercentage: baseVariantData.discountPercentage || 0,
    discountStart: baseVariantData.discountStart,
    discountEnd: baseVariantData.discountEnd,
    stock: 0, // Default stock 0
    imageGroupName: baseVariantData.imageGroupName || '',
    sku: baseVariantData.sku ? `${baseVariantData.sku}-${index + 1}` : `VAR-${index + 1}`
  }));
};

// Pricing Calculation Middleware
function calculatePrice(
  variantBasePrice, 
  variantDiscountPercentage, 
  variantDiscountStart, 
  variantDiscountEnd,
  productDiscountPercentage,
  productDiscountStart, 
  productDiscountEnd 
) {
  const now = new Date();
  
  // প্রথমে variant discount check করুন
  if (variantDiscountPercentage > 0) {
    const variantStartDate = variantDiscountStart ? new Date(variantDiscountStart) : null;
    const variantEndDate = variantDiscountEnd ? new Date(variantDiscountEnd) : null;
    
    const isVariantDiscountActive = 
      (!variantStartDate && !variantEndDate) || // No date restriction
      (variantStartDate && variantEndDate && now >= variantStartDate && now <= variantEndDate);
    
    if (isVariantDiscountActive) {
      return Math.max(0, variantBasePrice - (variantBasePrice * variantDiscountPercentage) / 100);
    }
  }
  
  // Variant discount না থাকলে product level discount check করুন
  if (productDiscountPercentage > 0) {
    const productStartDate = productDiscountStart ? new Date(productDiscountStart) : null;
    const productEndDate = productDiscountEnd ? new Date(productDiscountEnd) : null;
    
    const isProductDiscountActive = 
      (!productStartDate && !productEndDate) || // No date restriction
      (productStartDate && productEndDate && now >= productStartDate && now <= productEndDate);
    
    if (isProductDiscountActive) {
      return Math.max(0, variantBasePrice - (variantBasePrice * productDiscountPercentage) / 100);
    }
  }
  
  // কোনো discount না থাকলে base price return করুন
  return variantBasePrice;
}

// Pre-save hook
productSchema.pre("save", function (next) {
  // Main product price calculation
  this.price = calculatePrice(
    this.basePrice,
    this.discountPercentage,
    this.discountStart,
    this.discountEnd,
    this.discountPercentage, // product level discount
    this.discountStart,      // product level dates
    this.discountEnd
  );

  if (this.hasVariants && this.variants && this.variants.length > 0) {
    this.variants = this.variants.map((variant) => {
      const variantBasePrice = variant.basePrice || this.basePrice;
      const variantDiscountPercentage = variant.discountPercentage || 0;
      const variantDiscountStart = variant.discountStart || null;
      const variantDiscountEnd = variant.discountEnd || null;
      
      variant.price = calculatePrice(
        variantBasePrice,
        variantDiscountPercentage,
        variantDiscountStart,
        variantDiscountEnd,
        this.discountPercentage,  // Pass product level discount
        this.discountStart,       // Pass product level dates  
        this.discountEnd
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
productSchema.index({ createdAt: -1 });
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