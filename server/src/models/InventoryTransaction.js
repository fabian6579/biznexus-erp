import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  type: {
    type: String,
    enum: ['purchase_received', 'sales_fulfilled', 'adjustment', 'return', 'initial_stock'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true, // + for additions, - for deductions
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  unitCost: {
    type: Number,
    default: 0,
  },
  referenceId: {
    type: String,
    default: '', // e.g. SO-10001 or PO-10001
  },
  referenceModel: {
    type: String,
    enum: ['SalesOrder', 'PurchaseOrder', 'ManualAdjustment', ''],
    default: '',
  },
  reason: {
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

inventoryTransactionSchema.index({ organization: 1, product: 1, createdAt: -1 });

export const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
