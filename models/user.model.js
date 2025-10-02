// models/user.model.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // ⚠️ এটি অবশ্যই ইন্সটল করুন: npm install bcryptjs
import jwt from 'jsonwebtoken'; // ⚠️ এটি অবশ্যই ইন্সটল করুন: npm install jsonwebtoken

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // 🛑 যখনই ইউজারকে DB থেকে আনা হবে, তখন পাসওয়ার্ড দেখাবে না।
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'editor'],
      default: 'user',
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    shippingAddress: [
      {
        addressLine1: { type: String, required: true },
        addressLine2: { type: String },
        city: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true, default: 'Bangladesh' },
        isDefault: { type: Boolean, default: false },
      },
    ],
    // কার্ট এর জন্য এখানে একটি রেফারেন্স রাখা যেতে পারে, অথবা আলাদা Cart মডেল ব্যবহার করা যায়।
  },
  {
    timestamps: true,
  }
);

// Mongoose Pre-Save Hook: পাসওয়ার্ড সেভ করার আগে হ্যাশ করুন
userSchema.pre('save', async function (next) {
  // যদি পাসওয়ার্ড ফিল্ড মডিফাই না হয়, তবে হ্যাশ করার দরকার নেই
  if (!this.isModified('password')) {
    return next();
  }

  // নতুন পাসওয়ার্ড হ্যাশ করা
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance Method: হ্যাশ করা পাসওয়ার্ড চেক করার জন্য
userSchema.methods.matchPassword = async function (enteredPassword) {
  // this.password এ select: false থাকায়, এই মেথড ব্যবহার করার আগে .select('+password') করতে হবে।
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance Method: JWT টোকেন জেনারেট করার জন্য
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const User = mongoose.model('User', userSchema);
export default User;