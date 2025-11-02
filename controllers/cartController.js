import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';

// @desc    Get user cart
// @route   GET /api/v1/cart
// @access  Private
export const getCart = async (req, res, next) => {
    
    // 1. অথেন্টিকেশন চেক
    if (!req.user || !req.user.id) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authorized. Please log in to view your cart.' 
        });
    }
    
    try {
        // 2. কার্ট এবং প্রোডাক্টের প্রয়োজনীয় ফিল্ড পপুলেট করা
        let cart = await Cart.findOne({ user: req.user.id })
            .populate({
                path: 'items.product',
                select: 'name slug imageGroups variants hasVariants price basePrice discountPercentage'
            });

        // কার্ট না থাকলে নতুন কার্ট তৈরি করা
        if (!cart) {
            const newCart = await Cart.create({ user: req.user.id, items: [] });
            return res.status(200).json({ success: true, cart: newCart });
        }

        let isCartModified = false; // দাম/আইটেম পরিবর্তন হয়েছে কিনা ট্র্যাক করার জন্য
        const itemsToKeep = [];
        
        // 3. প্রতিটি আইটেম লুপ করে দাম এবং প্রোডাক্ট স্ট্যাটাস পরীক্ষা করা
        for (const item of cart.items) {
            const product = item.product;
            
            // যদি প্রোডাক্ট ডাটাবেস থেকে মুছে ফেলা হয়ে থাকে
            if (!product) {
                isCartModified = true;
                // এই ক্ষেত্রে আইটেমটি বাদ দেওয়া হবে, তাই itemsToKeep তে যোগ করা হচ্ছে না।
                continue; 
            }

            let livePrice = product.price; // ডিফল্টভাবে প্রোডাক্টের মূল দাম
            let currentItemPrice = item.priceAtPurchase;
            
            // ভেরিয়েন্ট (Variant) এর দাম খুঁজে বের করা
            if (product.hasVariants && item.variant?.sku) {
                const liveVariant = product.variants.find(v => v.sku === item.variant.sku);
                
                // যদি ভেরিয়েন্ট খুঁজে পাওয়া যায়, তবে সেই ভেরিয়েন্টের দাম ব্যবহার করা
                if (liveVariant) {
                    livePrice = liveVariant.price;
                } else {
                    // ভেরিয়েন্ট খুঁজে না পেলে (হয়তো ডিলিট হয়েছে বা SKU বদলেছে), আইটেমটি বাদ দেওয়া
                    isCartModified = true;
                    continue; 
                }
            }
            
            // 4. দামের তুলনা: যদি কার্টে সেভ করা দাম লাইভ দামের সাথে না মেলে
            // .toFixed(2) ব্যবহার করা হয়েছে ফ্লোটিং পয়েন্ট তুলনা করার জটিলতা এড়াতে।
            if (currentItemPrice.toFixed(2) !== livePrice.toFixed(2)) {
                
                // দাম আপডেট করা
                item.priceAtPurchase = livePrice; 
                isCartModified = true;
            }

            // এই আইটেমটি রেখে দেওয়া হবে
            itemsToKeep.push(item);
        }
        
        // 5. যদি কোনো পরিবর্তন হয়, কার্ট আপডেট করে সেভ করা
        if (isCartModified) {
            cart.items = itemsToKeep; // ডিলিট হওয়া আইটেম বা ইনভ্যালিড ভেরিয়েন্ট বাদ দেওয়া হলো
            
            // মোট দাম পুনরায় গণনা করা (pre-save hook ব্যবহার করেও এটি করা যায়, তবে ম্যানুয়ালি সেট করা নিরাপদ)
            let newTotalPrice = cart.items.reduce((total, item) => total + (item.priceAtPurchase * item.quantity), 0);
            cart.totalPrice = newTotalPrice;
            
            // ডাটাবেসে পরিবর্তনগুলো সংরক্ষণ করা
            await cart.save();
            
            // সেভ করার পর, আবার পপুলেট করে সঠিক স্ট্রাকচার নিশ্চিত করা
            await cart.populate({
                path: 'items.product',
                select: 'name slug imageGroups variants hasVariants price basePrice discountPercentage'
            });
        }

        // 6. আপডেট হওয়া বা যাচাই করা কার্ট ফ্রন্টএন্ডে পাঠানো
        res.status(200).json({ success: true, cart: cart });
        
    } catch (error) {
        console.error("❌ Cart Controller getCart Error:", error);
        
        // General server error handling
        next(error); 
    }
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
        variantId: variantItem._id, 
        options: variant.options,   
        imageGroupName: variant.imageGroupName || variantItem.imageGroupName,
        displayName: variant.displayName || variant.options.map(opt => `${opt.name}: ${opt.value}`).join(', ')
      };
      
      console.log('✅ Variant selected:', variantData.displayName);
      console.log('✅ Variant price:', priceToUse);
    } else {
      console.log('✅ No variant selected, using product price:', priceToUse);
    }

    if (priceToUse === null || priceToUse === undefined || priceToUse <= 0) {
      priceToUse = product.price || product.basePrice || 0;
    }


    const basePriceToUse = basePrice || product.basePrice || priceToUse;
    const discountPercentageToUse = discountPercentage || product.discountPercentage || 0;

    console.log(' Final price to use:', priceToUse);
    console.log(' Base price:', basePriceToUse);
    console.log(' Discount percentage:', discountPercentageToUse);

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
      console.log('New cart created for user:', req.user.id);
    }

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
    const existingItem = cart.items.find(item => {
      if (item.product.toString() !== productId) return false;      
      if (!item.variant && !variantData) return true;      
      if (!item.variant || !variantData) return false;  
      if (item.variant.variantId && variantData.variantId) {
        return item.variant.variantId.toString() === variantData.variantId.toString();
      }      
      if (item.variant.options && variantData.options) {
        const itemOptions = JSON.stringify(item.variant.options.sort((a, b) => a.name.localeCompare(b.name)));
        const newOptions = JSON.stringify(variantData.options.sort((a, b) => a.name.localeCompare(b.name)));
        return itemOptions === newOptions;
      }      
      return false;
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.priceAtPurchase = priceToUse;
      existingItem.basePrice = basePriceToUse;
      existingItem.discountPercentage = discountPercentageToUse;
      console.log('Item already in cart, updated quantity:', existingItem.quantity);
    } else {
      cart.items.push(newItem);
      console.log('New item added to cart');
    }
    await cart.save();
    cart = await Cart.findById(cart._id).populate('items.product', 'name slug imageGroups variants hasVariants');
    console.log('Cart saved successfully, total items:', cart.items.length);
    res.status(200).json({ 
      success: true, 
      message: 'Product added to your cart successfully.',
      cart 
    });
  } catch (error) {
    console.error("Cart Controller Error:", error);
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
  if (quantity < 1) { 
    return res.status(400).json({ 
      success: false, 
      message: 'Quantity must be at least 1. Use DELETE to remove item.' 
    });
  }
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }
    item.quantity = quantity;
    await cart.save(); 
    await cart.populate('items.product', 'name slug imageGroups variants hasVariants');
    res.status(200).json({ success: true, cart });
  } catch (error) { 
    console.error("art Controller Update Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
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