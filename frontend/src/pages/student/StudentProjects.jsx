import { useState, useEffect } from 'react';
import StudentLayout from '../../components/StudentLayout';
import api from '../../services/api';
import {
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Calendar,
  Layers,
  Loader2,
  Send,
  BookOpen,
  Filter
} from 'lucide-react';

export default function StudentProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Similarity Checker States
  const [ideaText, setIdeaText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError] = useState('');

  // Fetch Historical Projects
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedYear) params.year = selectedYear;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/ideas/historical', { params });
      setProjects(res.data || []);
    } catch (err) {
      console.error('Failed to load historical projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [selectedYear]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  // Run Similarity Check against database
  const handleCheckSimilarity = async (e) => {
    e.preventDefault();
    if (!ideaText.trim()) return;

    setIsChecking(true);
    setCheckError('');
    setCheckResult(null);

    try {
      const res = await api.post('/ideas/check', { idea: ideaText.trim() });
      setCheckResult(res.data);
    } catch (err) {
      setCheckError(err.response?.data?.message || 'Failed to check idea similarity.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="border-b border-outline-variant/60 pb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-primary text-xs font-semibold mb-2">
            <BookOpen className="h-3.5 w-3.5 text-secondary" />
            <span>Academic Project Archive</span>
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Previous Project Titles</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Search the repository of past student projects to discover inspiration and verify idea uniqueness.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search project titles, keywords, or topics (e.g. IoT, Hostel, Attendance)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Academic Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>

              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-all shadow-xs shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-outline-variant/50">
            <span>Showing verified past university projects</span>
            <span className="font-semibold text-primary">{projects.length} Projects Found</span>
          </div>
        </div>

        {/* Main Grid: Left 8 cols = Projects List, Right 4 cols = Similarity Checker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Projects Directory (8 cols) */}
          <div className="lg:col-span-8 space-y-3.5">
            {loading ? (
              <div className="flex h-64 items-center justify-center bg-white rounded-xl border border-outline-variant">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.length > 0 ? (
              projects.map((proj) => (
                <div
                  key={proj._id}
                  className="bg-white border border-outline-variant rounded-xl p-5 shadow-xs hover:border-primary/40 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-primary leading-snug">
                      {proj.title}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-bold text-xs shrink-0 self-start">
                      Year {proj.batch}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/50">
                    <span className="font-semibold text-secondary">
                      Group {proj.groupNumber}
                    </span>
                    {proj.supervisor && (
                      <span className="text-outline">
                        Supervisor: {proj.supervisor}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-outline-variant rounded-xl p-8 text-center text-xs text-outline">
                No past projects matched your search criteria.
              </div>
            )}
          </div>

          {/* Right Column: Live Similarity Checker (4 cols) */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs sticky top-24 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-surface-container-high text-secondary rounded-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-base">Idea Similarity Checker</h3>
                  <p className="text-xs text-on-surface-variant">Check project uniqueness</p>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Paste your proposed project title or concept below to analyze potential topic overlap with existing projects.
              </p>

              <form onSubmit={handleCheckSimilarity} className="space-y-3">
                <textarea
                  rows={4}
                  required
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  placeholder="e.g. Smart Hostel Room Allocation & Maintenance System..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none text-on-surface"
                />

                <button
                  type="submit"
                  disabled={isChecking}
                  className="w-full py-2.5 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-70"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Checking Similarity...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Check Similarity</span>
                    </>
                  )}
                </button>
              </form>

              {checkError && (
                <p className="text-xs text-error font-medium">{checkError}</p>
              )}

              {/* Similarity Results Card */}
              {checkResult && (
                <div className="mt-4 pt-4 border-t border-outline-variant/60 space-y-3">
                  {checkResult.count === 0 ? (
                    <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
                      <div className="flex items-center gap-2 text-teal-800 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                        <span>Low Risk of Duplication</span>
                      </div>
                      <p className="text-[11px] text-teal-700 mt-1">
                        No highly similar past projects found. Your project idea appears unique!
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>{checkResult.count} Similar Project(s) Found</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1 mb-2">
                        Potential overlap detected with the following past projects:
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {checkResult.matches.map((m, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border border-amber-200 text-xs">
                            <p className="font-bold text-primary">{m.projectName}</p>
                            <span className="text-[10px] text-outline">
                              Year {m.year} • Group {m.groupNumber}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </StudentLayout>
  );
}