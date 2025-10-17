// controllers/orderController.js
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
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    const quantity = action === 'decrease' ? -item.quantity : item.quantity;

    if (product.hasVariants && item.variant && item.variant.sku) {
      const variantIndex = product.variants.findIndex(v => v.sku === item.variant.sku);
      if (variantIndex > -1) {
        product.variants[variantIndex].stock += quantity;
      }
    } else {
      product.stock += quantity;
    }

    await product.save({ validateBeforeSave: false });
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
      shippingPrice, // যদি ফ্রন্টএন্ড থেকে আসে
      taxPrice = 0,
      isGuest = false,
      guestEmail,
      guestItems
    } = req.body;

    // --- ১. প্রাথমিক ভ্যালিডেশন ---
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || 
        !shippingAddress.district || !shippingAddress.upazila || !shippingAddress.addressLine1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Complete shipping address is required' 
      });
    }

    let orderItems = [];
    let user = null;
    if (isGuest) {
      if (!guestEmail || !guestItems || guestItems.length === 0) {
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
    } else {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      user = req.user.id;
      const cart = await Cart.findOne({ user }).populate('items.product', 'name slug imageGroups');
      
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
        image: item.product.imageGroups?.[0]?.images?.[0]?.url || ''
      }));
    }
    const itemsPrice = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const finalShippingPrice = shippingPrice || 0; 
    
    const totalPrice = itemsPrice + finalShippingPrice + (taxPrice || 0);
    const newOrder = new Order({
      user: isGuest ? null : user,
      isGuest,
      guestEmail: isGuest ? guestEmail : null,
      orderItems,
      shippingAddress,
      paymentMethod,
      shippingPrice: finalShippingPrice,
      taxPrice: taxPrice || 0,
      totalPrice,
      orderStatus: 'Pending',
      paymentStatus: 'Pending'
    });

    await newOrder.save();
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
            newOrder.orderStatus = 'Cancelled';
            newOrder.paymentStatus = 'Failed';
            await newOrder.save();

            return res.status(500).json({
                success: false,
                message: paymentInit.failedreason || 'Failed to initiate online payment'
            });
        }
    } else if (paymentMethod === 'COD') {
        await updateProductStock(orderItems, 'decrease');
        if (!isGuest && req.user) {
            await Cart.findOneAndDelete({ user: req.user.id });
        }

        res.status(201).json({ 
            success: true, 
            message: 'Order placed successfully (COD)',
            order: newOrder 
        });
    } else {
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
    next(error);
  }
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
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('statusHistory.updatedBy', 'name');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Authorization check
    // 💡 নতুন লজিক: যদি অর্ডারটি গেস্ট অর্ডার হয় OR 
    // যদি অর্ডারের মালিক রিকোয়েস্ট করা ইউজার হন, তবে দেখতে দিন।
    
    // 1. যদি গেস্ট অর্ডার হয়, তবে অনুমতি দিন (যদি আপনি ট্র্যাকিং এর জন্য গেস্টকে উন্মুক্ত রাখতে চান)
    if (order.isGuest) {
        // এখানে আপনি আরও কঠোর ভেরিফিকেশন যোগ করতে পারেন (যেমন, ট্রানজ্যাকশন আইডি/ইমেল)
        // বর্তমানে অর্ডার লোড করার জন্য এক্সেস দিচ্ছি:
        return res.status(200).json({ success: true, order }); // ✅ Guest Order লোড হবে।
    } 
    
    // 2. যদি রেজিস্টার্ড ইউজার অর্ডার হয়
    if (!req.user || !order.user || order.user._id.toString() !== req.user.id) {
        // যদি ইউজার লগইন করা না থাকে (!req.user) বা অর্ডারের মালিক না হয়
        return res.status(403).json({
            success: false,
            message: 'Not authorized to view this order'
        });
    }
    
    // যদি রেজিস্টার্ড ইউজার হন এবং তিনিই মালিক হন
    res.status(200).json({ success: true, order });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Order not found' });
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

