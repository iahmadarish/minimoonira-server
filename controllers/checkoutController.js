// controllers/checkoutController.js

import Cart from '../models/cart.model.js';
import { districtsData, getDistrictsList, getUpazilasByDistrict } from '../data/districts.js';

// ✅ Shipping চার্জ ক্যালকুলেশন (Order Amount অনুযায়ী)
const calculateShippingPrice = (shippingZone, orderAmount) => {
  // 8000+ টাকা - ফ্রি শিপিং
  if (orderAmount >= 8000) {
    return 0;
  }
  
  // 4000+ টাকা - সব জেলায় 30 টাকা
  if (orderAmount >= 4000) {
    return 30;
  }

  // নরমাল চার্জ (4000 টাকার নিচে)
  switch (shippingZone) {
    case 'dhaka_city': // ঢাকা সিটি কর্পোরেশনের মধ্যে
      return 50;
    case 'dhaka_outside': // ঢাকা জেলার বাইরে কিন্তু আশেপাশে
      return 70;
    case 'other_district': // অন্যান্য জেলা
      return 130;
    default:
      return 130; // ডিফল্ট চার্জ
  }
};

// ✅ জেলা লিস্ট পাওয়ার API
// @route   GET /api/v1/checkout/districts
// @access  Public
export const getDistricts = async (req, res) => {
  try {
    const districts = getDistrictsList();
    res.status(200).json({ success: true, districts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch districts' });
  }
};

// ✅ উপজেলা লিস্ট পাওয়ার API
// @route   GET /api/v1/checkout/upazilas/:district
// @access  Public
export const getUpazilas = async (req, res) => {
  try {
    const { district } = req.params;
    const upazilas = getUpazilasByDistrict(district);
    
    if (!upazilas || upazilas.length === 0) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }
    
    res.status(200).json({ success: true, upazilas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch upazilas' });
  }
};

// ✅ চেকআউট ডেটা ক্যালকুলেট করা (Shipping সহ)
// @route   POST /api/v1/checkout/calculate
// @access  Public (Guest) / Private (Registered)
export const calculateCheckoutData = async (req, res, next) => {
  try {
    const { isGuest, shippingAddress, couponCode, guestItems } = req.body;

    let itemsToProcess = [];
    
    // ✅ Guest vs Registered User
    if (isGuest) {
      if (!guestItems || guestItems.length === 0) {
        return res.status(400).json({ success: false, message: 'No items provided for calculation' });
      }
      itemsToProcess = guestItems;
    } else {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const cart = await Cart.findOne({ user: req.user.id });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
      }
      itemsToProcess = cart.items;
    }

    // ✅ আইটেম সাবটোটাল ক্যালকুলেট করা
    const itemsSubtotal = itemsToProcess.reduce(
      (acc, item) => acc + (item.priceAtPurchase || item.price) * item.quantity,
      0
    );

    let discountAmount = 0;
    // TODO: Coupon Code Logic এখানে যুক্ত করুন

    // ✅ Shipping Address চেক করা
    if (!shippingAddress || !shippingAddress.district || !shippingAddress.upazila) {
      return res.status(200).json({
        success: true,
        data: {
          itemsSubtotal,
          discountAmount,
          shippingPrice: 0,
          taxPrice: 0,
          finalTotal: itemsSubtotal,
          message: 'Please provide complete shipping address'
        }
      });
    }

    // ✅ Upazila খুঁজে শিপিং জোন বের করা
    const district = districtsData.find(d => d.name === shippingAddress.district);
    if (!district) {
      return res.status(400).json({ success: false, message: 'Invalid district' });
    }

    const upazila = district.upazilas.find(u => u.name === shippingAddress.upazila);
    if (!upazila) {
      return res.status(400).json({ success: false, message: 'Invalid upazila' });
    }

    // ✅ Shipping চার্জ ক্যালকুলেট করা
    const shippingPrice = calculateShippingPrice(upazila.shippingZone, itemsSubtotal);

    // ✅ ট্যাক্স ক্যালকুলেট করা (যদি প্রয়োজন হয়)
    const taxRate = parseFloat(process.env.VAT_RATE) || 0;
    const taxPrice = (itemsSubtotal - discountAmount) * taxRate;

    // ✅ ফাইনাল টোটাল
    const finalTotal = itemsSubtotal - discountAmount + shippingPrice + taxPrice;

    res.status(200).json({
      success: true,
      data: {
        itemsSubtotal,
        discountAmount,
        shippingPrice,
        taxPrice,
        finalTotal,
        estimatedDelivery: shippingPrice === 0 ? '1-2 days' : upazila.shippingZone === 'dhaka_city' ? '1-2 days' : '3-5 days',
        shippingZone: upazila.shippingZone
      }
    });

  } catch (error) {
    console.error('Checkout calculation error:', error);
    next(error);
  }
};