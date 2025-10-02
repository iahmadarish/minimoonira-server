import FurnitureProduct from "../models/FurnitureProduct.js"
import Category from "../models/Category.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { APIFeatures } from "../utils/apiFeatures.js"

// @desc    Get all furniture products
// @route   GET /api/v1/products/furniture
// @access  Public
export const getFurnitureProducts = asyncHandler(async (req, res) => {
  const features = new APIFeatures(FurnitureProduct.find({ isActive: true, status: "published" }), req.query)
    .filter()
    .search(["name", "description", "brand"])
    .sort()
    .limitFields()
    .paginate()

  const products = await features.query.populate("category", "name slug path")
  const total = await FurnitureProduct.countDocuments({ isActive: true, status: "published" })

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    data: products,
  })
})

// @desc    Get single furniture product
// @route   GET /api/v1/products/furniture/:id
// @access  Public
export const getFurnitureProduct = asyncHandler(async (req, res) => {
  const product = await FurnitureProduct.findById(req.params.id).populate("category", "name slug path")

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

// @desc    Create furniture product
// @route   POST /api/v1/products/furniture
// @access  Private/Admin
export const createFurnitureProduct = asyncHandler(async (req, res) => {
  // Verify category exists
  const category = await Category.findById(req.body.category)
  if (!category) {
    return res.status(400).json({
      success: false,
      error: "Invalid category",
    })
  }

  const product = await FurnitureProduct.create(req.body)

  res.status(201).json({
    success: true,
    data: product,
  })
})

// @desc    Update furniture product
// @route   PUT /api/v1/products/furniture/:id
// @access  Private/Admin
export const updateFurnitureProduct = asyncHandler(async (req, res) => {
  let product = await FurnitureProduct.findById(req.params.id)

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

  product = await FurnitureProduct.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: product,
  })
})

// @desc    Delete furniture product
// @route   DELETE /api/v1/products/furniture/:id
// @access  Private/Admin
export const deleteFurnitureProduct = asyncHandler(async (req, res) => {
  const product = await FurnitureProduct.findById(req.params.id)

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
// @route   GET /api/v1/products/furniture/category/:categoryId
// @access  Public
export const getFurnitureProductsByCategory = asyncHandler(async (req, res) => {
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
    FurnitureProduct.find({
      category: { $in: categoryIds },
      isActive: true,
      status: "published",
    }),
    req.query,
  )
    .filter()
    .search(["name", "description", "brand"])
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

// @desc    Get products by style
// @route   GET /api/v1/products/furniture/style/:style
// @access  Public
export const getFurnitureProductsByStyle = asyncHandler(async (req, res) => {
  const { style } = req.params

  const validStyles = [
    "Modern",
    "Traditional",
    "Contemporary",
    "Rustic",
    "Industrial",
    "Scandinavian",
    "Mid-Century",
    "Vintage",
  ]

  if (!validStyles.includes(style)) {
    return res.status(400).json({
      success: false,
      error: "Invalid style parameter",
    })
  }

  const features = new APIFeatures(
    FurnitureProduct.find({
      style,
      isActive: true,
      status: "published",
    }),
    req.query,
  )
    .filter()
    .search(["name", "description", "brand"])
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
