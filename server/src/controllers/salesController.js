import {
  SalesOrder,
  Product,
  Customer,
  InventoryTransaction,
  Invoice,
} from '../models/index.js';
import { logAudit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

// @desc    Get all sales orders with filtering & pagination
// @route   GET /api/sales
export const getSalesOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      orderStatus = '',
      paymentStatus = '',
      startDate,
      endDate,
      sortBy = 'orderDate',
      order = 'desc',
    } = req.query;

    const query = { organization: req.orgId };

    if (orderStatus && orderStatus !== 'all') {
      query.orderStatus = orderStatus;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    if (search) {
      // Find matching customer IDs first
      const matchingCustomers = await Customer.find({
        organization: req.orgId,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const customerIds = matchingCustomers.map((c) => c._id);

      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customer: { $in: customerIds } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      SalesOrder.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('customer', 'name company email phone customerId')
        .populate('createdBy', 'name'),
      SalesOrder.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
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

// @desc    Get sales order by ID
// @route   GET /api/sales/:id
export const getSalesOrderById = async (req, res, next) => {
  try {
    const salesOrder = await SalesOrder.findOne({
      _id: req.params.id,
      organization: req.orgId,
    })
      .populate('customer', 'name company email phone address customerId')
      .populate('items.product', 'name sku unit sellingPrice availableQuantity')
      .populate('createdBy', 'name email');

    if (!salesOrder) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    // Check if an invoice already exists for this order
    const invoice = await Invoice.findOne({
      organization: req.orgId,
      salesOrder: salesOrder._id,
    });

    res.status(200).json({
      success: true,
      data: {
        ...salesOrder.toObject(),
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new sales order
// @route   POST /api/sales
export const createSalesOrder = async (req, res, next) => {
  try {
    const {
      customer: customerId,
      items,
      discount = 0,
      taxRate = 18,
      shippingAddress,
      notes,
      orderStatus = 'pending',
    } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer and at least one item are required.',
      });
    }

    const customer = await Customer.findOne({ _id: customerId, organization: req.orgId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Selected customer not found.' });
    }

    // Validate line items and calculate subtotal
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, organization: req.orgId });
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ID '${item.product}' not found.`,
        });
      }

      const quantity = Number(item.quantity);
      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product ${product.name}.`,
        });
      }

      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : product.sellingPrice;
      const subtotal = Math.round(quantity * unitPrice * 100) / 100;
      calculatedSubtotal += subtotal;

      validatedItems.push({
        product: product._id,
        sku: product.sku,
        productName: product.name,
        quantity,
        unitPrice,
        subtotal,
      });
    }

    const discountAmount = Math.max(0, Number(discount));
    const taxableAmount = Math.max(0, calculatedSubtotal - discountAmount);
    const taxAmount = Math.round((taxableAmount * (Number(taxRate) / 100)) * 100) / 100;
    const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    // Generate unique order number
    const count = await SalesOrder.countDocuments({ organization: req.orgId });
    const orderNumber = `SO-${String(count + 10001).padStart(5, '0')}`;

    const order = await SalesOrder.create({
      organization: req.orgId,
      orderNumber,
      customer: customer._id,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount: discountAmount,
      taxRate: Number(taxRate),
      taxAmount,
      totalAmount,
      orderStatus,
      shippingAddress: shippingAddress || `${customer.address?.street || ''}, ${customer.address?.city || ''}`,
      notes: notes || '',
      createdBy: req.user._id,
      isStockDeducted: false,
    });

    // If initial status is confirmed or fulfilled, deduct stock right away
    if (orderStatus === 'confirmed' || orderStatus === 'fulfilled') {
      await deductStockForOrder(order, req.user._id, req.orgId);
    }

    await createNotification(req.orgId, {
      title: 'New Sales Order Created',
      message: `Order ${order.orderNumber} for ${customer.name} (Amount: ₹${order.totalAmount.toLocaleString()}) created.`,
      type: 'order_status',
      link: `/sales/${order._id}`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber },
    });

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SALES_ORDER_CREATED',
      module: 'sales',
      details: { orderNumber: order.orderNumber, total: order.totalAmount },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Sales order created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to deduct stock safely and log transactions
const deductStockForOrder = async (order, userId, orgId) => {
  if (order.isStockDeducted) return;

  for (const item of order.items) {
    const product = await Product.findOne({ _id: item.product, organization: orgId });
    if (product) {
      if (product.availableQuantity < item.quantity) {
        throw new Error(
          `Insufficient inventory for '${product.name}' (SKU: ${product.sku}). Required: ${item.quantity}, Available: ${product.availableQuantity}.`
        );
      }

      product.availableQuantity -= item.quantity;
      await product.save();

      await InventoryTransaction.create({
        organization: orgId,
        product: product._id,
        type: 'sales_fulfilled',
        quantity: -item.quantity,
        balanceAfter: product.availableQuantity,
        unitCost: product.costPrice,
        referenceId: order.orderNumber,
        referenceModel: 'SalesOrder',
        reason: `Fulfilled sales order ${order.orderNumber}`,
        createdBy: userId,
      });

      // Low stock notification if reached threshold
      if (product.availableQuantity <= product.minStockLevel) {
        await createNotification(orgId, {
          title: 'Low Stock Alert',
          message: `${product.name} (${product.sku}) is running low (${product.availableQuantity} left) after fulfilling order ${order.orderNumber}.`,
          type: 'low_stock',
          link: '/inventory',
          metadata: { productId: product._id, sku: product.sku },
        });
      }
    }
  }

  order.isStockDeducted = true;
  await order.save();

  // Update customer summary
  await Customer.findByIdAndUpdate(order.customer, {
    $inc: { ordersCount: 1, totalSpent: order.totalAmount },
  });
};

// Helper function to reverse stock upon order cancellation
const reverseStockForOrder = async (order, userId, orgId) => {
  if (!order.isStockDeducted) return;

  for (const item of order.items) {
    const product = await Product.findOne({ _id: item.product, organization: orgId });
    if (product) {
      product.availableQuantity += item.quantity;
      await product.save();

      await InventoryTransaction.create({
        organization: orgId,
        product: product._id,
        type: 'return',
        quantity: item.quantity,
        balanceAfter: product.availableQuantity,
        unitCost: product.costPrice,
        referenceId: order.orderNumber,
        referenceModel: 'SalesOrder',
        reason: `Restocked from cancelled sales order ${order.orderNumber}`,
        createdBy: userId,
      });
    }
  }

  order.isStockDeducted = false;
  await order.save();

  // Deduct from customer summary
  await Customer.findByIdAndUpdate(order.customer, {
    $inc: { ordersCount: -1, totalSpent: -order.totalAmount },
  });
};

// @desc    Update sales order status
// @route   PATCH /api/sales/:id/status
export const updateSalesOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'pending', 'confirmed', 'processing', 'fulfilled', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await SalesOrder.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    if (order.orderStatus === 'fulfilled' && status === 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Cannot revert a fulfilled order back to draft.',
      });
    }

    const previousStatus = order.orderStatus;

    // Handle stock deduction on confirmation/fulfillment
    if ((status === 'confirmed' || status === 'fulfilled') && !order.isStockDeducted) {
      await deductStockForOrder(order, req.user._id, req.orgId);
    }

    // Handle stock restoration on cancellation
    if (status === 'cancelled' && order.isStockDeducted) {
      await reverseStockForOrder(order, req.user._id, req.orgId);
    }

    order.orderStatus = status;
    await order.save();

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SALES_STATUS_UPDATED',
      module: 'sales',
      details: { orderNumber: order.orderNumber, from: previousStatus, to: status },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: order,
      message: `Order status updated to '${status}'.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate invoice from sales order
// @route   POST /api/sales/:id/invoice
export const generateInvoiceFromOrder = async (req, res, next) => {
  try {
    const order = await SalesOrder.findOne({
      _id: req.params.id,
      organization: req.orgId,
    }).populate('customer');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    // Check if invoice already exists
    let invoice = await Invoice.findOne({
      organization: req.orgId,
      salesOrder: order._id,
    });

    if (invoice) {
      return res.status(200).json({
        success: true,
        data: invoice,
        message: 'Invoice already exists for this order.',
      });
    }

    const invCount = await Invoice.countDocuments({ organization: req.orgId });
    const invoiceNumber = `INV-${String(invCount + 10001).padStart(5, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days net terms

    invoice = await Invoice.create({
      organization: req.orgId,
      invoiceNumber,
      customer: order.customer._id,
      salesOrder: order._id,
      issueDate: new Date(),
      dueDate,
      items: order.items.map((it) => ({
        description: `${it.productName} (${it.sku})`,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal,
      })),
      subtotal: order.subtotal - order.discount,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      paidAmount: order.paidAmount,
      balanceDue: order.totalAmount - order.paidAmount,
      status: order.paidAmount >= order.totalAmount ? 'paid' : order.paidAmount > 0 ? 'partially_paid' : 'sent',
      notes: order.notes,
    });

    res.status(201).json({
      success: true,
      data: invoice,
      message: `Invoice ${invoice.invoiceNumber} created successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
