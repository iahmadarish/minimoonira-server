
import mongoose from 'mongoose';
import { bulkCreateSimpleProducts } from './scripts/bulkCreator.js'; // Adjust path as needed

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mdola33131:paO8f5VQ1tn6bAe5@cluster0.fvkw4qi.mongodb.net/rrrdata?retryWrites=true&w=majority&appName=Cluster0"; 

/**
 * Main function to connect to MongoDB and execute the bulk insert script.
 */
const runSeeder = async () => {
    console.log("Starting Bulk Product Insertion...");
    console.log(`Attempting to connect to MongoDB at: ${MONGO_URI.substring(0, 30)}...`);
    
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log("✅ Database connection successful.");
        
        // Execute the bulk insertion function
        const count = await bulkCreateSimpleProducts();

        console.log(`\n🎉 Seeding complete. Total ${count} products inserted.`);
    } catch (error) {
        console.error("\n❌ Seeding failed. Check your MongoDB connection or data structure.");
        // Log the full error for debugging
        console.error(error); 
        process.exit(1); // Exit with a failure code
    } finally {
        // Disconnect from the database
        await mongoose.disconnect();
        console.log("Database connection closed.");
    }
};

runSeeder();