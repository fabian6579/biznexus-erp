import {
  PurchaseOrder,
  Product,
  Supplier,
  InventoryTransaction,
} from '../models/index.js';
import { logAudit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

// @desc    Get all purchase orders with filtering & pagination
// @route   GET /api/purchases
export const getPurchaseOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      paymentStatus = '',
      sortBy = 'orderDate',
      order = 'desc',
    } = req.query;

    const query = { organization: req.orgId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      const matchingSuppliers = await Supplier.find({
        organization: req.orgId,
        $or: [
          { companyName: { $regex: search, $options: 'i' } },
          { contactPerson: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const supplierIds = matchingSuppliers.map((s) => s._id);

      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { supplier: { $in: supplierIds } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [purchases, total] = await Promise.all([
      PurchaseOrder.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('supplier', 'companyName contactPerson email phone supplierId')
        .populate('createdBy', 'name'),
      PurchaseOrder.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: purchases,
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

// @desc    Get purchase order by ID
// @route   GET /api/purchases/:id
export const getPurchaseOrderById = async (req, res, next) => {
  try {
    const purchase = await PurchaseOrder.findOne({
      _id: req.params.id,
      organization: req.orgId,
    })
      .populate('supplier')
      .populate('items.product', 'name sku unit costPrice availableQuantity')
      .populate('createdBy', 'name email');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new purchase order
// @route   POST /api/purchases
export const createPurchaseOrder = async (req, res, next) => {
  try {
    const {
      supplier: supplierId,
      items,
      expectedDate,
      notes,
    } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier and at least one item are required.',
      });
    }

    const supplier = await Supplier.findOne({ _id: supplierId, organization: req.orgId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Selected supplier not found.' });
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, organization: req.orgId });
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ID '${item.product}' not found.`,
        });
      }

      const orderedQuantity = Number(item.orderedQuantity || item.quantity);
      if (orderedQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product ${product.name}.`,
        });
      }

      const unitCost = item.unitCost !== undefined ? Number(item.unitCost) : product.costPrice;
      const subtotal = Math.round(orderedQuantity * unitCost * 100) / 100;
      calculatedTotal += subtotal;

      validatedItems.push({
        product: product._id,
        sku: product.sku,
        productName: product.name,
        orderedQuantity,
        receivedQuantity: 0,
        unitCost,
        subtotal,
      });
    }

    const count = await PurchaseOrder.countDocuments({ organization: req.orgId });
    const poNumber = `PO-${String(count + 10001).padStart(5, '0')}`;

    const purchase = await PurchaseOrder.create({
      organization: req.orgId,
      poNumber,
      supplier: supplier._id,
      items: validatedItems,
      totalAmount: calculatedTotal,
      expectedDate: expectedDate || null,
      notes: notes || '',
      createdBy: req.user._id,
      status: 'ordered',
    });

    await createNotification(req.orgId, {
      title: 'Purchase Order Placed',
      message: `PO ${purchase.poNumber} placed with ${supplier.companyName} for ₹${purchase.totalAmount.toLocaleString()}.`,
      type: 'purchase_status',
      link: `/purchases/${purchase._id}`,
      metadata: { poId: purchase._id, poNumber: purchase.poNumber },
    });

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PURCHASE_ORDER_CREATED',
      module: 'purchases',
      details: { poNumber: purchase.poNumber, total: purchase.totalAmount },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: purchase,
      message: 'Purchase order created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record goods received from supplier
// @route   PATCH /api/purchases/:id/receive
export const receiveGoods = async (req, res, next) => {
  try {
    const { receivedItems } = req.body; // array of { product, quantityReceived }

    if (!receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide items and quantities received.',
      });
    }

    const purchase = await PurchaseOrder.findOne({
      _id: req.params.id,
      organization: req.orgId,
    }).populate('supplier', 'companyName');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    if (purchase.status === 'received') {
      return res.status(400).json({
        success: false,
        message: 'This purchase order has already been fully received.',
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot receive goods on a cancelled purchase order.',
      });
    }

    // Process each item received
    for (const recItem of receivedItems) {
      const targetItem = purchase.items.find(
        (it) => it.product.toString() === recItem.product.toString()
      );

      if (!targetItem) {
        return res.status(400).json({
          success: false,
          message: `Product ID '${recItem.product}' is not part of this purchase order.`,
        });
      }

      const qtyToReceive = Number(recItem.quantityReceived);
      if (qtyToReceive <= 0) continue;

      const remainingAllowed = targetItem.orderedQuantity - targetItem.receivedQuantity;
      if (qtyToReceive > remainingAllowed) {
        return res.status(400).json({
          success: false,
          message: `Cannot receive ${qtyToReceive} for ${targetItem.productName}. Outstanding balance is only ${remainingAllowed}.`,
        });
      }

      // Update item in purchase order
      targetItem.receivedQuantity += qtyToReceive;

      // Update product inventory stock
      const product = await Product.findOne({
        _id: targetItem.product,
        organization: req.orgId,
      });

      if (product) {
        product.availableQuantity += qtyToReceive;
        // Also update cost price if new cost provided
        if (targetItem.unitCost > 0) {
          product.costPrice = targetItem.unitCost;
        }
        await product.save();

        // Record stock movement transaction
        await InventoryTransaction.create({
          organization: req.orgId,
          product: product._id,
          type: 'purchase_received',
          quantity: qtyToReceive,
          balanceAfter: product.availableQuantity,
          unitCost: targetItem.unitCost,
          referenceId: purchase.poNumber,
          referenceModel: 'PurchaseOrder',
          reason: `Goods received against PO ${purchase.poNumber}`,
          createdBy: req.user._id,
        });
      }
    }

    // Determine new status
    const allFullyReceived = purchase.items.every(
      (it) => it.receivedQuantity >= it.orderedQuantity
    );
    const anyReceived = purchase.items.some((it) => it.receivedQuantity > 0);

    purchase.status = allFullyReceived ? 'received' : anyReceived ? 'partially_received' : 'ordered';
    await purchase.save();

    await createNotification(req.orgId, {
      title: 'Goods Received',
      message: `Goods received for PO ${purchase.poNumber} (${purchase.status}). Stock updated.`,
      type: 'purchase_status',
      link: `/purchases/${purchase._id}`,
      metadata: { poId: purchase._id, poNumber: purchase.poNumber },
    });

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'GOODS_RECEIVED',
      module: 'purchases',
      details: { poNumber: purchase.poNumber, status: purchase.status },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: purchase,
      message: `Goods received recorded successfully. Status: ${purchase.status}`,
    });
  } catch (error) {
    next(error);
  }
};
