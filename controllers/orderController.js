// controllers/orderController.js

import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
// ⚠️ আপনার SSL Commerz ইন্টিগ্রেশন ফাইল ইমপোর্ট করুন (পরের ধাপে তৈরি করা হবে)
import { initializePayment } from '../config/sslcommerz.js';

// @desc    Create a new order (Checkout)
// @route   POST /api/v1/orders
// @access  Private (Registered User) / Public (Guest)
export const createOrder = async (req, res, next) => {
  const {
    shippingAddress,
    paymentMethod,
    shippingPrice,
    taxPrice,
    isGuest,
    guestEmail,
    // Note: Registered users will fetch items from Cart model
    // Guest users might pass items in req.body
    guestItems // if isGuest is true
  } = req.body;

  let orderItems = [];
  let user = null;
  let cart = null;

  if (!isGuest) {
    // 1. Registered User: Get items from Cart
    user = req.user.id;
    cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    
    // Transform Cart Items to Order Items
    orderItems = cart.items.map(item => ({
        name: item.product.name,
        product: item.product._id,
        variant: item.variant,
        quantity: item.quantity,
        price: item.priceAtPurchase,
        image: item.product.imageGroups[0]?.images[0]?.url, // প্রথম ইমেজ নেওয়া
    }));

  } else {
    // 2. Guest User: Get items from body
    if (!guestItems || guestItems.length === 0 || !guestEmail) {
        return res.status(400).json({ success: false, message: 'Guest details and items are required' });
    }
    // Perform basic validation and price check for guestItems if needed
    orderItems = guestItems.map(item => ({
        // Assuming guestItems already contains structured data from client
        name: item.name,
        product: item.productId,
        variant: item.variant,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
    }));
  }

  // Calculate Subtotal
  const itemsPrice = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  // Create Order Object
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
    orderStatus: paymentMethod === 'COD' ? 'Pending' : 'Pending', // COD হলে Pending, SSL হলে Pending/Processing
  });

  // 3. Payment Method Handling
  if (paymentMethod === 'SSLCommerz') {
    // Initialize Payment
    const paymentData = {
        amount: totalPrice,
        cus_name: shippingAddress.name || 'Customer', // এখানে কাস্টমার নাম যোগ করুন
        cus_email: guestEmail || req.user.email,
        // ... অন্যান্য প্রয়োজনীয় ডেটা
    };

    const response = await initializePayment(newOrder._id, paymentData);
    
    if (response.status === 'SUCCESS') {
        await newOrder.save(); // পেমেন্ট সফলভাবে ইনিশিয়ালাইজ হলে সেভ করুন
        if (!isGuest && cart) {
            await Cart.findByIdAndDelete(cart._id); // কার্ট খালি/ডিলিট করুন
        }
        return res.status(200).json({ 
            success: true, 
            message: 'Payment initialized', 
            redirectUrl: response.GatewayPageURL 
        });
    } else {
        return res.status(500).json({ success: false, message: 'Payment initiation failed' });
    }
  } 
  
  // 4. COD or Direct Save
  await newOrder.save();
  if (!isGuest && cart) {
    await Cart.findByIdAndDelete(cart._id);
  }

  await updateProductStock(orderItems); 

  res.status(201).json({ success: true, order: newOrder });
};

export const getMyOrders = async (req, res, next) => {
    try {
        // req.user.id আসে protect middleware থেকে
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get order by ID
// @route   GET /api/v1/orders/:id
// @access  Private / Public (Admin or User's Own Order)
export const getOrderById = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email'); // ইউজার নাম ও ইমেইল পপুলেট করা

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // শুধু মাত্র নিজের অর্ডার এবং Guest Order দেখানোর অনুমতি দেওয়া (অথবা Admin)
        const isOwner = order.user?.toString() === req.user?.id.toString();
        const isGuest = order.isGuest;
        
        // যদি অর্ডার নিজের না হয় এবং গেস্ট অর্ডারও না হয় তবে অ্যাক্সেস দিন
        if (!isOwner && !isGuest && req.user?.role !== 'admin') {
             return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
        }


        res.status(200).json({
            success: true,
            order,
        });

    } catch (error) {
        next(error);
    }
};


const updateProductStock = async (orderItems) => {
    for (const item of orderItems) {
        // 1. প্রোডাক্ট খুঁজে বের করা
        const product = await Product.findById(item.product);

        if (!product) {
            console.error(`Product not found for ID: ${item.product}`);
            continue; 
        }

        // 2. স্টক আপডেট করা
        if (product.hasVariants && item.variant && item.variant.sku) {
            // যদি ভেরিয়েন্ট থাকে, তবে ভেরিয়েন্টের স্টক কমানো
            const variantIndex = product.variants.findIndex(v => v.sku === item.variant.sku);
            if (variantIndex > -1) {
                product.variants[variantIndex].stock -= item.quantity;
            }
        } else {
            // যদি ভেরিয়েন্ট না থাকে, তবে মূল প্রোডাক্টের স্টক কমানো
            product.stock -= item.quantity;
        }

        // 3. সেভ করা
        await product.save({ validateBeforeSave: false }); // দ্রুত সেভ করার জন্য
    }
};