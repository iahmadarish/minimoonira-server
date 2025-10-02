// models/cart.model.js

import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    // যদি Product-এ Variants থাকে, তবে এই ফিল্ডে Variant এর ID/Value রাখা হবে
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
    // বর্তমান মূল্য সংরক্ষণ, যাতে দাম পরিবর্তন হলেও অর্ডারে সমস্যা না হয়
    priceAtPurchase: {
      type: Number,
      required: true,
    },
  },
  { _id: false } // Cart Item গুলোর জন্য আলাদা _id দরকার নেই
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // প্রতিটি ইউজারের জন্য শুধুমাত্র একটি কার্ট
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