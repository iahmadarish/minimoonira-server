import Category from "../models/Category.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { APIFeatures } from "../utils/apiFeatures.js"
import { deleteImageFile, getImageUrl, getFilePathFromUrl } from "../utils/uploadCategoryImage.js"


// @desc    Get all categories with tree structure
// @route   GET /api/v1/categories/tree
// @access  Public
export const getCategoryTree = asyncHandler(async (req, res) => {
  const buildTree = (categories, parentId = null) => {
    return categories
      .filter((cat) => String(cat.parentCategory) === String(parentId))
      .map((cat) => ({
        ...cat.toObject(),
        children: buildTree(categories, cat._id),
      }))
  }

  const categories = await Category.find({ isActive: true }).sort("name")
  const tree = buildTree(categories)

  res.status(200).json({
    success: true,
    count: categories.length,
    data: tree,
  })
})

// @desc    Get all categories (flat list)
// @route   GET /api/v1/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const features = new APIFeatures(Category.find(), req.query)
    .filter()
    .search(["name", "description"])
    .sort()
    .limitFields()
    .paginate()
  const categories = await features.query.select("+aplusContent").populate("parentCategory", "name slug")
  const total = await Category.countDocuments()
  res.status(200).json({
    success: true,
    count: categories.length,
    total,
    data: categories,
  })
})

// @desc    Get single category
// @route   GET /api/v1/categories/:id
// @access  Public
export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate("parentCategory", "name slug").populate("children")

  if (!category) {
    return res.status(404).json({
      success: false,
      error: "Category not found",
    })
  }

  res.status(200).json({
    success: true,
    data: category,
  })
})

// @desc    Create new category
// @route   POST /api/v1/categories
// @access  Private/Admin
export const createCategory = asyncHandler(async (req, res) => {
  const categoryData = { ...req.body }

  if (req.file) {
    categoryData.image = {
      url: getImageUrl(req.file.filename),
      public_id: req.file.filename, 
    }
  }

  const category = await Category.create(categoryData)

  res.status(201).json({
    success: true,
    data: category,
  })
})

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private/Admin
export const updateCategory = asyncHandler(async (req, res) => {
  let category = await Category.findById(req.params.id)

  if (!category) {
    return res.status(404).json({
      success: false,
      error: "Category not found",
    })
  }

  const updateData = { ...req.body }

  if (req.file) {
    // Delete old image if exists
    if (category.image?.url) {
      const oldImagePath = getFilePathFromUrl(category.image.url)
      deleteImageFile(oldImagePath)
    }

    // Set new image
    updateData.image = {
      url: getImageUrl(req.file.filename),
      public_id: req.file.filename,
    }
  }

  category = await Category.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: category,
  })
})

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)

  if (!category) { return res.status(404).json({success: false,error: "Category not found",})}

  // Check if category has children
  const hasChildren = await Category.findOne({ parentCategory: req.params.id })
  if (hasChildren) {
    return res.status(400).json({
      success: false,
      error: "Cannot delete category with subcategories",
    })
  }

  if (category.image?.url) {
    const imagePath = getFilePathFromUrl(category.image.url)
    deleteImageFile(imagePath)
  }

  await category.deleteOne()

  res.status(200).json({
    success: true,
    data: {},
  })
})

// @desc    Get category path/breadcrumb
// @route   GET /api/v1/categories/:id/path
// @access  Public
export const getCategoryPath = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)

  if (!category) {
    return res.status(404).json({
      success: false,
      error: "Category not found",
    })
  }

  const path = []
  let current = category

  while (current) {
    path.unshift({
      _id: current._id,
      name: current.name,
      slug: current.slug,
    })

    if (current.parentCategory) {
      current = await Category.findById(current.parentCategory)
    } else {
      current = null
    }
  }

  res.status(200).json({
    success: true,
    data: path,
  })
})

// @desc    Delete category image
// @route   DELETE /api/v1/categories/:id/image
// @access  Private/Admin
export const deleteCategoryImage = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)

  if (!category) {
    return res.status(404).json({
      success: false,
      error: "Category not found",
    })
  }

  if (!category.image?.url) {
    return res.status(400).json({
      success: false,
      error: "No image to delete",
    })
  }

  // Delete image file
  const imagePath = getFilePathFromUrl(category.image.url)
  deleteImageFile(imagePath)

  // Remove image from database
  category.image = undefined
  await category.save()

  res.status(200).json({
    success: true,
    message: "Image deleted successfully",
    data: category,
  })
})
