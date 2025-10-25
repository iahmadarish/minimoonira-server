// cartController.js

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
  
  const cart = await Cart.findOne({ user: req.user.id })
    .populate('items.product', 'name slug imageGroups variants hasVariants variantOptions');
  
  if (!cart) {
    const newCart = await Cart.create({ user: req.user.id, items: [] });
    return res.status(200).json({ success: true, cart: newCart });
  }
  
  // কার্ট আইটেম প্রসেসিং - নতুন ভেরিয়েন্ট স্ট্রাকচার অনুযায়ী
  const processedCart = {
    ...cart.toObject(),
    items: cart.items.map(item => {
      const product = item.product;
      if (!product) return item;
      
      // ভ্যারিয়েন্ট সিলেক্ট করা থাকলে সেই ইমেজ নিন
      let productImage = '';
      if (product.imageGroups && product.imageGroups.length > 0) {
        // নতুন ভেরিয়েন্ট স্ট্রাকচার অনুযায়ী ইমেজ গ্রুপ খুঁজুন
        if (item.variant && item.variant.imageGroupName) {
          const variantImageGroup = product.imageGroups.find(
            group => group.name === item.variant.imageGroupName
          );
          if (variantImageGroup && variantImageGroup.images.length > 0) {
            productImage = variantImageGroup.images[0].url;
          }
        }
        
        // ভ্যারিয়েন্ট ইমেজ না পেলে মেইন ইমেজ নিন
        if (!productImage) {
          const mainGroup = product.imageGroups.find(group => group.name === 'Main') || product.imageGroups[0];
          productImage = mainGroup.images[0]?.url || '';
        }
      }
      
      // ভেরিয়েন্ট ডিসপ্লে নাম তৈরি করুন
      let variantDisplayName = '';
      if (item.variant && item.variant.options && Array.isArray(item.variant.options)) {
        variantDisplayName = item.variant.options.map(opt => `${opt.name}: ${opt.value}`).join(', ');
      } else if (item.variant && item.variant.displayName) {
        variantDisplayName = item.variant.displayName;
      }
      
      return {
        ...item.toObject(),
        name: product.name,
        image: productImage,
        productId: product._id,
        variantDisplayName: variantDisplayName
      };
    })
  };
  
  res.status(200).json({ success: true, cart: processedCart });
};

// @desc    Add item to cart
// @route   POST /api/v1/cart
// @access  Private (protect middleware ensures req.user exists)
export const addItemToCart = async (req, res, next) => {
  const { productId, quantity, finalPrice, basePrice, discountPercentage, variant } = req.body; 

  console.log('🛒 Cart Controller - Add Item Request:');
  console.log('User ID:', req.user?.id);
  console.log('Request Body:', req.body);

  // Authorization চেক - protect middleware এটা handle করবে
  if (!req.user || !req.user.id) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized. Please log in to add items to cart.' 
    });
  }

  try {
    // প্রোডাক্ট খুঁজুন
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    console.log('✅ Product found:', product.name);

    // প্রাইস এবং ভ্যারিয়েন্ট লজিক - নতুন স্ট্রাকচার অনুযায়ী
    let priceToUse = finalPrice || product.price; // ফ্রন্টএন্ড থেকে পাঠানো finalPrice ব্যবহার করুন
    let variantData = null;
    let variantSku = null;

    // নতুন ভেরিয়েন্ট স্ট্রাকচার অনুযায়ী
    if (variant && variant.options && Array.isArray(variant.options)) {
      console.log('✅ New variant structure detected:', variant);
      
      // প্রোডাক্টের ভেরিয়েন্ট খুঁজুন
      const variantItem = product.variants.find(v => {
        // ভেরিয়েন্টের options এর সাথে মিল খুঁজুন
        return variant.options.every(opt => 
          v.options.some(vOpt => 
            vOpt.name === opt.name && vOpt.value === opt.value
          )
        );
      });
      
      if (!variantItem) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid product variant or variant not found.' 
        });
      }
      
      // ভ্যারিয়েন্টের calculated price ব্যবহার করুন
      priceToUse = finalPrice || variantItem.price; 
      variantSku = variantItem.sku;
      variantData = {
        variantId: variant.variantId || variantItem._id,
        options: variant.options,
        imageGroupName: variant.imageGroupName || variantItem.imageGroupName,
        displayName: variant.displayName || variant.options.map(opt => `${opt.name}: ${opt.value}`).join(', ')
      };
      
      console.log('✅ Variant selected:', variantData.displayName);
      console.log('✅ Variant price:', priceToUse);
    } else {
      console.log('✅ No variant selected, using product price:', priceToUse);
    }

    // ফলব্যাক: যদি priceToUse undefined/null হয়
    if (priceToUse === null || priceToUse === undefined || priceToUse <= 0) {
      priceToUse = product.price || product.basePrice || 0;
    }

    // বেস প্রাইস এবং ডিসকাউন্ট সেট করুন
    const basePriceToUse = basePrice || product.basePrice || priceToUse;
    const discountPercentageToUse = discountPercentage || product.discountPercentage || 0;

    console.log('✅ Final price to use:', priceToUse);
    console.log('✅ Base price:', basePriceToUse);
    console.log('✅ Discount percentage:', discountPercentageToUse);

    // ইউজারের কার্ট খুঁজুন অথবা তৈরি করুন
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
      console.log('✅ New cart created for user:', req.user.id);
    }

    // নতুন আইটেম - নতুন স্ট্রাকচার অনুযায়ী
    const newItem = {
      product: productId,
      quantity,
      priceAtPurchase: priceToUse,
      basePrice: basePriceToUse,
      discountPercentage: discountPercentageToUse,
      variant: variantData ? {
        variantId: variantData.variantId,
        options: variantData.options,
        imageGroupName: variantData.imageGroupName,
        displayName: variantData.displayName,
        sku: variantSku
      } : null
    };

    // চেক করুন: আইটেম কার্টে আছে কিনা - নতুন ভেরিয়েন্ট আইডেন্টিফায়ার অনুযায়ী
    const existingItem = cart.items.find(item => {
      // একই প্রোডাক্ট এবং একই ভেরিয়েন্ট চেক করুন
      if (item.product.toString() !== productId) return false;
      
      // উভয় আইটেমে ভেরিয়েন্ট নেই
      if (!item.variant && !variantData) return true;
      
      // একটিতে ভেরিয়েন্ট আছে, অন্যটিতে নেই
      if (!item.variant || !variantData) return false;
      
      // ভেরিয়েন্ট আইডি চেক করুন
      if (item.variant.variantId && variantData.variantId) {
        return item.variant.variantId.toString() === variantData.variantId.toString();
      }
      
      // ভেরিয়েন্ট অপশনস চেক করুন
      if (item.variant.options && variantData.options) {
        const itemOptions = JSON.stringify(item.variant.options.sort((a, b) => a.name.localeCompare(b.name)));
        const newOptions = JSON.stringify(variantData.options.sort((a, b) => a.name.localeCompare(b.name)));
        return itemOptions === newOptions;
      }
      
      return false;
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.priceAtPurchase = priceToUse; // প্রাইস আপডেট করুন
      existingItem.basePrice = basePriceToUse;
      existingItem.discountPercentage = discountPercentageToUse;
      console.log('✅ Item already in cart, updated quantity:', existingItem.quantity);
    } else {
      cart.items.push(newItem);
      console.log('✅ New item added to cart');
    }

    // কার্ট সেভ করুন
    await cart.save();
    
    // পপুলেট করে ফ্রন্টএন্ডে পাঠান
    cart = await Cart.findById(cart._id).populate('items.product', 'name slug imageGroups variants hasVariants');

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
  // Debugging
  console.log('Update Cart Item ID:', req.params.itemId); 
  console.log('Requested Quantity:', quantity);
    
  if (!req.user || !req.user.id) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized.' 
    });
  }

  // ✅ Client side-e check kora holeo, server side-e confirm kora bhalo
  if (quantity < 1) { 
    return res.status(400).json({ 
      success: false, 
      message: 'Quantity must be at least 1. Use DELETE to remove item.' 
    });
  }
  
  try { // ✅ try block add kora holo
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
    await cart.save(); // ✅ save() call korar shomoy kono validation error hole catch block e jabe
    
    // ✅ Population সহ কার্ট আবার পাঠান
    await cart.populate('items.product', 'name slug imageGroups variants hasVariants');

    // ✅ Successful response
    res.status(200).json({ success: true, cart });
    
  } catch (error) { // ✅ catch block add kora holo
    console.error("❌ Cart Controller Update Error:", error);
    
    // Mongoose validation error handle
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    // General server error
    next(error); 
  }
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
  
  // পপুলেট করে রেসপন্স দিন
  await cart.populate('items.product', 'name slug imageGroups variants hasVariants');
  
  res.status(200).json({ success: true, cart });
};