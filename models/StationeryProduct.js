import mongoose from "mongoose"
import { makeSlug } from "../utils/makeSlug.js"

const stationeryProductSchema = new mongoose.Schema(
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
    model: {
      type: String,
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

    // Stationery/Toy/Gadget Specific
    productType: {
      type: String,
      enum: ["stationery", "toy", "gadget"],
      required: true,
    },
    ageGroup: {
      min: Number,
      max: Number,
      description: String, // "3-8 years", "Adult", etc.
    },
    material: [String],
    color: [String],
    size: String,
    weight: String,
    batteryRequired: {
      type: Boolean,
      default: false,
    },
    batteryType: String,
    batteryIncluded: {
      type: Boolean,
      default: false,
    },

    // Educational/Safety Info
    educationalValue: [String],
    skillsDeveloped: [String],
    safetyWarnings: [String],
    chokeHazard: {
      type: Boolean,
      default: false,
    },
    certifications: [String], // CE, ASTM, etc.

    // Technical Specs (for gadgets)
    technicalSpecs: {
      connectivity: [String],
      compatibility: [String],
      operatingSystem: String,
      storage: String,
      display: String,
      camera: String,
      sensors: [String],
    },

    // Features
    keyFeatures: [String],
    bulletPoints: [String],
    includedItems: [String],

    // Variants (color, size, type)
    hasVariant: {
      type: Boolean,
      default: false,
    },
    variants: [
      {
        name: String,
        sku: String,
        color: String,
        size: String,
        type: String,
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
    instructionVideo: String,

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
    fragile: {
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
stationeryProductSchema.pre("validate", function (next) {
  if ((!this.slug || this.isModified("name")) && this.name) {
    this.slug = makeSlug(this.name)
  }
  next()
})

// Virtual for discounted price
stationeryProductSchema.virtual("discountedPrice").get(function () {
  const now = new Date()
  const isOfferActive = this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd

  if (isOfferActive && this.discountPercentage > 0) {
    return this.basePrice - (this.basePrice * this.discountPercentage) / 100
  }
  return this.basePrice
})

// Virtual for stock status
stationeryProductSchema.virtual("stockStatus").get(function () {
  if (this.stock === 0) return "out-of-stock"
  if (this.stock <= this.lowStockThreshold) return "low-stock"
  return "in-stock"
})

// Virtual to check if offer is currently active
stationeryProductSchema.virtual("isOfferActive").get(function () {
  const now = new Date()
  return (
    this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd && this.discountPercentage > 0
  )
})

stationeryProductSchema.pre("save", function (next) {
  // Calculate price based on basePrice and discount
  if (this.discountPercentage > 0) {
    this.price = this.basePrice - (this.basePrice * this.discountPercentage) / 100
  } else {
    this.price = this.basePrice
  }
  next()
})

// Indexes
// stationeryProductSchema.index({ slug: 1 })
stationeryProductSchema.index({ category: 1 })
stationeryProductSchema.index({ brand: 1 })
stationeryProductSchema.index({ price: 1 })
stationeryProductSchema.index({ productType: 1 })
stationeryProductSchema.index({ isActive: 1, status: 1 })

const StationeryProduct = mongoose.model("StationeryProduct", stationeryProductSchema)
export default StationeryProduct
