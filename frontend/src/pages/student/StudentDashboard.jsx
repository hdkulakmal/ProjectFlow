import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentLayout from '../../components/StudentLayout';
import api from '../../services/api';
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Users,
  Megaphone,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [supervisorRequest, setSupervisorRequest] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [nextMeeting, setNextMeeting] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Student's Group Info
        try {
          const groupRes = await api.get('/groups/my-group');
          setGroup(groupRes.data.group);
        } catch (err) {
          // If 404, student doesn't have a group yet
          setGroup(null);
        }

        // 2. Fetch Announcements
        try {
          const annRes = await api.get('/announcements?limit=3');
          setAnnouncements(annRes.data.announcements || []);
        } catch (err) {
          console.error('Failed to load announcements');
        }

        // 3. Fetch Meetings
        try {
          const meetRes = await api.get('/meetings');
          const upcoming = (meetRes.data || []).find(m => m.status === 'Accepted' || m.status === 'Scheduled');
          setNextMeeting(upcoming || null);
        } catch (err) {
          console.error('Failed to load meetings');
        }
      } catch (err) {
        console.error('Error fetching dashboard info', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
  const groupLabel = group?.groupNumber ? `Group ${group.groupNumber}` : "Group Not Assigned";

  // Calculate progress mock or based on status
  const progressPercent = 35; // Default milestone progress

  return (
    <StudentLayout projectTitle={projectTitle} groupNumber={groupLabel}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 1. Welcome Card (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-outline-variant rounded-xl p-6 md:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low text-primary text-xs font-semibold mb-4">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                <span>Academic Year 2026</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                Welcome back, {user?.fullName?.split(' ')[0] || 'Student'}! 👋
              </h2>
              <p className="text-on-surface-variant text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                Your group is making steady progress. Your next major milestone proposal submission deadline is approaching. Keep up the momentum!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-outline-variant/60">
              <button
                onClick={() => navigate('/student/timeline')}
                className="px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-xs"
              >
                View Timeline
              </button>
              <button
                onClick={() => navigate('/student/documents')}
                className="px-4 py-2.5 border border-outline-variant text-primary text-sm font-semibold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2"
              >
                <UploadCloud className="h-4 w-4" />
                Upload Milestone Doc
              </button>
            </div>
          </div>

          {/* 2. Supervisor Request Status Widget (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary text-base">Supervision Status</h3>
                <span className="p-2 bg-surface-container-low rounded-lg text-primary">
                  <Users className="h-5 w-5" />
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Current supervisor allocation for your project group.
              </p>
            </div>

            <div className="mt-4">
              {group?.supervisor ? (
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
                  <div className="flex items-center gap-2 text-teal-800 font-semibold text-sm">
                    <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                    <span>Supervisor Assigned</span>
                  </div>
                  <p className="text-xs text-teal-900 font-bold mt-2">
                    {group.supervisor.fullName}
                  </p>
                  <p className="text-[11px] text-teal-700">{group.supervisor.email}</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>Pending Assignment</span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1">
                    You have not been assigned a supervisor yet.
                  </p>
                  <button
                    onClick={() => navigate('/student/supervisor-requests')}
                    className="mt-3 text-xs font-bold text-amber-900 hover:underline flex items-center gap-1"
                  >
                    Send Request <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 3. Project Progress Card (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-outline-variant rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-primary text-base">Project Milestone Progress</h3>
              <button
                onClick={() => navigate('/student/timeline')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Gantt Chart <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-extrabold text-primary">{progressPercent}%</span>
                <span className="text-xs text-on-surface-variant font-medium">Overall Progress</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Upcoming Milestone Badge */}
            <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/60 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Upcoming Milestone
                </p>
                <h4 className="text-sm font-bold text-primary mt-0.5">Project Proposal Submission</h4>
                <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                  <Clock className="h-3.5 w-3.5" /> Due Soon (20 MB max file)
                </p>
              </div>
              <button
                onClick={() => navigate('/student/documents')}
                className="px-3.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shrink-0"
              >
                Submit Now
              </button>
            </div>
          </div>

          {/* 4. Group Members Card (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary text-base">Group Members</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container text-primary">
                  {group?.members?.length || 1} Members
                </span>
              </div>

              <div className="space-y-3">
                {group?.members && group.members.length > 0 ? (
                  group.members.map((member) => (
                    <div key={member._id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold">
                          {member.fullName?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary">
                            {member.fullName} {member._id === user?.id && <span className="text-on-surface-variant font-normal">(You)</span>}
                          </p>
                          <p className="text-[11px] text-on-surface-variant">{member.email}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 p-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold">
                      {user?.fullName?.slice(0, 2).toUpperCase() || 'ME'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary">
                        {user?.fullName} <span className="text-on-surface-variant font-normal">(You)</span>
                      </p>
                      <p className="text-[11px] text-on-surface-variant">{user?.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/student/group')}
              className="mt-4 pt-3 border-t border-outline-variant text-xs font-semibold text-primary hover:underline text-center w-full"
            >
              View Full Group Details
            </button>
          </div>

          {/* 5. Recent Announcements Card (12 cols) */}
          <div className="lg:col-span-12 bg-white border border-outline-variant rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-primary text-base">Announcements & Notices</h3>
              </div>
            </div>

            {announcements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {announcements.map((item) => (
                  <div key={item._id} className="p-4 rounded-xl border border-outline-variant bg-surface hover:border-primary/40 transition-colors">
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                      {item.audience || 'Notice'}
                    </span>
                    <h4 className="font-bold text-primary text-sm mt-1 truncate">{item.title}</h4>
                    <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2">
                      {item.message}
                    </p>
                    <p className="text-[10px] text-outline mt-3">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant py-4 text-center">
                No active announcements at this time.
              </p>
            )}
          </div>

        </div>
      </div>
    </StudentLayout>
  );
}