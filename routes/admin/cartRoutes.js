import express from 'express';
import { protect, adminOnly } from '../../../middlewares/authMiddleware.js';
import Cart from '../../../models/cart.model.js';
import Product from '../../../models/product.model.js';

const router = express.Router();

// Get all carts with user and product details
router.get('/carts', protect, adminOnly, async (req, res) => {
  try {
    const carts = await Cart.find()
      .populate('user', 'name email')
      .populate('items.product', 'name price imageGroups')
      .sort({ updatedAt: -1 });

    // Calculate abandoned carts (not updated in last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const cartsWithStatus = carts.map(cart => ({
      ...cart.toObject(),
      isAbandoned: cart.updatedAt < twoHoursAgo
    }));

    res.json({
      success: true,
      carts: cartsWithStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching carts'
    });
  }
});

// Get cart statistics
router.get('/cart-stats', protect, adminOnly, async (req, res) => {
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
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
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
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      totalCarts,
      activeCarts: totalCarts - abandonedCarts,
      abandonedCarts,
      totalUsers: uniqueUsers.length,
      popularProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cart statistics'
    });
  }
});

// Create campaign
router.post('/campaigns', protect, adminOnly, async (req, res) => {
  try {
    const {
      name,
      description,
      discountType,
      discountValue,
      durationHours,
      minimumCartValue,
      targetType,
      targetUsers
    } = req.body;

    // Here you would integrate with your promotion system
    // This is a simplified version

    res.json({
      success: true,
      message: 'Campaign created successfully',
      campaign: {
        name,
        description,
        discountType,
        discountValue,
        durationHours,
        targetType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating campaign'
    });
  }
});

export default router;