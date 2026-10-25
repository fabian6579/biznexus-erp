import {
  FinanceTransaction,
  Invoice,
  SalesOrder,
  Customer,
  Supplier,
} from '../models/index.js';
import { logAudit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

// @desc    Get all financial transactions with filters & pagination
// @route   GET /api/finance/transactions
export const getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      type = '',
      category = '',
      startDate,
      endDate,
      search = '',
      sortBy = 'transactionDate',
      order = 'desc',
    } = req.query;

    const query = { organization: req.orgId };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      FinanceTransaction.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('relatedCustomer', 'name company customerId')
        .populate('relatedSupplier', 'companyName supplierId')
        .populate('createdBy', 'name'),
      FinanceTransaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new financial transaction (Income or Expense)
// @route   POST /api/finance/transactions
export const createTransaction = async (req, res, next) => {
  try {
    const {
      type,
      category,
      description,
      amount,
      transactionDate,
      paymentMethod,
      relatedCustomer,
      relatedSupplier,
      relatedOrder,
      referenceNumber,
    } = req.body;

    if (!type || !category || !description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Type, category, description, and amount are required.',
      });
    }

    const count = await FinanceTransaction.countDocuments({ organization: req.orgId });
    const transactionId = `TXN-${String(count + 10001).padStart(5, '0')}`;

    const transaction = await FinanceTransaction.create({
      organization: req.orgId,
      transactionId,
      type,
      category,
      description,
      amount: Number(amount),
      transactionDate: transactionDate || new Date(),
      paymentMethod: paymentMethod || 'bank_transfer',
      relatedCustomer: relatedCustomer || null,
      relatedSupplier: relatedSupplier || null,
      relatedOrder: relatedOrder || null,
      referenceNumber: referenceNumber || '',
      createdBy: req.user._id,
    });

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'TRANSACTION_RECORDED',
      module: 'finance',
      details: { transactionId: transaction.transactionId, type, amount: transaction.amount },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: `${type === 'income' ? 'Income' : 'Expense'} recorded successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get financial summary & breakdown
// @route   GET /api/finance/summary
export const getFinanceSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateMatch = { organization: req.orgId };

    if (startDate || endDate) {
      dateMatch.transactionDate = {};
      if (startDate) dateMatch.transactionDate.$gte = new Date(startDate);
      if (endDate) dateMatch.transactionDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    // Aggregate income and expense totals
    const totals = await FinanceTransaction.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;

    totals.forEach((t) => {
      if (t._id === 'income') totalIncome = t.totalAmount;
      if (t._id === 'expense') totalExpenses = t.totalAmount;
    });

    const netProfit = totalIncome - totalExpenses;

    // Aggregate outstanding invoices
    const invoiceSummary = await Invoice.aggregate([
      { $match: { organization: req.orgId } },
      {
        $group: {
          _id: '$status',
          totalBilled: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalBalance: { $sum: '$balanceDue' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalOutstanding = 0;
    let totalInvoiced = 0;

    invoiceSummary.forEach((inv) => {
      totalInvoiced += inv.totalBilled;
      if (inv._id !== 'paid' && inv._id !== 'cancelled') {
        totalOutstanding += inv.totalBalance;
      }
    });

    // Monthly income vs expense aggregation (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrends = await FinanceTransaction.aggregate([
      {
        $match: {
          organization: req.orgId,
          transactionDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Categories breakdown
    const expenseCategories = await FinanceTransaction.aggregate([
      { $match: { organization: req.orgId, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netProfit,
        totalInvoiced,
        totalOutstanding,
        expenseCategories,
        monthlyTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invoices with filters
// @route   GET /api/finance/invoices
export const getInvoices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sortBy = 'issueDate',
      order = 'desc',
    } = req.query;

    const query = { organization: req.orgId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const matchingCustomers = await Customer.find({
        organization: req.orgId,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const customerIds = matchingCustomers.map((c) => c._id);

      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customer: { $in: customerIds } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('customer', 'name company email phone customerId')
        .populate('salesOrder', 'orderNumber'),
      Invoice.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/finance/invoices/:id
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      organization: req.orgId,
    })
      .populate('customer')
      .populate('salesOrder');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record payment on an invoice
// @route   PATCH /api/finance/invoices/:id/payment
export const recordInvoicePayment = async (req, res, next) => {
  try {
    const { amount, paymentMethod = 'bank_transfer', referenceNumber = '', notes = '' } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid positive payment amount is required.',
      });
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      organization: req.orgId,
    }).populate('customer');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (invoice.balanceDue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice has already been paid in full.',
      });
    }

    if (paymentAmount > invoice.balanceDue) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount}) exceeds outstanding balance (₹${invoice.balanceDue}).`,
      });
    }

    invoice.paidAmount += paymentAmount;
    invoice.balanceDue = invoice.totalAmount - invoice.paidAmount;
    invoice.status = invoice.balanceDue <= 0 ? 'paid' : 'partially_paid';
    await invoice.save();

    // Create Finance Income Transaction
    const count = await FinanceTransaction.countDocuments({ organization: req.orgId });
    const transactionId = `TXN-${String(count + 10001).padStart(5, '0')}`;

    await FinanceTransaction.create({
      organization: req.orgId,
      transactionId,
      type: 'income',
      category: 'Sales Revenue',
      description: `Payment received for Invoice ${invoice.invoiceNumber}`,
      amount: paymentAmount,
      transactionDate: new Date(),
      paymentMethod,
      relatedCustomer: invoice.customer._id,
      relatedOrder: invoice.salesOrder,
      referenceNumber: referenceNumber || invoice.invoiceNumber,
      createdBy: req.user._id,
    });

    // Update SalesOrder payment status if linked
    if (invoice.salesOrder) {
      const salesOrder = await SalesOrder.findOne({
        _id: invoice.salesOrder,
        organization: req.orgId,
      });

      if (salesOrder) {
        salesOrder.paidAmount += paymentAmount;
        salesOrder.paymentStatus =
          salesOrder.paidAmount >= salesOrder.totalAmount
            ? 'paid'
            : salesOrder.paidAmount > 0
            ? 'partially_paid'
            : 'unpaid';
        await salesOrder.save();
      }
    }

    await createNotification(req.orgId, {
      title: 'Payment Received',
      message: `Received ₹${paymentAmount.toLocaleString()} for Invoice ${invoice.invoiceNumber} from ${invoice.customer.name}.`,
      type: 'payment',
      link: `/finance/invoices/${invoice._id}`,
      metadata: { invoiceId: invoice._id, amount: paymentAmount },
    });

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PAYMENT_RECORDED',
      module: 'finance',
      details: { invoiceNumber: invoice.invoiceNumber, amount: paymentAmount, balanceDue: invoice.balanceDue },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Payment recorded and income transaction created successfully.',
    });
  } catch (error) {
    next(error);
  }
};
