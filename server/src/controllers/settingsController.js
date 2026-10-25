import { Organization, User, AuditLog } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

// @desc    Get organization profile
// @route   GET /api/settings/organization
export const getOrganizationSettings = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    res.status(200).json({
      success: true,
      data: org,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update organization profile
// @route   PUT /api/settings/organization
export const updateOrganizationSettings = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    const {
      name,
      currency,
      currencySymbol,
      phone,
      email,
      taxNumber,
      address,
      settings,
    } = req.body;

    if (name) org.name = name;
    if (currency) org.currency = currency.toUpperCase();
    if (currencySymbol) org.currencySymbol = currencySymbol;
    if (phone !== undefined) org.phone = phone;
    if (email !== undefined) org.email = email;
    if (taxNumber !== undefined) org.taxNumber = taxNumber;
    if (address) org.address = { ...org.address, ...address };
    if (settings) org.settings = { ...org.settings, ...settings };

    await org.save();

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      module: 'settings',
      details: { name: org.name, currency: org.currency },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: org,
      message: 'Organization settings updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users in organization
// @route   GET /api/settings/users
export const getOrganizationUsers = async (req, res, next) => {
  try {
    const users = await User.find({ organization: req.orgId })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new user to organization
// @route   POST /api/settings/users
export const createOrganizationUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'employee', department = 'Operations', phone = '' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and initial password are required.',
      });
    }

    // Check duplicate
    const existing = await User.findOne({ organization: req.orgId, email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists in your organization.',
      });
    }

    const newUser = await User.create({
      organization: req.orgId,
      name,
      email: email.toLowerCase(),
      password,
      role,
      department,
      phone,
      status: 'active',
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_CREATED',
      module: 'settings',
      details: { email: newUser.email, role: newUser.role },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: userObj,
      message: 'User created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role or status
// @route   PUT /api/settings/users/:id
export const updateOrganizationUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, organization: req.orgId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Protect self-lockout
    if (user._id.toString() === req.user._id.toString() && req.body.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own active account.',
      });
    }

    const { role, status, department } = req.body;
    if (role) user.role = role;
    if (status) user.status = status;
    if (department) user.department = department;

    await user.save();

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_ROLE_UPDATED',
      module: 'settings',
      details: { targetUser: user.email, role: user.role, status: user.status },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit trail logs
// @route   GET /api/settings/audit-logs
export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, module } = req.query;
    const query = { organization: req.orgId };

    if (module && module !== 'all') {
      query.module = module;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
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
