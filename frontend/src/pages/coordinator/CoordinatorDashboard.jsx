import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import CoordinatorLayout from '../../components/CoordinatorLayout';
import api from '../../services/api';
import {
  GraduationCap,
  Users,
  ShieldCheck,
  FolderGit2,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Loader2,
  Send,
  X,
  Sparkles
} from 'lucide-react';

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({ students: 0, groups: 0, supervisors: 0 });
  const [groups, setGroups] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  // Capacity Edit State
  const [capacityUpdates, setCapacityUpdates] = useState({});
  const [savingCapacityId, setSavingCapacityId] = useState(null);

  // Announcement Form
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annAudience, setAnnAudience] = useState('All');
  const [isPostingAnn, setIsPostingAnn] = useState(false);

  // Excel Modal
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  // Alerts
  const [alert, setAlert] = useState({ type: '', text: '' });

  const fetchCoordinatorData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Groups
      const groupsRes = await api.get('/groups');
      const fetchedGroups = groupsRes.data.groups || [];
      setGroups(fetchedGroups);

      // 2. Fetch Supervisors
      const supRes = await api.get('/supervisors');
      const fetchedSups = supRes.data || [];
      setSupervisors(fetchedSups);

      // 3. Fetch Students Count
      const usersRes = await api.get('/users?role=Student');
      const totalStudents = usersRes.data.total || 0;

      setStats({
        students: totalStudents,
        groups: fetchedGroups.length,
        supervisors: fetchedSups.length,
      });

      // Init capacity map
      const capMap = {};
      fetchedSups.forEach((s) => {
        capMap[s._id] = s.capacity || 5;
      });
      setCapacityUpdates(capMap);
    } catch (err) {
      console.error('Error fetching coordinator data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordinatorData();
  }, []);

  // Update supervisor capacity limit
  const handleSaveCapacity = async (supId) => {
    setSavingCapacityId(supId);
    setAlert({ type: '', text: '' });
    try {
      const newCap = Number(capacityUpdates[supId]);
      await api.put(`/supervisors/${supId}/capacity`, { capacity: newCap });
      setAlert({ type: 'success', text: 'Supervisor capacity updated successfully!' });
      fetchCoordinatorData();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.message || 'Failed to update capacity.' });
    } finally {
      setSavingCapacityId(null);
    }
  };

  // Post Announcement
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;

    setIsPostingAnn(true);
    setAlert({ type: '', text: '' });
    try {
      await api.post('/announcements', {
        title: annTitle.trim(),
        message: annMessage.trim(),
        audience: annAudience,
      });
      setAlert({ type: 'success', text: 'Announcement published successfully!' });
      setAnnTitle('');
      setAnnMessage('');
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.message || 'Failed to post announcement.' });
    } finally {
      setIsPostingAnn(false);
    }
  };

  // Upload Excel to Generate Groups
  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      setAlert({ type: 'error', text: 'Please select an Excel or CSV file first.' });
      return;
    }

    setIsUploadingExcel(true);
    setAlert({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', excelFile);

    try {
      const res = await api.post('/groups/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAlert({
        type: 'success',
        text: res.data.message || 'Student groups successfully imported!',
      });
      setExcelModalOpen(false);
      setExcelFile(null);
      fetchCoordinatorData();
    } catch (err) {
      setAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to import groups from Excel.',
      });
    } finally {
      setIsUploadingExcel(false);
    }
  };

  if (loading) {
    return (
      <CoordinatorLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CoordinatorLayout>
    );
  }

  return (
    <CoordinatorLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header & Auto Generate Button */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/60 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Coordinator Overview</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Manage student groups, monitor supervisor capacities, and publish batch announcements.
            </p>
          </div>
          <button
            onClick={() => setExcelModalOpen(true)}
            className="px-5 py-2.5 bg-primary-container text-white text-sm font-semibold rounded-lg hover:bg-primary transition-all flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="h-4 w-4" />
            <span>Automatically Generate Groups</span>
          </button>
        </div>

        {/* Alert Feedback Banner */}
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

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Total Students
              </p>
              <p className="text-2xl font-extrabold text-primary mt-0.5">{stats.students}</p>
            </div>
          </div>

          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Total Groups
              </p>
              <p className="text-2xl font-extrabold text-primary mt-0.5">{stats.groups}</p>
            </div>
          </div>

          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Total Supervisors
              </p>
              <p className="text-2xl font-extrabold text-primary mt-0.5">{stats.supervisors}</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Left 8 cols, Right 4 cols */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (8 cols): Group Management & Global Progress */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Group Management Table */}
            <div className="bg-white border border-outline-variant rounded-xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface">
                <h3 className="font-bold text-primary text-base">Group Management</h3>
                <span className="text-xs text-on-surface-variant font-medium">
                  {groups.length} groups registered
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Group</th>
                      <th className="px-5 py-3.5">Members</th>
                      <th className="px-5 py-3.5">Supervisor</th>
                      <th className="px-5 py-3.5">Project Topic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {groups.length > 0 ? (
                      groups.map((grp) => (
                        <tr key={grp._id} className="hover:bg-surface transition-colors">
                          <td className="px-5 py-4 font-bold text-primary whitespace-nowrap">
                            Group {grp.groupNumber}
                            <span className="block text-[11px] text-outline font-normal">
                              Batch {grp.batch}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-on-surface">
                            {grp.members?.length || 0} Students
                          </td>
                          <td className="px-5 py-4 text-xs">
                            {grp.supervisor ? (
                              <span className="font-semibold text-secondary">
                                {grp.supervisor.fullName || 'Supervisor'}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium">Pending Assignment</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-on-surface-variant max-w-xs truncate">
                            {grp.project?.title || 'Software Project Management System'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-5 py-8 text-center text-xs text-outline">
                          No student groups registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Global Milestone Progress Card */}
            <div className="bg-white border border-outline-variant rounded-xl shadow-xs p-6 space-y-5">
              <h3 className="font-bold text-primary text-base">Global Milestone Progress</h3>

              {/* Milestone 1 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                  <span className="text-on-surface font-semibold">1. Project Proposal Submission</span>
                  <span className="text-secondary font-bold">100% Completed</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Milestone 2 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                  <span className="text-on-surface font-semibold">2. Mid-Evaluation Submissions</span>
                  <span className="text-primary font-bold">65% Groups Submitted</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              {/* Milestone 3 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                  <span className="text-on-surface font-semibold">3. Final Project Report & Codebase</span>
                  <span className="text-outline font-bold">In Progress (20%)</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '20%' }} />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (4 cols): Supervisor Capacities & Announcements */}
          <div className="lg:col-span-4 space-y-6">

            {/* Supervisor Capacity Settings */}
            <div className="bg-white border border-outline-variant rounded-xl shadow-xs p-6">
              <h3 className="font-bold text-primary text-base mb-4">Supervisor Capacity Limits</h3>
              <div className="space-y-3.5 divide-y divide-outline-variant/60">
                {supervisors.map((sup) => {
                  const supName = sup.fullName || sup.name || 'Faculty Member';
                  return (
                    <div key={sup._id} className="pt-3.5 first:pt-0 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-primary">{supName}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          Active: <strong>{sup.assignedGroupsCount || 0}</strong> groups
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={capacityUpdates[sup._id] ?? sup.capacity}
                          onChange={(e) =>
                            setCapacityUpdates({ ...capacityUpdates, [sup._id]: e.target.value })
                          }
                          className="w-14 px-2 py-1 text-xs border border-outline-variant rounded-md text-center font-bold bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          disabled={savingCapacityId === sup._id}
                          onClick={() => handleSaveCapacity(sup._id)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-primary text-white rounded-md hover:bg-primary-container transition-colors disabled:opacity-50"
                        >
                          {savingCapacityId === sup._id ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Announcements Panel */}
            <div className="bg-white border border-outline-variant rounded-xl shadow-xs p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-primary text-base">Post Announcement</h3>
              </div>

              <form onSubmit={handlePostAnnouncement} className="space-y-3">
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Notice Title (e.g. Milestone 2 Deadline)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <textarea
                  rows={3}
                  required
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Type an announcement for students and faculty..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <select
                    value={annAudience}
                    onChange={(e) => setAnnAudience(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface text-on-surface"
                  >
                    <option value="All">All Users</option>
                    <option value="Students">Students Only</option>
                    <option value="Supervisors">Supervisors Only</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isPostingAnn}
                    className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-70"
                  >
                    {isPostingAnn ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    <span>Publish</span>
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>

        {/* Modal: Upload Excel */}
        {excelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant relative">
              <button
                onClick={() => setExcelModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center mb-3">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-primary">Import Groups via Excel</h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Upload an Excel (.xlsx) file containing student registration numbers and group allocations to batch generate project groups.
                </p>
              </div>

              <form onSubmit={handleExcelUpload} className="space-y-4">
                <div className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                  <UploadCloud className="h-8 w-8 text-outline mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    required
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-container file:text-white hover:file:bg-primary cursor-pointer"
                  />
                  {excelFile && (
                    <p className="text-xs font-semibold text-secondary mt-2 truncate">
                      Selected: {excelFile.name}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setExcelModalOpen(false)}
                    className="px-4 py-2 border border-outline-variant text-xs font-semibold rounded-lg hover:bg-slate-100 text-on-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingExcel}
                    className="px-5 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-xs flex items-center gap-2 disabled:opacity-70"
                  >
                    {isUploadingExcel ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>Upload & Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </CoordinatorLayout>
  );
}