
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
dotenv.config();


const STORE_ID = 'minim68ed493379d49';
const STORE_PASS = 'minim68ed493379d49@ssl'; 
const IS_LIVE = process.env.NODE_ENV === 'production'; 

const API_URL = IS_LIVE 
  ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
  : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

const VALIDATION_URL = IS_LIVE
  ? 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
  : 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';


export const initializePayment = async (orderId, paymentData) => {
  if (!STORE_ID || !STORE_PASS) {
    throw new Error('SSL Commerz credentials missing from .env file');
  }

const data = {
    store_id: STORE_ID,
    store_passwd: STORE_PASS,
    total_amount: paymentData.amount.toFixed(2),
    currency: 'BDT',
    tran_id: orderId.toString(),

    success_url: `${process.env.BASE_URL}/api/v1/payment/success`,
    fail_url: `${process.env.BASE_URL}/api/v1/payment/fail`,
    cancel_url: `${process.env.BASE_URL}/api/v1/payment/cancel`,
    ipn_url: `${process.env.BASE_URL}/api/v1/payment/ipn`,
    
    shipping_method: 'YES', 
    ship_name: paymentData.cus_name, 
    ship_add1: paymentData.shippingAddress?.addressLine1 || 'N/A',
    ship_city: paymentData.shippingAddress?.district || 'N/A', 
    ship_postcode: paymentData.shippingAddress?.zipCode || 'N/A',
    ship_country: 'Bangladesh',

    cus_name: paymentData.cus_name,
    cus_email: paymentData.cus_email || 'customer@example.com',
    cus_add1: paymentData.shippingAddress?.addressLine1 || 'N/A',
    cus_city: paymentData.shippingAddress?.district || 'N/A',
    cus_country: 'Bangladesh',
    cus_phone: paymentData.cus_phone,

    product_category: 'E-commerce',
    product_name: 'Online Purchase',
    product_profile: 'general',
  };

  try {
    const response = await axios.post(API_URL, qs.stringify(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  } catch (error) {
    console.error('SSL Commerz Init Error:', error.response ? error.response.data : error.message);
    throw new Error('Could not initiate payment with SSL Commerz');
  }
};

/**
 * @desc Verify SSL Commerz Payment (Server-to-Server Validation)
 */
export const verifyPayment = async (val_id, tran_id, amount) => {
  if (!val_id) {
    return { isValid: false, message: 'Validation ID missing' };
  }

  const params = {
    val_id: val_id,
    store_id: STORE_ID,
    store_passwd: STORE_PASS,
    format: 'json',
  };

  try {
    const response = await axios.get(VALIDATION_URL, { params });
    const result = response.data;

    if (
      result.status === 'VALID' &&
      result.tran_id === tran_id &&
      parseFloat(result.amount) >= amount
    ) {
      return { isValid: true, data: result };
    } else {
      console.error('SSLCommerz Verification Failed:', result);
      return { isValid: false, data: result };
    }
  } catch (error) {
    console.error(
      'SSLCommerz Verification API Error:',
      error.response ? error.response.data : error.message
    );
    return { isValid: false, error: error.message };
  }
};
