import Cart from '../models/cart.model.js';
import { districtsData, getDistrictsList, getUpazilasByDistrict } from '../data/districts.js';

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

    let itemsToProcess = [];
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

    const itemsSubtotal = itemsToProcess.reduce(
      (acc, item) => acc + (item.priceAtPurchase || item.price) * item.quantity,
      0
    );

    let discountAmount = 0;
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

    const district = districtsData.find(d => d.name === shippingAddress.district);
    if (!district) {
      return res.status(400).json({ success: false, message: 'Invalid district' });
    }

    const upazila = district.upazilas.find(u => u.name === shippingAddress.upazila);
    if (!upazila) {
      return res.status(400).json({ success: false, message: 'Invalid upazila' });
    }
    const shippingPrice = calculateShippingPrice(upazila.shippingZone, itemsSubtotal);
    const taxRate = parseFloat(process.env.VAT_RATE) || 0;
    const taxPrice = (itemsSubtotal - discountAmount) * taxRate;
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