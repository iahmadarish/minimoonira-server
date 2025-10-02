import mongoose from "mongoose"
import { makeSlug } from "../utils/makeSlug.js"

const clothingProductSchema = new mongoose.Schema(
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
    gender: {
      type: String,
      enum: ["Men", "Women", "Kids", "Unisex"],
      required: [true, "Gender is required"],
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

    // Clothing Specific
    sizes: [
      {
        size: {
          type: String,
          enum: ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "28", "30", "32", "34", "36", "38", "40", "42"],
        },
        stock: { type: Number, default: 0 },
        price: Number, // Optional size-specific pricing
      },
    ],
    colors: [
      {
        name: String,
        hexCode: String,
        stock: { type: Number, default: 0 },
        images: [{ url: String, public_id: String }],
      },
    ],
    material: [String],
    careInstructions: [String],
    fit: {
      type: String,
      enum: ["Slim", "Regular", "Loose", "Oversized", "Tailored"],
    },
    season: {
      type: String,
      enum: ["Spring", "Summer", "Fall", "Winter", "All Season"],
    },
    occasion: [String], // Casual, Formal, Party, etc.

    // Features
    bulletPoints: [String],
    fabricDetails: {
      composition: String,
      weight: String,
      texture: String,
    },

    // Variants (size + color combinations)
    hasVariant: {
      type: Boolean,
      default: true,
    },
    variants: [
      {
        size: String,
        color: String,
        sku: String,
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
clothingProductSchema.pre("validate", function (next) {
  if ((!this.slug || this.isModified("name")) && this.name) {
    this.slug = makeSlug(this.name)
  }
  next()
})

// Virtual for discounted price
clothingProductSchema.virtual("discountedPrice").get(function () {
  const now = new Date()
  const isOfferActive = this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd

  if (isOfferActive && this.discountPercentage > 0) {
    return this.basePrice - (this.basePrice * this.discountPercentage) / 100
  }
  return this.basePrice
})

// Virtual for available sizes
clothingProductSchema.virtual("availableSizes").get(function () {
  return this.sizes.filter((size) => size.stock > 0).map((size) => size.size)
})

// Virtual for available colors
clothingProductSchema.virtual("availableColors").get(function () {
  return this.colors.filter((color) => color.stock > 0)
})

// Virtual to check if offer is currently active
clothingProductSchema.virtual("isOfferActive").get(function () {
  const now = new Date()
  return (
    this.offerStart && this.offerEnd && now >= this.offerStart && now <= this.offerEnd && this.discountPercentage > 0
  )
})

// Indexes
// clothingProductSchema.index({ slug: 1 })
clothingProductSchema.index({ category: 1 })
clothingProductSchema.index({ brand: 1 })
clothingProductSchema.index({ gender: 1 })
clothingProductSchema.index({ price: 1 })
clothingProductSchema.index({ isActive: 1, status: 1 })

clothingProductSchema.pre("save", function (next) {
  // Calculate price based on basePrice and discount
  if (this.discountPercentage > 0) {
    this.price = this.basePrice - (this.basePrice * this.discountPercentage) / 100
  } else {
    this.price = this.basePrice
  }
  next()
})

const ClothingProduct = mongoose.model("ClothingProduct", clothingProductSchema)
export default ClothingProduct
