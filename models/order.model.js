// models/order.model.js

import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { name: String, value: String, sku: String },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  image: { type: String }, // অর্ডার সামারির জন্য
});

const shippingAddressSchema = new mongoose.Schema({
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
});

const paymentResultSchema = new mongoose.Schema({
    id: { type: String }, // SSL Commerz Transaction ID (tran_id)
    status: { type: String }, // Success, Failed, Cancelled
    method: { type: String }, // SSL Commerz
    // ... অন্যান্য পেমেন্ট তথ্য
});

const orderSchema = new mongoose.Schema(
  {
    // যদি গেস্ট অর্ডার হয়, তবে user ফিল্ডটি null হবে
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isGuest: {
        type: Boolean,
        default: false,
    },
    guestEmail: { // গেস্ট ইউজারের জন্য
        type: String,
    },
    orderItems: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    paymentMethod: {
      type: String,
      required: true,
      enum: ['COD', 'SSLCommerz'], // Cash on Delivery, SSL Commerz
    },
    paymentResult: paymentResultSchema,
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Failed'],
      default: 'Pending',
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;