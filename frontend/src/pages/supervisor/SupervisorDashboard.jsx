import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SupervisorLayout from '../../components/SupervisorLayout';
import api from '../../services/api';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  FolderGit2,
  Calendar,
  MessageSquare,
  FileText
} from 'lucide-react';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  const fetchSupervisorData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Pending Requests
      const reqRes = await api.get('/supervisor-requests');
      setPendingRequests(reqRes.data || []);

      // 2. Fetch My Supervised Groups
      const groupsRes = await api.get('/supervisors/my-groups');
      setMyGroups(groupsRes.data || []);
    } catch (err) {
      console.error('Error fetching supervisor dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisorData();
  }, []);

  const handleRequestAction = async (requestId, status) => {
    setProcessingId(requestId);
    setFeedbackMsg({ type: '', text: '' });

    try {
      await api.put(`/supervisor-requests/${requestId}`, { status });
      setFeedbackMsg({
        type: 'success',
        text: `Request successfully ${status.toLowerCase()}ed!`,
      });
      // Refresh data
      fetchSupervisorData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || `Failed to ${status.toLowerCase()} request.`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <SupervisorLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SupervisorLayout>
    );
  }

  const capacity = 5; // Default supervisor capacity
  const assignedCount = myGroups.length;
  const slotsRemaining = Math.max(0, capacity - assignedCount);

  return (
    <SupervisorLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header & Limit Widget */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Supervised Projects</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Manage your assigned student project groups and review supervision requests.
            </p>
          </div>

          {/* Supervision Limits Widget */}
          <div className="bg-white border border-outline-variant rounded-xl p-4 flex items-center gap-4 shadow-xs">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-container"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-primary-container"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${(assignedCount / capacity) * 100}, 100`}
                  strokeWidth="3"
                />
              </svg>
              <span className="absolute text-xs font-bold text-primary">
                {assignedCount}/{capacity}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-primary">Supervision Limit</p>
              <p className="text-xs text-on-surface-variant font-medium">
                {slotsRemaining} slots remaining
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg.text && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
              feedbackMsg.type === 'success'
                ? 'bg-teal-50 border-teal-200 text-secondary'
                : 'bg-red-50 border-red-200 text-error'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Main Grid: Left = Supervised Groups, Right = Pending Requests */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left Column: Active Supervised Groups (2 cols) */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Active Groups ({myGroups.length})</h2>
            </div>

            {myGroups.length > 0 ? (
              myGroups.map((grp) => (
                <div
                  key={grp._id}
                  className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-xs hover:border-primary/40 transition-all"
                >
                  <div className="h-1.5 w-full bg-surface-container">
                    <div className="h-full bg-primary-container w-[45%]" />
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-bold text-primary">Group {grp.groupNumber}</h3>
                          <span className="px-2.5 py-0.5 bg-surface-container-high text-primary rounded-full text-xs font-semibold">
                            Batch {grp.batch}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {grp.project?.title || 'Software Group Project'}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-secondary bg-teal-50 px-3 py-1 rounded-full border border-teal-200 self-start">
                        Supervision Active
                      </span>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
                      <div className="bg-surface rounded-lg p-3 border border-outline-variant/60">
                        <div className="flex items-center gap-1.5 text-outline text-xs mb-1">
                          <Calendar className="h-4 w-4" />
                          <span>Meeting Status</span>
                        </div>
                        <p className="text-xs font-bold text-on-surface">Scheduled</p>
                      </div>

                      <div className="bg-surface rounded-lg p-3 border border-outline-variant/60">
                        <div className="flex items-center gap-1.5 text-outline text-xs mb-1">
                          <FileText className="h-4 w-4" />
                          <span>Weekly Eval</span>
                        </div>
                        <p className="text-xs font-bold text-amber-600">Pending Review</p>
                      </div>

                      <div className="bg-surface rounded-lg p-3 border border-outline-variant/60">
                        <div className="flex items-center gap-1.5 text-outline text-xs mb-1">
                          <Users className="h-4 w-4" />
                          <span>Members</span>
                        </div>
                        <p className="text-xs font-bold text-on-surface">
                          {grp.members?.length || 0} Students
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between">
                      <p className="text-xs text-on-surface-variant">
                        Last milestone updated 2 days ago
                      </p>
                      <button className="text-xs font-bold text-primary hover:underline">
                        View Group Workspace →
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-outline-variant rounded-xl p-8 text-center">
                <Users className="h-10 w-10 text-outline mx-auto mb-2" />
                <h3 className="text-base font-bold text-primary">No Active Groups Yet</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  You have not accepted any group supervision requests yet. Review incoming requests on the right panel.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Pending Requests (1 col) */}
          <div className="xl:col-span-1">
            <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-xs sticky top-24">
              <div className="p-4 border-b border-outline-variant bg-surface flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-primary text-sm">Incoming Requests</h3>
                </div>
                <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              </div>

              <div className="p-4 divide-y divide-outline-variant/60 space-y-4">
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((req) => (
                    <div key={req._id} className="pt-4 first:pt-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface-container text-primary">
                          Group {req.group?.groupNumber || 'N/A'}
                        </span>
                        <span className="text-[11px] text-outline">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-primary mb-1">Project Idea Brief:</p>
                      <p className="text-xs text-on-surface-variant bg-surface p-3 rounded-lg border border-outline-variant/60 mb-3 leading-relaxed">
                        {req.ideaBrief || 'No idea brief provided by student group.'}
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={processingId === req._id}
                          onClick={() => handleRequestAction(req._id, 'Accepted')}
                          className="flex-1 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-70"
                        >
                          {processingId === req._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Accept</span>
                            </>
                          )}
                        </button>
                        <button
                          disabled={processingId === req._id}
                          onClick={() => handleRequestAction(req._id, 'Rejected')}
                          className="px-3 py-2 border border-outline-variant text-error hover:bg-red-50 text-xs font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-on-surface-variant py-8 text-center">
                    No pending supervisor requests at this time.
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </SupervisorLayout>
  );
}