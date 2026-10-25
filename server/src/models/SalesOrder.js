import mongoose from 'mongoose';

const salesOrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const salesOrderSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    trim: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required'],
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  items: [salesOrderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 18,
    min: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid'],
    default: 'unpaid',
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  orderStatus: {
    type: String,
    enum: ['draft', 'pending', 'confirmed', 'processing', 'fulfilled', 'cancelled'],
    default: 'pending',
  },
  isStockDeducted: {
    type: Boolean,
    default: false,
  },
  shippingAddress: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

salesOrderSchema.index({ organization: 1, orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ organization: 1, customer: 1 });
salesOrderSchema.index({ organization: 1, orderStatus: 1 });
salesOrderSchema.index({ organization: 1, orderDate: -1 });

export const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
