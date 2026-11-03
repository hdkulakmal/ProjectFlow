import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StudentLayout from '../../components/StudentLayout';
import api from '../../services/api';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Calendar,
  Sparkles,
  Paperclip,
  Check,
  Loader2,
  Send,
  FileCheck2,
  FolderOpen
} from 'lucide-react';

export default function StudentDocuments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'weekly'
  const [loading, setLoading] = useState(true);

  // Submissions Data
  const [submissions, setSubmissions] = useState([]);
  const [weeklyEvals, setWeeklyEvals] = useState([]);

  // Milestone Form States
  const [subType, setSubType] = useState('Proposal');
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subFile, setSubFile] = useState(null);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  // Weekly Form States
  const [weekNumber, setWeekNumber] = useState(1);
  const [workSummary, setWorkSummary] = useState('');
  const [weeklyFiles, setWeeklyFiles] = useState([]);
  const [isSubmittingWeek, setIsSubmittingWeek] = useState(false);

  // Feedback Alerts
  const [alert, setAlert] = useState({ type: '', text: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Milestone Submissions
      try {
        const subRes = await api.get('/submissions');
        setSubmissions(subRes.data.submissions || subRes.data || []);
      } catch {
        setSubmissions([]);
      }

      // 2. Fetch Weekly Evaluations
      try {
        const weekRes = await api.get('/weekly-evaluations');
        setWeeklyEvals(weekRes.data.evaluations || weekRes.data || []);
      } catch {
        setWeeklyEvals([]);
      }
    } catch (err) {
      console.error('Error fetching documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Milestone Submission
  const handleSubmitMilestone = async (e) => {
    e.preventDefault();
    if (!subFile || !subTitle.trim()) {
      setAlert({ type: 'error', text: 'Please provide document title and select a file.' });
      return;
    }

    setIsSubmittingDoc(true);
    setAlert({ type: '', text: '' });

    const formData = new FormData();
    formData.append('type', subType);
    formData.append('title', subTitle.trim());
    formData.append('description', subDesc.trim());
    formData.append('file', subFile);

    try {
      await api.post('/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAlert({ type: 'success', text: `${subType} document submitted successfully!` });
      setSubTitle('');
      setSubDesc('');
      setSubFile(null);
      fetchData();
    } catch (err) {
      setAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to submit milestone document.',
      });
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  // Handle Weekly Evaluation Submission
  const handleSubmitWeekly = async (e) => {
    e.preventDefault();
    if (!workSummary.trim()) {
      setAlert({ type: 'error', text: 'Please write a brief summary of work done this week.' });
      return;
    }

    setIsSubmittingWeek(true);
    setAlert({ type: '', text: '' });

    const formData = new FormData();
    formData.append('weekNumber', Number(weekNumber));
    formData.append('workSummary', workSummary.trim());
    for (let i = 0; i < weeklyFiles.length; i++) {
      formData.append('files', weeklyFiles[i]);
    }

    try {
      await api.post('/weekly-evaluations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAlert({ type: 'success', text: `Week ${weekNumber} progress log submitted successfully!` });
      setWorkSummary('');
      setWeeklyFiles([]);
      setWeekNumber((prev) => Number(prev) + 1);
      fetchData();
    } catch (err) {
      setAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to submit weekly evaluation.',
      });
    } finally {
      setIsSubmittingWeek(false);
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

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/60 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-primary text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              <span>Project Deliverables & Progress Logs</span>
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Documents & Submissions</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Submit major project milestone deliverables and upload weekly progress reports for supervisor review.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/60">
            <button
              onClick={() => { setActiveTab('milestones'); setAlert({ type: '', text: '' }); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'milestones'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Milestone Submissions</span>
            </button>
            <button
              onClick={() => { setActiveTab('weekly'); setAlert({ type: '', text: '' }); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'weekly'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Weekly Evaluations</span>
            </button>
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

        {/* TAB 1: Milestone Submissions */}
        {activeTab === 'milestones' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Upload Form (4 cols) */}
            <div className="lg:col-span-5 bg-white border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-surface-container-high text-primary rounded-lg">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary text-base">Submit Formal Deliverable</h3>
                    <p className="text-xs text-on-surface-variant">PDF or DOCX file (up to 20 MB)</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitMilestone} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                      Deliverable Type
                    </label>
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Proposal">Project Proposal</option>
                      <option value="Presentation">Mid-Evaluation Presentation</option>
                      <option value="Report">Final Project Report</option>
                      <option value="Other">Other Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                      Document Title
                    </label>
                    <input
                      type="text"
                      required
                      value={subTitle}
                      onChange={(e) => setSubTitle(e.target.value)}
                      placeholder="e.g. Group 4 Final Proposal v2"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                      Description / Revision Notes
                    </label>
                    <textarea
                      rows={2}
                      value={subDesc}
                      onChange={(e) => setSubDesc(e.target.value)}
                      placeholder="Brief notes on this version or changes made..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  {/* File Upload Zone */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                      Deliverable File
                    </label>
                    <div className="border-2 border-dashed border-outline-variant rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-surface">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.zip"
                        required
                        onChange={(e) => setSubFile(e.target.files[0])}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-container file:text-white hover:file:bg-primary cursor-pointer"
                      />
                      {subFile && (
                        <p className="text-xs font-semibold text-secondary mt-2 truncate">
                          Selected: {subFile.name} ({(subFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingDoc}
                    className="w-full py-2.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-70 mt-2"
                  >
                    {isSubmittingDoc ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading Document...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Milestone</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Submissions List (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-outline-variant rounded-xl shadow-xs overflow-hidden flex flex-col">
              <div className="p-5 border-b border-outline-variant bg-surface flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-primary text-base">Submitted Milestone Documents</h3>
                </div>
                <span className="text-xs text-on-surface-variant font-medium">
                  {submissions.length} documents submitted
                </span>
              </div>

              <div className="p-4 divide-y divide-outline-variant/60 overflow-y-auto">
                {submissions.length > 0 ? (
                  submissions.map((sub) => (
                    <div key={sub._id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-bold text-[11px]">
                            {sub.type}
                          </span>
                          <h4 className="font-bold text-primary text-sm">{sub.title}</h4>
                        </div>
                        {sub.description && (
                          <p className="text-xs text-on-surface-variant mt-1">{sub.description}</p>
                        )}
                        <p className="text-[11px] text-outline mt-1.5">
                          File: {sub.file?.originalName} • Submitted on {new Date(sub.createdAt).toLocaleDateString()}
                        </p>

                        {/* Evaluation Badge / Marks */}
                        {sub.status === 'Evaluated' && (
                          <div className="mt-2 p-2.5 rounded-lg bg-teal-50 border border-teal-200">
                            <p className="text-xs font-bold text-teal-900">
                              Evaluation Marks: {sub.evaluation?.marks} / 100
                            </p>
                            {sub.evaluation?.comments && (
                              <p className="text-[11px] text-teal-800 mt-0.5">
                                "{sub.evaluation.comments}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            sub.status === 'Evaluated'
                              ? 'bg-teal-100 text-secondary'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-on-surface-variant py-8 text-center">
                    No milestone documents submitted yet. Use the form on the left to submit your project proposal.
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Weekly Progress Evaluations */}
        {activeTab === 'weekly' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Submit Weekly Log (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-surface-container-high text-primary rounded-lg">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary text-base">Submit Weekly Progress</h3>
                    <p className="text-xs text-on-surface-variant">Log activities & attach up to 5 files</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitWeekly} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                      Week Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      required
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                      Weekly Work Summary
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={workSummary}
                      onChange={(e) => setWorkSummary(e.target.value)}
                      placeholder="Describe the tasks completed, challenges encountered, and next steps for this week..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                      Supporting Files (Optional, Max 5 files)
                    </label>
                    <div className="border border-outline-variant rounded-lg p-3 bg-surface">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setWeeklyFiles(e.target.files)}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-container file:text-white hover:file:bg-primary cursor-pointer"
                      />
                      {weeklyFiles.length > 0 && (
                        <p className="text-xs text-secondary font-semibold mt-1">
                          {weeklyFiles.length} file(s) selected
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingWeek}
                    className="w-full py-2.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-70 mt-2"
                  >
                    {isSubmittingWeek ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting Weekly Log...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Week {weekNumber} Log</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Weekly Logs List (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-outline-variant rounded-xl shadow-xs overflow-hidden flex flex-col">
              <div className="p-5 border-b border-outline-variant bg-surface flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-primary text-base">Weekly Evaluation History</h3>
                </div>
                <span className="text-xs text-on-surface-variant font-medium">
                  {weeklyEvals.length} weekly logs submitted
                </span>
              </div>

              <div className="p-4 divide-y divide-outline-variant/60 overflow-y-auto space-y-4">
                {weeklyEvals.length > 0 ? (
                  weeklyEvals.map((we) => (
                    <div key={we._id} className="pt-4 first:pt-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 rounded-full bg-primary text-white font-bold text-xs">
                          Week {we.weekNumber}
                        </span>
                        <span className="text-[11px] text-outline">
                          {new Date(we.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-on-surface bg-surface p-3 rounded-lg border border-outline-variant/60 leading-relaxed mb-3">
                        {we.workSummary}
                      </p>

                      {/* Attachments */}
                      {we.attachments && we.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {we.attachments.map((att) => (
                            <span
                              key={att._id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container text-primary text-[11px] font-medium"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{att.originalName}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Supervisor Feedback */}
                      {we.status === 'Reviewed' ? (
                        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
                          <p className="text-xs font-bold text-teal-900">
                            Supervisor Feedback: {we.feedback || 'Good progress.'}
                          </p>
                          {we.marks !== null && (
                            <p className="text-xs font-semibold text-teal-800 mt-0.5">
                              Marks: {we.marks} / 100
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-medium">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>Pending Supervisor Review & Marks</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-on-surface-variant py-8 text-center">
                    No weekly evaluations submitted yet.
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </StudentLayout>
  );
}