import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Upload,
  X,
  FileCheck,
  Trash2,
} from 'lucide-react';
import api, { deleteResume } from '../../services/api';

const ResumeUploader = ({
  authToken,
  hasResume: hasResumeProp,
  resumeDetails,
  onUploadSuccess,
  onDeleteSuccess,
  onNavigateToNext,
}) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const [localResumeData, setLocalResumeData] = useState(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const fileInputRef = useRef(null);

  // Sync with prop if available
  useEffect(() => {
    if (resumeDetails) {
      setLocalResumeData(resumeDetails);
    } else if (hasResumeProp === false) {
      setLocalResumeData(null);
    }
  }, [resumeDetails, hasResumeProp]);

  // If hasResumeProp is explicitly provided, respect it; otherwise fall back to local data
  const isResumeUploaded =
    hasResumeProp !== undefined ? Boolean(hasResumeProp) : Boolean(localResumeData);

  const activeFileName =
    localResumeData?.fileName || resumeDetails?.fileName || 'Uploaded Resume';

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      setError('File exceeds the 5MB size limit. Please choose a smaller file.');
      return;
    }

    setError(null);
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }

    if (!authToken) {
      setError('You must be logged in to upload a resume.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await api.post('/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${authToken}`,
        },
      });

      setLocalResumeData(res.resume);
      setFile(null);
      setJustUploaded(true);
      setIsReplacing(false);
      if (onUploadSuccess) {
        onUploadSuccess(res.resume);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove your resume? You will need to upload a resume again to proceed.')) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteResume();
      setLocalResumeData(null);
      setJustUploaded(false);
      setIsReplacing(false);
      setFile(null);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete resume.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4">
      {/* Hidden file input controlled by [ Choose File ] button */}
      <input
        ref={fileInputRef}
        type="file"
        id="resume-upload-input"
        accept=".pdf,.docx,.doc,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* =========================================================================
          VIEW STATE A: RESUME IS UPLOADED (AND NOT REPLACING)
          ========================================================================= */}
      {isResumeUploaded && !isReplacing ? (
        <div className="glass-panel p-10 rounded-3xl border border-slate-800/90 shadow-2xl text-center space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Student Resume</h1>
          </div>

          {/* Status badge */}
          <div className="flex items-center justify-center space-x-2 text-emerald-400 font-semibold text-base">
            <CheckCircle className="w-5 h-5" />
            <span>
              {justUploaded ? '✓ Resume uploaded successfully' : '✓ Resume uploaded'}
            </span>
          </div>

          {/* Document card */}
          <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-center space-x-3 max-w-sm mx-auto">
            <FileCheck className="w-6 h-6 text-brand-400" />
            <span className="font-semibold text-white text-sm truncate">
              {activeFileName}
            </span>
          </div>

          {/* Secondary helper text */}
          <p className="text-xs text-slate-400">
            Your resume is ready for AI analysis.
          </p>

          {/* Action row: [ View Resume ] [ Replace Resume ] [ Remove Resume ] */}
          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <button
              onClick={() => setShowViewModal(true)}
              className="px-5 py-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition shadow-sm"
            >
              [ View Resume ]
            </button>

            <button
              onClick={() => {
                setIsReplacing(true);
                setJustUploaded(false);
              }}
              className="px-5 py-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition shadow-sm"
            >
              [ Replace Resume ]
            </button>

            <button
              onClick={handleDeleteResume}
              disabled={deleting}
              className="px-4 py-2 rounded-xl border border-rose-900/60 hover:border-rose-700 bg-rose-950/20 hover:bg-rose-950/40 text-xs font-semibold text-rose-300 transition shadow-sm inline-flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{deleting ? 'Removing...' : '[ Remove Resume ]'}</span>
            </button>
          </div>

          {/* Primary Action: [ Continue to Target Job ] */}
          <div className="pt-4 border-t border-slate-800/80">
            <button
              onClick={onNavigateToNext}
              className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 inline-flex items-center space-x-2"
            >
              <span>[ Continue to Target Job ]</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* =========================================================================
           VIEW STATE B: NO RESUME UPLOADED (INITIAL STATE) OR REPLACE MODE
           ========================================================================= */
        <div className="glass-panel p-10 rounded-3xl border border-slate-800/90 shadow-2xl text-center space-y-6">
          {/* Title & Subtitles */}
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Student Resume</h1>
            <h2 className="text-sm font-semibold text-slate-200 mt-2">
              Upload your resume to get started
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Your resume will be analyzed to identify your skills, projects, and areas that may need improvement.
            </p>
          </div>

          {/* Center Upload Box Matching Wireframe:
              ┌──────────────────────────────┐
              │                              │
              │        📄                    │
              │                              │
              │    Upload your resume        │
              │                              │
              │    PDF, DOCX or TXT          │
              │                              │
              │       [ Choose File ]        │
              │                              │
              └──────────────────────────────┘ */}
          <div className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-2xl p-8 bg-slate-900/40 transition flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
            <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl text-brand-400">
              <FileText className="w-8 h-8" />
            </div>

            <p className="text-sm font-bold text-white">Upload your resume</p>
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

          <p className="text-xs text-slate-500">Maximum file size: 5 MB</p>

          {/* Feedback error banner if any */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center space-x-2 max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action Button: [ Upload Resume ] */}
          <div className="pt-2 flex items-center justify-center gap-3">
            {isReplacing && isResumeUploaded && (
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
              type="button"
              onClick={handleUpload}
              disabled={uploading || !file}
              className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 inline-flex items-center space-x-2 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading Resume...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>[ Upload Resume ]</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODAL (When student clicks [ View Resume ])
          ========================================================================= */}
      {showViewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">{activeFileName}</h3>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 max-h-72 overflow-y-auto pr-1">
              <p className="text-slate-400">
                Uploaded document is stored securely and ready for AI skill-gap analysis.
              </p>
              {localResumeData?.rawText && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400 whitespace-pre-line leading-relaxed">
                  {localResumeData.rawText.substring(0, 500)}...
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUploader;
