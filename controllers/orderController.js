// controllers/orderController.js

import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import { districtsData } from '../data/districts.js';
// ⚠️ আপনার SSL Commerz ইন্টিগ্রেশন ফাইল ইমপোর্ট করুন
// import { initializePayment } from '../config/sslcommerz.js';

// ✅ Shipping চার্জ ক্যালকুলেশন (Order Amount অনুযায়ী)
const calculateShippingPrice = (shippingZone, orderAmount) => {
  if (orderAmount >= 8000) return 0; // ফ্রি শিপিং
  if (orderAmount >= 4000) return 30; // সব জেলায় 30 টাকা

  switch (shippingZone) {
    case 'dhaka_city': return 50;
    case 'dhaka_outside': return 70;
    case 'other_district': return 130;
    default: return 130;
  }
};

// ✅ Product Stock আপডেট করা
const updateProductStock = async (orderItems) => {
  for (const item of orderItems) {
    const product = await Product.findById(item.product);

    if (!product) {
      console.error(`Product not found for ID: ${item.product}`);
      continue;
    }

    if (product.hasVariants && item.variant && item.variant.sku) {
      const variantIndex = product.variants.findIndex(v => v.sku === item.variant.sku);
      if (variantIndex > -1) {
        product.variants[variantIndex].stock -= item.quantity;
      }
    } else {
      product.stock -= item.quantity;
    }

    await product.save({ validateBeforeSave: false });
  }
};

// @desc    Create a new order (Checkout)
// @route   POST /api/v1/orders
// @access  Public (Guest) / Private (Registered)
export const createOrder = async (req, res, next) => {
  try {
    const {
      shippingAddress,
      paymentMethod,
      taxPrice = 0,
      isGuest = false,
      guestEmail,
      guestItems
    } = req.body;

    // ✅ Shipping Address Validation
    if (!shippingAddress || !shippingAddress.district || !shippingAddress.upazila) {
      return res.status(400).json({ 
        success: false, 
        message: 'Complete shipping address is required' 
      });
    }

    let orderItems = [];
    let user = null;
    let cart = null;

    // ✅ Registered User - Cart থেকে Items নেওয়া
    if (!isGuest) {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      user = req.user.id;
      cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cart is empty' 
        });
      }

      orderItems = cart.items.map(item => ({
        name: item.product.name,
        product: item.product._id,
        variant: item.variant || {},
        quantity: item.quantity,
        price: item.priceAtPurchase,
        image: item.product.imageGroups?.[0]?.url || ''
      }));

    } else {
      // ✅ Guest User - Body থেকে Items নেওয়া
      if (!guestItems || guestItems.length === 0 || !guestEmail) {
        return res.status(400).json({ 
          success: false, 
          message: 'Guest email and items are required' 
        });
      }

      orderItems = guestItems.map(item => ({
        name: item.name,
        product: item.productId,
        variant: item.variant || {},
        quantity: item.quantity,
        price: item.priceAtPurchase || item.price,
        image: item.image || ''
      }));
    }

    // ✅ Items Subtotal
    const itemsPrice = orderItems.reduce(
      (acc, item) => acc + item.price * item.quantity, 
      0
    );

    // ✅ Shipping Zone খুঁজে বের করা
    const district = districtsData.find(d => d.name === shippingAddress.district);
    if (!district) {
      return res.status(400).json({ success: false, message: 'Invalid district' });
    }

    const upazila = district.upazilas.find(u => u.name === shippingAddress.upazila);
    if (!upazila) {
      return res.status(400).json({ success: false, message: 'Invalid upazila' });
    }

    // ✅ Shipping চার্জ ক্যালকুলেট করা
    const shippingPrice = calculateShippingPrice(upazila.shippingZone, itemsPrice);

    // ✅ Total Price
    const totalPrice = itemsPrice + shippingPrice + taxPrice;

    // ✅ Order তৈরি করা
    const newOrder = new Order({
      user,
      isGuest,
      guestEmail,
      orderItems,
      shippingAddress,
      paymentMethod,
      shippingPrice,
      taxPrice,
      totalPrice,
      orderStatus: 'Pending'
    });

    // ✅ Payment Method Handling
    if (paymentMethod === 'SSLCommerz') {
      // TODO: SSL Commerz Integration
      // const paymentData = {
      //   amount: totalPrice,
      //   cus_name: shippingAddress.name || 'Customer',
      //   cus_email: guestEmail || req.user.email,
      // };
      // const response = await initializePayment(newOrder._id, paymentData);
      // if (response.status === 'SUCCESS') {
      //   await newOrder.save();
      //   if (!isGuest && cart) {
      //     await Cart.findByIdAndDelete(cart._id);
      //   }
      //   return res.status(200).json({
      //     success: true,
      //     message: 'Payment initialized',
      //     redirectUrl: response.GatewayPageURL
      //   });
      // }
      
      return res.status(501).json({ 
        success: false, 
        message: 'SSL Commerz integration pending' 
      });
    }

    // ✅ COD (Cash on Delivery)
    await newOrder.save();

    // ✅ Cart Clear করা (Registered User এর জন্য)
    if (!isGuest && cart) {
      await Cart.findByIdAndDelete(cart._id);
    }

    // ✅ Stock আপডেট করা
    await updateProductStock(orderItems);

    res.status(201).json({ 
      success: true, 
      message: 'Order placed successfully',
      order: newOrder 
    });

  } catch (error) {
    console.error('Order creation error:', error);
    next(error);
  }
};

// @desc    Get my orders (Logged in user)
// @route   GET /api/v1/orders
// @access  Private
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/v1/orders/:id
// @access  Private (Own order) / Public (Guest with email verification)
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // ✅ Authorization Check
    const isOwner = order.user?.toString() === req.user?.id?.toString();
    const isGuest = order.isGuest;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isGuest && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this order' 
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};