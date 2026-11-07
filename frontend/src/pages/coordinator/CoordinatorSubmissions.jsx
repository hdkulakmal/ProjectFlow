import { useState, useEffect } from 'react';
import CoordinatorLayout from '../../components/CoordinatorLayout';
import api from '../../services/api';
import {
  FileCheck2,
  Download,
  Award,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Clock,
  Filter
} from 'lucide-react';

export default function CoordinatorSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [alert, setAlert] = useState({ type: '', text: '' });

  // Evaluation Modal
  const [evalModalSub, setEvalModalSub] = useState(null);
  const [marks, setMarks] = useState('');
  const [comments, setComments] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      const res = await api.get('/submissions', { params });
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setAlert({ type: 'error', text: 'Failed to load submissions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [typeFilter]);

  // Handle Download File securely
  const handleDownload = async (sub) => {
    try {
      const res = await api.get(`/submissions/${sub._id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', sub.file?.originalName || 'submission.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setAlert({ type: 'error', text: 'Failed to download submission document.' });
    }
  };

  // Open Evaluation Modal
  const openEvalModal = (sub) => {
    setEvalModalSub(sub);
    setMarks(sub.evaluation?.marks !== null && sub.evaluation?.marks !== undefined ? sub.evaluation.marks : '');
    setComments(sub.evaluation?.comments || '');
  };

  // Submit Evaluation
  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (!evalModalSub || !comments.trim()) return;

    setIsEvaluating(true);
    try {
      await api.patch(`/submissions/${evalModalSub._id}/evaluate`, {
        marks: marks === '' ? null : Number(marks),
        comments: comments.trim()
      });
      setAlert({
        type: 'success',
        text: `Submission "${evalModalSub.title}" evaluated successfully!`
      });
      setEvalModalSub(null);
      fetchSubmissions();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.message || 'Failed to submit evaluation.' });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <CoordinatorLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/60 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Deliverables & Grading</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Review milestone document submissions, download project deliverables, and assign formal grades.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-on-surface-variant" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-white rounded-lg border border-outline-variant text-on-surface font-semibold focus:ring-1 focus:ring-primary shadow-xs"
            >
              <option value="">All Document Types</option>
              <option value="Proposal">Proposals</option>
              <option value="Presentation">Presentations</option>
              <option value="Report">Reports</option>
              <option value="Other">Other</option>
            </select>
          </div>
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
            <span className="flex-1">{alert.text}</span>
            <button onClick={() => setAlert({ type: '', text: '' })}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Submissions Table */}
        <div className="bg-white border border-outline-variant rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Group & Batch</th>
                    <th className="px-6 py-4">Submission Details</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Grade / Marks</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {submissions.length > 0 ? (
                    submissions.map((sub) => {
                      const isEvaluated = sub.status === 'Evaluated';
                      return (
                        <tr key={sub._id} className="hover:bg-surface transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-primary">Group {sub.group?.groupNumber || '—'}</p>
                            <p className="text-xs text-on-surface-variant">Batch {sub.group?.batch || '—'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-primary">{sub.title}</p>
                            <p className="text-xs text-on-surface-variant truncate max-w-xs">
                              {sub.file?.originalName}
                            </p>
                            <p className="text-[11px] text-outline mt-0.5">
                              By: {sub.submittedBy?.fullName || 'Student'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-surface-container text-primary">
                              {sub.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isEvaluated && sub.evaluation?.marks !== null ? (
                              <span className="text-sm font-extrabold text-secondary">
                                {sub.evaluation.marks} / 100
                              </span>
                            ) : (
                              <span className="text-xs text-outline font-medium">Ungraded</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isEvaluated ? 'bg-teal-100 text-secondary' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isEvaluated ? 'bg-secondary' : 'bg-amber-600'}`} />
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDownload(sub)}
                                title="Download File"
                                className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEvalModal(sub)}
                                className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-xs"
                              >
                                <Award className="h-3.5 w-3.5" />
                                <span>{isEvaluated ? 'Re-grade' : 'Evaluate'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-xs text-outline">
                        No submissions available to evaluate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Evaluation / Grading */}
        {evalModalSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant relative">
              <button
                onClick={() => setEvalModalSub(null)}
                className="absolute top-4 right-4 p-1.5 text-outline hover:text-on-surface rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center mb-3">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-primary">Evaluate Submission</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Group {evalModalSub.group?.groupNumber} — <strong>{evalModalSub.title}</strong>
                </p>
              </div>

              <form onSubmit={handleEvaluate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Marks / Score (0 – 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    placeholder="e.g. 85"
                    className="w-full px-3 py-2 text-sm bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Coordinator Feedback & Comments
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter academic feedback, strengths, and areas for improvement..."
                    className="w-full px-3 py-2 text-xs bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEvalModalSub(null)}
                    className="px-4 py-2 border border-outline-variant text-xs font-semibold rounded-lg hover:bg-slate-50 text-on-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEvaluating}
                    className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
                  >
                    {isEvaluating ? 'Saving...' : 'Submit Evaluation'}
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