const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  phone: {
    type: String,
    required: false
  },
  message: {
    type: String,
    required: true
  },
  budget: {
    type: String,
    enum: ['$1k - $5k', '$5k - $10k', '$10k - $25k', '$25k+', 'undecided'],
    required: false
  },
  timeline: {
    type: String,
    enum: ['ASAP', '1-3 months', '3-6 months', '6+ months', 'flexible'],
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Contact', contactSchema);