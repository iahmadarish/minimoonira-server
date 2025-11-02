import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
// import Campaign from '../models/campaign.model.js';
// import Promotion from '../models/promotion.model.js';


export const getCart = async (req, res, next) => {
    
    if (!req.user || !req.user.id) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authorized. Please log in to view your cart.' 
        });
    }
    
    try {
        let cart = await Cart.findOne({ user: req.user.id })
            .populate({
                path: 'items.product',
                select: 'name slug imageGroups variants hasVariants price basePrice discountPercentage stockStatus isActive'
            });
        if (!cart) {
            const newCart = await Cart.create({ user: req.user.id, items: [] });          
            let activeCampaigns = [];
            try {
                const Campaign = (await import('../models/campaign.model.js')).default;
                activeCampaigns = await Campaign.find({
                    user: req.user.id,
                    status: 'active',
                    expiresAt: { $gt: new Date() }
                }).populate('promotion').populate('cartItems.product');
            } catch (campaignError) {
                console.log('⚠️ Campaign model not available yet');
            }
            
            return res.status(200).json({ 
                success: true, 
                cart: newCart,
                activeCampaigns: activeCampaigns
            });
        }

        let isCartModified = false;
        const itemsToKeep = [];
        
        // 3. প্রতিটি আইটেম লুপ করে দাম এবং প্রোডাক্ট স্ট্যাটাস পরীক্ষা করা
        for (const item of cart.items) {
            const product = item.product;
            
            // যদি প্রোডাক্ট ডাটাবেস থেকে মুছে ফেলা হয়ে থাকে বা inactive থাকে
            if (!product || product.isActive === false) {
                isCartModified = true;
                console.log(`🗑️ Removing inactive/deleted product from cart: ${product?.name || 'Unknown Product'}`);
                continue; 
            }

            // যদি প্রোডাক্ট out of stock থাকে
            if (product.stockStatus === 'out_of_stock') {
                isCartModified = true;
                console.log(`📦 Removing out of stock product: ${product.name}`);
                continue;
            }

            let livePrice = product.price;
            let currentItemPrice = item.priceAtPurchase;
            
            // ভেরিয়েন্ট (Variant) এর দাম খুঁজে বের করা
            if (product.hasVariants && item.variant?.sku) {
                const liveVariant = product.variants.find(v => v.sku === item.variant.sku);
                
                if (liveVariant) {
                    livePrice = liveVariant.price;
                    
                    // যদি ভেরিয়েন্ট out of stock থাকে
                    if (liveVariant.stockStatus === 'out_of_stock') {
                        isCartModified = true;
                        console.log(`📦 Removing out of stock variant: ${product.name} - ${item.variant.displayName}`);
                        continue;
                    }
                } else {
                    // ভেরিয়েন্ট খুঁজে না পেলে (হয়তো ডিলিট হয়েছে বা SKU বদলেছে)
                    isCartModified = true;
                    console.log(`❌ Variant not found, removing: ${product.name} - ${item.variant.displayName}`);
                    continue; 
                }
            }
            
            // 4. দামের তুলনা: যদি কার্টে সেভ করা দাম লাইভ দামের সাথে না মেলে
            if (currentItemPrice.toFixed(2) !== livePrice.toFixed(2)) {
                console.log(`💰 Price updated for ${product.name}: ${currentItemPrice} → ${livePrice}`);
                item.priceAtPurchase = livePrice; 
                isCartModified = true;
            }

            // এই আইটেমটি রেখে দেওয়া হবে
            itemsToKeep.push(item);
        }
        
        // 5. যদি কোনো পরিবর্তন হয়, কার্ট আপডেট করে সেভ করা
        if (isCartModified) {
            cart.items = itemsToKeep;
            
            // মোট দাম পুনরায় গণনা করা
            let newTotalPrice = cart.items.reduce((total, item) => total + (item.priceAtPurchase * item.quantity), 0);
            cart.totalPrice = newTotalPrice;
            
            await cart.save();
            
            // সেভ করার পর, আবার পপুলেট করে সঠিক স্ট্রাকচার নিশ্চিত করা
            await cart.populate({
                path: 'items.product',
                select: 'name slug imageGroups variants hasVariants price basePrice discountPercentage stockStatus isActive'
            });
        }

        // 🔥 6. ইউজারের একটিভ ক্যাম্পেইন গুলো ফেচ করুন
        let activeCampaigns = [];
        try {
            const Campaign = (await import('../models/campaign.model.js')).default;
            const Promotion = (await import('../models/promotion.model.js')).default;
            
            activeCampaigns = await Campaign.find({
                user: req.user.id,
                status: 'active',
                expiresAt: { $gt: new Date() }
            })
            .populate('promotion')
            .populate('cartItems.product', 'name slug imageGroups price');
            
            console.log(`🎁 Found ${activeCampaigns.length} active campaigns for user`);
            
        } catch (campaignError) {
            console.log('⚠️ Campaign/Promotion models not available yet:', campaignError.message);
        }

        // 🔥 7. প্রমোশন এপ্লাই করার লজিক
        let finalCart = cart.toObject();
        let appliedPromotions = [];
        let totalDiscount = 0;

        if (activeCampaigns.length > 0) {
            for (const campaign of activeCampaigns) {
                if (campaign.promotion && campaign.promotion.isActive) {
                    const promotion = campaign.promotion;
                    
                    // প্রমোশন ভ্যালিডিটি চেক
                    const now = new Date();
                    if (now < promotion.startDate || now > promotion.endDate) {
                        continue;
                    }

                    // মিনিমাম কার্ট ভ্যালু চেক
                    if (promotion.minimumCartValue && finalCart.totalPrice < promotion.minimumCartValue) {
                        continue;
                    }

                    let campaignDiscount = 0;
                    
                    // প্রোমোশন টাইপ অনুযায়ী ডিস্কাউন্ট ক্যালকুলেট
                    if (promotion.type === 'cart_discount') {
                        // সম্পূর্ণ কার্টে ডিস্কাউন্ট
                        if (promotion.discountType === 'percentage') {
                            campaignDiscount = (finalCart.totalPrice * promotion.discountValue) / 100;
                        } else {
                            campaignDiscount = promotion.discountValue;
                        }
                    } else if (promotion.type === 'product_discount') {
                        // স্পেসিফিক প্রোডাক্টে ডিস্কাউন্ট
                        for (const item of finalCart.items) {
                            if (promotion.applicableProducts && 
                                promotion.applicableProducts.includes(item.product._id.toString())) {
                                
                                if (promotion.discountType === 'percentage') {
                                    const itemDiscount = (item.priceAtPurchase * item.quantity * promotion.discountValue) / 100;
                                    campaignDiscount += itemDiscount;
                                    
                                    // আইটেম লেভেলে ডিস্কাউন্ট প্রাইস সেট করুন
                                    item.discountedPrice = item.priceAtPurchase - (item.priceAtPurchase * promotion.discountValue / 100);
                                } else {
                                    campaignDiscount += promotion.discountValue * item.quantity;
                                    item.discountedPrice = item.priceAtPurchase - promotion.discountValue;
                                }
                            }
                        }
                    } else if (promotion.type === 'abandoned_cart') {
                        // অ্যাবানডন্ড কার্ট প্রমোশন - সম্পূর্ণ কার্টে
                        if (promotion.discountType === 'percentage') {
                            campaignDiscount = (finalCart.totalPrice * promotion.discountValue) / 100;
                        } else {
                            campaignDiscount = promotion.discountValue;
                        }
                    }

                    // ডিস্কাউন্ট অ্যাপ্লাই করা
                    if (campaignDiscount > 0) {
                        totalDiscount += campaignDiscount;
                        appliedPromotions.push({
                            campaignId: campaign._id,
                            promotionName: promotion.name,
                            discountValue: promotion.discountValue,
                            discountType: promotion.discountType,
                            discountAmount: campaignDiscount
                        });
                    }
                }
            }
        }

        // ফাইনাল প্রাইস ক্যালকুলেশন
        const finalTotalPrice = Math.max(0, finalCart.totalPrice - totalDiscount);

        // 8. আপডেট হওয়া বা যাচাই করা কার্ট ফ্রন্টএন্ডে পাঠানো
        res.status(200).json({ 
            success: true, 
            cart: finalCart,
            activeCampaigns: activeCampaigns,
            appliedPromotions: appliedPromotions,
            totalDiscount: totalDiscount,
            finalTotalPrice: finalTotalPrice,
            message: appliedPromotions.length > 0 ? 
                `🎉 ${appliedPromotions.length} promotion(s) applied to your cart!` : 
                'Cart loaded successfully'
        });
        
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