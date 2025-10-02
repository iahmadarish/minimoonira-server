import mongoose from "mongoose"
import { makeSlug } from "../utils/makeSlug.js"

const electronicsProductSchema = new mongoose.Schema(
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

    // Electronics Specific
    warranty: {
      type: String,
      default: "1 year",
    },
    specifications: [
      {
        key: String,
        value: String,
      },
    ],
    technicalSpecs: {
      processor: String,
      ram: String,
      storage: String,
      display: String,
      battery: String,
      camera: String,
      connectivity: [String],
      operatingSystem: String,
    },
    powerConsumption: String,
    dimensions: {
      height: String,
      width: String,
      depth: String,
      weight: String,
    },

    // Features
    bulletPoints: [String],
    keyFeatures: [String],

    // Variants for electronics (color, storage, etc.)
    hasVariant: {
      type: Boolean,
      default: false,
    },
    variants: [
      {
        name: String,
        sku: String,
        // Electronics-specific variant attributes
        color: String,
        storage: String,
        ram: String,
        processor: String,
        screenSize: String,
        connectivity: String,
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
electronicsProductSchema.pre("validate", function (next) {
  if ((!this.slug || this.isModified("name")) && this.name) {
    this.slug = makeSlug(this.name)
  }
  next()
})

// Virtual for discounted price
electronicsProductSchema.virtual("discountedPrice").get(function () {
  const now = new Date()
  const isOfferActive = this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd

  if (isOfferActive && this.discountPercentage > 0) {
    return this.basePrice - (this.basePrice * this.discountPercentage) / 100
  }
  return this.basePrice
})

// Virtual for stock status
electronicsProductSchema.virtual("stockStatus").get(function () {
  if (this.stock === 0) return "out-of-stock"
  if (this.stock <= this.lowStockThreshold) return "low-stock"
  return "in-stock"
})

// Virtual to check if offer is currently active
electronicsProductSchema.virtual("isOfferActive").get(function () {
  const now = new Date()
  return (
    this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd && this.discountPercentage > 0
  )
})

// Indexes
// electronicsProductSchema.index({ slug: 1 })
electronicsProductSchema.index({ category: 1 })
electronicsProductSchema.index({ brand: 1 })
electronicsProductSchema.index({ price: 1 })
electronicsProductSchema.index({ isActive: 1, status: 1 })

electronicsProductSchema.pre("save", function (next) {
  // Calculate price based on basePrice and discount
  if (this.discountPercentage > 0) {
    this.price = this.basePrice - (this.basePrice * this.discountPercentage) / 100
  } else {
    this.price = this.basePrice
  }
  next()
})

const ElectronicsProduct = mongoose.model("ElectronicsProduct", electronicsProductSchema)
export default ElectronicsProduct
