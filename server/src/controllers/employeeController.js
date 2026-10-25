import { Employee, Task, Project } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

// @desc    Get all employees with filters, search & pagination
// @route   GET /api/employees
export const getEmployees = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      department = '',
      employmentStatus = '',
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = { organization: req.orgId };

    if (department && department !== 'all') {
      query.department = department;
    }

    if (employmentStatus && employmentStatus !== 'all') {
      query.employmentStatus = employmentStatus;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [employees, total] = await Promise.all([
      Employee.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userAccount', 'role status'),
      Employee.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: employees,
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

// @desc    Get single employee details
// @route   GET /api/employees/:id
export const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      organization: req.orgId,
    }).populate('userAccount', 'role status email');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Fetch assigned tasks and projects
    const [tasks, projects] = await Promise.all([
      Task.find({ organization: req.orgId, assignee: employee._id }).sort({ dueDate: 1 }).limit(10),
      Project.find({ organization: req.orgId, teamMembers: employee._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...employee.toObject(),
        tasks,
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new employee
// @route   POST /api/employees
export const createEmployee = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      department,
      jobTitle,
      joiningDate,
      employmentStatus,
      salary,
      profileImage,
      address,
      emergencyContact,
    } = req.body;

    if (!fullName || !email || !jobTitle) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and job title are required.',
      });
    }

    // Auto-generate employeeId if not supplied
    let employeeId = req.body.employeeId;
    if (!employeeId) {
      const count = await Employee.countDocuments({ organization: req.orgId });
      employeeId = `EMP-${String(count + 1001).padStart(4, '0')}`;
    }

    // Check duplicate ID
    const existing = await Employee.findOne({ organization: req.orgId, employeeId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Employee ID '${employeeId}' already exists in your organization.`,
      });
    }

    const employee = await Employee.create({
      organization: req.orgId,
      employeeId,
      fullName,
      email: email.toLowerCase(),
      phone: phone || '',
      department: department || 'Operations',
      jobTitle,
      joiningDate: joiningDate || Date.now(),
      employmentStatus: employmentStatus || 'active',
      salary: salary ? Number(salary) : 0,
      profileImage: profileImage || '',
      address: address || '',
      emergencyContact: emergencyContact || {},
    });

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EMPLOYEE_CREATED',
      module: 'employees',
      details: { employeeId: employee.employeeId, fullName: employee.fullName },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: employee,
      message: 'Employee created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
export const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const allowedUpdates = [
      'fullName', 'email', 'phone', 'department', 'jobTitle',
      'joiningDate', 'employmentStatus', 'salary', 'profileImage',
      'address', 'emergencyContact'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    await employee.save();

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EMPLOYEE_UPDATED',
      module: 'employees',
      details: { employeeId: employee.employeeId },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: employee,
      message: 'Employee updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Safety check: is employee assigned to active tasks?
    const activeTasks = await Task.countDocuments({
      organization: req.orgId,
      assignee: employee._id,
      status: { $in: ['todo', 'in_progress', 'review'] },
    });

    if (activeTasks > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete employee with ${activeTasks} active task(s). Reassign them first or change status to 'terminated'.`,
      });
    }

    await Employee.findByIdAndDelete(employee._id);

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EMPLOYEE_DELETED',
      module: 'employees',
      details: { employeeId: employee.employeeId, fullName: employee.fullName },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get employee statistics
// @route   GET /api/employees/stats
export const getEmployeeStats = async (req, res, next) => {
  try {
    const [total, active, onLeave, departmentBreakdown] = await Promise.all([
      Employee.countDocuments({ organization: req.orgId }),
      Employee.countDocuments({ organization: req.orgId, employmentStatus: 'active' }),
      Employee.countDocuments({ organization: req.orgId, employmentStatus: 'on_leave' }),
      Employee.aggregate([
        { $match: { organization: req.orgId } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        onLeave,
        departmentBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
