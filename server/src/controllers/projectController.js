import { Project, Task, Employee, Customer } from '../models/index.js';
import { logAudit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

// Helper to recalculate project progress
const recalculateProjectProgress = async (projectId, orgId) => {
  const [totalTasks, completedTasks] = await Promise.all([
    Task.countDocuments({ organization: orgId, project: projectId }),
    Task.countDocuments({ organization: orgId, project: projectId, status: 'completed' }),
  ]);

  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  await Project.findByIdAndUpdate(projectId, { progressPercentage });
};

// @desc    Get all projects
// @route   GET /api/projects
export const getProjects = async (req, res, next) => {
  try {
    const { status = '', search = '' } = req.query;
    const query = { organization: req.orgId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
      ];
    }

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .populate('client', 'name company')
      .populate('teamMembers', 'fullName employeeId jobTitle profileImage');

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project by ID with its tasks
// @route   GET /api/projects/:id
export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      organization: req.orgId,
    })
      .populate('client')
      .populate('teamMembers', 'fullName employeeId jobTitle email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const tasks = await Task.find({
      organization: req.orgId,
      project: project._id,
    })
      .sort({ dueDate: 1 })
      .populate('assignee', 'fullName employeeId jobTitle profileImage');

    res.status(200).json({
      success: true,
      data: {
        ...project.toObject(),
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
export const createProject = async (req, res, next) => {
  try {
    const {
      name,
      description,
      client,
      startDate,
      endDate,
      budget,
      status = 'active',
      teamMembers,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Project name is required.' });
    }

    const count = await Project.countDocuments({ organization: req.orgId });
    const projectId = `PRJ-${String(count + 1001).padStart(4, '0')}`;

    const project = await Project.create({
      organization: req.orgId,
      projectId,
      name,
      description: description || '',
      client: client || null,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      budget: budget ? Number(budget) : 0,
      status,
      teamMembers: teamMembers || [],
    });

    await logAudit({
      organization: req.orgId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PROJECT_CREATED',
      module: 'projects',
      details: { projectId: project.projectId, name: project.name },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const allowed = ['name', 'description', 'client', 'startDate', 'endDate', 'budget', 'status', 'teamMembers'];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) project[k] = req.body[k];
    });

    await project.save();

    res.status(200).json({
      success: true,
      data: project,
      message: 'Project updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Delete associated tasks
    await Task.deleteMany({ organization: req.orgId, project: project._id });
    await Project.findByIdAndDelete(project._id);

    res.status(200).json({
      success: true,
      message: 'Project and associated tasks deleted.',
    });
  } catch (error) {
    next(error);
  }
};

// ======================== TASKS ======================== //

// @desc    Get all tasks with filtering (table & kanban)
// @route   GET /api/tasks
export const getTasks = async (req, res, next) => {
  try {
    const {
      project,
      assignee,
      priority,
      status,
      search = '',
    } = req.query;

    const query = { organization: req.orgId };

    if (project && project !== 'all') query.project = project;
    if (assignee && assignee !== 'all') query.assignee = assignee;
    if (priority && priority !== 'all') query.priority = priority;
    if (status && status !== 'all') query.status = status;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { taskId: { $regex: search, $options: 'i' } },
      ];
    }

    const tasks = await Task.find(query)
      .sort({ dueDate: 1, createdAt: -1 })
      .populate('project', 'name projectId')
      .populate('assignee', 'fullName employeeId jobTitle profileImage email');

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new task
// @route   POST /api/tasks
export const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      project,
      assignee,
      priority = 'medium',
      status = 'todo',
      dueDate,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const count = await Task.countDocuments({ organization: req.orgId });
    const taskId = `TSK-${String(count + 1001).padStart(4, '0')}`;

    const task = await Task.create({
      organization: req.orgId,
      taskId,
      title,
      description: description || '',
      project: project || null,
      assignee: assignee || null,
      priority,
      status,
      dueDate: dueDate || null,
      createdBy: req.user._id,
    });

    if (project) {
      await recalculateProjectProgress(project, req.orgId);
    }

    if (assignee) {
      const emp = await Employee.findById(assignee);
      if (emp) {
        await createNotification(req.orgId, {
          title: 'New Task Assigned',
          message: `You have been assigned to task: ${task.title} (Priority: ${task.priority}).`,
          type: 'task_deadline',
          link: '/projects',
          metadata: { taskId: task._id },
        });
      }
    }

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task (status, details)
// @route   PUT /api/tasks/:id
export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const allowed = ['title', 'description', 'project', 'assignee', 'priority', 'status', 'dueDate'];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) task[k] = req.body[k];
    });

    await task.save();

    if (task.project) {
      await recalculateProjectProgress(task.project, req.orgId);
    }

    res.status(200).json({
      success: true,
      data: task,
      message: 'Task updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organization: req.orgId,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const projectId = task.project;
    await Task.findByIdAndDelete(task._id);

    if (projectId) {
      await recalculateProjectProgress(projectId, req.orgId);
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
