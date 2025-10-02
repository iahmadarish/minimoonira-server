// controllers/paymentController.js

import Order from '../models/order.model.js';
// ⚠️ আপনার SSL Commerz এর validation logic এখানে যুক্ত করতে হবে

// @desc    Handle successful payment callback
// @route   POST /api/v1/payment/success
// @access  Public (Called by SSL Commerz)
export const handleSuccess = async (req, res) => {
  const { tran_id, status } = req.body;
  
  // 1. Transaction ID দ্বারা Order খুঁজে বের করা
  const order = await Order.findById(tran_id);

  if (order && status === 'VALID') {
    // 2. অর্ডার আপডেট করা
    order.orderStatus = 'Processing';
    order.paidAt = Date.now();
    order.paymentResult = {
        id: tran_id,
        status: status,
        method: 'SSLCommerz',
        // ... আরও তথ্য সেভ করুন
    };
    await order.save();

await updateProductStock(order.orderItems);

    // 3. ক্লায়েন্টকে রিডিরেক্ট করা (যেমন: আপনার ফ্রন্টএন্ডে Order Success page)
    return res.redirect(`${process.env.CLIENT_URL}/order/success?orderId=${tran_id}`);

  } else {
    // Failure handling
    return res.redirect(`${process.env.CLIENT_URL}/order/fail?orderId=${tran_id}`);
  }
};

// @desc    Handle failed/cancelled payment
// @route   POST /api/v1/payment/fail, /api/v1/payment/cancel
// @access  Public (Called by SSL Commerz)
export const handleFailure = async (req, res) => {
    const { tran_id } = req.body;
    
    // শুধু স্ট্যাটাস আপডেট করতে পারেন (ঐচ্ছিক)
    // const order = await Order.findById(tran_id);
    // if (order) {
    //     order.orderStatus = 'Failed';
    //     await order.save();
    // }
    
    return res.redirect(`${process.env.CLIENT_URL}/order/fail?orderId=${tran_id}`);
};

// @desc    Handle IPN (Instant Payment Notification)
// @route   POST /api/v1/payment/ipn
// @access  Public (Called by SSL Commerz)
export const handleIPN = async (req, res) => {
    // IPN হল SSL Commerz থেকে আসা ব্যাকএন্ড টু ব্যাকএন্ড নোটিফিকেশন। 
    // এটি ফাইনাল স্ট্যাটাস নিশ্চিত করার জন্য ব্যবহৃত হয়।
    
    // ⚠️ এখানে SSL Commerz এর API ব্যবহার করে Validation যাচাই করতে হবে
    const { tran_id, status, val_id } = req.body; 

    if (status === 'VALID') {
        // আপনার Order খুঁজে বের করে, orderStatus 'Processing' করে দিন
        // Stock management (Stock কমানো) এই IPN এ করা সবচেয়ে নিরাপদ
        // ... validation logic ...
        
        res.status(200).send('IPN Handled');
    } else {
        res.status(200).send('IPN Status not VALID');
    }
};