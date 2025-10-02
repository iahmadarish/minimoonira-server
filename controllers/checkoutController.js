// controllers/checkoutController.js

import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';

// ** ডেলিভারি চার্জ ক্যালকুলেশন লজিক (আপনার ব্যবসার নিয়ম অনুযায়ী পরিবর্তন করুন) **
const calculateShippingPrice = (district, upazila) => {
    // এটি ডামি লজিক। আপনি ডাটাবেস থেকে চার্জ লোড করতে পারেন।
    if (district === 'Dhaka') {
        return 60; // ঢাকা মেট্রোপলিটন
    } else if (['Chattogram', 'Sylhet', 'Rajshahi'].includes(district)) {
        return 120; // প্রধান শহরগুলো
    } else {
        return 150; // অন্যান্য জেলা/গ্রামাঞ্চল
    }
};

// @desc    Calculate total price, shipping, and tax before placing order
// @route   POST /api/v1/checkout/calculate
// @access  Public (Guest) / Private (Registered)
export const calculateCheckoutData = async (req, res, next) => {
    try {
        const { isGuest, shippingAddress, couponCode, guestItems } = req.body;
        
        let itemsToProcess = [];
        
        // 1. কার্টের পণ্য লোড করা
        if (isGuest) {
            // Guest: Client-এর পাঠানো items এর ভিত্তিতে হিসেব করুন
            if (!guestItems || guestItems.length === 0) {
                 return res.status(400).json({ success: false, message: 'No items provided for calculation' });
            }
            // ⚠️ SECURITY NOTE: এখানে প্রতিটি পণ্যের বর্তমান মূল্য ও স্টক ভেরিফাই করুন 
            // যেন ক্লায়েন্ট নিজের ইচ্ছেমতো দাম বা স্টক না পাঠাতে পারে।
            itemsToProcess = guestItems; 
            
        } else {
            // Registered: Database থেকে Cart লোড করুন
            if (!req.user) {
                 return res.status(401).json({ success: false, message: 'Authentication required' });
            }
            const cart = await Cart.findOne({ user: req.user.id });
            if (!cart || cart.items.length === 0) {
                 return res.status(400).json({ success: false, message: 'Cart is empty' });
            }
            itemsToProcess = cart.items;
        }

        // 2. Subtotal গণনা
        const itemsSubtotal = itemsToProcess.reduce(
            (acc, item) => acc + item.priceAtPurchase * item.quantity, 
            0
        );

        // 3. কুপন/ডিসকাউন্ট প্রয়োগ (আপনি কুপন লজিক এখানে যুক্ত করতে পারেন)
        let discountAmount = 0;
        // if (couponCode) { discountAmount = calculateDiscount(couponCode, itemsSubtotal); }

        // 4. শিপিং চার্জ গণনা (জেলা/উপজেলা অনুযায়ী)
        if (!shippingAddress || !shippingAddress.district || !shippingAddress.upazilaOrThana) {
             // যদি লোকেশন না পাঠানো হয়, তবে শুধুমাত্র সাবটোটাল পাঠান
             return res.status(200).json({ 
                 success: true, 
                 data: { itemsSubtotal, discountAmount, shippingPrice: 0, taxPrice: 0, finalTotal: itemsSubtotal } 
             });
        }
        
        const shippingPrice = calculateShippingPrice(
            shippingAddress.district, 
            shippingAddress.upazilaOrThana
        );
        
        // 5. ট্যাক্স গণনা (যদি VAT/Tax থাকে)
        const taxRate = process.env.VAT_RATE || 0; // .env থেকে ট্যাক্স রেট নিন
        const taxPrice = (itemsSubtotal - discountAmount) * taxRate;

        // 6. চূড়ান্ত মূল্য
        const finalTotal = itemsSubtotal - discountAmount + shippingPrice + taxPrice;

        res.status(200).json({
            success: true,
            data: {
                itemsSubtotal,
                discountAmount,
                shippingPrice,
                taxPrice,
                finalTotal,
                estimatedDelivery: '3-5 days', // ডেলিভারি সময়
            },
        });

    } catch (error) {
        next(error);
    }
};