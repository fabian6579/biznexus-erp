import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  Briefcase,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { formatDate, formatCurrency, getStatusBadgeClass, getPriorityBadgeClass } from '../../utils/formatters';

export const EmployeeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await axiosClient.get(`/employees/${id}`);
        if (res.success) {
          setEmployee(res.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load employee profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (loading) {
    return <LoadingSkeleton count={5} />;
  }

  if (error || !employee) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-600 mb-4">{error || 'Employee not found'}</p>
        <Button variant="secondary" onClick={() => navigate('/employees')} icon={ArrowLeft}>
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/employees')}
          icon={ArrowLeft}
          className="text-slate-500"
        >
          Back to Employees
        </Button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xl shadow-md shadow-indigo-100 flex-shrink-0">
              {employee.fullName?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{employee.fullName}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${getStatusBadgeClass(employee.employmentStatus)}`}>
                  {employee.employmentStatus?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {employee.jobTitle} • {employee.department}
              </p>
              <span className="inline-block mt-1 text-[11px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                {employee.employeeId}
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-3.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </span>
            <p className="text-xs font-semibold text-slate-800 break-all">{employee.email}</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </span>
            <p className="text-xs font-semibold text-slate-800">{employee.phone || 'Not recorded'}</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Joined Date
            </span>
            <p className="text-xs font-semibold text-slate-800">{formatDate(employee.joiningDate)}</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5" /> Monthly CTC
            </span>
            <p className="text-xs font-semibold text-slate-800">
              {employee.salary ? formatCurrency(employee.salary) : 'Confidential'}
            </p>
          </div>
        </div>

        {employee.address && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-bold text-slate-700">Residential Address: </span>
            {employee.address}
          </div>
        )}
      </div>

      {/* Assigned Tasks & Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Assigned */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" /> Assigned Operational Tasks
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {employee.tasks?.length || 0} tasks
            </span>
          </div>

          {employee.tasks?.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No tasks assigned currently.</p>
          ) : (
            <div className="space-y-2.5">
              {employee.tasks.map((task) => (
                <div
                  key={task._id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{task.title}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Due: {formatDate(task.dueDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getPriorityBadgeClass(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadgeClass(task.status)}`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Projects */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-600" /> Active Projects
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {employee.projects?.length || 0} projects
            </span>
          </div>

          {employee.projects?.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No project team allocations.</p>
          ) : (
            <div className="space-y-2.5">
              {employee.projects.map((proj) => (
                <div
                  key={proj._id}
                  onClick={() => navigate('/projects')}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/40 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{proj.name}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{proj.projectId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-600">{proj.progressPercentage}%</span>
                    <span className="block text-[10px] text-slate-400 capitalize">{proj.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
