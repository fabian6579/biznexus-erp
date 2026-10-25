import { Product, InventoryTransaction, SalesOrder, PurchaseOrder } from '../models/index.js';
import { logAudit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

// @desc    Get all products with search, category & low-stock filtering
// @route   GET /api/products
export const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      lowStock = 'false',
      sortBy = 'name',
      order = 'asc',
    } = req.query;

    const query = { organization: req.orgId };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$availableQuantity', '$minStockLevel'] };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('supplier', 'companyName supplierId'),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: products,
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

// @desc    Get product by ID with stock movement history
// @route   GET /api/products/:id
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.orgId,
    }).populate('supplier', 'companyName contactPerson email phone supplierId');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const movements = await InventoryTransaction.find({
      organization: req.orgId,
      product: product._id,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        movements,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      description,
      costPrice,
      sellingPrice,
      availableQuantity = 0,
      minStockLevel = 10,
      unit = 'units',
      supplier,
    } = req.body;

    if (!name || costPrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product name, cost price, and selling price are required.',
      });
    }

    let sku = req.body.sku;
    if (!sku) {
      const count = await Product.countDocuments({ organization: req.orgId });
      sku = `SKU-${String(count + 1001).padStart(4, '0')}`;
    }

    const existing = await Product.findOne({ organization: req.orgId, sku: sku.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `SKU '${sku}' already exists in your organization.`,
      });
    }

    const product = await Product.create({
      organization: req.orgId,
      sku: sku.toUpperCase(),
      name,
      category: category || 'Hardware',
      description: description || '',
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      availableQuantity: Number(availableQuantity),
      minStockLevel: Number(minStockLevel),
      unit: unit || 'units',
      supplier: supplier || null,
    });

    // Record initial stock transaction if stock > 0
    if (Number(availableQuantity) > 0) {
      await InventoryTransaction.create({
        organization: req.orgId,
        product: product._id,
        type: 'initial_stock',
        quantity: Number(availableQuantity),
        balanceAfter: Number(availableQuantity),
        unitCost: Number(costPrice),
        reason: 'Initial opening stock',
        createdBy: req.user._id,
      });
    }

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PRODUCT_CREATED',
      module: 'inventory',
      details: { sku: product.sku, name: product.name },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const allowedUpdates = [
      'name', 'category', 'description', 'costPrice',
      'sellingPrice', 'minStockLevel', 'unit', 'supplier', 'status'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'costPrice' || field === 'sellingPrice' || field === 'minStockLevel') {
          product[field] = Number(req.body[field]);
        } else {
          product[field] = req.body[field];
        }
      }
    });

    await product.save();

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PRODUCT_UPDATED',
      module: 'inventory',
      details: { sku: product.sku, name: product.name },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: product,
      message: 'Product updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Check if product is in any sales or purchase order
    const [salesCount, poCount] = await Promise.all([
      SalesOrder.countDocuments({ organization: req.orgId, 'items.product': product._id }),
      PurchaseOrder.countDocuments({ organization: req.orgId, 'items.product': product._id }),
    ]);

    if (salesCount > 0 || poCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product referenced in ${salesCount} sales orders and ${poCount} purchase orders. Set status to 'discontinued' instead.`,
      });
    }

    await Product.findByIdAndDelete(product._id);

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PRODUCT_DELETED',
      module: 'inventory',
      details: { sku: product.sku, name: product.name },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust inventory manually (Audit/Loss/Gain)
// @route   POST /api/products/:id/adjust
export const adjustStock = async (req, res, next) => {
  try {
    const { adjustmentQuantity, reason } = req.body;

    if (adjustmentQuantity === undefined || Number(adjustmentQuantity) === 0) {
      return res.status(400).json({
        success: false,
        message: 'A non-zero adjustment quantity is required.',
      });
    }

    const qty = Number(adjustmentQuantity);

    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (product.availableQuantity + qty < 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock! Current stock: ${product.availableQuantity}, cannot deduct ${Math.abs(qty)}.`,
      });
    }

    product.availableQuantity += qty;
    await product.save();

    const transaction = await InventoryTransaction.create({
      organization: req.orgId,
      product: product._id,
      type: 'adjustment',
      quantity: qty,
      balanceAfter: product.availableQuantity,
      unitCost: product.costPrice,
      reason: reason || 'Manual stock adjustment',
      referenceModel: 'ManualAdjustment',
      createdBy: req.user._id,
    });

    // Check low stock trigger
    if (product.availableQuantity <= product.minStockLevel) {
      await createNotification(req.orgId, {
        title: 'Low Stock Alert',
        message: `${product.name} (${product.sku}) has reached low stock level: ${product.availableQuantity} ${product.unit} left.`,
        type: 'low_stock',
        link: `/inventory`,
        metadata: { productId: product._id, sku: product.sku },
      });
    }

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'STOCK_ADJUSTED',
      module: 'inventory',
      details: { sku: product.sku, adjustment: qty, balance: product.availableQuantity },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: {
        product,
        transaction,
      },
      message: 'Stock adjusted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all inventory transaction movements
// @route   GET /api/products/movements/all
export const getInventoryMovements = async (req, res, next) => {
  try {
    const { page = 1, limit = 15, type = '' } = req.query;
    const query = { organization: req.orgId };

    if (type && type !== 'all') {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movements, total] = await Promise.all([
      InventoryTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('product', 'name sku unit')
        .populate('createdBy', 'name'),
      InventoryTransaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: movements,
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
