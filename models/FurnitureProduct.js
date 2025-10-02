import mongoose from "mongoose"
import { makeSlug } from "../utils/makeSlug.js"

const furnitureProductSchema = new mongoose.Schema(
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
      default: 2,
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

    // Furniture Specific
    dimensions: {
      length: { type: String, required: true },
      width: { type: String, required: true },
      height: { type: String, required: true },
      weight: String,
    },
    material: {
      primary: { type: String, required: true },
      secondary: [String],
      finish: String,
    },
    color: {
      primary: String,
      secondary: [String],
    },
    style: {
      type: String,
      enum: ["Modern", "Traditional", "Contemporary", "Rustic", "Industrial", "Scandinavian", "Mid-Century", "Vintage"],
    },
    room: [String], // Living Room, Bedroom, Dining Room, etc.
    assemblyRequired: {
      type: Boolean,
      default: true,
    },
    assemblyTime: String, // "30 minutes", "2 hours", etc.
    warranty: {
      type: String,
      default: "1 year",
    },

    // Features
    bulletPoints: [String],
    features: [String],
    careInstructions: [String],

    // Variants (different colors, finishes)
    hasVariant: {
      type: Boolean,
      default: false,
    },
    variants: [
      {
        name: String,
        sku: String,
        color: String,
        finish: String,
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
furnitureProductSchema.pre("validate", function (next) {
  if ((!this.slug || this.isModified("name")) && this.name) {
    this.slug = makeSlug(this.name)
  }
  next()
})

// Virtual for discounted price
furnitureProductSchema.virtual("discountedPrice").get(function () {
  const now = new Date()
  const isOfferActive = this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd

  if (isOfferActive && this.discountPercentage > 0) {
    return this.basePrice - (this.basePrice * this.discountPercentage) / 100
  }
  return this.basePrice
})

// Virtual for stock status
furnitureProductSchema.virtual("stockStatus").get(function () {
  if (this.stock === 0) return "out-of-stock"
  if (this.stock <= this.lowStockThreshold) return "low-stock"
  return "in-stock"
})

// Virtual to check if offer is currently active
furnitureProductSchema.virtual("isOfferActive").get(function () {
  const now = new Date()
  return (
    this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd && this.discountPercentage > 0
  )
})

// Pre-save hook to calculate price from basePrice and discount
furnitureProductSchema.pre("save", function (next) {
  // Calculate price based on basePrice and discount
  if (this.discountPercentage > 0) {
    this.price = this.basePrice - (this.basePrice * this.discountPercentage) / 100
  } else {
    this.price = this.basePrice
  }
  next()
})

// Indexes
// furnitureProductSchema.index({ slug: 1 })
furnitureProductSchema.index({ category: 1 })
furnitureProductSchema.index({ brand: 1 })
furnitureProductSchema.index({ price: 1 })
furnitureProductSchema.index({ style: 1 })
furnitureProductSchema.index({ isActive: 1, status: 1 })

const FurnitureProduct = mongoose.model("FurnitureProduct", furnitureProductSchema)
export default FurnitureProduct
