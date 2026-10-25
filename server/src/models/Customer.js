import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  customerId: {
    type: String,
    required: [true, 'Customer ID is required'],
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  company: {
    type: String,
    default: '',
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Customer email is required'],
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
  customerType: {
    type: String,
    enum: ['individual', 'business'],
    default: 'business',
  },
  leadStatus: {
    type: String,
    enum: ['lead', 'contacted', 'qualified', 'customer', 'inactive'],
    default: 'customer',
  },
  assignedEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  notes: [{
    content: { type: String, required: true },
    author: { type: String, default: 'Staff' },
    createdAt: { type: Date, default: Date.now },
  }],
  totalSpent: {
    type: Number,
    default: 0,
    min: 0,
  },
  ordersCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

customerSchema.index({ organization: 1, customerId: 1 }, { unique: true });
customerSchema.index({ organization: 1, name: 1 });
customerSchema.index({ organization: 1, email: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
