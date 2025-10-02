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
// @access  Public (Guest/Registered both)
export const addItemToCart = async (req, res, next) => {
  const { productId, quantity, variantName, variantValue, currentGuestItems } = req.body; 
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  let priceAtPurchase = product.price; 
  let variantInfo = null;

  if (product.hasVariants && variantName && variantValue) {
    const variant = product.variants.find(
      (v) => v.name === variantName && v.value === variantValue
    );

    if (!variant) {
      return res.status(400).json({ success: false, message: 'Invalid variant selected' });
    }

    priceAtPurchase = variant.price;
    variantInfo = { name: variantName, value: variantValue, sku: variant.sku };
  }
  
  if (!req.user || !req.user.id) {
    let items = currentGuestItems || []; 
    const itemIndex = items.findIndex(
        (item) => 
            item.product.toString() === productId && 
            JSON.stringify(item.variant) === JSON.stringify(variantInfo)
    );

    if (itemIndex > -1) {
      items[itemIndex].quantity += quantity;
    } else {
      items.push({
        product: productId,
        name: product.name,
        image: product.imageGroups[0]?.images[0]?.url,
        variant: variantInfo,
        quantity,
        priceAtPurchase,
      });
    }
    return res.status(200).json({ 
        success: true, 
        message: `Product added to temporary cart.`,
        cart: { items: items, isGuest: true }
    });
  }
  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId && JSON.stringify(item.variant) === JSON.stringify(variantInfo)
  );

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += quantity;
  } else {
    cart.items.push({
      product: productId,
      variant: variantInfo,
      quantity,
      priceAtPurchase,
    });
  }

  await cart.save();
  res.status(200).json({ success: true, cart: cart, isGuest: false });
};

// @desc    Update item quantity in cart
// @route   PUT /api/v1/cart/:itemId
// @access  Private
export const updateCartItem = async (req, res, next) => {
  const { quantity } = req.body;
    
  if (!req.user || !req.user.id) {
     return res.status(401).json({ success: false, message: 'Not authorized.' });
  }

  if (quantity === 0) {
    return res.status(400).json({ success: false, message: 'Use DELETE to remove item. Quantity must be greater than 0.' });
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  const item = cart.items.id(req.params.itemId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Cart item not found' });
  }

  item.quantity = quantity;

  await cart.save();
  res.status(200).json({ success: true, cart });
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:itemId
// @access  Private
export const removeItemFromCart = async (req, res, next) => {
    
  if (!req.user || !req.user.id) {
     return res.status(401).json({ success: false, message: 'Not authorized.' });
  }
    
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  cart.items.pull({ _id: req.params.itemId });

  await cart.save();
  res.status(200).json({ success: true, cart });
};