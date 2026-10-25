import { Customer, SalesOrder, FinanceTransaction } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

// @desc    Get all customers with filtering, search, pagination
// @route   GET /api/customers
export const getCustomers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      leadStatus = '',
      customerType = '',
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = { organization: req.orgId };

    if (leadStatus && leadStatus !== 'all') {
      query.leadStatus = leadStatus;
    }

    if (customerType && customerType !== 'all') {
      query.customerType = customerType;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedEmployee', 'fullName employeeId jobTitle'),
      Customer.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: customers,
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

// @desc    Get customer by ID with sales orders and transaction history
// @route   GET /api/customers/:id
export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      organization: req.orgId,
    }).populate('assignedEmployee', 'fullName employeeId email jobTitle');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const [orders, transactions] = await Promise.all([
      SalesOrder.find({ organization: req.orgId, customer: customer._id })
        .sort({ orderDate: -1 })
        .limit(10),
      FinanceTransaction.find({ organization: req.orgId, relatedCustomer: customer._id })
        .sort({ transactionDate: -1 })
        .limit(10),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...customer.toObject(),
        orders,
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/customers
export const createCustomer = async (req, res, next) => {
  try {
    const {
      name,
      company,
      email,
      phone,
      address,
      customerType,
      leadStatus,
      assignedEmployee,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and email are required.',
      });
    }

    let customerId = req.body.customerId;
    if (!customerId) {
      const count = await Customer.countDocuments({ organization: req.orgId });
      customerId = `CUST-${String(count + 1001).padStart(4, '0')}`;
    }

    const existing = await Customer.findOne({ organization: req.orgId, customerId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Customer ID '${customerId}' already exists in your organization.`,
      });
    }

    const customer = await Customer.create({
      organization: req.orgId,
      customerId,
      name,
      company: company || '',
      email: email.toLowerCase(),
      phone: phone || '',
      address: address || {},
      customerType: customerType || 'business',
      leadStatus: leadStatus || 'customer',
      assignedEmployee: assignedEmployee || null,
    });

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CUSTOMER_CREATED',
      module: 'customers',
      details: { customerId: customer.customerId, name: customer.name },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const allowedUpdates = [
      'name', 'company', 'email', 'phone', 'address',
      'customerType', 'leadStatus', 'assignedEmployee'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });

    await customer.save();

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CUSTOMER_UPDATED',
      module: 'customers',
      details: { customerId: customer.customerId },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Safety check: existing orders?
    const ordersCount = await SalesOrder.countDocuments({
      organization: req.orgId,
      customer: customer._id,
    });

    if (ordersCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer with ${ordersCount} associated sales order(s). Set status to 'inactive' instead.`,
      });
    }

    await Customer.findByIdAndDelete(customer._id);

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CUSTOMER_DELETED',
      module: 'customers',
      details: { customerId: customer.customerId, name: customer.name },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add customer note
// @route   POST /api/customers/:id/notes
export const addCustomerNote = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Note content is required.' });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    customer.notes.unshift({
      content,
      author: req.user.name,
      createdAt: new Date(),
    });

    await customer.save();

    res.status(200).json({
      success: true,
      data: customer.notes,
      message: 'Note added successfully.',
    });
  } catch (error) {
    next(error);
  }
};
