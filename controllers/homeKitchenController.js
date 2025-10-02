import HomeKitchenProduct from "../models/HomeKitchenProduct.js"
import Category from "../models/Category.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { APIFeatures } from "../utils/apiFeatures.js"

// @desc    Get all home & kitchen products
// @route   GET /api/v1/products/homekitchen
// @access  Public
export const getHomeKitchenProducts = asyncHandler(async (req, res) => {
  const features = new APIFeatures(HomeKitchenProduct.find({ isActive: true, status: "published" }), req.query)
    .filter()
    .search(["name", "description", "brand", "model"])
    .sort()
    .limitFields()
    .paginate()

  const products = await features.query.populate("category", "name slug path")
  const total = await HomeKitchenProduct.countDocuments({ isActive: true, status: "published" })

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    data: products,
  })
})

// @desc    Get single home & kitchen product
// @route   GET /api/v1/products/homekitchen/:id
// @access  Public
export const getHomeKitchenProduct = asyncHandler(async (req, res) => {
  const product = await HomeKitchenProduct.findById(req.params.id).populate("category", "name slug path")

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

// @desc    Create home & kitchen product
// @route   POST /api/v1/products/homekitchen
// @access  Private/Admin
export const createHomeKitchenProduct = asyncHandler(async (req, res) => {
  // Verify category exists
  const category = await Category.findById(req.body.category)
  if (!category) {
    return res.status(400).json({
      success: false,
      error: "Invalid category",
    })
  }

  const product = await HomeKitchenProduct.create(req.body)

  res.status(201).json({
    success: true,
    data: product,
  })
})

// @desc    Update home & kitchen product
// @route   PUT /api/v1/products/homekitchen/:id
// @access  Private/Admin
export const updateHomeKitchenProduct = asyncHandler(async (req, res) => {
  let product = await HomeKitchenProduct.findById(req.params.id)

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

  product = await HomeKitchenProduct.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: product,
  })
})

// @desc    Delete home & kitchen product
// @route   DELETE /api/v1/products/homekitchen/:id
// @access  Private/Admin
export const deleteHomeKitchenProduct = asyncHandler(async (req, res) => {
  const product = await HomeKitchenProduct.findById(req.params.id)

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
// @route   GET /api/v1/products/homekitchen/category/:categoryId
// @access  Public
export const getHomeKitchenProductsByCategory = asyncHandler(async (req, res) => {
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
    HomeKitchenProduct.find({
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

// @desc    Get products by room type
// @route   GET /api/v1/products/homekitchen/room/:roomType
// @access  Public
export const getHomeKitchenProductsByRoom = asyncHandler(async (req, res) => {
  const { roomType } = req.params

  const features = new APIFeatures(
    HomeKitchenProduct.find({
      roomType: { $in: [roomType] },
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
