import mongoose from "mongoose";

const navbarItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  type: {
    type: String,
    enum: ['category', 'custom', 'link'],
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  customUrl: {
    type: String,
    default: ''
  },
  path: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const navbarConfigSchema = new mongoose.Schema({
  logo: {
    url: {
      type: String,
      default: ''
    },
    public_id: {
      type: String,
      default: ''
    }
  },
  logoUrl: {
    type: String,
    default: '/'
  },
  items: [navbarItemSchema],
  cartIcon: {
    type: Boolean,
    default: true
  },
  searchIcon: {
    type: Boolean,
    default: true
  },
  userIcon: {
    type: Boolean,
    default: true
  },
  wishlistIcon: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const NavbarConfig = mongoose.model('NavbarConfig', navbarConfigSchema);
export default NavbarConfig;