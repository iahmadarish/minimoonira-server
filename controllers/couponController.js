import Coupon from "../models/Coupon.js"
// ধরে নিলাম আপনার Product মডেলটি এমনভাবে ইম্পোর্ট করা যাবে
import Product from "../models/product.model.js" 
// ধরে নিলাম আপনার Category মডেলটি এমনভাবে ইম্পোর্ট করা যাবে
import Category from "../models/Category.js" 

// 1. অ্যাডমিন: নতুন কুপন তৈরি
export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body)
    res.status(201).json({
      success: true,
      coupon,
    })
  } catch (error) {
    next(error)
  }
}

// 2. অ্যাডমিন: সমস্ত কুপন দেখা
export const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find()
    res.status(200).json({
      success: true,
      count: coupons.length,
      coupons,
    })
  } catch (error) {
    next(error)
  }
}

// 3. কাস্টমার: কুপন কোড যাচাই এবং ডিসকাউন্ট গণনা
export const applyCoupon = async (req, res, next) => {
  const { couponCode, cartItems, userId } = req.body

  if (!couponCode || !cartItems || cartItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Coupon code and cart items are required.",
    })
  }

  try {
    const coupon = await Coupon.findOne({ code: couponCode, isActive: true })

    // A. কুপন অস্তিত্ব এবং সক্রিয়তা যাচাই
    if (!coupon || coupon.isExpired) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired coupon code.",
      })
    }

    const now = new Date()
    if (now < coupon.startDate || now > coupon.expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not active during this period.",
      })
    }

    // B. ব্যবহারের সীমা যাচাই (Global Max Usage)
    const usedCount = await Coupon.findOne({ _id: coupon._id }).select('+usedCount').then(c => c ? c.usedCount : 0)

    if (coupon.maxUsage > 0 && usedCount >= coupon.maxUsage) {
      return res.status(400).json({
        success: false,
        message: "This coupon has reached its maximum usage limit.",
      })
    }
    
    // C. কাস্টমার-ভিত্তিক ব্যবহারের সীমা যাচাই (যদি আপনার কাছে Order মডেল থাকে)
    // **ধরে নিচ্ছি আপনার কাছে একটি Order মডেল আছে**
    // const customerUsageCount = await Order.countDocuments({ user: userId, coupon: coupon._id });
    // if (customerUsageCount >= coupon.usagePerCustomer) {
    //     return res.status(400).json({ success: false, message: "You have already used this coupon." });
    // }


    // D. কার্টের মূল্য এবং প্রোডাক্ট যোগ্যতা গণনা
    let subtotal = 0
    let eligibleAmount = 0
    const eligibleProducts = []
    
    // CartItems-এর স্ট্রাকচার ধরে নিলাম: [{ productId: '...', quantity: 1, price: 500, categoryId: '...' }, ...]
    
    // কার্টের মোট মূল্য গণনা
    subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)
    
    // যোগ্য (Eligible) প্রোডাক্ট এবং মূল্য নির্ধারণ 
    for (const item of cartItems) {
      // কুপন যদি নির্দিষ্ট পণ্য বা ক্যাটাগরির জন্য হয় তবেই এই চেক হবে
      if (coupon.appliesTo === "all") {
        eligibleAmount += item.price * item.quantity
        eligibleProducts.push(item)
      } else if (coupon.appliesTo === "products") {
        const isRestricted = coupon.productRestrictions.some(
          (restrictedId) => restrictedId.toString() === item.productId.toString()
        )
        if (isRestricted) {
          eligibleAmount += item.price * item.quantity
          eligibleProducts.push(item)
        }
      } else if (coupon.appliesTo === "categories") {
        const isRestricted = coupon.categoryRestrictions.some(
          (restrictedId) => restrictedId.toString() === item.categoryId.toString()
        )
        if (isRestricted) {
          eligibleAmount += item.price * item.quantity
          eligibleProducts.push(item)
        }
      }
    }


    // E. নূন্যতম অর্ডারের মূল্য যাচাই (Min Order Amount)
    if (subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order of ₹${coupon.minOrderAmount} is required to use this coupon.`,
      })
    }
    
    // F. ডিসকাউন্ট গণনা
    let discountAmount = 0
    let shippingDiscount = 0
    
    if (coupon.couponType === "percentage") {
      discountAmount = (eligibleAmount * coupon.value) / 100
      // আপনি চাইলে একটি সর্বোচ্চ ডিসকাউন্ট সীমা (Max Discount Cap) এখানে যোগ করতে পারেন
    } else if (coupon.couponType === "fixed_amount") {
      // ফিক্সড অ্যামাউন্ট ডিসকাউন্ট eligibleAmount-এর বেশি হতে পারবে না
      discountAmount = Math.min(coupon.value, eligibleAmount)
    } else if (coupon.couponType === "free_shipping") {
      // এখানে শিপিং চার্জ ডিসকাউন্ট যোগ হবে, যা আপনার শিপিং লজিকে ব্যবহার হবে
      shippingDiscount = 1 
    }
    

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully.",
      couponCode: coupon.code,
      discountAmount: discountAmount.toFixed(2), // ডিসকাউন্ট টাকা
      finalCartTotal: (subtotal - discountAmount).toFixed(2), // ডিসকাউন্ট পরবর্তী মোট মূল্য
      eligibleAmount: eligibleAmount.toFixed(2), // ডিসকাউন্ট পাওয়ার জন্য যোগ্য মূল্য
      isFreeShipping: shippingDiscount > 0, // ফ্রি শিপিং ফ্ল্যাগ
    })

  } catch (error) {
    next(error)
  }
}

// 4. অর্ডারের পরে কুপন ব্যবহার কাউন্ট আপডেট করা (গুরুত্বপূর্ণ)
// আপনার অর্ডার কন্ট্রোলারের 'createOrder' ফাংশনে এটি ব্যবহার করুন
export const incrementCouponUsage = async (couponCode) => {
    try {
        await Coupon.updateOne(
            { code: couponCode },
            { $inc: { usedCount: 1 } }
        );
        // কাস্টমার আইডি আপনার Order মডেলে সংরক্ষণ করতে ভুলবেন না।
    } catch (error) {
        console.error("Error updating coupon usage:", error.message);
        // এরর হলেও অর্ডার তৈরি বন্ধ করা উচিত নয়।
    }
};

// 5. অ্যাডমিন: কুপন আপডেট বা ডিলিট করার অন্যান্য ফাংশন এখানে যোগ করুন...