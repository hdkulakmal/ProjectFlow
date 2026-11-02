import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StudentLayout from '../../components/StudentLayout';
import api from '../../services/api';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  FolderGit2,
  PlusCircle,
  AlertCircle,
  Loader2,
  Mail,
  GraduationCap
} from 'lucide-react';

export default function StudentGroup() {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for creating a group
  const [groupNumber, setGroupNumber] = useState('');
  const [batch, setBatch] = useState(user?.batch || '2019/2020');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const res = await api.get('/groups/my-group');
      setGroup(res.data.group);
    } catch (err) {
      // 404 means no group yet
      setGroup(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!groupNumber || !batch) {
      setError('Please provide group number and batch.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/groups', {
        groupNumber: Number(groupNumber),
        batch: batch.trim(),
        members: [user.id],
      });
      setSuccess('Group created successfully!');
      fetchGroup();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group.');
    } finally {
      setIsSubmitting(false);
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
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Project Group Details</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Manage your team members and assigned project details.
            </p>
          </div>
          {group && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low text-primary text-xs font-bold border border-outline-variant/60">
              <Users className="h-4 w-4 text-secondary" />
              <span>Group {group.groupNumber} ({group.batch})</span>
            </div>
          )}
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

        {/* If Student DOES NOT have a group yet */}
        {!group ? (
          <div className="bg-white border border-outline-variant rounded-2xl p-8 max-w-xl mx-auto shadow-sm text-center">
            <div className="w-14 h-14 bg-surface-container-low text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">You don't have a group yet</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              You can register your group below or wait for the Project Coordinator to assign you via Excel.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                  Group Number (e.g. 4)
                </label>
                <input
                  type="number"
                  required
                  value={groupNumber}
                  onChange={(e) => setGroupNumber(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                  Academic Batch
                </label>
                <input
                  type="text"
                  required
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="e.g. 2019/2020"
                  className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary-container text-white font-semibold rounded-lg hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Group...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    <span>Create & Register Group</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* If Student HAS a group */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Group Members (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-bold text-primary">Team Members</h3>
                    <p className="text-xs text-on-surface-variant">Students registered in this group</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container text-primary">
                    {group.members?.length || 1} Members
                  </span>
                </div>

                <div className="divide-y divide-outline-variant/60">
                  {group.members && group.members.length > 0 ? (
                    group.members.map((member) => (
                      <div key={member._id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold">
                            {member.fullName?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-primary">
                              {member.fullName} {member._id === user?.id && <span className="text-secondary font-semibold">(You)</span>}
                            </p>
                            <p className="text-xs text-on-surface-variant">{member.email}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-surface text-on-surface-variant">
                          {member.role || 'Student'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-on-surface-variant py-4">No members registered yet.</p>
                  )}
                </div>
              </div>

              {/* Project Overview Card */}
              <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <FolderGit2 className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold text-primary">Project Overview</h3>
                </div>
                <h4 className="text-base font-semibold text-primary mb-2">
                  {group.project?.title || "Software Group Project Management System"}
                </h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {group.project?.description || "A centralized university project management platform supporting automated group creation, supervisor requests, milestone tracking, and document submissions."}
                </p>
              </div>
            </div>

            {/* Right: Supervisor Status (1 col) */}
            <div className="space-y-6">
              <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold text-primary">Assigned Supervisor</h3>
                </div>

                {group.supervisor ? (
                  <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-800">Faculty Supervisor</p>
                    <p className="text-base font-bold text-teal-950 mt-1">{group.supervisor.fullName}</p>
                    <div className="flex items-center gap-1.5 text-xs text-teal-800 mt-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{group.supervisor.email}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <p className="text-sm font-bold text-amber-900">No Supervisor Assigned</p>
                    <p className="text-xs text-amber-800 mt-1 mb-4">
                      Your group does not have an active supervisor yet.
                    </p>
                    <a
                      href="/student/supervisor-requests"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Browse Supervisors
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </StudentLayout>
  );
}