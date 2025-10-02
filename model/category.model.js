import mongoose from 'mongoose';
import { makeSlug } from '../utils/makeSlug.js';


const categorySchema = new mongoose.Schema(
{
name: { type: String, required: true, trim: true },
slug: { type: String, required: true, lowercase: true, unique: true },
description: { type: String },
parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
isActive: { type: Boolean, default: true },
image: { url: String, public_id: String },
metaTitle: String,
metaDescription: String,
metaKeywords: [String],
},
{ timestamps: true }
);


// Auto-create slug from name if missing or name changed
categorySchema.pre('validate', function (next) {
if ((!this.slug || this.isModified('name')) && this.name) {
this.slug = makeSlug(this.name);
}
next();
});


// Prevent circular reference in parentCategory
categorySchema.pre('save', async function (next) {
if (!this.parentCategory) return next();
if (this.parentCategory?.toString() === this._id?.toString()) {
return next(new Error('A category cannot be its own parent.'));
} 
// Optional: ensure parent exists
const parent = await mongoose.model('Category').findById(this.parentCategory).select('_id').lean();
if (!parent) return next(new Error('Parent category not found.'));
return next();
});


const Category = mongoose.model('Category', categorySchema);
export default Category;