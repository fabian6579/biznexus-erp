import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  supplierId: {
    type: String,
    required: [true, 'Supplier ID is required'],
    trim: true,
  },
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
  },
  contactPerson: {
    type: String,
    default: '',
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Supplier email is required'],
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    default: '',
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'India' },
  },
  paymentTerms: {
    type: String,
    default: 'Net 30',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5,
  },
}, {
  timestamps: true,
});

supplierSchema.index({ organization: 1, supplierId: 1 }, { unique: true });
supplierSchema.index({ organization: 1, companyName: 1 });

export const Supplier = mongoose.model('Supplier', supplierSchema);
