import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Upload,
  FileCheck,
  Building2,
  X,
} from 'lucide-react';
import { saveTargetJob, fetchTargetJob } from '../../services/api';

const TargetJobSetup = ({
  hasResume = true,
  targetJobDetails,
  onSaveSuccess,
  onNavigateToResume,
  onNavigateToDashboard,
  onContinueToAnalysis,
}) => {
  const [company, setCompany] = useState('');
  const [file, setFile] = useState(null);
  const [hasExistingJob, setHasExistingJob] = useState(false);
  const [existingCompany, setExistingCompany] = useState('');
  const [existingFileName, setExistingFileName] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [justAdded, setJustAdded] = useState(false);

  const fileInputRef = useRef(null);

  // Synchronize with passed prop if available
  useEffect(() => {
    if (targetJobDetails && targetJobDetails.company) {
      setExistingCompany(targetJobDetails.company);
      setExistingFileName(targetJobDetails.jdFileName || 'Company_Job_Description.pdf');
      setCompany(targetJobDetails.company);
      setHasExistingJob(true);
      setLoading(false);
    }
  }, [targetJobDetails]);

  // Load existing target job on mount if not provided via props
  useEffect(() => {
    const loadData = async () => {
      if (targetJobDetails && targetJobDetails.company) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchTargetJob();
        if (res.success && res.data) {
          setExistingCompany(res.data.company || '');
          setExistingFileName(res.data.jdFileName || 'Company_Job_Description.pdf');
          setCompany(res.data.company || '');
          setHasExistingJob(true);
        } else {
          setHasExistingJob(false);
        }
      } catch (err) {
        console.warn('Failed to load target job:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      setError('File exceeds the 5MB size limit. Please choose a smaller file.');
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError(`Invalid file format '${ext}'. Please upload a PDF, DOCX or TXT file.`);
      return;
    }

    setError(null);
    setFile(selected);
  };

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!company || company.trim().length < 2) {
      setError('Please enter a valid company name (at least 2 characters).');
      return;
    }

    if (!file) {
      setError('Please choose and upload the company job description file.');
      return;
    }

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('company', company.trim());
    formData.append('jd', file);

    try {
      const res = await saveTargetJob(formData);
      if (res.success) {
        const savedCompany = res.data?.company || company.trim();
        const savedFileName = res.data?.jdFileName || file.name;
        setExistingCompany(savedCompany);
        setExistingFileName(savedFileName);
        setHasExistingJob(true);
        setIsReplacing(false);
        setFile(null);
        setJustAdded(true);

        if (onSaveSuccess) {
          onSaveSuccess(res.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save target job. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Rule 1 Enforcement: If student has not uploaded a resume yet, gate target job
  if (!hasResume && !loading) {
    return (
      <div className="glass-panel p-8 rounded-3xl border border-slate-800/90 text-center max-w-xl mx-auto space-y-4 shadow-xl">
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl w-12 h-12 mx-auto flex items-center justify-center">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Resume Required First</h3>
        <p className="text-xs text-slate-300">
          You must upload your resume before adding your target job. The platform uses your resume to evaluate skills against the job requirements.
        </p>
        <div className="pt-2">
          <button
            onClick={onNavigateToResume}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-500/20"
          >
            [ Upload Resume ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4">
      {/* Hidden file input controlled by [ Choose File ] button */}
      <input
        ref={fileInputRef}
        type="file"
        id="jd-upload-input"
        accept=".pdf,.docx,.doc,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* =========================================================================
          VIEW STATE A: TARGET JOB ADDED (AND NOT REPLACING)
          ========================================================================= */}
      {hasExistingJob && !isReplacing ? (
        <div className="glass-panel p-10 rounded-3xl border border-slate-800/90 shadow-2xl text-center space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Target Job</h1>
          </div>

          {/* Status badge: ✓ Target Job Added */}
          <div className="flex items-center justify-center space-x-2 text-emerald-400 font-semibold text-base">
            <CheckCircle className="w-5 h-5" />
            <span>
              {justAdded ? '✓ Target Job Added successfully' : '✓ Target Job Added'}
            </span>
          </div>

          {/* Company details */}
          <div className="text-sm text-slate-300">
            Company: <span className="font-bold text-white text-base">{existingCompany}</span>
          </div>

          {/* Job Description details card */}
          <div className="space-y-1.5 max-w-sm mx-auto">
            <p className="text-xs text-slate-400 text-left font-semibold">Job Description:</p>
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center space-x-3 text-left">
              <FileCheck className="w-6 h-6 text-brand-400 flex-shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-emerald-400 text-sm truncate block">
                  ✓ {existingFileName}
                </span>
                <span className="text-[11px] text-slate-400">Stored and ready for AI analysis</span>
              </div>
            </div>
          </div>

          {/* Secondary helper text */}
          <p className="text-xs text-slate-400">
            Your target job is configured. You can now proceed to AI skill-gap analysis.
          </p>

          {/* Action: [ Replace JD ] */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={() => {
                setIsReplacing(true);
                setJustAdded(false);
                setCompany(existingCompany);
                setFile(null);
                setError(null);
              }}
              className="px-5 py-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition shadow-sm"
            >
              [ Replace JD ]
            </button>
          </div>

          {/* Primary Action: [ Continue to AI Analysis ] */}
          <div className="pt-4 border-t border-slate-800/80">
            <button
              onClick={onContinueToAnalysis}
              className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 inline-flex items-center space-x-2"
            >
              <span>[ Continue to AI Analysis ]</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* =========================================================================
           VIEW STATE B: NO TARGET JOB (INITIAL STATE) OR REPLACE MODE
           ========================================================================= */
        <div className="glass-panel p-10 rounded-3xl border border-slate-800/90 shadow-2xl text-center space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Target Job</h1>
            <p className="text-xs text-slate-400 mt-1.5">
              Add the company job description you're preparing for.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-6 text-left max-w-md mx-auto">
            {/* Field 1: Company Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Company Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
                <Building2 className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Field 2: Company Job Description Box Matching ASCII Wireframe:
                Company Job Description
                ┌─────────────────────────────────────────────┐
                │                                             │
                │                    📄                       │
                │                                             │
                │             Upload Company JD              │
                │                                             │
                │             PDF, DOCX or TXT                │
                │                                             │
                │              [ Choose File ]                │
                │                                             │
                └─────────────────────────────────────────────┘ */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Company Job Description
              </label>
              <div className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-2xl p-8 bg-slate-900/40 transition flex flex-col items-center justify-center space-y-3 text-center">
                <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl text-brand-400">
                  <FileText className="w-8 h-8" />
                </div>

                <p className="text-sm font-bold text-white">Upload Company JD</p>
                <p className="text-xs text-slate-400">PDF, DOCX or TXT</p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition shadow-sm"
                >
                  [ Choose File ]
                </button>

                {file && (
                  <div className="pt-2 text-xs font-semibold text-brand-400 truncate max-w-xs">
                    Selected: {file.name}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 text-center mt-2">Maximum file size: 5 MB</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button: [ Add Target Job ] */}
            <div className="pt-2 flex items-center justify-center gap-3">
              {isReplacing && hasExistingJob && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReplacing(false);
                    setFile(null);
                    setError(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 inline-flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing & Adding Target Job...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>[ Add Target Job ]</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TargetJobSetup;
