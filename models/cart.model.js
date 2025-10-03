// models/cart.model.js

import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variant: {
      name: String,
      value: String,
      sku: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    priceAtPurchase: {
      type: Number,
      required: true,
    },
  },
  { _id: true } // ✅ _id enable করা হয়েছে
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalPrice: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate total price
cartSchema.pre('save', function (next) {
  let total = 0;
  this.items.forEach((item) => {
    total += item.priceAtPurchase * item.quantity;
  });
  this.totalPrice = total;
  next();
});

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;