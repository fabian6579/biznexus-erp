import React, { useState, useEffect, useCallback } from 'react';
import {
  KanbanSquare,
  Plus,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Search,
  Filter,
  ArrowRight,
  List,
  Edit,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { toast } from '../../components/common/Toast';
import {
  formatDate,
  formatCurrency,
  getPriorityBadgeClass,
  getStatusBadgeClass,
} from '../../utils/formatters';

const TASK_STATUSES = [
  { key: 'todo', label: 'To Do', color: 'bg-slate-100 text-slate-700' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-amber-50 text-amber-700' },
  { key: 'review', label: 'Under Review', color: 'bg-indigo-50 text-indigo-700' },
  { key: 'completed', label: 'Completed', color: 'bg-emerald-50 text-emerald-700' },
];

export const ProjectsPage = () => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table' | 'projects'

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Modals
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Task Form State
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    project: '',
    assignee: '',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
  });

  // Project Form State
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    client: '',
    budget: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  });

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axiosClient.get(
        `/tasks?search=${encodeURIComponent(search)}&priority=${priorityFilter}&project=${projectFilter}`
      );
      if (res.success) {
        setTasks(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load tasks.');
    }
  }, [search, priorityFilter, projectFilter]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axiosClient.get('/projects');
      if (res.success) {
        setProjects(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadReferences = useCallback(async () => {
    try {
      const [empRes, custRes] = await Promise.all([
        axiosClient.get('/employees?limit=100'),
        axiosClient.get('/customers?limit=100'),
      ]);
      if (empRes.success) setEmployees(empRes.data);
      if (custRes.success) setCustomers(custRes.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchProjects(), loadReferences()]);
      setLoading(false);
    };
    init();
  }, [fetchTasks, fetchProjects, loadReferences]);

  // Quick move status on task
  const handleMoveStatus = async (taskId, currentStatus) => {
    const sequence = ['todo', 'in_progress', 'review', 'completed'];
    const currentIdx = sequence.indexOf(currentStatus);
    const nextStatus = sequence[(currentIdx + 1) % sequence.length];

    try {
      await axiosClient.put(`/tasks/${taskId}`, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
      );
      fetchProjects(); // Recalculate project progress
    } catch (err) {
      toast.error(err.message || 'Status update failed.');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title) {
      setFormError('Task title is required.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/tasks', taskForm);
      toast.success('Task created successfully.');
      setShowCreateTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        project: '',
        assignee: '',
        priority: 'medium',
        status: 'todo',
        dueDate: '',
      });
      fetchTasks();
      fetchProjects();
    } catch (err) {
      setFormError(err.message || 'Failed to create task.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectForm.name) {
      setFormError('Project name is required.');
      return;
    }

    setModalLoading(true);
    setFormError('');

    try {
      await axiosClient.post('/projects', projectForm);
      toast.success('Project created.');
      setShowCreateProjectModal(false);
      setProjectForm({
        name: '',
        description: '',
        client: '',
        budget: '',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
      });
      fetchProjects();
    } catch (err) {
      setFormError(err.message || 'Failed to create project.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects & Tasks</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational project management, Kanban task pipeline, and milestone tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={FolderKanban}
            onClick={() => {
              setFormError('');
              setShowCreateProjectModal(true);
            }}
          >
            New Project
          </Button>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setFormError('');
              setShowCreateTaskModal(true);
            }}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* View Switcher & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'kanban'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KanbanSquare className="w-3.5 h-3.5" /> Kanban Board
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'table'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Tasks Table
          </button>

          <button
            onClick={() => setViewMode('projects')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'projects'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" /> Projects List ({projects.length})
          </button>
        </div>

        {viewMode !== 'projects' && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 capitalize"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton count={4} type="card" />
      ) : viewMode === 'kanban' ? (
        /* ================= KANBAN BOARD VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TASK_STATUSES.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);

            return (
              <div
                key={col.key}
                className="bg-slate-100/70 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shadow-xs">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border border-dashed border-slate-300 rounded-xl text-[11px] text-slate-400">
                      Empty column
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isOverdue =
                        task.dueDate &&
                        new Date(task.dueDate) < new Date() &&
                        task.status !== 'completed';

                      return (
                        <div
                          key={task._id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getPriorityBadgeClass(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="font-mono text-[9px] text-slate-400 font-semibold">{task.taskId}</span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {task.project && (
                            <span className="inline-block mt-2 text-[10px] font-medium text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded truncate max-w-full">
                              {task.project.name}
                            </span>
                          )}

                          {/* Footer */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            {task.assignee ? (
                              <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center flex-shrink-0">
                                  {task.assignee.fullName?.slice(0, 1)}
                                </div>
                                <span className="text-slate-600 truncate text-[10px] font-medium">
                                  {task.assignee.fullName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Unassigned</span>
                            )}

                            <div className="flex items-center gap-1">
                              {task.dueDate && (
                                <span
                                  className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                                    isOverdue ? 'text-rose-600' : 'text-slate-400'
                                  }`}
                                  title={`Due: ${formatDate(task.dueDate)}`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {formatDate(task.dueDate)}
                                </span>
                              )}

                              <button
                                onClick={() => handleMoveStatus(task._id, task.status)}
                                className="ml-1 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Advance status"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'table' ? (
        /* ================= TASKS TABLE VIEW ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Advance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{task.title}</p>
                      <span className="font-mono text-[10px] text-slate-400">{task.taskId}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {task.project?.name || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                            {task.assignee.fullName?.slice(0, 1)}
                          </div>
                          <span className="text-slate-800 font-medium">{task.assignee.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityBadgeClass(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {formatDate(task.dueDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(task.status)}`}>
                        {task.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveStatus(task._id, task.status)}
                      >
                        Advance <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= PROJECTS OVERVIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj._id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {proj.projectId}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(proj.status)}`}>
                    {proj.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2">{proj.name}</h3>
                {proj.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.description}</p>
                )}

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-indigo-600">{proj.progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${proj.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Budget: {proj.budget ? formatCurrency(proj.budget) : 'Unset'}</span>
                <span>Due: {formatDate(proj.endDate)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        title="Create Operational Task"
        subtitle="Assign deliverables, set priority, and schedule deadline."
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            required
            placeholder="e.g. Conduct RS-485 Modbus stress test"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
          />

          <Input
            label="Description"
            placeholder="Specify test criteria and acceptance parameters..."
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Associated Project"
              value={taskForm.project}
              onChange={(e) => setTaskForm({ ...taskForm, project: e.target.value })}
              placeholder="Select project (Optional)"
              options={projects.map((p) => ({ value: p._id, label: p.name }))}
            />

            <Select
              label="Assigned Employee"
              value={taskForm.assignee}
              onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
              placeholder="Select staff member"
              options={employees.map((e) => ({ value: e._id, label: `${e.fullName} (${e.jobTitle})` }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Priority Level"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              options={[
                { value: 'urgent', label: 'Urgent' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />

            <Select
              label="Initial Status"
              value={taskForm.status}
              onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
              options={TASK_STATUSES.map((s) => ({ value: s.key, label: s.label }))}
            />

            <Input
              label="Due Date"
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowCreateTaskModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Save Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        title="Initialize New Project"
        subtitle="Define milestones, customer engagement, and allocation budget."
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Project Name"
            required
            placeholder="e.g. NextGen Industrial Automation Rollout"
            value={projectForm.name}
            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
          />

          <Input
            label="Project Scope / Summary"
            placeholder="Key milestones and deliverables..."
            value={projectForm.description}
            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Client Customer"
              value={projectForm.client}
              onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
              placeholder="Select client (Optional)"
              options={customers.map((c) => ({ value: c._id, label: c.name }))}
            />

            <Input
              label="Allocated Budget (₹)"
              type="number"
              placeholder="350000"
              value={projectForm.budget}
              onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={projectForm.startDate}
              onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
            />

            <Input
              label="Target Completion Date"
              type="date"
              value={projectForm.endDate}
              onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowCreateProjectModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              Launch Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
