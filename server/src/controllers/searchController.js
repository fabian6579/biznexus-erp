import {
  Customer,
  Product,
  SalesOrder,
  Employee,
  Invoice,
  Task,
} from '../models/index.js';

// @desc    Global search across modules
// @route   GET /api/search
export const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          customers: [],
          products: [],
          orders: [],
          employees: [],
          invoices: [],
          tasks: [],
        },
      });
    }

    const regex = { $regex: q.trim(), $options: 'i' };
    const orgId = req.orgId;

    const [customers, products, orders, employees, invoices, tasks] = await Promise.all([
      Customer.find({
        organization: orgId,
        $or: [{ name: regex }, { customerId: regex }, { company: regex }, { email: regex }],
      })
        .select('name customerId company email')
        .limit(5),

      Product.find({
        organization: orgId,
        $or: [{ name: regex }, { sku: regex }, { category: regex }],
      })
        .select('name sku category sellingPrice availableQuantity unit')
        .limit(5),

      SalesOrder.find({
        organization: orgId,
        $or: [{ orderNumber: regex }],
      })
        .select('orderNumber totalAmount orderStatus paymentStatus orderDate')
        .populate('customer', 'name')
        .limit(5),

      Employee.find({
        organization: orgId,
        $or: [{ fullName: regex }, { employeeId: regex }, { department: regex }, { jobTitle: regex }],
      })
        .select('fullName employeeId jobTitle department profileImage')
        .limit(5),

      Invoice.find({
        organization: orgId,
        $or: [{ invoiceNumber: regex }],
      })
        .select('invoiceNumber totalAmount balanceDue status issueDate')
        .limit(5),

      Task.find({
        organization: orgId,
        $or: [{ title: regex }, { taskId: regex }],
      })
        .select('title taskId priority status dueDate')
        .limit(5),
    ]);

    res.status(200).json({
      success: true,
      data: {
        customers,
        products,
        orders,
        employees,
        invoices,
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};
