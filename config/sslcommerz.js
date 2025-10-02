// config/sslcommerz.js

import axios from 'axios';
import Order from '../models/order.model.js'; // Order মডেল প্রয়োজন

// ⚠️ আপনার .env ফাইলে এই ভেরিয়েবলগুলো সেট করতে হবে
const STORE_ID = process.env.SSL_STORE_ID;
const STORE_PASS = process.env.SSL_STORE_PASSWORD;
const IS_LIVE = process.env.NODE_ENV === 'production';

// API URL (Sandbox/Test এর জন্য এটি ব্যবহার করুন)
const API_URL = IS_LIVE 
    ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

// @desc Initialize SSL Commerz Payment
export const initializePayment = async (orderId, paymentData) => {
    // SSL Commerz এর জন্য প্রয়োজনীয় ডেটা
    const data = {
        store_id: STORE_ID,
        store_passwd: STORE_PASS,
        total_amount: paymentData.amount,
        currency: 'BDT', // সাধারণত BDT ব্যবহার করা হয়
        tran_id: orderId.toString(), // প্রতি অর্ডারের জন্য ইউনিক ID
        success_url: `${process.env.BASE_URL}/api/v1/payment/success`, // আপনার সফল URL
        fail_url: `${process.env.BASE_URL}/api/v1/payment/fail`,
        cancel_url: `${process.env.BASE_URL}/api/v1/payment/cancel`,
        ipn_url: `${process.env.BASE_URL}/api/v1/payment/ipn`, // Instant Payment Notification
        
        // CUSTOMER INFO
        cus_name: paymentData.cus_name,
        cus_email: paymentData.cus_email,
        cus_add1: paymentData.shippingAddress?.addressLine1 || 'N/A',
        cus_city: paymentData.shippingAddress?.city || 'N/A',
        cus_country: 'Bangladesh',
        // ... অন্যান্য প্রয়োজনীয় কাস্টমার ও শিপিং ডেটা
        
        product_category: 'E-commerce',
        product_name: 'Online Purchase',
        product_profile: 'general',
    };

    try {
        const response = await axios.post(API_URL, data);
        return response.data; // এখানে GatewayPageURL সহ অন্যান্য ডেটা থাকবে
    } catch (error) {
        console.error('SSL Commerz Init Error:', error.response ? error.response.data : error.message);
        throw new Error('Could not initiate payment with SSL Commerz');
    }
};