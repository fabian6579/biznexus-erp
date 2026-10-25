import jwt from 'jsonwebtoken';
import { User, Organization } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'biznexus_super_secret_jwt_key_2026_secure_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  res.cookie('token', token, cookieOptions);

  // Exclude password from response
  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    token,
    user: userObj,
  });
};

// @desc    Register a new organization and business owner
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, organizationName, organizationCode, phone } = req.body;

    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and organization name are required.',
      });
    }

    // Check if organization code exists or generate one
    const code = (organizationCode || organizationName.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') + Math.floor(100 + Math.random() * 900));
    
    let org = await Organization.findOne({ code });
    if (org) {
      return res.status(400).json({
        success: false,
        message: `Organization code '${code}' already exists. Please provide a unique code.`,
      });
    }

    // Create organization
    org = await Organization.create({
      name: organizationName,
      code,
      email,
      phone: phone || '',
      currency: 'INR',
      currencySymbol: '₹',
    });

    // Check if user email already exists in this org
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    // Create business owner
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'business_owner',
      organization: org._id,
      phone: phone || '',
    });

    await logAudit({
      organization: org._id,
      user: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'ORGANIZATION_REGISTERED',
      module: 'auth',
      details: { organizationName: org.name, code: org.code },
      ipAddress: req.ip,
    });

    user.organization = org;
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Find user by email and include password field
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('organization');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Contact your business administrator.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await logAudit({
      organization: user.organization._id,
      user: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      module: 'auth',
      details: { email: user.email },
      ipAddress: req.ip,
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
export const logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'User successfully logged out.',
  });
};

// @desc    Get currently logged in user
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
    organization: req.organization,
  });
};

// @desc    Update profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, department } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (department && req.user.role === 'business_owner') user.department = department;

    await user.save();

    res.status(200).json({
      success: true,
      user,
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.',
      });
    }

    user.password = newPassword;
    await user.save();

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PASSWORD_CHANGED',
      module: 'auth',
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
