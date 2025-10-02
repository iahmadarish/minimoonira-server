import ElectronicsProduct from "../models/ElectronicsProduct.js"
import Category from "../models/Category.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { APIFeatures } from "../utils/apiFeatures.js"

// @desc    Get all electronics products
// @route   GET /api/v1/products/electronics
// @access  Public
export const getElectronicsProducts = asyncHandler(async (req, res) => {
  const features = new APIFeatures(ElectronicsProduct.find({ isActive: true, status: "published" }), req.query)
    .filter()
    .search(["name", "description", "brand", "model"])
    .sort()
    .limitFields()
    .paginate()

  const products = await features.query.populate("category", "name slug path")
  const total = await ElectronicsProduct.countDocuments({ isActive: true, status: "published" })

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    data: products,
  })
})

// @desc    Get single electronics product
// @route   GET /api/v1/products/electronics/:id
// @access  Public
export const getElectronicsProduct = asyncHandler(async (req, res) => {
  const product = await ElectronicsProduct.findById(req.params.id).populate("category", "name slug path")

  if (!product) {
    return res.status(404).json({
      success: false,
      error: "Product not found",
    })
  }

  res.status(200).json({
    success: true,
    data: product,
  })
})

// @desc    Create electronics product
// @route   POST /api/v1/products/electronics
// @access  Private/Admin
export const createElectronicsProduct = asyncHandler(async (req, res) => {
  // Verify category exists
  const category = await Category.findById(req.body.category)
  if (!category) {
    return res.status(400).json({
      success: false,
      error: "Invalid category",
    })
  }

  const product = await ElectronicsProduct.create(req.body)

  res.status(201).json({
    success: true,
    data: product,
  })
})

// @desc    Update electronics product
// @route   PUT /api/v1/products/electronics/:id
// @access  Private/Admin
export const updateElectronicsProduct = asyncHandler(async (req, res) => {
  let product = await ElectronicsProduct.findById(req.params.id)

  if (!product) {
    return res.status(404).json({
      success: false,
      error: "Product not found",
    })
  }

  // Verify category if being updated
  if (req.body.category) {
    const category = await Category.findById(req.body.category)
    if (!category) {
      return res.status(400).json({
        success: false,
        error: "Invalid category",
      })
    }
  }

  product = await ElectronicsProduct.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: product,
  })
})

// @desc    Delete electronics product
// @route   DELETE /api/v1/products/electronics/:id
// @access  Private/Admin
export const deleteElectronicsProduct = asyncHandler(async (req, res) => {
  const product = await ElectronicsProduct.findById(req.params.id)

  if (!product) {
    return res.status(404).json({
      success: false,
      error: "Product not found",
    })
  }

  await product.deleteOne()

  res.status(200).json({
    success: true,
    data: {},
  })
})

// @desc    Get products by category
// @route   GET /api/v1/products/electronics/category/:categoryId
// @access  Public
export const getElectronicsProductsByCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.categoryId)

  if (!category) {
    return res.status(404).json({
      success: false,
      error: "Category not found",
    })
  }

  // Get all subcategories recursively
  const getAllSubcategories = async (categoryId) => {
    const subcategories = await Category.find({ parentCategory: categoryId })
    let allCategories = [categoryId]

    for (const subcat of subcategories) {
      const nested = await getAllSubcategories(subcat._id)
      allCategories = allCategories.concat(nested)
    }

    return allCategories
  }

  const categoryIds = await getAllSubcategories(req.params.categoryId)

  const features = new APIFeatures(
    ElectronicsProduct.find({
      category: { $in: categoryIds },
      isActive: true,
      status: "published",
    }),
    req.query,
  )
    .filter()
    .search(["name", "description", "brand", "model"])
    .sort()
    .limitFields()
    .paginate()

  const products = await features.query.populate("category", "name slug path")

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  })
})
