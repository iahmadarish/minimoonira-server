// controllers/paymentController.js

import Order from '../models/order.model.js';
// ✅ SSL Commerz এর ভ্যালিডেশন লজিক ইম্পোর্ট করা হলো
import { verifyPayment } from '../config/sslcommerz.js';
// ✅ Stock Update লজিক ইম্পোর্ট করা হলো (যা orderController.js থেকে export করা হয়েছে)
import { updateProductStock } from './orderController.js'; 

// @desc    Handle successful payment callback
// @route   POST /api/v1/payment/success
// @access  Public (Called by SSL Commerz, redirecting from Gateway)
export const handleSuccess = async (req, res) => {
  // SSL Commerz সাধারণত POST রিকোয়েস্টের মাধ্যমে ডেটা পাঠায়
  const { tran_id, status, val_id, amount, currency } = req.body;
  
  // 1. Transaction ID দ্বারা Order খুঁজে বের করা
  const order = await Order.findById(tran_id);
  
  if (!order) {
    console.error(`Success Handler: Order not found for tran_id: ${tran_id}`);
    // ব্যর্থতার পাতায় ক্লায়েন্টকে রিডিরেক্ট করা হলো
    return res.redirect(`${process.env.CLIENT_URL}/order/fail?orderId=${tran_id}&message=OrderNotFound`);
  }

  // ⚠️ যদি অর্ডার ইতোমধ্যে 'Processing' বা 'Confirmed' থাকে (যেমন: IPN আগে এসে গেলে)
  if (order.orderStatus === 'Processing' || order.orderStatus === 'Confirmed') {
    return res.redirect(`${process.env.CLIENT_URL}/order/success?orderId=${tran_id}`);
  }

  // 2. SSL Commerz থেকে প্রাপ্ত স্ট্যাটাস এবং নিজস্ব ভ্যালিডেশন
  // এই ভ্যালিডেশনটি Client-to-Server কলব্যাকে অতিরিক্ত নিরাপত্তার জন্য ব্যবহার করা হয়
  if (status === 'VALID' && val_id) {
    try {
        // সার্ভার-টু-সার্ভার ভেরিফিকেশন করা হলো
        const verificationResult = await verifyPayment(val_id, tran_id, order.totalPrice);
        
        if (verificationResult.isValid) {
            // 3. অর্ডার আপডেট করা
            order.orderStatus = 'Processing';
            order.paymentStatus = 'Paid';
            order.paidAt = Date.now();
            order.paymentResult = {
                id: tran_id,
                status: verificationResult.data.status,
                method: 'SSLCommerz',
                update_time: new Date().toISOString(),
                // ... অন্যান্য গুরুত্বপূর্ণ ডেটা সেভ করুন
            };
            await order.save();

            // ⚠️ নোট: IPN-এ স্টক আপডেট করা বেশি নিরাপদ। 
            // যদি IPN কোনো কারণে ব্যর্থ হয়, তবে এখানেও স্টক আপডেট করা যেতে পারে। 
            // এখানে ধরে নেওয়া হলো যে IPN ফাংশনটি কাজ করবে।
            
            console.log(`Success Handler: Order ${tran_id} successfully validated.`);

            // 4. ক্লায়েন্টকে রিডিরেক্ট করা
            return res.redirect(`${process.env.CLIENT_URL}/order/success?orderId=${tran_id}`);
        }
        
    } catch (error) {
        console.error('Success Handler: Payment verification failed:', error);
    }
  } 
  
  // 5. যদি ভ্যালিডেশন ব্যর্থ হয়
  order.orderStatus = 'Cancelled';
  order.paymentStatus = 'Failed';
  await order.save();

  return res.redirect(`${process.env.CLIENT_URL}/order/fail?orderId=${tran_id}`);
};

// @desc    Handle failed/cancelled payment
// @route   POST /api/v1/payment/fail, /api/v1/payment/cancel
// @access  Public (Called by SSL Commerz)
export const handleFailure = async (req, res) => {
    const { tran_id } = req.body;
    
    // অর্ডার খুঁজে বের করা
    const order = await Order.findById(tran_id);
    
    // যদি অর্ডারটি কেবল 'Pending' অবস্থায় থাকে, তবে সেটিকে 'Cancelled' করে দেওয়া হলো
    if (order && order.orderStatus === 'Pending') {
        order.orderStatus = 'Cancelled';
        order.paymentStatus = 'Failed';
        await order.save();
    }
    
    // ক্লায়েন্টকে রিডিরেক্ট করা
    return res.redirect(`${process.env.CLIENT_URL}/order/fail?orderId=${tran_id}`);
};

// @desc    Handle IPN (Instant Payment Notification)
// @route   POST /api/v1/payment/ipn
// @access  Public (Called by SSL Commerz - Server-to-Server)
export const handleIPN = async (req, res) => {
    // IPN হল SSL Commerz থেকে আসা ফাইনাল স্ট্যাটাস নিশ্চিত করার জন্য ব্যাকএন্ড টু ব্যাকএন্ড নোটিফিকেশন।
    
    // SSL Commerz IPN ডেটা
    const { tran_id, status, val_id } = req.body; 
    
    if (status !== 'VALID' || !val_id) {
        // যদি স্ট্যাটাস VALID না হয় বা val_id না থাকে, তবে 200 রেসপন্স দেওয়া উচিত
        return res.status(200).send('IPN Status not VALID or val_id missing. No action taken.');
    }

    try {
        const order = await Order.findById(tran_id);

        if (!order) {
            console.error(`IPN: Order not found for tran_id: ${tran_id}`);
            return res.status(404).send('Order Not Found');
        }

        // ⚠️ যদি অর্ডার ইতোমধ্যে 'Processing' হয়, তাহলে আর কিছু করার দরকার নেই (ডুপ্লিকেট IPN রোধ)
        if (order.orderStatus === 'Processing' || order.orderStatus === 'Confirmed') {
            return res.status(200).send('IPN Handled (Already Processed)');
        }
        
        // 1. সার্ভার-টু-সার্ভার ভ্যালিডেশন যাচাই করা
        const verificationResult = await verifyPayment(val_id, tran_id, order.totalPrice);

        if (verificationResult.isValid) {
            // 2. ফাইনাল নিশ্চিতকরণ ও অর্ডার আপডেট
            order.orderStatus = 'Processing';
            order.paymentStatus = 'Paid';
            order.paidAt = Date.now();
            order.paymentResult = {
                id: tran_id,
                status: verificationResult.data.status,
                method: 'SSLCommerz',
                update_time: new Date().toISOString(),
                // ... অন্যান্য তথ্য
            };
            await order.save();

            // 3. Stock management: স্টক কমানো এই IPN এ করা সবচেয়ে নিরাপদ
            await updateProductStock(order.orderItems, 'decrease');
            
            console.log(`IPN: Order ${tran_id} successfully validated and stock updated.`);
            // SSL Commerz কে 200 রেসপন্স দেওয়া হলো
            res.status(200).send('IPN Handled');
        } else {
            // ভ্যালিডেশন ব্যর্থ হলে
            order.orderStatus = 'Cancelled';
            order.paymentStatus = 'Failed';
            await order.save();
            console.error(`IPN: Order ${tran_id} validation failed.`);
            // SSL Commerz কে 200 রেসপন্স দেওয়া হলো
            res.status(200).send('IPN Validation Failed');
        }
    } catch (error) {
        console.error('IPN processing error:', error);
        // যদি কোনো আনএক্সপেক্টেড এরর হয়
        res.status(500).send('IPN Server Error');
    }
};