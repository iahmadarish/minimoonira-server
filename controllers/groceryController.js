import GroceryProduct from "../models/GroceryProduct.js"
import Category from "../models/Category.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { APIFeatures } from "../utils/apiFeatures.js"

// @desc    Get all grocery products
// @route   GET /api/v1/products/grocery
// @access  Public
export const getGroceryProducts = asyncHandler(async (req, res) => {
  const features = new APIFeatures(GroceryProduct.find({ isActive: true, status: "published" }), req.query)
    .filter()
    .search(["name", "description", "brand"])
    .sort()
    .limitFields()
    .paginate()

  const products = await features.query.populate("category", "name slug path")
  const total = await GroceryProduct.countDocuments({ isActive: true, status: "published" })

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    data: products,
  })
})

// @desc    Get single grocery product
// @route   GET /api/v1/products/grocery/:id
// @access  Public
export const getGroceryProduct = asyncHandler(async (req, res) => {
  const product = await GroceryProduct.findById(req.params.id).populate("category", "name slug path")

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

// @desc    Create grocery product
// @route   POST /api/v1/products/grocery
// @access  Private/Admin
export const createGroceryProduct = asyncHandler(async (req, res) => {
  // Verify category exists
  const category = await Category.findById(req.body.category)
  if (!category) {
    return res.status(400).json({
      success: false,
      error: "Invalid category",
    })
  }

  const product = await GroceryProduct.create(req.body)

  res.status(201).json({
    success: true,
    data: product,
  })
})

// @desc    Update grocery product
// @route   PUT /api/v1/products/grocery/:id
// @access  Private/Admin
export const updateGroceryProduct = asyncHandler(async (req, res) => {
  let product = await GroceryProduct.findById(req.params.id)

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

  product = await GroceryProduct.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: product,
  })
})

// @desc    Delete grocery product
// @route   DELETE /api/v1/products/grocery/:id
// @access  Private/Admin
export const deleteGroceryProduct = asyncHandler(async (req, res) => {
  const product = await GroceryProduct.findById(req.params.id)

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
// @route   GET /api/v1/products/grocery/category/:categoryId
// @access  Public
export const getGroceryProductsByCategory = asyncHandler(async (req, res) => {
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
    GroceryProduct.find({
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

// @desc    Get products by dietary info
// @route   GET /api/v1/products/grocery/dietary/:type
// @access  Public
export const getGroceryProductsByDietary = asyncHandler(async (req, res) => {
  const { type } = req.params
  const validTypes = ["vegan", "vegetarian", "glutenFree", "organic", "keto"]

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Invalid dietary type parameter",
    })
  }

  const query = { isActive: true, status: "published" }
  query[`dietaryInfo.is${type.charAt(0).toUpperCase() + type.slice(1)}`] = true

  const features = new APIFeatures(GroceryProduct.find(query), req.query)
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
