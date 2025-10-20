import Order from '../models/order.model.js';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../utils/asyncHandler.js'; // Assuming you have this utility

// @desc    Get all dashboard analytics
// @route   GET /api/v1/admin/analytics
// @access  Private/Admin
export const getAdminAnalytics = asyncHandler(async (req, res) => {
    // 1. Order Stats (Similar to what you already fetch)
    const orderStats = await Order.aggregate([
        { 
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                pendingOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "Pending"] }, 1, 0] } },
                deliveredOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "Delivered"] }, 1, 0] } },
                totalRevenue: { $sum: { $cond: [{ $eq: ["$orderStatus", "Delivered"] }, "$totalPrice", 0] } },
            }
        },
        { $project: { _id: 0 } }
    ]);
    const stats = orderStats[0] || {};
    
    // 2. User Stats
    const userStats = await User.aggregate([
        { $group: { _id: null, totalUsers: { $sum: 1 } } },
        { $project: { _id: 0 } }
    ]);
    stats.totalUsers = userStats[0]?.totalUsers || 0;

    // 3. Product Stats
    const productStats = await Product.aggregate([
        { $group: { _id: null, totalProducts: { $sum: 1 } } },
        { $project: { _id: 0 } }
    ]);
    stats.totalProducts = productStats[0]?.totalProducts || 0;

    // 4. Category Sales Analysis (Top 3 categories by total sales quantity)
    const categorySales = await Order.aggregate([
        // Filter only delivered orders for accurate sales data
        { $match: { orderStatus: "Delivered" } }, 
        // Deconstruct orderItems
        { $unwind: "$orderItems" },
        // Look up product to get category
        {
            $lookup: {
                from: "products", // The name of your product collection
                localField: "orderItems.product",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        // Unwind the productInfo
        { $unwind: "$productInfo" },
        // Group by category and sum quantity
        {
            $group: {
                _id: "$productInfo.category",
                totalQuantitySold: { $sum: "$orderItems.quantity" },
                totalSalesValue: { $sum: { $multiply: ["$orderItems.quantity", "$orderItems.price"] } }
            }
        },
        // Look up category name
        {
            $lookup: {
                from: "categories", // The name of your category collection
                localField: "_id",
                foreignField: "_id",
                as: "categoryDetails"
            }
        },
        // Final project/sort
        { $unwind: "$categoryDetails" },
        { $sort: { totalQuantitySold: -1 } },
        { $limit: 3 },
        {
            $project: {
                _id: 0,
                categoryName: "$categoryDetails.name",
                totalQuantitySold: 1,
                totalSalesValue: 1
            }
        }
    ]);
    stats.topCategories = categorySales;

    res.status(200).json({
        success: true,
        stats
    });
});