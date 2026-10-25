import { Supplier, PurchaseOrder } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

// @desc    Get all suppliers with search and pagination
// @route   GET /api/suppliers
export const getSuppliers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sortBy = 'companyName',
      order = 'asc',
    } = req.query;

    const query = { organization: req.orgId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { supplierId: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [suppliers, total] = await Promise.all([
      Supplier.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit)),
      Supplier.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: suppliers,
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

// @desc    Get supplier by ID with purchase order history
// @route   GET /api/suppliers/:id
export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    const purchases = await PurchaseOrder.find({
      organization: req.orgId,
      supplier: supplier._id,
    })
      .sort({ orderDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        ...supplier.toObject(),
        purchases,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new supplier
// @route   POST /api/suppliers
export const createSupplier = async (req, res, next) => {
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      paymentTerms,
      status,
      rating,
    } = req.body;

    if (!companyName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Company name and email are required.',
      });
    }

    let supplierId = req.body.supplierId;
    if (!supplierId) {
      const count = await Supplier.countDocuments({ organization: req.orgId });
      supplierId = `SUP-${String(count + 1001).padStart(4, '0')}`;
    }

    const existing = await Supplier.findOne({ organization: req.orgId, supplierId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Supplier ID '${supplierId}' already exists.`,
      });
    }

    const supplier = await Supplier.create({
      organization: req.orgId,
      supplierId,
      companyName,
      contactPerson: contactPerson || '',
      email: email.toLowerCase(),
      phone: phone || '',
      address: address || {},
      paymentTerms: paymentTerms || 'Net 30',
      status: status || 'active',
      rating: rating ? Number(rating) : 5,
    });

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUPPLIER_CREATED',
      module: 'purchases',
      details: { supplierId: supplier.supplierId, companyName: supplier.companyName },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    const allowedUpdates = [
      'companyName', 'contactPerson', 'email', 'phone',
      'address', 'paymentTerms', 'status', 'rating'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        supplier[field] = req.body[field];
      }
    });

    await supplier.save();

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUPPLIER_UPDATED',
      module: 'purchases',
      details: { supplierId: supplier.supplierId },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    const purchasesCount = await PurchaseOrder.countDocuments({
      organization: req.orgId,
      supplier: supplier._id,
    });

    if (purchasesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier with ${purchasesCount} associated purchase order(s). Mark status 'inactive' instead.`,
      });
    }

    await Supplier.findByIdAndDelete(supplier._id);

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUPPLIER_DELETED',
      module: 'purchases',
      details: { supplierId: supplier.supplierId },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
