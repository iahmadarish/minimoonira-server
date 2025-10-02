import mongoose from "mongoose"
import { makeSlug } from "../utils/makeSlug.js"

const groceryProductSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
    },
    description: {
      type: String,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },

    // Pricing
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Price cannot be negative"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },
    offerStart: {
      type: Date,
      default: null,
    },
    offerEnd: {
      type: Date,
      default: null,
    },
    currency: {
      type: String,
      default: "USD",
    },

    // Stock & Inventory
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    soldCount: {
      type: Number,
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Grocery Specific
    nutritionFacts: {
      calories: Number,
      protein: String,
      carbohydrates: String,
      fat: String,
      fiber: String,
      sugar: String,
      sodium: String,
      vitamins: [String],
    },
    ingredients: [String],
    allergens: [String],
    dietaryInfo: {
      isVegan: { type: Boolean, default: false },
      isVegetarian: { type: Boolean, default: false },
      isGlutenFree: { type: Boolean, default: false },
      isOrganic: { type: Boolean, default: false },
      isKeto: { type: Boolean, default: false },
    },
    expiryDate: Date,
    manufacturingDate: Date,
    shelfLife: String,
    storageInstructions: String,
    servingSize: String,
    servingsPerContainer: Number,
    origin: String,
    certifications: [String], // Organic, Fair Trade, etc.

    // Variants (size, flavor, pack)
    hasVariant: {
      type: Boolean,
      default: false,
    },
    variants: [
      {
        name: String,
        sku: String,
        size: String,
        flavor: String,
        packSize: String,
        price: Number,
        stock: { type: Number, default: 0 },
        images: [{ url: String, public_id: String }],
      },
    ],

    // Relations
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    tags: [String],

    // Media
    thumbnail: {
      url: String,
      public_id: String,
    },
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
    videos: [String],

    // Shipping
    shippingWeight: Number,
    shippingDimensions: {
      length: String,
      width: String,
      height: String,
    },
    freeShipping: {
      type: Boolean,
      default: false,
    },
    requiresRefrigeration: {
      type: Boolean,
      default: false,
    },

    // SEO
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],

    // Flags
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },

    // Status
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Auto-generate slug
groceryProductSchema.pre("validate", function (next) {
  if ((!this.slug || this.isModified("name")) && this.name) {
    this.slug = makeSlug(this.name)
  }
  next()
})

// Virtual for discounted price
groceryProductSchema.virtual("discountedPrice").get(function () {
  const now = new Date()
  const isOfferActive = this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd

  if (isOfferActive && this.discountPercentage > 0) {
    return this.basePrice - (this.basePrice * this.discountPercentage) / 100
  }
  return this.basePrice
})

// Virtual for stock status
groceryProductSchema.virtual("stockStatus").get(function () {
  if (this.stock === 0) return "out-of-stock"
  if (this.stock <= this.lowStockThreshold) return "low-stock"
  return "in-stock"
})

// Virtual to check if offer is currently active
groceryProductSchema.virtual("isOfferActive").get(function () {
  const now = new Date()
  return (
    this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd && this.discountPercentage > 0
  )
})

// Virtual to check if product is expired
groceryProductSchema.virtual("isExpired").get(function () {
  if (!this.expiryDate) return false
  return new Date() > this.expiryDate
})

groceryProductSchema.pre("save", function (next) {
  // Calculate price based on basePrice and discount
  if (this.discountPercentage > 0) {
    this.price = this.basePrice - (this.basePrice * this.discountPercentage) / 100
  } else {
    this.price = this.basePrice
  }
  next()
})

// Indexes
// groceryProductSchema.index({ slug: 1 })
groceryProductSchema.index({ category: 1 })
groceryProductSchema.index({ brand: 1 })
groceryProductSchema.index({ price: 1 })
groceryProductSchema.index({ isActive: 1, status: 1 })
groceryProductSchema.index({ expiryDate: 1 })

const GroceryProduct = mongoose.model("GroceryProduct", groceryProductSchema)
export default GroceryProduct
