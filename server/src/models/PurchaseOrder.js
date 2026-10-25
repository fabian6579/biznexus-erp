import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  orderedQuantity: { type: Number, required: true, min: 1 },
  receivedQuantity: { type: Number, default: 0, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  poNumber: {
    type: String,
    required: [true, 'PO number is required'],
    trim: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required'],
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  expectedDate: {
    type: Date,
  },
  items: [purchaseOrderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'ordered', 'partially_received', 'received', 'cancelled'],
    default: 'ordered',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid'],
    default: 'unpaid',
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

purchaseOrderSchema.index({ organization: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ organization: 1, supplier: 1 });
purchaseOrderSchema.index({ organization: 1, status: 1 });
purchaseOrderSchema.index({ organization: 1, orderDate: -1 });

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
