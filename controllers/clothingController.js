import ClothingProduct from "../models/ClothingProduct.js"
import Category from "../models/Category.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { APIFeatures } from "../utils/apiFeatures.js"

// @desc    Get all clothing products
// @route   GET /api/v1/products/clothing
// @access  Public
export const getClothingProducts = asyncHandler(async (req, res) => {
  const features = new APIFeatures(ClothingProduct.find({ isActive: true, status: "published" }), req.query)
    .filter()
    .search(["name", "description", "brand"])
    .sort()
    .limitFields()
    .paginate()

  const products = await features.query.populate("category", "name slug path")
  const total = await ClothingProduct.countDocuments({ isActive: true, status: "published" })

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    data: products,
  })
})

// @desc    Get single clothing product
// @route   GET /api/v1/products/clothing/:id
// @access  Public
export const getClothingProduct = asyncHandler(async (req, res) => {
  const product = await ClothingProduct.findById(req.params.id).populate("category", "name slug path")

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

// @desc    Create clothing product
// @route   POST /api/v1/products/clothing
// @access  Private/Admin
export const createClothingProduct = asyncHandler(async (req, res) => {
  // Verify category exists
  const category = await Category.findById(req.body.category)
  if (!category) {
    return res.status(400).json({
      success: false,
      error: "Invalid category",
    })
  }

  const product = await ClothingProduct.create(req.body)

  res.status(201).json({
    success: true,
    data: product,
  })
})

// @desc    Update clothing product
// @route   PUT /api/v1/products/clothing/:id
// @access  Private/Admin
export const updateClothingProduct = asyncHandler(async (req, res) => {
  let product = await ClothingProduct.findById(req.params.id)

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

  product = await ClothingProduct.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: product,
  })
})

// @desc    Delete clothing product
// @route   DELETE /api/v1/products/clothing/:id
// @access  Private/Admin
export const deleteClothingProduct = asyncHandler(async (req, res) => {
  const product = await ClothingProduct.findById(req.params.id)

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
// @route   GET /api/v1/products/clothing/category/:categoryId
// @access  Public
export const getClothingProductsByCategory = asyncHandler(async (req, res) => {
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
    ClothingProduct.find({
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

// @desc    Get products by gender
// @route   GET /api/v1/products/clothing/gender/:gender
// @access  Public
export const getClothingProductsByGender = asyncHandler(async (req, res) => {
  const { gender } = req.params

  if (!["Men", "Women", "Kids", "Unisex"].includes(gender)) {
    return res.status(400).json({
      success: false,
      error: "Invalid gender parameter",
    })
  }

  const features = new APIFeatures(
    ClothingProduct.find({
      gender,
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
