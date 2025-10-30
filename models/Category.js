import mongoose from "mongoose"
import { makeSlug } from "../utils/makeSlug.js"

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    aplusContent: {
      type: String, 
      default: "",
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      url: String,
      public_id: String,
    },
    metaTitle: {
      type: String,
      maxlength: [60, "Meta title cannot exceed 60 characters"],
    },
    metaDescription: {
      type: String,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
    },
    metaKeywords: [String],
    level: {
      type: Number,
      default: 0,
    },
    path: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for children categories
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
})

// Auto-create slug from name if missing or name changed
categorySchema.pre("validate", function (next) {
  if ((!this.slug || this.isModified("name")) && this.name) {
    this.slug = makeSlug(this.name)
  }
  next()
})

// Set level and path before saving
categorySchema.pre("save", async function (next) {
  if (!this.parentCategory) {
    this.level = 0
    this.path = this.slug
    return next()
  }

  // Prevent circular reference
  if (this.parentCategory?.toString() === this._id?.toString()) {
    return next(new Error("A category cannot be its own parent."))
  }

  // Get parent category
  const parent = await mongoose.model("Category").findById(this.parentCategory)
  if (!parent) {
    return next(new Error("Parent category not found."))
  }

  // Set level and path
  this.level = parent.level + 1
  this.path = `${parent.path}/${this.slug}`

  next()
})

// Index for better performance
// categorySchema.index({ slug: 1 })
categorySchema.index({ parentCategory: 1 })
categorySchema.index({ isActive: 1 })
categorySchema.index({ level: 1 })

const Category = mongoose.model("Category", categorySchema)
export default Category
