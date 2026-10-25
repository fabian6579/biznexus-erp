import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Electronics', 'Raw Materials', 'Office Supplies', 'Hardware', 'Software', 'Services', 'Packaging', 'Other'],
    default: 'Hardware',
  },
  description: {
    type: String,
    default: '',
  },
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price cannot be negative'],
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative'],
  },
  availableQuantity: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Available quantity cannot be negative'],
  },
  minStockLevel: {
    type: Number,
    default: 10,
    min: [0, 'Minimum stock level cannot be negative'],
  },
  unit: {
    type: String,
    default: 'units',
    trim: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  status: {
    type: String,
    enum: ['active', 'discontinued'],
    default: 'active',
  },
}, {
  timestamps: true,
});

productSchema.index({ organization: 1, sku: 1 }, { unique: true });
productSchema.index({ organization: 1, name: 1 });
productSchema.index({ organization: 1, category: 1 });

export const Product = mongoose.model('Product', productSchema);
