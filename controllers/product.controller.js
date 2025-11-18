import Product from "../models/product.model.js";
import mongoose from "mongoose"; 
import { validationResult } from "express-validator";
import DynamicSection from "../models/DynamicSection.model.js";



export const createProduct = async (req, res) => {
  try {
    console.log('Received product data:', req.body); 

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        message: 'Validation errors',
        errors: errors.array() 
      });
    }

    // Ensure category is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid category ID' 
      });
    }
    
    // Handle subCategory if provided
    if (req.body.subCategory && !mongoose.Types.ObjectId.isValid(req.body.subCategory)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid subCategory ID' 
      });
    }
    
    // Parse numeric fields to ensure they're numbers
    const productData = {
      ...req.body,
      basePrice: parseFloat(req.body.basePrice) || 0,
      discountPercentage: parseFloat(req.body.discountPercentage) || 0,
      stock: parseInt(req.body.stock) || 0,
      lowStockAlert: parseInt(req.body.lowStockAlert) || 5,
      weight: parseFloat(req.body.weight) || 0,
      aplusContent: req.body.aplusContent || '',
      bulletPoints: Array.isArray(req.body.bulletPoints) ? req.body.bulletPoints : [],
    };
    
    // Parse dimensions
    if (req.body.dimensions) {
      productData.dimensions = {
        length: parseFloat(req.body.dimensions.length) || 0,
        width: parseFloat(req.body.dimensions.width) || 0,
        height: parseFloat(req.body.dimensions.height) || 0
      };
    }

    // Handle main product discount dates - UTC হিসেবে স্টোর
    if (req.body.discountStart) {
      const startDate = new Date(req.body.discountStart);
      productData.discountStart = isNaN(startDate.getTime()) ? null : startDate;
    } else {
      productData.discountStart = null;
    }

    if (req.body.discountEnd) {
      const endDate = new Date(req.body.discountEnd);
      productData.discountEnd = isNaN(endDate.getTime()) ? null : endDate;
    } else {
      productData.discountEnd = null;
    }

    // UNIVERSAL VARIANT HANDLING - ANY PRODUCT TYPE
    if (req.body.hasVariants && req.body.variantOptions && Array.isArray(req.body.variantOptions)) {
      productData.hasVariants = true;
      productData.variantOptions = req.body.variantOptions;
      
      // Function to generate all possible combinations for ANY variant options
      const generateAllVariants = (variantOptions, baseData = {}) => {
        if (!variantOptions || variantOptions.length === 0) return [];

        // Recursive function to generate combinations
        const generateCombinations = (options, currentIndex = 0, currentCombination = []) => {
          if (currentIndex === options.length) {
            return [currentCombination];
          }

          const currentOption = options[currentIndex];
          const combinations = [];

          for (const value of currentOption.values) {
            const newCombination = [
              ...currentCombination,
              { name: currentOption.name, value: value }
            ];
            combinations.push(...generateCombinations(options, currentIndex + 1, newCombination));
          }

          return combinations;
        };

        const allCombinations = generateCombinations(variantOptions);
        
        console.log(`Generated ${allCombinations.length} variant combinations`);
        
        // Convert to variant objects with universal defaults
        return allCombinations.map((combination, index) => {
          // Find if this combination already exists in manually provided variants
          const existingVariant = req.body.variants?.find(manualVariant => {
            if (!manualVariant.options || manualVariant.options.length !== combination.length) {
              return false;
            }
            return combination.every(combOpt => 
              manualVariant.options.some(manualOpt => 
                manualOpt.name === combOpt.name && manualOpt.value === combOpt.value
              )
            );
          });

          // Use existing variant data if available, otherwise use defaults
          return {
            options: combination,
            basePrice: existingVariant?.basePrice || baseData.basePrice || productData.basePrice || 0,
            discountPercentage: existingVariant?.discountPercentage || baseData.discountPercentage || productData.discountPercentage || 0,
            discountStart: existingVariant?.discountStart || baseData.discountStart || productData.discountStart,
            discountEnd: existingVariant?.discountEnd || baseData.discountEnd || productData.discountEnd,
            stock: existingVariant?.stock || 0, // Default stock 0 for new variants
            imageGroupName: existingVariant?.imageGroupName || '',
            sku: existingVariant?.sku || `${productData.sku || 'PROD'}-${index + 1}`
          };
        });
      };

      // CASE 1: Manual variants provided - use them as they are
      if (req.body.variants && Array.isArray(req.body.variants) && req.body.variants.length > 0) {
        console.log('Using manually provided variants');
        productData.variants = req.body.variants.map(variant => {
          // Handle discount dates for each variant - UTC হিসেবে স্টোর
          let variantDiscountStart = null;
          let variantDiscountEnd = null;
          
          if (variant.discountStart) {
            const startDate = new Date(variant.discountStart);
            variantDiscountStart = isNaN(startDate.getTime()) ? null : startDate;
          }
          
          if (variant.discountEnd) {
            const endDate = new Date(variant.discountEnd);
            variantDiscountEnd = isNaN(endDate.getTime()) ? null : endDate;
          }

          return {
            options: Array.isArray(variant.options) ? variant.options.map(opt => ({
              name: opt.name,
              value: opt.value,
            })) : [],
            
            basePrice: parseFloat(variant.basePrice) || parseFloat(productData.basePrice) || 0,
            discountPercentage: parseFloat(variant.discountPercentage) || 0,
            discountStart: variantDiscountStart,
            discountEnd: variantDiscountEnd,
            stock: parseInt(variant.stock) || 0,
            imageGroupName: variant.imageGroupName || '',
            sku: variant.sku || ''
          };
        });
      } 
      // CASE 2: No manual variants - auto-generate ALL possible combinations
      else {
        console.log('Auto-generating all variant combinations');
        productData.variants = generateAllVariants(req.body.variantOptions, {
          basePrice: productData.basePrice,
          discountPercentage: productData.discountPercentage,
          discountStart: productData.discountStart,
          discountEnd: productData.discountEnd
        });
      }
    } else {
      // No variants - simple product
      productData.hasVariants = false;
      productData.variantOptions = [];
      productData.variants = [];
    }

    // Handle image groups
    if (req.body.imageGroups && Array.isArray(req.body.imageGroups)) {
      productData.imageGroups = req.body.imageGroups.map(group => ({
        name: group.name,
        images: group.images || []
      }));
    } else {
      // Default image group
      productData.imageGroups = [{
        name: 'Main',
        images: []
      }];
    }

    // Handle videos
    if (req.body.videos && Array.isArray(req.body.videos)) {
      productData.videos = req.body.videos;
    }

    // Handle attributes
    if (req.body.attributes && Array.isArray(req.body.attributes)) {
      productData.attributes = req.body.attributes;
    }

    // Handle meta keywords
    if (req.body.metaKeywords && Array.isArray(req.body.metaKeywords)) {
      productData.metaKeywords = req.body.metaKeywords;
    }
    
    console.log('Processed product data:', productData); 
    console.log(`Variant Info: hasVariants=${productData.hasVariants}, variantCount=${productData.variants?.length || 0}`);
    
    // Create product
    const product = new Product(productData);
    const savedProduct = await product.save();
    
    // Populate category and subCategory for response
    await savedProduct.populate('category subCategory');
    
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: savedProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Product with this ${duplicateField} already exists`
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// ################ version 2 optimizeed product fetch performance and filtering with existing rolebase access ################
export const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, // ফ্রন্টএন্ড থেকে আসা limit, default 12 
      search, 
      category, 
      minPrice, 
      maxPrice, 
      inStock, 
      onSale, 
      sortBy = 'createdAt', // Sorting field, default: createdAt
      sortOrder = 'desc'   // Sorting order, default: desc
    } = req.query;

    const limitInt = parseInt(limit);
    const pageInt = parseInt(page);
    const skip = (pageInt - 1) * limitInt;

    // ১. ফিল্টার অবজেক্ট তৈরি
    let filter = { isActive: true }; // শুধু সক্রিয় প্রোডাক্ট দেখান

    // ক্যাটেগরি ফিল্টার
    if (category) {
      filter.$or = [
        { category: category }, 
        { subCategory: category }
      ];
    }
    
    // দামের ফিল্টার
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // স্টকের ফিল্টার
    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // সেলের ফিল্টার: discountPercentage > 0 এবং বর্তমান ডিসকাউন্ট পিরিয়ডের মধ্যে
    if (onSale === 'true') {
      const now = new Date();
      filter.discountPercentage = { $gt: 0 };
      filter.discountStart = { $lte: now };
      filter.discountEnd = { $gte: now };
    }

    // ২. সার্চ অপটিমাইজেশন (Text Search)
    let sortOptions = {};
    if (sortBy && sortOrder) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    if (search) {
      filter.$text = { $search: search };
      sortOptions.score = { $meta: "textScore" }; // সার্চ রেজাল্টকে প্রাসঙ্গিকতা অনুযায়ী সর্ট করুন
    }

    // ৩. মোট প্রোডাক্ট সংখ্যা গণনা
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limitInt);

    // ৪. কোয়েরি চালানো এবং প্রোজেকশন
    const products = await Product.find(filter)
      // ✅ প্রোজেকশন: দ্রুত লোডিং-এর জন্য শুধুমাত্র প্রয়োজনীয় ফিল্ড সিলেক্ট করুন
      .select('name slug price basePrice discountPercentage imageGroups averageRating numReviews stock hasVariants category subCategory') 
      
      // ✅ পপুলেশন অপটিমাইজেশন: ক্যাটেগরি থেকে শুধু নাম ও স্ল্যাগ লোড করুন 
      .populate({
        path: "category",
        select: 'name slug parentCategory', 
        populate: {
          path: "parentCategory",
          select: 'name slug parentCategory',
          populate: { path: "parentCategory", select: 'name slug' }
        }
      })
      .populate({
        path: "subCategory",
        select: 'name slug parentCategory',
        populate: {
          path: "parentCategory",
          select: 'name slug parentCategory',
          populate: { path: "parentCategory", select: 'name slug' }
        }
      })
      
      .sort(sortOptions)
      .skip(skip)
      .limit(limitInt);
      
    // ৫. রেসপন্স পাঠানো
    res.status(200).json({
      success: true,
      products,
      total: totalProducts,
      totalPages: totalPages,
      currentPage: pageInt,
      limit: limitInt
    });

  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message
    });
  }
};

// Get all products for admin dashboard (including inactive)
export const getAdminProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      category,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build filter object - NO isActive filter for admin
    let filter = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: { $regex: searchRegex } },
        { brand: { $regex: searchRegex } },
        { slug: { $regex: searchRegex } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    // Admin sees everything - no isActive filter

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const products = await Product.find(filter)
      .populate("category subCategory")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message
    });
  }
};

// Get a single product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category subCategory")
      .populate("reviews.user", "name email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message
    });
  }
};

// Get a single product by slug
export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate("category subCategory")
      .populate("reviews.user", "name email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message
    });
  }
};

// ################ version 3 utc time conversation supported for bangladesh to mongobd database ################
export const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const productData = {
      ...req.body,
      basePrice: parseFloat(req.body.basePrice) || 0,
      discountPercentage: parseFloat(req.body.discountPercentage) || 0,
      stock: parseInt(req.body.stock) || 0,
      lowStockAlert: parseInt(req.body.lowStockAlert) || 5,
      weight: parseFloat(req.body.weight) || 0,
      aplusContent: req.body.aplusContent || '',
      bulletPoints: Array.isArray(req.body.bulletPoints) ? req.body.bulletPoints : [],
    };
    
    if (req.body.dimensions) {
      productData.dimensions = {
        length: parseFloat(req.body.dimensions.length) || 0,
        width: parseFloat(req.body.dimensions.width) || 0,
        height: parseFloat(req.body.dimensions.height) || 0
      };
    }

    // Handle main product discount dates - UTC হিসেবে স্টোর
    if (req.body.discountStart) {
      const startDate = new Date(req.body.discountStart);
      productData.discountStart = isNaN(startDate.getTime()) ? null : startDate;
    } else {
      productData.discountStart = null;
    }

    if (req.body.discountEnd) {
      const endDate = new Date(req.body.discountEnd);
      productData.discountEnd = isNaN(endDate.getTime()) ? null : endDate;
    } else {
      productData.discountEnd = null;
    }

    // UNIVERSAL VARIANT HANDLING
    if (req.body.hasVariants && req.body.variantOptions && Array.isArray(req.body.variantOptions)) {
      productData.hasVariants = true;
      productData.variantOptions = req.body.variantOptions;
      
      // Function to generate all possible combinations for ANY variant options
      const generateAllVariants = (variantOptions, baseData = {}) => {
        if (!variantOptions || variantOptions.length === 0) return [];

        const generateCombinations = (options, currentIndex = 0, currentCombination = []) => {
          if (currentIndex === options.length) {
            return [currentCombination];
          }

          const currentOption = options[currentIndex];
          const combinations = [];

          for (const value of currentOption.values) {
            const newCombination = [
              ...currentCombination,
              { name: currentOption.name, value: value }
            ];
            combinations.push(...generateCombinations(options, currentIndex + 1, newCombination));
          }

          return combinations;
        };

        const allCombinations = generateCombinations(variantOptions);
        
        return allCombinations.map((combination, index) => {
          const existingVariant = req.body.variants?.find(manualVariant => {
            if (!manualVariant.options || manualVariant.options.length !== combination.length) {
              return false;
            }
            return combination.every(combOpt => 
              manualVariant.options.some(manualOpt => 
                manualOpt.name === combOpt.name && manualOpt.value === combOpt.value
              )
            );
          });

          return {
            options: combination,
            basePrice: existingVariant?.basePrice || baseData.basePrice || productData.basePrice || 0,
            discountPercentage: existingVariant?.discountPercentage || baseData.discountPercentage || productData.discountPercentage || 0,
            discountStart: existingVariant?.discountStart || baseData.discountStart || productData.discountStart,
            discountEnd: existingVariant?.discountEnd || baseData.discountEnd || productData.discountEnd,
            stock: existingVariant?.stock || 0,
            imageGroupName: existingVariant?.imageGroupName || '',
            sku: existingVariant?.sku || `${productData.sku || 'PROD'}-${index + 1}`
          };
        });
      };

      // CASE 1: Manual variants provided - use them as they are
      if (req.body.variants && Array.isArray(req.body.variants) && req.body.variants.length > 0) {
        console.log('Using manually provided variants');
        productData.variants = req.body.variants.map(variant => {
          let variantDiscountStart = null;
          let variantDiscountEnd = null;
          
          if (variant.discountStart) {
            const startDate = new Date(variant.discountStart);
            variantDiscountStart = isNaN(startDate.getTime()) ? null : startDate;
          }
          
          if (variant.discountEnd) {
            const endDate = new Date(variant.discountEnd);
            variantDiscountEnd = isNaN(endDate.getTime()) ? null : endDate;
          }

          const variantBasePrice = parseFloat(variant.basePrice) || parseFloat(productData.basePrice) || 0;
          const variantDiscountPercentage = parseFloat(variant.discountPercentage) || 0;
          
          return {
            options: Array.isArray(variant.options) ? variant.options.map(opt => ({
              name: opt.name,
              value: opt.value,
            })) : [],
            
            basePrice: variantBasePrice,
            discountPercentage: variantDiscountPercentage,
            discountStart: variantDiscountStart,
            discountEnd: variantDiscountEnd,
            stock: parseInt(variant.stock) || 0,
            imageGroupName: variant.imageGroupName || '',
            sku: variant.sku || ''
          };
        });
      } 
      // CASE 2: No manual variants - auto-generate ALL possible combinations
      else {
        console.log('Auto-generating all variant combinations');
        productData.variants = generateAllVariants(req.body.variantOptions, {
          basePrice: productData.basePrice,
          discountPercentage: productData.discountPercentage,
          discountStart: productData.discountStart,
          discountEnd: productData.discountEnd
        });
      }
    } else {
      productData.hasVariants = false;
      productData.variantOptions = [];
      productData.variants = [];
    }

    console.log('Updating product with data:', productData);
    console.log(`Variant Info: hasVariants=${productData.hasVariants}, variantCount=${productData.variants?.length || 0}`);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true }
    ).populate("category subCategory");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU or slug already exists"
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message
    });
  }
};


// Delete a product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message
    });
  }
};

// Add review to a product
export const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const userId = req.user._id; 

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Check if user already reviewed this product
    const alreadyReviewed = product.reviews.find(
      review => review.user.toString() === userId.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product"
      });
    }

    // Add review
    product.reviews.push({
      user: userId,
      rating,
      comment
    });

    // Update average rating and number of reviews
    product.numReviews = product.reviews.length;
    product.averageRating = 
      product.reviews.reduce((acc, item) => item.rating + acc, 0) / 
      product.reviews.length;

    await product.save();
    await product.populate("reviews.user", "name email");

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      product
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Error adding review",
      error: error.message
    });
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ 
      isFeatured: true, 
      isActive: true 
    })
    .populate("category subCategory")
    .limit(10);

    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching featured products",
      error: error.message
    });
  }
};

// Update product stock
export const updateStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    product.stock += quantity;
    
    await product.save();

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      product
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating stock",
      error: error.message
    });
  }
};

// Get products by dynamic attributes
export const getProductsByAttributes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      onSale,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Attributes ফিল্টার - query parameters থেকে attributes পড়া
    const attributesFilter = {};
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('attr_')) {
        const attributeKey = key.replace('attr_', '');
        attributesFilter[`attributes.key`] = attributeKey;
        attributesFilter[`attributes.value`] = req.query[key];
      }
    });

    const limitInt = parseInt(limit);
    const pageInt = parseInt(page);
    const skip = (pageInt - 1) * limitInt;

    // ১. ফিল্টার অবজেক্ট তৈরি
    let filter = { isActive: true };

    // Attributes ফিল্টার প্রয়োগ
    if (Object.keys(attributesFilter).length > 0) {
      filter['attributes'] = {
        $elemMatch: {
          key: attributesFilter[`attributes.key`],
          value: attributesFilter[`attributes.value`]
        }
      };
    }

    // অন্যান্য ফিল্টার
    if (category) {
      filter.$or = [
        { category: category },
        { subCategory: category }
      ];
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    if (onSale === 'true') {
      const now = new Date();
      filter.discountPercentage = { $gt: 0 };
      filter.discountStart = { $lte: now };
      filter.discountEnd = { $gte: now };
    }

    // ২. সার্চ অপটিমাইজেশন
    let sortOptions = {};
    if (sortBy && sortOrder) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    if (search) {
      filter.$text = { $search: search };
      sortOptions.score = { $meta: "textScore" };
    }

    // ৩. মোট প্রোডাক্ট সংখ্যা গণনা
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limitInt);

    // ৪. কোয়েরি চালানো এবং প্রোজেকশন
    const products = await Product.find(filter)
      .select('name slug price basePrice discountPercentage imageGroups averageRating numReviews stock hasVariants category subCategory attributes')
      .populate({
        path: "category",
        select: 'name slug parentCategory',
        populate: {
          path: "parentCategory",
          select: 'name slug parentCategory',
          populate: { path: "parentCategory", select: 'name slug' }
        }
      })
      .populate({
        path: "subCategory",
        select: 'name slug parentCategory',
        populate: {
          path: "parentCategory",
          select: 'name slug parentCategory',
          populate: { path: "parentCategory", select: 'name slug' }
        }
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limitInt);

    // ৫. রেসপন্স পাঠানো
    res.status(200).json({
      success: true,
      products,
      total: totalProducts,
      totalPages: totalPages,
      currentPage: pageInt,
      limit: limitInt,
      filter: Object.keys(attributesFilter).length > 0 ? attributesFilter : null
    });

  } catch (error) {
    console.error("Error fetching products by attributes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message
    });
  }
};

// Get available attribute keys and values for filtering
export const getProductAttributes = async (req, res) => {
  try {
    const activeProducts = await Product.find({ isActive: true })
      .select('attributes')
      .lean();

    const attributesMap = {};

    activeProducts.forEach(product => {
      if (product.attributes && Array.isArray(product.attributes)) {
        product.attributes.forEach(attr => {
          if (attr.key && attr.value) {
            if (!attributesMap[attr.key]) {
              attributesMap[attr.key] = new Set();
            }
            attributesMap[attr.key].add(attr.value);
          }
        });
      }
    });

    // Convert Sets to Arrays
    const attributes = {};
    Object.keys(attributesMap).forEach(key => {
      attributes[key] = Array.from(attributesMap[key]);
    });

    res.status(200).json({
      success: true,
      attributes,
      totalAttributes: Object.keys(attributes).length
    });

  } catch (error) {
    console.error("Error fetching product attributes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product attributes",
      error: error.message
    });
  }
};

// Get products by multiple attributes (advanced filtering)
export const getProductsByMultipleAttributes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      attributes = '{}' // JSON string হিসেবে attributes নিবে
    } = req.query;

    let attributesFilter;
    try {
      attributesFilter = JSON.parse(attributes);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid attributes format. Please provide valid JSON."
      });
    }

    const limitInt = parseInt(limit);
    const pageInt = parseInt(page);
    const skip = (pageInt - 1) * limitInt;

    // ফিল্টার অবজেক্ট তৈরি
    let filter = { isActive: true };

    // মাল্টিপল attributes ফিল্টার
    if (attributesFilter && Object.keys(attributesFilter).length > 0) {
      filter.$and = Object.keys(attributesFilter).map(key => ({
        attributes: {
          $elemMatch: {
            key: key,
            value: attributesFilter[key]
          }
        }
      }));
    }

    // মোট প্রোডাক্ট সংখ্যা গণনা
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limitInt);

    // কোয়েরি চালানো
    const products = await Product.find(filter)
      .select('name slug price basePrice discountPercentage imageGroups averageRating numReviews stock hasVariants category subCategory attributes')
      .populate({
        path: "category",
        select: 'name slug'
      })
      .populate({
        path: "subCategory",
        select: 'name slug'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitInt);

    res.status(200).json({
      success: true,
      products,
      total: totalProducts,
      totalPages: totalPages,
      currentPage: pageInt,
      limit: limitInt,
      appliedFilters: attributesFilter
    });

  } catch (error) {
    console.error("Error fetching products by multiple attributes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message
    });
  }
};

export const getProductsForDynamicSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    // Find the section
    const section = await DynamicSection.findById(sectionId);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found"
      });
    }

    if (!section.isActive) {
      return res.status(200).json({
        success: true,
        section: {
          _id: section._id,
          title: section.title,
          description: section.description,
          isActive: false
        },
        products: []
      });
    }

    // Build filter based on section configuration
    let filter = { 
      isActive: true 
    };

    // Attribute based filtering
    if (section.sectionType === "attribute-based") {
      filter['attributes'] = {
        $elemMatch: {
          key: section.attributeKey,
          value: section.attributeValue
        }
      };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[section.sortBy] = section.sortOrder === "asc" ? 1 : -1;

    // Execute query
    const products = await Product.find(filter)
      .select('name slug price basePrice discountPercentage imageGroups averageRating numReviews stock hasVariants')
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .sort(sortOptions)
      .limit(section.productLimit);

    res.status(200).json({
      success: true,
      section: {
        _id: section._id,
        title: section.title,
        description: section.description,
        backgroundColor: section.backgroundColor,
        textColor: section.textColor,
        productLimit: section.productLimit
      },
      products,
      totalProducts: products.length
    });

  } catch (error) {
    console.error("Error fetching dynamic section products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching section products",
      error: error.message
    });
  }
};

// Get all active sections for homepage
export const getHomepageSections = async (req, res) => {
  try {
    console.log('Fetching homepage sections...');
    
    const sections = await DynamicSection.find({
      isActive: true,
      showInHomepage: true
    })
    .sort({ displayOrder: 1, createdAt: -1 })
    .select('title description attributeKey attributeValue productLimit backgroundColor textColor sectionType sortBy sortOrder isActive displayOrder showInHomepage') // ✅ isActive যোগ করুন
    .lean();

    console.log('Found sections:', sections.length);

    // Get products for each section
    const sectionsWithProducts = await Promise.all(
      sections.map(async (section) => {
        let filter = { isActive: true };
        
        console.log(`Processing section: ${section.title} - ${section.attributeKey}=${section.attributeValue}, Active: ${section.isActive}`);
        
        if (section.sectionType === "attribute-based") {
          filter['attributes'] = {
            $elemMatch: {
              key: section.attributeKey,
              value: section.attributeValue
            }
          };
        }

        const sortOptions = {};
        sortOptions[section.sortBy || 'createdAt'] = (section.sortOrder || 'desc') === "asc" ? 1 : -1;

        const products = await Product.find(filter)
          .select('name slug price basePrice discountPercentage imageGroups averageRating numReviews stock hasVariants')
          .populate("category", "name slug")
          .populate("subCategory", "name slug")
          .sort(sortOptions)
          .limit(section.productLimit || 8)
          .lean();

        console.log(`Found ${products.length} products for section: ${section.title}`);

        return {
          ...section,
          products,
          totalProducts: products.length,
          isActive: section.isActive !== undefined ? section.isActive : true // ✅ ডিফল্ট ভ্যালু
        };
      })
    );

    console.log('Sending response with sections:', sectionsWithProducts.map(s => ({
      title: s.title,
      isActive: s.isActive,
      products: s.products.length
    })));

    res.status(200).json({
      success: true,
      sections: sectionsWithProducts
    });

  } catch (error) {
    console.error("Error fetching homepage sections:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching homepage sections",
      error: error.message
    });
  }
};

// CRUD operations for dynamic sections
export const createDynamicSection = async (req, res) => {
  try {
    const {
      title,
      description,
      attributeKey,
      attributeValue,
      productLimit = 8,
      sortBy = "createdAt",
      sortOrder = "desc",
      displayOrder = 0,
      backgroundColor = "#ffffff",
      textColor = "#000000"
    } = req.body;

    // Check if similar section already exists
    const existingSection = await DynamicSection.findOne({
      attributeKey,
      attributeValue,
      isActive: true
    });

    if (existingSection) {
      return res.status(400).json({
        success: false,
        message: "A section with this attribute already exists"
      });
    }

    const section = new DynamicSection({
      title,
      description,
      attributeKey,
      attributeValue,
      productLimit,
      sortBy,
      sortOrder,
      displayOrder,
      backgroundColor,
      textColor,
      createdBy: req.user._id
    });

    const savedSection = await section.save();

    res.status(201).json({
      success: true,
      message: "Dynamic section created successfully",
      section: savedSection
    });

  } catch (error) {
    console.error("Error creating dynamic section:", error);
    res.status(500).json({
      success: false,
      message: "Error creating dynamic section",
      error: error.message
    });
  }
};

export const updateDynamicSection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await DynamicSection.findByIdAndUpdate(
      sectionId,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Section updated successfully",
      section
    });

  } catch (error) {
    console.error("Error updating dynamic section:", error);
    res.status(500).json({
      success: false,
      message: "Error updating dynamic section",
      error: error.message
    });
  }
};

export const deleteDynamicSection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await DynamicSection.findByIdAndDelete(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Section deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting dynamic section:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting dynamic section",
      error: error.message
    });
  }
};

export const getAllDynamicSections = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const sections = await DynamicSection.find(filter)
      .populate("createdBy", "name email")
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DynamicSection.countDocuments(filter);

    res.status(200).json({
      success: true,
      sections,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });

  } catch (error) {
    console.error("Error fetching dynamic sections:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dynamic sections",
      error: error.message
    });
  }
};

export const toggleSectionStatus = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await DynamicSection.findById(sectionId);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found"
      });
    }

    section.isActive = !section.isActive;
    await section.save();

    res.status(200).json({
      success: true,
      message: `Section ${section.isActive ? 'activated' : 'deactivated'} successfully`,
      section
    });

  } catch (error) {
    console.error("Error toggling section status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling section status",
      error: error.message
    });
  }
};

export const searchProductsForAdmin = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(200).json({ success: true, products: [] });
  }
  try {
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
      ],
    })
    .select('_id name basePrice price variants hasVariants imageGroups mainImage sku')
    .limit(20);
    
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during product search' });
  }
};