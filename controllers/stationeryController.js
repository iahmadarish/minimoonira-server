import StationeryProduct from "../models/StationeryProduct.js"
import Category from "../models/Category.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { APIFeatures } from "../utils/apiFeatures.js"

// @desc    Get all stationery products
// @route   GET /api/v1/products/stationery
// @access  Public
export const getStationeryProducts = asyncHandler(async (req, res) => {
  const features = new APIFeatures(StationeryProduct.find({ isActive: true, status: "published" }), req.query)
    .filter()
    .search(["name", "description", "brand", "model"])
    .sort()
    .limitFields()
    .paginate()

  const products = await features.query.populate("category", "name slug path")
  const total = await StationeryProduct.countDocuments({ isActive: true, status: "published" })

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    data: products,
  })
})

// @desc    Get single stationery product
// @route   GET /api/v1/products/stationery/:id
// @access  Public
export const getStationeryProduct = asyncHandler(async (req, res) => {
  const product = await StationeryProduct.findById(req.params.id).populate("category", "name slug path")

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

// @desc    Create stationery product
// @route   POST /api/v1/products/stationery
// @access  Private/Admin
export const createStationeryProduct = asyncHandler(async (req, res) => {
  // Verify category exists
  const category = await Category.findById(req.body.category)
  if (!category) {
    return res.status(400).json({
      success: false,
      error: "Invalid category",
    })
  }

  const product = await StationeryProduct.create(req.body)

  res.status(201).json({
    success: true,
    data: product,
  })
})

// @desc    Update stationery product
// @route   PUT /api/v1/products/stationery/:id
// @access  Private/Admin
export const updateStationeryProduct = asyncHandler(async (req, res) => {
  let product = await StationeryProduct.findById(req.params.id)

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

  product = await StationeryProduct.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: product,
  })
})

// @desc    Delete stationery product
// @route   DELETE /api/v1/products/stationery/:id
// @access  Private/Admin
export const deleteStationeryProduct = asyncHandler(async (req, res) => {
  const product = await StationeryProduct.findById(req.params.id)

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
// @route   GET /api/v1/products/stationery/category/:categoryId
// @access  Public
export const getStationeryProductsByCategory = asyncHandler(async (req, res) => {
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
    StationeryProduct.find({
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

// @desc    Get products by product type
// @route   GET /api/v1/products/stationery/type/:productType
// @access  Public
export const getStationeryProductsByType = asyncHandler(async (req, res) => {
  const { productType } = req.params

  if (!["stationery", "toy", "gadget"].includes(productType)) {
    return res.status(400).json({
      success: false,
      error: "Invalid product type parameter",
    })
  }

  const features = new APIFeatures(
    StationeryProduct.find({
      productType,
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

// @desc    Get products by age group
// @route   GET /api/v1/products/stationery/age/:minAge/:maxAge
// @access  Public
export const getStationeryProductsByAge = asyncHandler(async (req, res) => {
  const { minAge, maxAge } = req.params

  const features = new APIFeatures(
    StationeryProduct.find({
      "ageGroup.min": { $lte: Number.parseInt(maxAge) },
      "ageGroup.max": { $gte: Number.parseInt(minAge) },
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
