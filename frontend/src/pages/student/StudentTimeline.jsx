import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StudentLayout from '../../components/StudentLayout';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Loader2,
  Sparkles,
  Check,
  X,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function StudentTimeline() {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [chart, setChart] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [requestingTaskId, setRequestingTaskId] = useState(null);

  // Alerts
  const [alert, setAlert] = useState({ type: '', text: '' });

  const fetchTimelineData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Student's Group
      const groupRes = await api.get('/groups/my-group');
      const grp = groupRes.data.group;
      setGroup(grp);

      if (grp?._id) {
        // 2. Fetch Gantt Chart for this Group
        try {
          const chartRes = await api.get(`/gantt/${grp._id}`);
          if (chartRes.data && chartRes.data.tasks) {
            setChart(chartRes.data);
            setTasks(chartRes.data.tasks);
          } else {
            // Default sample tasks if chart not initialized yet
            setTasks([
              {
                taskName: 'Requirement Analysis & Project Proposal',
                startDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                status: 'In Progress',
                approvalStatus: 'Not Requested',
              },
              {
                taskName: 'System Architecture & UI/UX Wireframing',
                startDate: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
                status: 'Pending',
                approvalStatus: 'Not Requested',
              },
            ]);
          }
        } catch {
          // If no chart exists yet
          setChart(null);
        }
      }
    } catch (err) {
      console.error('Error fetching timeline data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, []);

  // Save all tasks to backend
  const handleSaveTasks = async (tasksToSave) => {
    if (!group?._id) return;
    setIsSaving(true);
    setAlert({ type: '', text: '' });

    try {
      const res = await api.post('/gantt/save', {
        groupId: group._id,
        tasks: tasksToSave,
      });
      setChart(res.data.chart);
      setTasks(res.data.chart.tasks);
      setAlert({ type: 'success', text: 'Gantt chart tasks saved successfully!' });
      setAddTaskModalOpen(false);
      setNewTaskName('');
      setNewStartDate('');
      setNewEndDate('');
    } catch (err) {
      setAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save Gantt chart tasks.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add new task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskName || !newStartDate || !newEndDate) return;

    if (new Date(newEndDate) < new Date(newStartDate)) {
      setAlert({ type: 'error', text: 'End date cannot be earlier than start date.' });
      return;
    }

    const updatedTasks = [
      ...tasks,
      {
        taskName: newTaskName.trim(),
        startDate: newStartDate,
        endDate: newEndDate,
        status: 'Pending',
        approvalStatus: 'Not Requested',
      },
    ];

    handleSaveTasks(updatedTasks);
  };

  // Request task completion approval from Supervisor
  const handleRequestCompletion = async (taskId) => {
    if (!group?._id || !taskId) return;
    setRequestingTaskId(taskId);
    setAlert({ type: '', text: '' });

    try {
      await api.patch(`/gantt/${group._id}/tasks/${taskId}/request-completion`);
      setAlert({
        type: 'success',
        text: 'Task completion approval request sent to your supervisor!',
      });
      fetchTimelineData();
    } catch (err) {
      setAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to request task completion.',
      });
    } finally {
      setRequestingTaskId(null);
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  const projectTitle = group?.project?.title || "Software Group Project Management System";
  const groupLabel = group?.groupNumber ? `Group ${group.groupNumber}` : "No Group Assigned";

  // Calculate Progress
  const approvedTasksCount = tasks.filter((t) => t.approvalStatus === 'Approved').length;
  const progressPercent = tasks.length > 0 ? Math.round((approvedTasksCount / tasks.length) * 100) : 0;

  return (
    <StudentLayout projectTitle={projectTitle} groupNumber={groupLabel}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/60 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-primary text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              <span>Project Milestones & Task Planning</span>
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Timeline & Gantt Chart</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Track project phases, schedule tasks, and request completion approvals from your supervisor.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {chart?.isFinalized ? (
              <span className="px-3.5 py-1.5 rounded-full bg-teal-50 text-secondary border border-teal-200 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Finalized by Supervisor</span>
              </span>
            ) : (
              <button
                onClick={() => setAddTaskModalOpen(true)}
                className="px-4 py-2.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-2 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Alert Feedback */}
        {alert.text && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
              alert.type === 'success'
                ? 'bg-teal-50 border-teal-200 text-secondary'
                : 'bg-red-50 border-red-200 text-error'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{alert.text}</span>
          </div>
        )}

        {/* Progress Overview Card */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-primary">Milestone Completion Status</h3>
            <p className="text-xs text-on-surface-variant">
              {approvedTasksCount} of {tasks.length} tasks approved by supervisor
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-96">
            <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xl font-extrabold text-primary shrink-0">{progressPercent}%</span>
          </div>
        </div>

        {/* Visual Gantt Chart Timeline View */}
        <div className="bg-white border border-outline-variant rounded-xl shadow-xs p-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-primary">Visual Gantt Schedule</h3>
          </div>

          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task, idx) => {
                const sDate = new Date(task.startDate);
                const eDate = new Date(task.endDate);
                const durationDays = Math.max(1, Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)));

                // Color based on approval
                let barColor = 'bg-primary-container';
                if (task.approvalStatus === 'Approved') barColor = 'bg-teal-600';
                else if (task.approvalStatus === 'Pending') barColor = 'bg-amber-500';

                return (
                  <div key={task._id || idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-primary truncate max-w-md">
                        {idx + 1}. {task.taskName}
                      </span>
                      <span className="text-outline text-[11px]">
                        {sDate.toLocaleDateString()} → {eDate.toLocaleDateString()} ({durationDays} days)
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full bg-surface-container rounded-lg h-7 p-1 flex items-center relative overflow-hidden">
                      <div
                        className={`h-full rounded-md ${barColor} text-white flex items-center justify-between px-3 text-[11px] font-semibold transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(25, (idx + 1) * 30))}%` }}
                      >
                        <span className="truncate">{task.taskName}</span>
                        <span className="text-[10px] opacity-90">{task.approvalStatus}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant py-6 text-center">
              No tasks added to the Gantt chart yet. Click "Add New Task" to begin scheduling.
            </p>
          )}
        </div>

        {/* Task Details & Action Table */}
        <div className="bg-white border border-outline-variant rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-outline-variant bg-surface flex justify-between items-center">
            <h3 className="font-bold text-primary text-base">Tasks & Completion Approvals</h3>
            <span className="text-xs text-on-surface-variant font-medium">
              {tasks.length} tasks scheduled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Task Description</th>
                  <th className="px-5 py-3.5">Start Date</th>
                  <th className="px-5 py-3.5">End Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Supervisor Approval</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {tasks.map((task, idx) => (
                  <tr key={task._id || idx} className="hover:bg-surface transition-colors">
                    <td className="px-5 py-4 font-semibold text-primary max-w-xs truncate">
                      {task.taskName}
                      {task.reviewComment && (
                        <p className="text-[11px] text-on-surface-variant font-normal mt-0.5">
                          Feedback: "{task.reviewComment}"
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-on-surface whitespace-nowrap">
                      {new Date(task.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-xs text-on-surface whitespace-nowrap">
                      {new Date(task.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-xs whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container font-medium text-primary">
                        {task.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs whitespace-nowrap">
                      {task.approvalStatus === 'Approved' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center gap-1 w-fit">
                          <Check className="h-3 w-3" /> Approved
                        </span>
                      ) : task.approvalStatus === 'Pending' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" /> Review Pending
                        </span>
                      ) : task.approvalStatus === 'Rejected' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold flex items-center gap-1 w-fit">
                          <X className="h-3 w-3" /> Needs Revision
                        </span>
                      ) : (
                        <span className="text-outline text-xs">Not Requested</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-right whitespace-nowrap">
                      {task.approvalStatus === 'Approved' ? (
                        <span className="text-teal-700 font-bold text-xs flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Completed
                        </span>
                      ) : task.approvalStatus === 'Pending' ? (
                        <span className="text-amber-700 text-xs font-semibold">
                          Waiting for Review...
                        </span>
                      ) : (
                        <button
                          disabled={!task._id || requestingTaskId === task._id || chart?.isFinalized}
                          onClick={() => handleRequestCompletion(task._id)}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-all shadow-xs disabled:opacity-50"
                        >
                          {requestingTaskId === task._id ? (
                            <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                          ) : (
                            <Send className="h-3 w-3 inline mr-1" />
                          )}
                          Request Approval
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add New Task */}
        {addTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant relative">
              <button
                onClick={() => setAddTaskModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center mb-3">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-primary">Schedule New Task</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Add a milestone or deliverable task to your group's Gantt timeline.
                </p>
              </div>

              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                    Task Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="e.g. Database Schema & API Implementation"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddTaskModalOpen(false)}
                    className="px-4 py-2 border border-outline-variant text-xs font-semibold rounded-lg hover:bg-slate-100 text-on-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-xs flex items-center gap-2 disabled:opacity-70"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving Task...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add & Save</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </StudentLayout>
  );
}