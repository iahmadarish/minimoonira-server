import Cart from '../models/cart.model.js';
import Promotion from '../models/promotion.model.js';

export const checkAbandonedCarts = async () => {
  try {
    // অটোমেটিকভাবে অ্যাবানডন্ড কার্ট চেক করার জন্য
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const abandonedCarts = await Cart.find({
      'items.0': { $exists: true },
      updatedAt: { $lte: twoHoursAgo }
    }).populate('user');
    
    // এখানে অটোমেটিক প্রমোশন ক্রিয়েট করার লজিক যোগ করুন
    console.log(`Found ${abandonedCarts.length} abandoned carts`);
    
  } catch (error) {
    console.error('Abandoned cart job error:', error);
  }
};