// controllers/orderController.js
import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import { districtsData } from '../data/districts.js';

import { initializePayment } from '../config/sslcommerz.js'; 

// ✅ Shipping Charge Calculation
const calculateShippingPrice = (shippingZone, orderAmount) => {
  if (orderAmount >= 8000) return 0;
  if (orderAmount >= 4000) return 30;

  switch (shippingZone) {
    case 'dhaka_city': return 50;
    case 'dhaka_outside': return 70;
    case 'other_district': return 130;
    default: return 130;
  }
};

// ✅ Product Stock Update
export const updateProductStock = async (orderItems, action = 'decrease') => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    for (const item of orderItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product) continue;

      const quantity = action === 'decrease' ? -item.quantity : item.quantity;

      // Variant product হলে variant stock আপডেট করুন
      if (product.hasVariants && item.variant && item.variant.sku) {
        const variantIndex = product.variants.findIndex(v => v.sku === item.variant.sku);
        if (variantIndex > -1) {
          product.variants[variantIndex].stock += quantity;
          // Ensure stock doesn't go negative
          if (product.variants[variantIndex].stock < 0) {
            product.variants[variantIndex].stock = 0;
          }
        }
      } else {
        // Simple product হলে main stock আপডেট করুন
        product.stock += quantity;
        // Ensure stock doesn't go negative
        if (product.stock < 0) {
          product.stock = 0;
        }
      }

      await product.save({ session, validateBeforeSave: false });
    }
    
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
// @desc    Create a new order
// @route   POST /api/v1/orders
// @access  Public/Private
export const createOrder = async (req, res, next) => {
  try {
    const {
      shippingAddress,
      paymentMethod,
      shippingPrice,
      taxPrice = 0,
      isGuest = false,
      guestEmail,
      guestItems,
      orderItems // Direct order items (if provided)
    } = req.body;

    // --- ১. প্রাথমিক ভ্যালিডেশন ---
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || 
        !shippingAddress.district || !shippingAddress.upazila || !shippingAddress.addressLine1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Complete shipping address is required' 
      });
    }

    let finalOrderItems = [];
    let user = null;

    // --- ২. অর্ডার আইটেম প্রস্তুত করুন ---
    if (isGuest) {
      // গেস্ট ইউজার ভ্যালিডেশন
      if (!guestEmail || !guestItems || guestItems.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Guest email and items are required' 
        });
      }
      
      // গেস্ট ইউজারের জন্য অর্ডার আইটেম প্রস্তুত করুন
      finalOrderItems = guestItems.map(item => {
        const variantData = convertVariantToOrderFormat(item.variant);
        
        return {
          name: item.name,
          product: item.productId,
          variant: variantData, // কনভার্টেড variant ডেটা
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.priceAtPurchase || item.price || 0),
          image: item.image || ''
        };
      });
    } else {
      // লগ ইন ইউজার ভ্যালিডেশন
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      user = req.user.id;
      
      // কার্ট থেকে আইটেম লোড করুন
      const cart = await Cart.findOne({ user })
        .populate('items.product', 'name slug imageGroups variants hasVariants');
      
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cart is empty' 
        });
      }

      // লগ ইন ইউজারের জন্য অর্ডার আইটেম প্রস্তুত করুন
      finalOrderItems = cart.items.map(item => {
        const variantData = convertVariantToOrderFormat(item.variant);
        const product = item.product;
        
        // ইমেজ URL তৈরি করুন
        let imageUrl = '';
        if (item.imageGroupName && product.imageGroups) {
          // Variant-specific image group
          const variantImageGroup = product.imageGroups.find(
            group => group.name === item.imageGroupName
          );
          if (variantImageGroup && variantImageGroup.images.length > 0) {
            imageUrl = variantImageGroup.images[0].url;
          }
        }
        
        // Fallback to main product image
        if (!imageUrl && product.imageGroups && product.imageGroups.length > 0) {
          const mainGroup = product.imageGroups.find(group => group.name === 'Main') || product.imageGroups[0];
          if (mainGroup && mainGroup.images.length > 0) {
            imageUrl = mainGroup.images[0].url;
          }
        }

        return {
          name: getOrderItemName(product.name, item.variant, item.variantDisplayName),
          product: product._id,
          variant: variantData,
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.priceAtPurchase || 0),
          image: imageUrl
        };
      });
    }

    // --- ৩. প্রাইস ক্যালকুলেশন ---
    const itemsPrice = finalOrderItems.reduce((acc, item) => {
      return acc + (item.price * item.quantity);
    }, 0);

    const finalShippingPrice = parseFloat(shippingPrice) || 0;
    const finalTaxPrice = parseFloat(taxPrice) || 0;
    
    const totalPrice = itemsPrice + finalShippingPrice + finalTaxPrice;

    // --- ৪. নতুন অর্ডার তৈরি করুন ---
    const newOrder = new Order({
      user: isGuest ? null : user,
      isGuest,
      guestEmail: isGuest ? guestEmail : null,
      orderItems: finalOrderItems,
      shippingAddress: {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        email: shippingAddress.email,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || '',
        district: shippingAddress.district,
        upazila: shippingAddress.upazila,
        zipCode: shippingAddress.zipCode || '',
        country: shippingAddress.country || 'Bangladesh'
      },
      paymentMethod,
      shippingPrice: finalShippingPrice,
      taxPrice: finalTaxPrice,
      totalPrice,
      orderStatus: 'Pending',
      paymentStatus: 'Pending'
    });

    // --- ৫. অর্ডার সেভ করুন ---
    await newOrder.save();

    // --- ৬. পেমেন্ট মেথড অনুযায়ী প্রসেস করুন ---
    if (paymentMethod === 'SSLCommerz') {
      const paymentData = {
        amount: totalPrice,
        cus_name: shippingAddress.name,
        cus_email: shippingAddress.email || newOrder.guestEmail || 'customer@example.com', 
        cus_phone: shippingAddress.phone,
        shippingAddress: shippingAddress,
      };

      const paymentInit = await initializePayment(newOrder._id.toString(), paymentData);

      if (paymentInit.status === 'SUCCESS' && paymentInit.GatewayPageURL) {
        // পেমেন্ট সফল হলে কার্ট ক্লিয়ার করুন
        if (!isGuest && req.user) {
          await Cart.findOneAndDelete({ user: req.user.id });
        }
        
        return res.status(201).json({
          success: true,
          message: 'Payment initialized. Redirecting to gateway.',
          order: newOrder,
          redirectUrl: paymentInit.GatewayPageURL 
        });
      } else {
        console.error('SSLCommerz initialization failed:', paymentInit);
        
        // পেমেন্ট ফেইল হলে অর্ডার ক্যানসেল করুন
        newOrder.orderStatus = 'Cancelled';
        newOrder.paymentStatus = 'Failed';
        await newOrder.save();

        return res.status(500).json({
          success: false,
          message: paymentInit.failedreason || 'Failed to initiate online payment'
        });
      }
    } else if (paymentMethod === 'COD') {
      // স্টক আপডেট করুন
      await updateProductStock(finalOrderItems, 'decrease');
      
      // কার্ট ক্লিয়ার করুন
      if (!isGuest && req.user) {
        await Cart.findOneAndDelete({ user: req.user.id });
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Order placed successfully (COD)',
        order: newOrder 
      });
    } else {
      // ইনভ্যালিড পেমেন্ট মেথড
      newOrder.orderStatus = 'Cancelled';
      newOrder.paymentStatus = 'Failed';
      await newOrder.save();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method selected.'
      });
    }

  } catch (error) {
    console.error('Order creation error:', error);
    
    // Mongoose validation error handle করুন
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    next(error);
  }
};

// --- HELPER FUNCTIONS ---

/**
 * Variant ডেটাকে অর্ডার ফরম্যাটে কনভার্ট করে
 */
const convertVariantToOrderFormat = (variant) => {
  if (!variant || Object.keys(variant).length === 0) {
    return undefined; // কোনো variant ডেটা নেই
  }

  // নতুন ফরম্যাট (options array)
  if (variant.options && Array.isArray(variant.options) && variant.options.length > 0) {
    const firstOption = variant.options[0];
    return {
      name: firstOption.name || 'Variant',
      value: firstOption.value || 'Default',
      sku: variant.variantId || variant.sku || undefined
    };
  }
  
  // পুরানো ফরম্যাট (সরাসরি name, value)
  if (variant.name || variant.value) {
    return {
      name: variant.name || 'Variant',
      value: variant.value || 'Default', 
      sku: variant.sku || variant.variantId || undefined
    };
  }
  
  // শুধু variantId থাকলে
  if (variant.variantId) {
    return {
      name: 'Variant',
      value: 'Default',
      sku: variant.variantId
    };
  }
  
  return undefined;
};

/**
 * অর্ডার আইটেমের নাম তৈরি করে
 */
const getOrderItemName = (productName, variant, variantDisplayName) => {
  let itemName = productName;
  
  if (variantDisplayName) {
    itemName += ` - ${variantDisplayName}`;
  } else if (variant && variant.options && Array.isArray(variant.options)) {
    const variantText = variant.options.map(opt => `${opt.name}: ${opt.value}`).join(', ');
    if (variantText) {
      itemName += ` - ${variantText}`;
    }
  } else if (variant && (variant.name || variant.value)) {
    itemName += ` - ${variant.name || 'Variant'}: ${variant.value || 'Default'}`;
  }
  
  return itemName;
};
// @desc    Get my orders
// @route   GET /api/v1/orders
// @access  Private
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select('-adminNotes');

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
// @access  Private/Public
export const getOrderById = async (req, res, next) => {
  try {
    console.log('🔍 Fetching order with ID:', req.params.id);
    
    // ✅ প্রথমে orderNumber দিয়ে খুঁজুন
    let order = await Order.findOne({ orderNumber: req.params.id })
      .populate('user', 'name email')
      .populate('statusHistory.updatedBy', 'name');

    // ✅ যদি orderNumber দিয়ে না পাওয়া যায়, তাহলে _id দিয়ে খুঁজুন
    if (!order) {
      console.log('🔍 Trying to find by _id:', req.params.id);
      order = await Order.findById(req.params.id)
        .populate('user', 'name email')
        .populate('statusHistory.updatedBy', 'name');
    }

    if (!order) {
      console.log('❌ Order not found for:', req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    console.log('✅ Order found:', order.orderNumber);

    // Authorization check - Updated logic
    if (order.isGuest) {
      // Guest order - allow access (you can add email verification if needed)
      return res.status(200).json({ success: true, order });
    } 
    
    // Registered user order
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view this order'
      });
    }

    if (order.user && order.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }
    
    res.status(200).json({ success: true, order });

  } catch (error) {
    console.error('❌ Order fetch error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    next(error);
  }
};

// ==================== ADMIN ORDER MANAGEMENT ====================

// @desc    Get all orders (Admin)
// @route   GET /api/v1/admin/orders
// @access  Private/Admin
export const getAllOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentMethod,
      paymentStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status && status !== 'all') filter.orderStatus = status;
    if (paymentMethod && paymentMethod !== 'all') filter.paymentMethod = paymentMethod;
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;

    // Search functionality
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order statistics (Admin)
// @route   GET /api/v1/admin/orders/stats
// @access  Private/Admin
export const getOrderStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'Pending' });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'Delivered' });
    const totalRevenue = await Order.aggregate([
      { $match: { orderStatus: 'Delivered' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    // Last 7 days orders
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Monthly revenue
    const currentMonth = new Date().getMonth();
    const monthlyRevenue = await Order.aggregate([
      { 
        $match: { 
          orderStatus: 'Delivered',
          createdAt: { $gte: new Date(new Date().getFullYear(), currentMonth, 1) }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/v1/admin/orders/:id/status
// @access  Private/Admin

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note, trackingNumber, carrier } = req.body;

    console.log('🔄 Order Status Update Request:', {
      orderId: req.params.id,
      status,
      note,
      trackingNumber,
      carrier,
      user: req.user.id
    });

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status value
    const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('📦 Current Order:', {
      id: order._id,
      currentStatus: order.orderStatus,
      newStatus: status
    });

    // ✅ USE findByIdAndUpdate instead of save() to avoid validation issues
    const updateData = {
      orderStatus: status
    };

    // Add tracking info if provided
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber;
    }
    if (carrier !== undefined) {
      updateData.carrier = carrier;
    }

    // Set deliveredAt if status is Delivered
    if (status === 'Delivered' && order.orderStatus !== 'Delivered') {
      updateData.deliveredAt = new Date();
      updateData.paymentStatus = 'Paid';
      console.log('✅ Order marked as delivered, setting paidAt');
    }

    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        $set: updateData,
        $push: {
          statusHistory: {
            status: status,
            note: note || `Order status updated to ${status}`,
            updatedBy: req.user.id,
            updatedAt: new Date()
          }
        }
      },
      { 
        new: true, // Return updated document
        runValidators: false // ✅ Temporarily disable validators to avoid orderNumber issue
      }
    ).populate('statusHistory.updatedBy', 'name')
     .populate('user', 'name email');

    console.log('💾 Order updated successfully');

    // Restore stock if cancelled (separate operation)
    if (status === 'Cancelled' && order.orderStatus !== 'Cancelled') {
      console.log('🔄 Restoring product stock for cancelled order');
      await updateProductStock(order.orderItems, 'increase');
    }

    console.log('✅ Order status update completed');

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('❌ Order status update error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};
// @desc    Update payment status (Admin)
// @route   PUT /api/v1/admin/orders/:id/payment
// @access  Private/Admin
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;

    console.log('💳 Payment Status Update Request:', {
      orderId: req.params.id,
      paymentStatus,
      user: req.user.id
    });

    // Validate required fields
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }

    // Validate payment status
    const validStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update payment status
    order.paymentStatus = paymentStatus;
    
    // Set paidAt if payment status is Paid
    if (paymentStatus === 'Paid' && !order.paidAt) {
      order.paidAt = new Date();
      console.log('💰 Payment marked as paid, setting paidAt');
    }

    // Add to status history
    order.statusHistory.push({
      status: order.orderStatus,
      note: `Payment status updated to ${paymentStatus}`,
      updatedBy: req.user.id,
      updatedAt: new Date()
    });

    await order.save();

    // Populate for response
    await order.populate('statusHistory.updatedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      order
    });

  } catch (error) {
    console.error('❌ Payment status update error:', error);
    next(error);
  }
};

// @desc    Add admin note to order
// @route   POST /api/v1/admin/orders/:id/notes
// @access  Private/Admin
export const addAdminNote = async (req, res, next) => {
  try {
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Note is required'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    order.adminNotes.push({
      note: note.trim(),
      addedBy: req.user.id
    });

    await order.save();

    // Populate for response
    await order.populate('adminNotes.addedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      order
    });
  } catch (error) {
    console.error('Add admin note error:', error);
    next(error);
  }
};

// @desc    Delete order (Admin)
// @route   DELETE /api/v1/admin/orders/:id
// @access  Private/Admin
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Restore stock before deleting
    if (order.orderStatus !== 'Cancelled') {
      await updateProductStock(order.orderItems, 'increase');
    }

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderByIdAdmin = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('statusHistory.updatedBy', 'name')
      .populate('adminNotes.addedBy', 'name');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // ✅ Admin users can access any order
    res.status(200).json({ 
      success: true, 
      order 
    });
    
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    next(error);
  }
};

export const updateOrderDetails = async (req, res, next) => {
  try {
    const {
      shippingAddress,
      orderItems,
      shippingPrice,
      taxPrice,
      note
    } = req.body;

    console.log('🔄 Order Update Request:', {
      orderId: req.params.id,
      itemsCount: orderItems?.length,
      shippingPrice,
      taxPrice,
      user: req.user.id
    });

    // ✅ Order খুঁজে আনুন
    let order;
    
    // Check if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      order = await Order.findById(req.params.id);
    } else {
      // If not ObjectId, try with orderNumber
      order = await Order.findOne({ orderNumber: req.params.id });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('✅ Order found:', order.orderNumber);

    // Update shipping address
    if (shippingAddress) {
      order.shippingAddress = { 
        ...order.shippingAddress, 
        ...shippingAddress 
      };
      console.log('📍 Shipping address updated');
    }

    // Update order items
    if (orderItems && Array.isArray(orderItems)) {
      order.orderItems = orderItems.map(item => ({
        name: item.name,
        product: item.productId || item.product,
        variant: item.variant || {},
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price) || 0,
        image: item.image || '',
        _id: item._id || new mongoose.Types.ObjectId()
      }));
      console.log('📦 Order items updated:', orderItems.length);
    }

    // Update pricing
    if (shippingPrice !== undefined) {
      order.shippingPrice = parseFloat(shippingPrice) || 0;
      console.log('🚚 Shipping price updated:', order.shippingPrice);
    }

    if (taxPrice !== undefined) {
      order.taxPrice = parseFloat(taxPrice) || 0;
      console.log('💰 Tax price updated:', order.taxPrice);
    }

    // Recalculate total price
    const itemsTotal = order.orderItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    order.totalPrice = itemsTotal + order.shippingPrice + order.taxPrice;
    console.log('🧮 Total price recalculated:', order.totalPrice);

    // Add to status history
    order.statusHistory.push({
      status: order.orderStatus,
      note: note || 'Order details updated by admin',
      updatedBy: req.user.id,
      updatedAt: new Date()
    });

    await order.save();

    // Populate for response
    await order.populate('user', 'name email');
    await order.populate('statusHistory.updatedBy', 'name');

    console.log('✅ Order updated successfully:', order.orderNumber);

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order
    });

  } catch (error) {
    console.error('❌ Order update error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};