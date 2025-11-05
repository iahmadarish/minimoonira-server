import NavbarConfig from '../models/NavbarConfig.js';
import Category from '../models/Category.js';

// Get active navbar configuration
export const getNavbarConfig = async (req, res) => {
  try {
    const config = await NavbarConfig.findOne({ isActive: true })
      .populate('items.category', 'name slug')
      .sort({ createdAt: -1 });

    if (!config) {
      // Return default config if none exists
      const defaultConfig = await createDefaultConfig();
      return res.json({
        success: true,
        data: defaultConfig
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create or update navbar configuration
export const updateNavbarConfig = async (req, res) => {
  try {
    const { logo, logoUrl, items, cartIcon, searchIcon, userIcon, wishlistIcon } = req.body;

    let config = await NavbarConfig.findOne({ isActive: true });

    if (config) {
      // Update existing config
      config.logo = logo || config.logo;
      config.logoUrl = logoUrl || config.logoUrl;
      config.items = items || config.items;
      config.cartIcon = cartIcon !== undefined ? cartIcon : config.cartIcon;
      config.searchIcon = searchIcon !== undefined ? searchIcon : config.searchIcon;
      config.userIcon = userIcon !== undefined ? userIcon : config.userIcon;
      config.wishlistIcon = wishlistIcon !== undefined ? wishlistIcon : config.wishlistIcon;
    } else {
      // Create new config
      config = new NavbarConfig({
        logo,
        logoUrl,
        items,
        cartIcon,
        searchIcon,
        userIcon,
        wishlistIcon
      });
    }

    await config.save();
    await config.populate('items.category', 'name slug');

    res.json({
      success: true,
      message: 'Navbar configuration updated successfully',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get available categories for navbar
export const getAvailableCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name slug level path')
      .sort({ level: 1, name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to create default config
const createDefaultConfig = async () => {
  const defaultConfig = new NavbarConfig({
    logo: {
      url: "https://static.toiimg.com/thumb/resizemode-4,width-1280,height-720,msid-106616097/106616097.jpg",
      public_id: ""
    },
    logoUrl: "/",
    items: [
      { name: "Home", type: "link", path: "/", order: 0, isActive: true },
      { name: "Collections", type: "link", path: "/shop", order: 1, isActive: true },
      { name: "Deals", type: "link", path: "/best-deal", order: 2, isActive: true },
      { name: "Blog", type: "link", path: "/blogs", order: 3, isActive: true },
      { name: "About Us", type: "link", path: "/about", order: 4, isActive: true }
    ],
    cartIcon: true,
    searchIcon: true,
    userIcon: true,
    wishlistIcon: true
  });

  await defaultConfig.save();
  return defaultConfig;
};