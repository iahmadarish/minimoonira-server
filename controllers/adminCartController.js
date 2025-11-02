import Cart from '../models/cart.model.js';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import Promotion from '../models/promotion.model.js';
import Campaign from '../models/campaign.model.js';
import { sendPromotionEmail } from '../utils/emailService.js';

// সব কার্ট ডেটা ফেচ করা
export const getAllCarts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    const query = {};
    
    // সার্চ ফাংশনালিটি
    if (search) {
      query.$or = [
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'items.product.name': { $regex: search, $options: 'i' } }
      ];
    }

    const carts = await Cart.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price imageGroups stockStatus')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Calculate abandoned carts (not updated in last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const cartsWithStatus = carts.map(cart => ({
      ...cart.toObject(),
      isAbandoned: cart.updatedAt < twoHoursAgo
    }));

    const total = await Cart.countDocuments(query);

    res.json({
      success: true,
      carts: cartsWithStatus,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    next(error);
  }
};

// কার্ট স্ট্যাটিস্টিক্স
export const getCartStats = async (req, res, next) => {
  try {
    const totalCarts = await Cart.countDocuments();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const abandonedCarts = await Cart.countDocuments({
      updatedAt: { $lt: twoHoursAgo }
    });

    // Get unique users with carts
    const uniqueUsers = await Cart.distinct('user');

    // Get popular products in carts
    const popularProducts = await Cart.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          price: '$product.price',
          image: { $arrayElemAt: ['$product.imageGroups.0.images.0', 0] },
          count: 1,
          totalQuantity: 1
        }
      }
    ]);

    // Total cart value
    const totalCartValue = await Cart.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalPrice' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalCarts,
        activeCarts: totalCarts - abandonedCarts,
        abandonedCarts,
        totalUsers: uniqueUsers.length,
        popularProducts,
        totalCartValue: totalCartValue[0]?.totalValue || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// অ্যাবানডন্ড কার্টস
export const getAbandonedCarts = async (req, res, next) => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const abandonedCarts = await Cart.find({
      updatedAt: { $lt: twoHoursAgo },
      'items.0': { $exists: true } // কার্টে আইটেম আছে
    })
    .populate('user', 'name email')
    .populate('items.product', 'name price imageGroups')
    .sort({ updatedAt: -1 });

    res.json({
      success: true,
      abandonedCarts,
      count: abandonedCarts.length
    });
  } catch (error) {
    next(error);
  }
};

// controllers/adminCartController.js - createCampaign function
export const createCampaign = async (req, res, next) => {
  try {
    console.log('📨 Campaign Creation Request:', req.body);

    const {
      name,
      description,
      discountType,
      discountValue,
      durationHours,
      minimumCartValue,
      targetType, // frontend থেকে আসছে: 'abandoned_cart', 'all_users'
      targetUsers
    } = req.body;

    // 🔥 Map frontend targetType to backend targetUsers enum values
    let targetUsersValue;
    if (targetType === 'abandoned_cart') {
      targetUsersValue = 'abandoned_cart_users';
    } else if (targetType === 'all_users') {
      targetUsersValue = 'all';
    } else if (targetType === 'specific_users') {
      targetUsersValue = 'specific_users';
    } else {
      targetUsersValue = 'abandoned_cart_users'; // default
    }

    // Validation check
    if (!name || !discountValue) {
      return res.status(400).json({
        success: false,
        message: 'Name and discount value are required'
      });
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot exceed 100%'
      });
    }

    // প্রমোশন তৈরি করুন - 🔥 সঠিক enum value ব্যবহার করুন
    const promotion = await Promotion.create({
      name,
      description: description || '',
      type: 'abandoned_cart',
      targetUsers: targetUsersValue, // 🔥 mapped value ব্যবহার করুন
      discountType,
      discountValue: Number(discountValue),
      minimumCartValue: minimumCartValue ? Number(minimumCartValue) : undefined,
      applicableProducts: targetType === 'specific_products' ? targetUsers : undefined,
      startDate: new Date(),
      endDate: new Date(Date.now() + (durationHours || 24) * 60 * 60 * 1000),
      isActive: true
    });

    console.log('✅ Promotion created with targetUsers:', targetUsersValue);

    let targetCarts = [];
    let message = '';

    // 🔥 টার্গেট টাইপ অনুযায়ী কার্ট সিলেক্ট করুন - frontend values ব্যবহার করুন
    if (targetType === 'abandoned_cart') {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      targetCarts = await Cart.find({
        updatedAt: { $lt: twoHoursAgo },
        'items.0': { $exists: true }
      }).populate('user');
      message = `Campaign created for ${targetCarts.length} abandoned cart users`;
    } 
    else if (targetType === 'specific_users' && targetUsers && targetUsers.length > 0) {
      targetCarts = await Cart.find({
        user: { $in: targetUsers },
        'items.0': { $exists: true }
      }).populate('user');
      message = `Campaign created for ${targetCarts.length} specific users`;
    }
    else if (targetType === 'all_users') {
      targetCarts = await Cart.find({
        'items.0': { $exists: true }
      }).populate('user');
      message = `Campaign created for all ${targetCarts.length} users with carts`;
    } else {
      // Default to abandoned carts
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      targetCarts = await Cart.find({
        updatedAt: { $lt: twoHoursAgo },
        'items.0': { $exists: true }
      }).populate('user');
      message = `Campaign created for ${targetCarts.length} abandoned cart users`;
    }

    console.log(`🎯 Found ${targetCarts.length} target carts`);

    // প্রতিটি টার্গেট ইউজারের জন্য ক্যাম্পেইন তৈরি করুন
    let campaignsCreated = 0;
    for (const cart of targetCarts) {
      try {
        // Check if user exists and has email
        if (!cart.user || !cart.user.email) {
          console.log('⚠️ Skipping cart - no user or email found');
          continue;
        }

        const campaign = await Campaign.create({
          user: cart.user._id,
          promotion: promotion._id,
          cartItems: cart.items,
          expiresAt: new Date(Date.now() + (durationHours || 24) * 60 * 60 * 1000)
        });

        // ইমেইল নোটিফিকেশন পাঠান
        try {
          await sendPromotionEmail({
            to: cart.user.email,
            name: cart.user.name || 'Customer',
            promotionName: name,
            discountValue: discountValue,
            discountType: discountType,
            expiryHours: durationHours || 24,
            campaignId: campaign._id
          });
          console.log(`📧 Email sent to: ${cart.user.email}`);
        } catch (emailError) {
          console.error(`❌ Email failed for ${cart.user.email}:`, emailError);
        }

        campaignsCreated++;
      } catch (error) {
        console.error(`❌ Error creating campaign for user ${cart.user?.email}:`, error);
      }
    }

    // প্রমোশন আপডেট করুন
    await Promotion.findByIdAndUpdate(promotion._id, {
      currentUsage: campaignsCreated
    });

    console.log(`✅ Campaign creation completed: ${campaignsCreated} campaigns created`);

    res.json({
      success: true,
      message: `${message}. ${campaignsCreated} campaigns created and notifications sent.`,
      promotion,
      campaignsCreated
    });

  } catch (error) {
    console.error('❌ Campaign Creation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating campaign: ' + error.message
    });
  }
};


export const sendBulkPromotions = async (req, res, next) => {
  try {
    const { userIds, promotionData } = req.body;

    const users = await User.find({ _id: { $in: userIds } });
    
    let sentCount = 0;
    for (const user of users) {
      try {
        await sendPromotionEmail({
          to: user.email,
          name: user.name,
          ...promotionData
        });
        sentCount++;
      } catch (error) {
        console.error(`Error sending email to ${user.email}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Promotions sent to ${sentCount} users successfully`
    });
  } catch (error) {
    next(error);
  }
};