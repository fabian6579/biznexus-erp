import {
  SalesOrder,
  FinanceTransaction,
  Customer,
  Employee,
  Product,
  Task,
  Notification,
} from '../models/index.js';

// Helper to resolve date range boundaries
const getDateRangeFilter = (timeframe, customStart, customEnd) => {
  const now = new Date();
  let start = new Date(0);
  let end = new Date();

  switch (timeframe) {
    case 'today':
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case '7d':
      start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (customStart) start = new Date(customStart);
      if (customEnd) end = new Date(new Date(customEnd).setHours(23, 59, 59, 999));
      break;
    default:
      // Default to last 30 days
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
};

// @desc    Get dashboard KPI summary and charts
// @route   GET /api/dashboard/summary
export const getDashboardSummary = async (req, res, next) => {
  try {
    const { timeframe = '30d', startDate, endDate } = req.query;
    const { start, end } = getDateRangeFilter(timeframe, startDate, endDate);

    const orgId = req.orgId;

    // 1. Financial aggregation for the period
    const [financeTotals, allSalesOrders, customerCount, employeeCount, lowStockProducts, pendingTasksCount] =
      await Promise.all([
        // Actual income and expenses in the period
        FinanceTransaction.aggregate([
          {
            $match: {
              organization: orgId,
              transactionDate: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: '$type',
              total: { $sum: '$amount' },
            },
          },
        ]),

        // Total orders and revenue from confirmed/fulfilled sales in the period
        SalesOrder.aggregate([
          {
            $match: {
              organization: orgId,
              orderDate: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: '$orderStatus',
              totalAmount: { $sum: '$totalAmount' },
              count: { $sum: 1 },
            },
          },
        ]),

        Customer.countDocuments({ organization: orgId }),
        Employee.countDocuments({ organization: orgId, employmentStatus: 'active' }),
        Product.find({
          organization: orgId,
          $expr: { $lte: ['$availableQuantity', '$minStockLevel'] },
        }).limit(6),
        Task.countDocuments({
          organization: orgId,
          status: { $in: ['todo', 'in_progress', 'review'] },
        }),
      ]);

    // Parse income/expenses
    let totalIncome = 0;
    let totalExpenses = 0;
    financeTotals.forEach((f) => {
      if (f._id === 'income') totalIncome = f.total;
      if (f._id === 'expense') totalExpenses = f.total;
    });

    // Parse orders breakdown
    let totalOrdersCount = 0;
    let salesRevenueFromOrders = 0;
    const orderStatusDistribution = [];

    allSalesOrders.forEach((o) => {
      totalOrdersCount += o.count;
      if (o._id !== 'cancelled') {
        salesRevenueFromOrders += o.totalAmount;
      }
      orderStatusDistribution.push({ status: o._id, count: o.count, amount: o.totalAmount });
    });

    // If no direct finance income logged yet, reflect confirmed order revenue as revenue KPI
    const totalRevenue = totalIncome > 0 ? totalIncome : salesRevenueFromOrders;
    const netProfit = totalRevenue - totalExpenses;

    // 2. Fetch monthly trend charts (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [monthlyRevenueTrends, monthlyExpenseTrends] = await Promise.all([
      SalesOrder.aggregate([
        {
          $match: {
            organization: orgId,
            orderDate: { $gte: sixMonthsAgo },
            orderStatus: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$orderDate' },
              month: { $month: '$orderDate' },
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      FinanceTransaction.aggregate([
        {
          $match: {
            organization: orgId,
            type: 'expense',
            transactionDate: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$transactionDate' },
              month: { $month: '$transactionDate' },
            },
            expenses: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    // Format monthly chart data with month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      trendMap[key] = { month: label, revenue: 0, expenses: 0, orders: 0 };
    }

    monthlyRevenueTrends.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (trendMap[key]) {
        trendMap[key].revenue = item.revenue;
        trendMap[key].orders = item.orders;
      }
    });

    monthlyExpenseTrends.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (trendMap[key]) {
        trendMap[key].expenses = item.expenses;
      }
    });

    const monthlyTrends = Object.values(trendMap);

    // 3. Inventory stock distribution
    const inventoryDistribution = await Product.aggregate([
      { $match: { organization: orgId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$availableQuantity' },
          totalValue: { $sum: { $multiply: ['$availableQuantity', '$costPrice'] } },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    // 4. Recent activities
    const [recentOrders, recentTransactions, upcomingTasks, recentNotifications] = await Promise.all([
      SalesOrder.find({ organization: orgId })
        .sort({ orderDate: -1 })
        .limit(5)
        .populate('customer', 'name company'),
      FinanceTransaction.find({ organization: orgId })
        .sort({ transactionDate: -1 })
        .limit(5),
      Task.find({
        organization: orgId,
        status: { $in: ['todo', 'in_progress', 'review'] },
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate('assignee', 'fullName profileImage')
        .populate('project', 'name'),
      Notification.find({ organization: orgId })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          totalExpenses,
          netProfit,
          totalOrders: totalOrdersCount,
          totalCustomers: customerCount,
          totalEmployees: employeeCount,
          lowStockCount: lowStockProducts.length,
          pendingTasks: pendingTasksCount,
        },
        charts: {
          monthlyTrends,
          orderStatusDistribution,
          inventoryDistribution,
        },
        activities: {
          recentOrders,
          recentTransactions,
          upcomingTasks,
          lowStockProducts,
          recentNotifications,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
