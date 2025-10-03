import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';

// @desc    Get user cart
// @route   GET /api/v1/cart
// @access  Private
export const getCart = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized. Please log in to view your cart.' 
    });
  }
  
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name slug imageGroups');
  if (!cart) {
    const newCart = await Cart.create({ user: req.user.id, items: [] });
    return res.status(200).json({ success: true, cart: newCart });
  }
  res.status(200).json({ success: true, cart });
};

// @desc    Add item to cart
// @route   POST /api/v1/cart
// @access  Private (protect middleware ensures req.user exists)
export const addItemToCart = async (req, res, next) => {
  const { productId, quantity, variantName, variantValue } = req.body; 

  console.log('🛒 Cart Controller - Add Item Request:');
  console.log('User ID:', req.user?.id);
  console.log('Request Body:', req.body);

  // ✅ Authorization চেক - protect middleware এটা handle করবে
  if (!req.user || !req.user.id) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized. Please log in to add items to cart.' 
    });
  }

  try {
    // ✅ প্রোডাক্ট খুঁজুন
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    console.log('✅ Product found:', product.name);

    // ✅ প্রাইস এবং ভ্যারিয়েন্ট লজিক
    let priceToUse = product.price; // ডিফল্ট calculated price (basePrice - discount)
    let variantSku = null;

    // যদি ভ্যারিয়েন্ট নির্বাচন করা হয়
    if (variantName && variantValue) {
      const variantItem = product.variants.find(v => 
        v.name === variantName && v.value === variantValue
      );
      
      if (!variantItem) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid product variant or variant not found.' 
        });
      }
      
      // ভ্যারিয়েন্টের calculated price ব্যবহার করুন
      priceToUse = variantItem.price; 
      variantSku = variantItem.sku;
      
      console.log('✅ Variant selected:', variantName, variantValue);
      console.log('✅ Variant price:', priceToUse);
    } else {
      console.log('✅ No variant selected, using product price:', priceToUse);
    }

    // ফলব্যাক: যদি priceToUse undefined/null হয়
    if (priceToUse === null || priceToUse === undefined) {
      priceToUse = product.price || product.basePrice || 0;
    }

    console.log('✅ Final price to use:', priceToUse);

    // ✅ ইউজারের কার্ট খুঁজুন অথবা তৈরি করুন
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
      console.log('✅ New cart created for user:', req.user.id);
    }

    // ✅ নতুন আইটেম
    const newItem = {
      product: productId,
      quantity,
      variant: {
        name: variantName || null,
        value: variantValue || null,
        sku: variantSku,
      },
      priceAtPurchase: priceToUse, 
    };

    // ✅ চেক করুন: আইটেম কার্টে আছে কিনা
    const existingItem = cart.items.find(item => 
      item.product.toString() === productId &&
      item.variant.name === (variantName || null) &&
      item.variant.value === (variantValue || null)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      console.log('✅ Item already in cart, updated quantity:', existingItem.quantity);
    } else {
      cart.items.push(newItem);
      console.log('✅ New item added to cart');
    }

    // ✅ কার্ট সেভ করুন
    await cart.save();
    
    // ✅ পপুলেট করে ফ্রন্টএন্ডে পাঠান
    cart = await Cart.findById(cart._id).populate('items.product', 'name slug imageGroups');

    console.log('✅ Cart saved successfully, total items:', cart.items.length);

    res.status(200).json({ 
      success: true, 
      message: 'Product added to your cart successfully.',
      cart 
    });

  } catch (error) {
    console.error("❌ Cart Controller Error:", error);
    
    // মঙ্গুজ ভ্যালিডেশন এরর হ্যান্ডলিং
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    next(error);
  }
};

// @desc    Update item quantity in cart
// @route   PUT /api/v1/cart/:itemId
// @access  Private
export const updateCartItem = async (req, res, next) => {
  const { quantity } = req.body;
    
  if (!req.user || !req.user.id) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized.' 
    });
  }

  if (quantity === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Use DELETE to remove item. Quantity must be greater than 0.' 
    });
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(404).json({ 
      success: false, 
      message: 'Cart not found' 
    });
  }

  // ✅ item ID ব্যবহার করে সাবডকুমেন্ট খোঁজা
  const item = cart.items.id(req.params.itemId);
  if (!item) {
    return res.status(404).json({ 
      success: false, 
      message: 'Cart item not found' 
    });
  }

  item.quantity = quantity;
  await cart.save();
  
  // ✅ Population সহ কার্ট আবার পাঠান
  await cart.populate('items.product', 'name slug imageGroups');

  res.status(200).json({ success: true, cart });
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:itemId
// @access  Private
export const removeItemFromCart = async (req, res, next) => {
    
  if (!req.user || !req.user.id) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized.' 
    });
  }
    
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(404).json({ 
      success: false, 
      message: 'Cart not found' 
    });
  }

  cart.items.pull({ _id: req.params.itemId });
  await cart.save();
  
  res.status(200).json({ success: true, cart });
};