import React, { useState, useEffect } from 'react';
import { fetchAdminOverview, fetchAdminStudents, checkHealth } from '../../services/api';
import {
  Users,
  FileText,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';

const AdminDashboardView = () => {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, studentsRes] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminStudents(),
      ]);

      if (overviewRes.success) {
        setStats(overviewRes.data.stats);
      }
      if (studentsRes.success) {
        setStudents(studentsRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Admin Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Registered Students</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {stats?.totalStudents ?? (loading ? '...' : 0)}
              </h3>
            </div>
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl border border-brand-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Enrolled candidates preparing for placements</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Resumes Uploaded & Parsed</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">
                {stats?.totalResumes ?? (loading ? '...' : 0)}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Active student profiles with extracted skills</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Platform Administrators</p>
              <h3 className="text-2xl font-extrabold text-violet-400 mt-1">
                {stats?.totalAdmins ?? (loading ? '...' : 0)}
              </h3>
            </div>
            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Platform administrators with system access</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">System Status</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-bold text-white">Online & Healthy</span>
              </div>
            </div>
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">MongoDB Connected • Port 5000</p>
        </div>
      </div>

      {/* Student Directory Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-brand-400" />
              <span>Student Candidate Directory</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review registered students, resume upload status, and detected technical skills
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 w-56"
              />
            </div>

            <button
              onClick={loadAdminData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-2">Student Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Enrolled On</th>
                <th className="pb-3">Resume Status</th>
                <th className="pb-3 pr-2">Skills Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {loading ? 'Loading registered students...' : 'No students found matching your search.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 pl-2 font-medium text-white">{student.name}</td>
                    <td className="py-3.5 text-slate-400 font-mono">{student.email}</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold text-[10px]">
                        Student
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-400">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5">
                      {student.hasResume ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Uploaded</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Pending Upload</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-2">
                      {student.hasResume && student.resume?.skills?.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {student.resume.skills.slice(0, 4).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20 text-[10px]"
                            >
                              {skill}
                            </span>
                          ))}
                          {student.resume.skills.length > 4 && (
                            <span className="text-[10px] text-slate-500 self-center">
                              +{student.resume.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardView;
