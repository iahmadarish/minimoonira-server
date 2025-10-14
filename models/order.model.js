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

const shippingAddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  district: { type: String, required: true },
  upazila: { type: String, required: true },
  zipCode: { type: String },
  country: { type: String, default: 'Bangladesh' }
});

const paymentResultSchema = new mongoose.Schema({
  id: { type: String },
  status: { type: String },
  method: { type: String },
  update_time: { type: String },
  email_address: { type: String }
});

const orderStatusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

// models/order.model.js - নিশ্চিত করুন এই ফিল্ডগুলো আছে
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
    orderNumber: {
      type: String,
      unique: true,
      // required: true
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
      enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
      default: 'Pending'
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending'
    },
    statusHistory: [orderStatusHistorySchema],
    adminNotes: [{
      note: String,
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      addedAt: { type: Date, default: Date.now }
    }],
    trackingNumber: String,
    carrier: String,
    paidAt: Date,
    deliveredAt: Date
  },
  {
    timestamps: true
  }
);

// Order Number Generate Middleware
orderSchema.pre('save', async function(next) {
  // শুধুমাত্র নতুন document-এর জন্য orderNumber generate করুন
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await Order.countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    
    this.orderNumber = `ORD${year}${month}${day}${(count + 1).toString().padStart(4, '0')}`;
    
    // Initial status history
    this.statusHistory.push({
      status: 'Pending',
      note: 'Order placed successfully',
      updatedAt: new Date()
    });
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;