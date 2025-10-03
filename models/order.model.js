// models/order.model.js

import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { name: String, value: String, sku: String },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  image: { type: String }
});

// ✅ আপডেটেড Shipping Address Schema
const shippingAddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  district: { type: String, required: true }, // ✅ জেলা
  upazila: { type: String, required: true }, // ✅ উপজেলা/থানা
  zipCode: { type: String },
  country: { type: String, default: 'Bangladesh' }
});

const paymentResultSchema = new mongoose.Schema({
  id: { type: String },
  status: { type: String },
  method: { type: String }
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isGuest: {
      type: Boolean,
      default: false
    },
    guestEmail: {
      type: String
    },
    orderItems: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    paymentMethod: {
      type: String,
      required: true,
      enum: ['COD', 'SSLCommerz']
    },
    paymentResult: paymentResultSchema,
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Failed'],
      default: 'Pending'
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;