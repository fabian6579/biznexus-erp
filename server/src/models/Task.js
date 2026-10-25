import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  taskId: {
    type: String,
    required: [true, 'Task ID is required'],
    trim: true,
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'completed'],
    default: 'todo',
  },
  dueDate: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

taskSchema.index({ organization: 1, taskId: 1 }, { unique: true });
taskSchema.index({ organization: 1, status: 1 });
taskSchema.index({ organization: 1, assignee: 1 });
taskSchema.index({ organization: 1, project: 1 });
taskSchema.index({ organization: 1, dueDate: 1 });

export const Task = mongoose.model('Task', taskSchema);
