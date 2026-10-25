import { Parser } from 'json2csv';
import {
  SalesOrder,
  FinanceTransaction,
  Product,
  Customer,
  PurchaseOrder,
  Employee,
} from '../models/index.js';

// Helper to construct date filters
const parseDateRange = (startDate, endDate) => {
  const filter = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) filter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  return filter;
};

// @desc    Get Sales & Revenue Report
// @route   GET /api/reports/sales
export const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { organization: req.orgId };

    if (startDate || endDate) {
      match.orderDate = parseDateRange(startDate, endDate);
    }

    const [salesByDay, topProducts, salesByCustomer, orderStatusSummary] = await Promise.all([
      // Sales grouped by day
      SalesOrder.aggregate([
        { $match: { ...match, orderStatus: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
            totalSales: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top selling products
      SalesOrder.aggregate([
        { $match: { ...match, orderStatus: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productName',
            sku: { $first: '$items.sku' },
            unitsSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.subtotal' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]),

      // Sales by customer
      SalesOrder.aggregate([
        { $match: { ...match, orderStatus: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: '$customer',
            totalSpent: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customerDetails',
          },
        },
        { $unwind: '$customerDetails' },
        {
          $project: {
            customerId: '$customerDetails.customerId',
            name: '$customerDetails.name',
            company: '$customerDetails.company',
            totalSpent: 1,
            orderCount: 1,
          },
        },
      ]),

      // Order status breakdown
      SalesOrder.aggregate([
        { $match },
        {
          $group: {
            _id: '$orderStatus',
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        salesByDay,
        topProducts,
        salesByCustomer,
        orderStatusSummary,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Financial P&L Report
// @route   GET /api/reports/financial
export const getFinancialReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { organization: req.orgId };

    if (startDate || endDate) {
      match.transactionDate = parseDateRange(startDate, endDate);
    }

    const [incomeByCategory, expenseByCategory, monthlyTrends] = await Promise.all([
      FinanceTransaction.aggregate([
        { $match: { ...match, type: 'income' } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      FinanceTransaction.aggregate([
        { $match: { ...match, type: 'expense' } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      FinanceTransaction.aggregate([
        { $match },
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
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const totalIncome = incomeByCategory.reduce((sum, item) => sum + item.total, 0);
    const totalExpenses = expenseByCategory.reduce((sum, item) => sum + item.total, 0);
    const netProfit = totalIncome - totalExpenses;

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netProfit,
        incomeByCategory,
        expenseByCategory,
        monthlyTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Inventory & Stock Valuation Report
// @route   GET /api/reports/inventory
export const getInventoryReport = async (req, res, next) => {
  try {
    const [categorySummary, lowStockItems, totalValuation] = await Promise.all([
      Product.aggregate([
        { $match: { organization: req.orgId } },
        {
          $group: {
            _id: '$category',
            itemCount: { $sum: 1 },
            totalUnits: { $sum: '$availableQuantity' },
            inventoryCost: { $sum: { $multiply: ['$availableQuantity', '$costPrice'] } },
            retailValue: { $sum: { $multiply: ['$availableQuantity', '$sellingPrice'] } },
          },
        },
        { $sort: { inventoryCost: -1 } },
      ]),
      Product.find({
        organization: req.orgId,
        $expr: { $lte: ['$availableQuantity', '$minStockLevel'] },
      }).select('sku name category availableQuantity minStockLevel costPrice sellingPrice unit'),
      Product.aggregate([
        { $match: { organization: req.orgId } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalQuantity: { $sum: '$availableQuantity' },
            totalCost: { $sum: { $multiply: ['$availableQuantity', '$costPrice'] } },
            totalValue: { $sum: { $multiply: ['$availableQuantity', '$sellingPrice'] } },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: totalValuation[0] || { totalItems: 0, totalQuantity: 0, totalCost: 0, totalValue: 0 },
        categorySummary,
        lowStockItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export data to CSV
// @route   GET /api/reports/export-csv
export const exportReportCsv = async (req, res, next) => {
  try {
    const { reportType } = req.query; // 'sales', 'expenses', 'inventory', 'customers'
    const orgId = req.orgId;

    let data = [];
    let fields = [];
    let filename = `report_${Date.now()}.csv`;

    if (reportType === 'sales') {
      const orders = await SalesOrder.find({ organization: orgId })
        .populate('customer', 'name company')
        .sort({ orderDate: -1 });

      filename = `sales_orders_${new Date().toISOString().slice(0, 10)}.csv`;
      fields = ['orderNumber', 'customerName', 'company', 'orderDate', 'orderStatus', 'paymentStatus', 'subtotal', 'taxAmount', 'totalAmount'];
      data = orders.map((o) => ({
        orderNumber: o.orderNumber,
        customerName: o.customer?.name || 'N/A',
        company: o.customer?.company || 'N/A',
        orderDate: o.orderDate?.toISOString().slice(0, 10),
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        subtotal: o.subtotal,
        taxAmount: o.taxAmount,
        totalAmount: o.totalAmount,
      }));
    } else if (reportType === 'expenses' || reportType === 'finance') {
      const txns = await FinanceTransaction.find({ organization: orgId }).sort({ transactionDate: -1 });
      filename = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      fields = ['transactionId', 'type', 'category', 'description', 'amount', 'transactionDate', 'paymentMethod', 'referenceNumber'];
      data = txns.map((t) => ({
        transactionId: t.transactionId,
        type: t.type,
        category: t.category,
        description: t.description,
        amount: t.amount,
        transactionDate: t.transactionDate?.toISOString().slice(0, 10),
        paymentMethod: t.paymentMethod,
        referenceNumber: t.referenceNumber,
      }));
    } else if (reportType === 'inventory') {
      const products = await Product.find({ organization: orgId }).sort({ name: 1 });
      filename = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
      fields = ['sku', 'name', 'category', 'availableQuantity', 'minStockLevel', 'unit', 'costPrice', 'sellingPrice', 'status'];
      data = products.map((p) => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        availableQuantity: p.availableQuantity,
        minStockLevel: p.minStockLevel,
        unit: p.unit,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        status: p.status,
      }));
    } else {
      const customers = await Customer.find({ organization: orgId }).sort({ name: 1 });
      filename = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
      fields = ['customerId', 'name', 'company', 'email', 'phone', 'customerType', 'leadStatus', 'totalSpent', 'ordersCount'];
      data = customers.map((c) => ({
        customerId: c.customerId,
        name: c.name,
        company: c.company,
        email: c.email,
        phone: c.phone,
        customerType: c.customerType,
        leadStatus: c.leadStatus,
        totalSpent: c.totalSpent,
        ordersCount: c.ordersCount,
      }));
    }

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};
