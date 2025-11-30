import mongoose from "mongoose";
// Make sure this path is correct for your Product model
import Product from "../models/product.model.js"; 

// 🚨 MANDATORY: Updated Category and Subcategory IDs
const TODDLER_TOYS_CATEGORY_ID = '68e5ce40e11dcee27f5f37fe'; 
const HOME_KITCHEN_CATEGORY_ID = '692060fe70884c2dde839597';
const TADDY_SUBCATEGORY_ID = '68e5ce61e11dcee27f5f3804';
const KITCHEN_SUBCATEGORY_ID = '6920714470884c2dde8397bb';

// --- Slug Generation Helper (Required for insertMany) ---
const generateSlug = (name) => {
    if (!name) return "product-" + Date.now();
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-zA-Z0-9\s-]/g, "") 
        .replace(/\s+/g, "-") 
        .replace(/-+/g, "-") 
        .replace(/^-|-$/g, ""); 
};

// --- Standardized Data (Fixed Content) ---
const FIXED_PRICE = 1200;
const FIXED_STOCK = 100;
const FIXED_LOW_STOCK_ALERT = 5;

const standardBulletPoints = [
    "Expertly designed for durability and long-term use in all environments.", // Max 150 chars
    "Made with premium, non-toxic materials, ensuring safety for the whole family.", // Max 150 chars
    "Easy to clean and maintain, providing a hassle-free user experience and saving time.", // Max 150 chars
    "Backed by our full satisfaction guarantee and excellent 24/7 customer support.", // Max 150 chars
    "Modern, ergonomic design for comfortable handling and efficient daily use." // Max 150 chars
];

const standardImageGroups = [
    {
        name: 'Main',
        images: [
            // Dummy image URLs (3 images requested)
            { url: "https://www.wonderchef.com/cdn/shop/files/6816217.jpg?v=1757415162&width=600", alt: "Main Product View" },
            { url: "https://www.wonderchef.com/cdn/shop/files/6819577.jpg?v=1757417066&width=600", alt: "Product Detail Shot" },
            { url: "https://www.wonderchef.com/cdn/shop/files/6816232.jpg?v=1757415162&width=720", alt: "In-Use Scenario" },
        ]
    },
];

// --- Product Data Definition (8 per Category) ---

const simpleProductsData = [
    // HOME & KITCHEN (8 Products)
    { name: "Chef's 7-Piece Knife Set", description: "Professional-grade, high-carbon stainless steel set for superior sharpness and precise cutting.", category: HOME_KITCHEN_CATEGORY_ID, subCategory: KITCHEN_SUBCATEGORY_ID, brand: "Chef's Best", isFeatured: true, skuPrefix: "HK" },
    { name: "Non-Stick 10-inch Frying Pan", description: "Eco-friendly, durable non-stick coating for healthy cooking. PFOA-free and suitable for all stovetops.", category: HOME_KITCHEN_CATEGORY_ID, subCategory: KITCHEN_SUBCATEGORY_ID, brand: "Green Cookware", skuPrefix: "HK" },
    { name: "Bamboo XL Cutting Board", description: "Organic bamboo, reversible design with a deep juice groove. Gentle on knives and easy to clean.", category: HOME_KITCHEN_CATEGORY_ID, subCategory: KITCHEN_SUBCATEGORY_ID, brand: "EcoHome", skuPrefix: "HK" },
    { name: "Electric Gooseneck Kettle", description: "Precision pour control for perfect coffee and tea. Rapid boil feature and automatic shut-off.", category: HOME_KITCHEN_CATEGORY_ID, subCategory: KITCHEN_SUBCATEGORY_ID, brand: "Aroma Brew", skuPrefix: "HK" },
    { name: "Digital Food Kitchen Scale", description: "High-precision digital scale for baking and cooking. Measures in grams, ounces, and milliliters.", category: HOME_KITCHEN_CATEGORY_ID, subCategory: KITCHEN_SUBCATEGORY_ID, brand: "MeasurePro", skuPrefix: "HK" },
    { name: "Silicone Baking Mat Set", description: "Non-stick, reusable silicone mats. Perfect for pastry, cookies, and freezing dough. Two sizes included.", category: HOME_KITCHEN_CATEGORY_ID, subCategory: KITCHEN_SUBCATEGORY_ID, brand: "BakeMaster", skuPrefix: "HK" },
    { name: "Set of 4 Bar Stools", description: "Modern counter-height bar stools with cushioned seats and solid wood legs. Easy assembly required.", category: HOME_KITCHEN_CATEGORY_ID, subCategory: KITCHEN_SUBCATEGORY_ID, brand: "Home Decor Co.", skuPrefix: "HK" },
    { name: "Glass Meal Prep Containers", description: "A set of 5 glass containers with airtight lids. Microwave, oven, and freezer safe. BPA-free.", category: HOME_KITCHEN_CATEGORY_ID, subCategory: KITCHEN_SUBCATEGORY_ID, brand: "Fresh Store", skuPrefix: "HK" },
    
    // TODDLER AND TOYS (8 Products)
    { name: "Soft Plush Taddy Bear", description: "An incredibly soft, hypoallergenic, and cuddly teddy bear. Perfect first friend for infants and toddlers.", category: TODDLER_TOYS_CATEGORY_ID, subCategory: TADDY_SUBCATEGORY_ID, brand: "Cuddle Buddies", isFeatured: true, skuPrefix: "TT" },
    { name: "Wooden Stacking Rainbow", description: "Classic Montessori-style toy. Develops fine motor skills, color recognition, and creativity in toddlers.", category: TODDLER_TOYS_CATEGORY_ID, subCategory: TADDY_SUBCATEGORY_ID, brand: "Play Smart", skuPrefix: "TT" },
    { name: "100-Piece Building Blocks Set", description: "Colorful, durable plastic blocks for endless creative play. Comes with a convenient reusable storage tub.", category: TODDLER_TOYS_CATEGORY_ID, subCategory: TADDY_SUBCATEGORY_ID, brand: "Kids Fun Co.", skuPrefix: "TT" },
    { name: "Soft Activity Cube", description: "Multi-sensory toy with rattles, mirrors, and textures to stimulate baby’s development and curiosity.", category: TODDLER_TOYS_CATEGORY_ID, subCategory: TADDY_SUBCATEGORY_ID, brand: "Baby Sense", skuPrefix: "TT" },
    { name: "Magnetic Drawing Board", description: "Portable, mess-free screen for drawing and writing practice. Includes 4 color zones and two stamps.", category: TODDLER_TOYS_CATEGORY_ID, subCategory: TADDY_SUBCATEGORY_ID, brand: "Art Kid", skuPrefix: "TT" },
    { name: "Interactive World Globe", description: "Educational globe that speaks about countries, capitals, and facts when touched with the smart pen.", category: TODDLER_TOYS_CATEGORY_ID, subCategory: TADDY_SUBCATEGORY_ID, brand: "Learn World", skuPrefix: "TT" },
    { name: "Stackable Cups Tower", description: "10 colorful, numbered cups for stacking and nesting. Great for bath time or play area activities.", category: TODDLER_TOYS_CATEGORY_ID, subCategory: TADDY_SUBCATEGORY_ID, brand: "Water Play", skuPrefix: "TT" },
    { name: "Remote Control Stunt Car", description: "Durable, high-speed RC car with 360-degree flips and spins. Rechargeable battery included.", category: TODDLER_TOYS_CATEGORY_ID, subCategory: TADDY_SUBCATEGORY_ID, brand: "Speed Toys", skuPrefix: "TT" },
];

// --- Main Bulk Creation Function ---

export const bulkCreateSimpleProducts = async () => {
    
    const processedProducts = [];
    let hkCount = 1; // Counter for Home & Kitchen SKUs
    let ttCount = 1; // Counter for Toddler and Toys SKUs

    for (const productData of simpleProductsData) {
        
        // 1. Manually Generate SKU
        let skuCounter = 0;
        let skuPrefix = productData.skuPrefix;

        if (skuPrefix === "HK") {
            skuCounter = hkCount++;
        } else if (skuPrefix === "TT") {
            skuCounter = ttCount++;
        }
        
        // Format the counter to be 3 digits (e.g., 001, 010)
        const skuSuffix = String(skuCounter).padStart(3, '0');
        
        // Final SKU (e.g., HK-001)
        productData.sku = `${skuPrefix}-${skuSuffix}`;
        
        // Remove the temporary prefix
        delete productData.skuPrefix; 

        // 2. Manually Generate Slug
        productData.slug = generateSlug(productData.name);

        // 3. Set Fixed Price, Stock, and Low Stock Alert
        productData.basePrice = FIXED_PRICE;
        productData.price = FIXED_PRICE; 
        productData.stock = FIXED_STOCK;
        productData.lowStockAlert = FIXED_LOW_STOCK_ALERT;

        // 4. Set No-Variant Defaults
        productData.hasVariants = false;
        productData.variantOptions = [];
        productData.variants = [];
        
        // 5. Set Fixed Content Fields
        productData.bulletPoints = standardBulletPoints;
        productData.imageGroups = standardImageGroups;
        
        // 6. Cleanup: Remove any discount fields since they are not needed
        delete productData.discountPercentage;
        delete productData.discountStart;
        delete productData.discountEnd;

        // 7. Add timestamps for consistency
        const now = new Date();
        productData.createdAt = now;
        productData.updatedAt = now;
        
        processedProducts.push(productData);
    }

    console.log(`Prepared ${processedProducts.length} simple products for insertion. Products will use basePrice: ${FIXED_PRICE} and stock: ${FIXED_STOCK}.`);
    console.log("Starting bulk insertion using insertMany...");

    try {
        const result = await Product.insertMany(processedProducts, { ordered: false }); 

        console.log(`✅ Successfully inserted ${result.length} simple products in bulk.`);
        return result.length;
    } catch (error) {
        console.error("❌ Error during bulk simple product creation:", error);
        if (error.code === 11000) {
            console.log("Some products were skipped due to duplicate keys (slug or sku).");
        }
        // Throw the error to stop the execution in the runner script
        throw error; 
    }
};