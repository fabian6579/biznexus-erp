import mongoose from 'mongoose';

const financeTransactionSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than zero'],
  },
  transactionDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'credit_card', 'upi', 'cheque'],
    default: 'bank_transfer',
  },
  relatedCustomer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  relatedSupplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesOrder',
  },
  relatedPurchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
  },
  referenceNumber: {
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

financeTransactionSchema.index({ organization: 1, transactionId: 1 }, { unique: true });
financeTransactionSchema.index({ organization: 1, type: 1 });
financeTransactionSchema.index({ organization: 1, category: 1 });
financeTransactionSchema.index({ organization: 1, transactionDate: -1 });

export const FinanceTransaction = mongoose.model('FinanceTransaction', financeTransactionSchema);
