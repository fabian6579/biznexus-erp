import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    trim: true,
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    default: '',
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['Management', 'Sales', 'Purchasing', 'Inventory', 'Finance', 'Engineering', 'Human Resources', 'Operations', 'Customer Support'],
    default: 'Operations',
  },
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
  },
  joiningDate: {
    type: Date,
    default: Date.now,
  },
  employmentStatus: {
    type: String,
    enum: ['active', 'on_leave', 'terminated'],
    default: 'active',
  },
  salary: {
    type: Number,
    default: 0,
    min: 0,
  },
  profileImage: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relationship: { type: String, default: '' },
  },
  userAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

employeeSchema.index({ organization: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ organization: 1, email: 1 });

export const Employee = mongoose.model('Employee', employeeSchema);
