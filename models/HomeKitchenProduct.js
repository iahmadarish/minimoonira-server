import mongoose from "mongoose"
import { makeSlug } from "../utils/makeSlug.js"

const homeKitchenProductSchema = new mongoose.Schema(
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

    // Home & Kitchen Specific
    material: {
      primary: String,
      secondary: [String],
    },
    capacity: String,
    powerRating: String,
    energyRating: String,
    warranty: {
      type: String,
      default: "1 year",
    },
    careInstructions: [String],
    safetyFeatures: [String],
    includedAccessories: [String],
    compatibility: [String],
    roomType: [String], // Kitchen, Living Room, Bedroom, etc.

    // Technical Specifications
    dimensions: {
      height: String,
      width: String,
      depth: String,
      weight: String,
    },
    electricalSpecs: {
      voltage: String,
      wattage: String,
      frequency: String,
    },

    // Features
    keyFeatures: [String],
    bulletPoints: [String],

    // Variants (color, size, capacity)
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
        capacity: String,
        material: String,
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
    assemblyVideo: String,

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
    assemblyRequired: {
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
homeKitchenProductSchema.pre("validate", function (next) {
  if ((!this.slug || this.isModified("name")) && this.name) {
    this.slug = makeSlug(this.name)
  }
  next()
})

// Virtual for discounted price
homeKitchenProductSchema.virtual("discountedPrice").get(function () {
  const now = new Date()
  const isOfferActive = this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd

  if (isOfferActive && this.discountPercentage > 0) {
    return this.basePrice - (this.basePrice * this.discountPercentage) / 100
  }
  return this.basePrice
})

// Virtual for stock status
homeKitchenProductSchema.virtual("stockStatus").get(function () {
  if (this.stock === 0) return "out-of-stock"
  if (this.stock <= this.lowStockThreshold) return "low-stock"
  return "in-stock"
})

// Virtual to check if offer is currently active
homeKitchenProductSchema.virtual("isOfferActive").get(function () {
  const now = new Date()
  return (
    this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd && this.discountPercentage > 0
  )
})

// Pre-save hook to calculate price from basePrice and discount
homeKitchenProductSchema.pre("save", function (next) {
  // Calculate price based on basePrice and discount
  if (this.discountPercentage > 0) {
    this.price = this.basePrice - (this.basePrice * this.discountPercentage) / 100
  } else {
    this.price = this.basePrice
  }
  next()
})

// Indexes
// homeKitchenProductSchema.index({ slug: 1 })
homeKitchenProductSchema.index({ category: 1 })
homeKitchenProductSchema.index({ brand: 1 })
homeKitchenProductSchema.index({ price: 1 })
homeKitchenProductSchema.index({ isActive: 1, status: 1 })

const HomeKitchenProduct = mongoose.model("HomeKitchenProduct", homeKitchenProductSchema)
export default HomeKitchenProduct
