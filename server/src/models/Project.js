import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  projectId: {
    type: String,
    required: [true, 'Project ID is required'],
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  budget: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'active',
  },
  progressPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  }],
}, {
  timestamps: true,
});

projectSchema.index({ organization: 1, projectId: 1 }, { unique: true });
projectSchema.index({ organization: 1, status: 1 });

export const Project = mongoose.model('Project', projectSchema);
