import Cart from '../models/cart.model.js';
import { districtsData, getDistrictsList, getUpazilasByDistrict } from '../data/districts.js';
import Coupon from '../models/Coupon.js';
import mongoose from 'mongoose';
import Product from '../models/product.model.js';

const calculateDiscount = (couponCode, itemsSubtotal, userId) => {
    if (!couponCode || couponCode !== '233DFG') { // আপনার কুপন কোড
        return { discountAmount: 0, isFreeShipping: false, message: 'Invalid coupon' };
    }

    // আপনার দেওয়া কুপন ডেটা থেকে (value: 30, couponType: "percentage", minOrderAmount: 510)
    if (itemsSubtotal < 510) {
        return { discountAmount: 0, isFreeShipping: false, message: 'Minimum order amount not met' };
    }
    
    // 30% ডিসকাউন্ট
    const calculatedDiscount = itemsSubtotal * 0.30; 
    
    // একটি রিয়েল কুপন লজিক এখানে ডাটাবেস থেকে কুপন লোড করে, ভ্যালিডেশন করে ডিসকাউন্ট গণনা করবে।
    // আপনার অর্ডারের সাবটোটাল: 52200 (10 * 5220)
    
    return { 
        discountAmount: calculatedDiscount, // 52200 * 0.30 = 15660
        isFreeShipping: false, 
        message: 'Coupon applied successfully' 
    };
};

const calculateShippingPrice = (shippingZone, orderAmount) => {
  if (orderAmount >= 8000) {
    return 0;
  }
  
  if (orderAmount >= 4000) {
    return 30;
  }

  switch (shippingZone) {
    case 'dhaka_city': 

      return 50;
    case 'dhaka_outside': 
      return 70;
    case 'other_district': 
      return 130;
    default:
      return 130;
  }
};

const applyCouponLogic = async (couponCode, itemsSubtotal, itemsToProcess, userId) => {
    let discountAmount = 0;
    let isFreeShipping = false;
    let validationMessage = '';

    if (!couponCode) {
        return { discountAmount, isFreeShipping, validationMessage: 'No coupon code provided' };
    }

    // ১. কুপন ডেটাবেস থেকে খুঁজুন
    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });

    if (!coupon) {
        return { discountAmount, isFreeShipping, validationMessage: 'Invalid coupon code' };
    }

    // ২. ভ্যালিডেশন চেক
    const now = new Date();
    if (now < coupon.startDate || now > coupon.expiryDate) {
        return { discountAmount, isFreeShipping, validationMessage: 'Coupon is expired or not yet active' };
    }
    
    if (coupon.usedCount >= coupon.maxUsage) {
        return { discountAmount, isFreeShipping, validationMessage: 'Coupon usage limit reached' };
    }

    // ৩. Min Order Amount চেক
    if (itemsSubtotal < coupon.minOrderAmount) {
        return { discountAmount, isFreeShipping, validationMessage: `Minimum order amount of ${coupon.minOrderAmount} is required` };
    }

    // ৪. ডিসকাউন্ট গণনা
    if (coupon.couponType === 'percentage') {
        discountAmount = itemsSubtotal * (coupon.value / 100);
        
        // যদি কুপনে Max Discount Limit থাকে (আপনার মডেলে না থাকলেও সেফটির জন্য)
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
        }

    } else if (coupon.couponType === 'fixed') {
        discountAmount = coupon.value;
    } else if (coupon.couponType === 'free_shipping') {
        isFreeShipping = true;
        discountAmount = 0;
    }
    
    // ৫. ডিসকাউন্ট ভ্যালিডেশন
    if (discountAmount > itemsSubtotal) {
        discountAmount = itemsSubtotal;
    }

    return { 
        discountAmount: parseFloat(discountAmount.toFixed(2)), 
        isFreeShipping,
        validationMessage: 'Coupon applied successfully'
    };
};



export const getDistricts = async (req, res) => {
  try {
    const districts = getDistrictsList();
    res.status(200).json({ success: true, districts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch districts' });
  }
};


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


export const calculateCheckoutData = async (req, res, next) => {
  try {
    const { isGuest, shippingAddress, couponCode, guestItems } = req.body;
    const userId = req.user?.id; // লগইন করা ইউজার আইডি

    let itemsToProcess = [];
    if (isGuest) {
      // ... (Guest cart logic unchanged)
      if (!guestItems || guestItems.length === 0) {
        return res.status(400).json({ success: false, message: 'No items provided for calculation' });
      }
      // Ensure product ID is ObjectId for consistency if needed later, but using as-is for subtotal
      itemsToProcess = guestItems; 
    } else {
      // ... (User cart logic unchanged)
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const cart = await Cart.findOne({ user: req.user.id })
            .populate('items.product'); // Populate product if priceAtPurchase is missing
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
      }
      itemsToProcess = cart.items;
    }

    // ১. আইটেম সাবটোটাল গণনা
    const itemsSubtotal = itemsToProcess.reduce(
      (acc, item) => acc + (parseFloat(item.priceAtPurchase || item.price || 0) * (item.quantity || 1)),
      0
    );

    let discountAmount = 0;
    let isFreeShippingByCoupon = false;
    let couponMessage = '';

    // ২. কুপন ডিসকাউন্ট গণনা (NEW L O G I C)
    if (couponCode) {
        const couponResult = await applyCouponLogic(
            couponCode.toUpperCase(), // কুপন কোড কে uppercase করে পাঠানো হলো
            itemsSubtotal, 
            itemsToProcess, 
            userId
        );
        
        discountAmount = couponResult.discountAmount;
        isFreeShippingByCoupon = couponResult.isFreeShipping;
        couponMessage = couponResult.validationMessage;
    }


    // ৩. শিপিং অ্যাড্রেস ভ্যালিডেশন
    if (!shippingAddress || !shippingAddress.district || !shippingAddress.upazila) {
      return res.status(200).json({
        success: true,
        data: {
          itemsSubtotal: parseFloat(itemsSubtotal.toFixed(2)),
          discountAmount,
          shippingPrice: 0,
          taxPrice: 0,
          finalTotal: parseFloat((itemsSubtotal - discountAmount).toFixed(2)),
          message: 'Please provide complete shipping address'
        }
      });
    }

    // ৪. ডিস্ট্রিক্ট/উপজেলা খুঁজে বের করা
    const district = districtsData.find(d => d.name === shippingAddress.district);
    if (!district) {
      return res.status(400).json({ success: false, message: 'Invalid district' });
    }

    const upazila = district.upazilas.find(u => u.name === shippingAddress.upazila);
    if (!upazila) {
      return res.status(400).json({ success: false, message: 'Invalid upazila' });
    }
    
    // ৫. শিপিং প্রাইস গণনা
    // ডিসকাউন্টের পর সাবটোটালের উপর ভিত্তি করে শিপিং প্রাইস গণনা
    let shippingPrice = calculateShippingPrice(upazila.shippingZone, itemsSubtotal - discountAmount);
    
    // কুপনের কারণে ফ্রি শিপিং হলে
    if (isFreeShippingByCoupon) {
        shippingPrice = 0;
    }


    // ৬. ট্যাক্স এবং ফাইনাল টোটাল গণনা
    const taxRate = parseFloat(process.env.VAT_RATE) || 0;
    const taxPrice = (itemsSubtotal - discountAmount) * taxRate;
    const finalTotal = itemsSubtotal - discountAmount + shippingPrice + taxPrice;

    // ৭. ফাইনাল রেসপন্স
    res.status(200).json({
      success: true,
      data: {
        itemsSubtotal: parseFloat(itemsSubtotal.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)), // ✅ CORRECT DISCOUNT AMOUNT
        shippingPrice: parseFloat(shippingPrice.toFixed(2)),
        taxPrice: parseFloat(taxPrice.toFixed(2)),
        finalTotal: parseFloat(finalTotal.toFixed(2)),
        estimatedDelivery: shippingPrice === 0 ? '1-2 days' : upazila.shippingZone === 'dhaka_city' ? '1-2 days' : '3-5 days',
        shippingZone: upazila.shippingZone,
        couponMessage: couponMessage // কুপন ভ্যালিডেশন মেসেজ ফ্রন্টএন্ডে দেখানোর জন্য
      }
    });

  } catch (error) {
    console.error('Checkout calculation error:', error);
    next(error);
  }
};