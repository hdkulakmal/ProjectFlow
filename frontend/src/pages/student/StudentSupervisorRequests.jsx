import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StudentLayout from '../../components/StudentLayout';
import api from '../../services/api';
import {
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Loader2,
  Sparkles,
  X
} from 'lucide-react';

export default function StudentSupervisorRequests() {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State for sending request
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [ideaBrief, setIdeaBrief] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Student's Group
        try {
          const groupRes = await api.get('/groups/my-group');
          setGroup(groupRes.data.group);
        } catch {
          setGroup(null);
        }

        // 2. Fetch All Supervisors & Their Slots
        const supRes = await api.get('/supervisors');
        setSupervisors(supRes.data || []);
      } catch (err) {
        console.error('Error fetching supervisors', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!group) {
      setError('You must create or join a group before sending a request.');
      return;
    }

    if (!ideaBrief.trim()) {
      setError('Please provide a brief description of your project idea.');
      return;
    }

    setIsSending(true);
    try {
      await api.post('/supervisor-requests', {
        groupId: group._id,
        supervisorId: selectedSupervisor._id,
        ideaBrief: ideaBrief.trim(),
      });

      setSuccess(`Request successfully sent to ${selectedSupervisor.fullName || selectedSupervisor.name}!`);
      setSelectedSupervisor(null);
      setIdeaBrief('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send supervisor request.');
    } finally {
      setIsSending(false);
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

  return (
    <StudentLayout projectTitle={projectTitle} groupNumber={groupLabel}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="border-b border-outline-variant/60 pb-5">
          <h1 className="text-2xl font-bold text-primary tracking-tight">Supervisor Request Portal</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Browse available faculty supervisors, check supervision limits, and request guidance for your project.
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-error">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-teal-50 border border-teal-200 text-sm text-secondary font-medium">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Status Notices */}
        {!group ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-900 font-medium">
                You do not have a group assigned yet. Please create or register your group first.
              </p>
            </div>
            <a
              href="/student/group"
              className="text-xs font-bold px-3 py-1.5 bg-amber-800 text-white rounded-lg hover:bg-amber-900"
            >
              Go to My Group
            </a>
          </div>
        ) : group.supervisor ? (
          <div className="p-5 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-teal-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-teal-900">
                Supervisor Already Assigned: {group.supervisor.fullName}
              </p>
              <p className="text-xs text-teal-700 mt-0.5">
                Your group has already established supervision. You do not need to submit another request.
              </p>
            </div>
          </div>
        ) : null}

        {/* Supervisors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supervisors.map((sup) => {
            const supervisorName = sup.fullName || sup.name || 'Faculty Member';
            const availableSlots = sup.slotsAvailable ?? (sup.capacity - (sup.assignedGroupsCount || 0));
            const isFull = availableSlots <= 0;

            return (
              <div
                key={sup._id}
                className="bg-white border border-outline-variant rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-container text-white flex items-center justify-center text-sm font-bold shadow-xs">
                      {supervisorName.slice(0, 2).toUpperCase()}
                    </div>
                    {isFull ? (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-error">
                        Slots Full
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-100 text-secondary">
                        {availableSlots} / {sup.capacity || 5} Slots Open
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-primary">{supervisorName}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-1">
                    <Mail className="h-3.5 w-3.5 text-outline" />
                    <span className="truncate">{sup.email}</span>
                  </div>

                  <p className="text-xs text-outline mt-3">
                    Currently supervising: <strong>{sup.assignedGroupsCount || 0}</strong> groups
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-outline-variant/60">
                  <button
                    disabled={isFull || !group || !!group.supervisor}
                    onClick={() => {
                      setSelectedSupervisor(sup);
                      setError('');
                      setSuccess('');
                    }}
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed bg-primary-container text-white hover:bg-primary shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Request Supervision</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Send Supervision Request */}
        {selectedSupervisor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant relative">
              <button
                onClick={() => setSelectedSupervisor(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-primary text-xs font-semibold mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-secondary" />
                  Requesting Supervision
                </span>
                <h3 className="text-lg font-bold text-primary">
                  {selectedSupervisor.fullName || selectedSupervisor.name}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{selectedSupervisor.email}</p>
              </div>

              <form onSubmit={handleSendRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                    Project Topic / Idea Brief
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={ideaBrief}
                    onChange={(e) => setIdeaBrief(e.target.value)}
                    placeholder="Briefly describe your project scope, proposed technology stack, and objectives so the supervisor can review..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSupervisor(null)}
                    className="px-4 py-2 border border-outline-variant text-sm font-semibold rounded-lg hover:bg-slate-100 text-on-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-xs flex items-center gap-2 disabled:opacity-70"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Request</span>
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