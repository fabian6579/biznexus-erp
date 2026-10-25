import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Organization code is required'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },
  currencySymbol: {
    type: String,
    default: '₹',
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'India' },
  },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  taxNumber: { type: String, default: '' }, // e.g. GSTIN
  settings: {
    defaultTaxRate: { type: Number, default: 18 },
    fiscalYearStart: { type: String, default: '04-01' },
    lowStockThreshold: { type: Number, default: 10 },
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active',
  },
}, {
  timestamps: true,
});

export const Organization = mongoose.model('Organization', organizationSchema);
