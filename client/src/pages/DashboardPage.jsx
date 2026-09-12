import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ResumeUploader from '../components/resume/ResumeUploader';
import TargetJobSetup from '../components/targetJob/TargetJobSetup';
import PreparationView from '../components/preparation/PreparationView';
import TechnicalInterviewView from '../components/interview/TechnicalInterviewView';
import AdminDashboardView from '../components/admin/AdminDashboardView';
import {
  fetchStudentDashboard,
  triggerAIAnalysis,
  startPreparing,
  setReadyForRound1,
} from '../services/api';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  BookOpen,
  Code2,
  CheckSquare,
  Video,
  TrendingUp,
  LogOut,
  User as UserIcon,
  Check,
  ArrowRight,
  Shield,
  Bot,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
} from 'lucide-react';

const DashboardPage = () => {
  const { user, token, logout, isAdmin } = useAuth();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [gateNotification, setGateNotification] = useState(null);

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetchStudentDashboard();
      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err.message);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stage = dashboardData?.stage ?? 1;
  const hasResume = dashboardData?.hasResume ?? false;
  const hasTargetJob = dashboardData?.hasTargetJob ?? false;
  const targetRoleText =
    dashboardData?.jobTargetDetails?.jobTitle ||
    dashboardData?.targetRole ||
    'Full Stack AI Engineer';
  const companyName = dashboardData?.company;
  const daysRemaining = dashboardData?.daysRemaining ?? 10;
  const nextStep = dashboardData?.nextStep;

  // Handle stage-gated navigation
  const handleNavClick = (tabId) => {
    setGateNotification(null);

    // Rule 1: Resume must be added first
    if (!hasResume && tabId !== 'dashboard' && tabId !== 'resume' && tabId !== 'admin') {
      setGateNotification('Resume must be uploaded first before proceeding.');
      return;
    }

    // Rule 2: Target job must be added before preparation or technical interview
    if (!hasTargetJob && (tabId === 'preparation' || tabId === 'technical-interview')) {
      setGateNotification('Target job must be added before proceeding to preparation or technical interviews.');
      return;
    }

    setActiveNav(tabId);
  };

  // State 3 Action: Trigger AI Analysis -> Moves to State 4
  const handleStartAnalysis = async () => {
    setActionLoading(true);
    try {
      const res = await triggerAIAnalysis();
      if (res.success) {
        await loadDashboard();
        setActiveNav('preparation');
      }
    } catch (err) {
      console.error('Failed to trigger AI analysis:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // State 4 Action: Start preparing -> Moves to State 5
  const handleStartPreparing = async () => {
    setActionLoading(true);
    try {
      const res = await startPreparing();
      if (res.success) {
        await loadDashboard();
      }
    } catch (err) {
      console.error('Failed to update preparation state:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // State 5 Action: I'M READY -> Moves to State 6
  const handleConfirmReady = async () => {
    setActionLoading(true);
    try {
      const res = await setReadyForRound1();
      if (res.success) {
        await loadDashboard();
      }
    } catch (err) {
      console.error('Failed to set readiness state:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Student Navigation menu items: Dashboard, Resume, Target Job, Preparation, Technical Interview
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, locked: false },
    { id: 'resume', label: 'Resume', icon: FileText, locked: false },
    { id: 'target-job', label: 'Target Job', icon: Briefcase, locked: !hasResume },
    { id: 'preparation', label: 'Preparation', icon: BookOpen, locked: !hasResume || !hasTargetJob },
    { id: 'technical-interview', label: 'Technical Interview', icon: Video, locked: !hasResume || !hasTargetJob },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-slate-100 font-sans">
      {/* ┌─────────────────────────────────────────────────────────────┐
          │ PrepAI                                      Profile   Logout │
          └─────────────────────────────────────────────────────────────┘ */}
      <header className="h-16 border-b border-slate-800/90 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-brand-600 to-violet-600 rounded-xl shadow-lg shadow-brand-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">PrepAI</span>
        </div>

        {/* Right Header Navigation: Profile & Logout */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5 text-xs text-slate-300">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-400 font-semibold">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-200">
              {user?.name || 'Profile'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {user?.role || 'Student'}
            </span>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-60 border-r border-slate-800/90 bg-slate-950/40 p-4 flex flex-col justify-between shrink-0">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              const isItemLocked = item.locked;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                    isActive
                      ? 'bg-brand-600 text-white font-semibold shadow-lg shadow-brand-500/20'
                      : isItemLocked
                      ? 'text-slate-600 hover:text-slate-500 hover:bg-slate-900/30 cursor-not-allowed'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isItemLocked ? 'text-slate-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isItemLocked && <Lock className="w-3 h-3 text-slate-600" />}
                </button>
              );
            })}

            {/* Admin Directory if logged in as Admin */}
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-slate-800/80">
                <button
                  onClick={() => setActiveNav('admin')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                    activeNav === 'admin'
                      ? 'bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20'
                      : 'text-violet-400 hover:text-violet-300 hover:bg-violet-950/30'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Directory</span>
                </button>
              </div>
            )}
          </nav>

          {/* Stage tracker footer in sidebar */}
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 text-brand-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              <span>Placement Preparation</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Stage {stage} of 6 • {daysRemaining} days to drive
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 max-w-5xl">
          {/* Gating Alert Banner if student clicks a locked tab */}
          {gateNotification && (
            <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{gateNotification}</span>
              </div>
              <button
                onClick={() => setGateNotification(null)}
                className="text-amber-400 hover:text-amber-200 font-semibold px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: Main Dashboard (Matching User Wireframe & 6 States Exactly) */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6 max-w-2xl">
              {/* Header Titles */}
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Welcome back!
                </h1>
                <p className="text-base text-slate-300 mt-1 font-semibold">
                  {hasTargetJob && companyName
                    ? `${targetRoleText} at ${companyName}`
                    : targetRoleText}
                </p>
              </div>

              {/* ┌──────────────────────┐  ┌──────────────────────────────┐
                  │ Resume               │  │ Target Job                   │
                  │                      │  │                              │
                  │ ✓ Uploaded           │  │ ✓ Added                      │
                  │                      │  │ Full Stack AI Engineer       │
                  │ [ View ]             │  │ [ View ]                     │
                  └──────────────────────┘  └──────────────────────────────┘ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Resume Card (Rule 1 & Rule 6) */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800/90 shadow-lg flex flex-col justify-between h-44 hover:border-slate-700/80 transition">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200">Resume</h2>
                    <div className="mt-3 flex items-center space-x-2">
                      {hasResume ? (
                        <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-sm">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>✓ Uploaded</span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Not added</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => setActiveNav('resume')}
                      className="px-4 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition shadow-sm"
                    >
                      {hasResume ? '[ View ]' : '[ Upload Resume ]'}
                    </button>
                  </div>
                </div>

                {/* Target Job Card (Rule 2 & Rule 6) */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800/90 shadow-lg flex flex-col justify-between h-44 hover:border-slate-700/80 transition">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200">Target Job</h2>
                    <div className="mt-3 flex items-center space-x-2">
                      {hasTargetJob ? (
                        <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-sm">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>✓ Added</span>
                        </div>
                      ) : hasResume ? (
                        <span className="text-xs font-medium text-slate-400">Not added</span>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                    {hasTargetJob && (
                      <p className="text-xs font-medium text-slate-300 mt-1 truncate">
                        {targetRoleText}
                      </p>
                    )}
                  </div>

                  <div>
                    {hasTargetJob ? (
                      <button
                        onClick={() => setActiveNav('target-job')}
                        className="px-4 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition shadow-sm"
                      >
                        [ View ]
                      </button>
                    ) : hasResume ? (
                      <button
                        onClick={() => setActiveNav('target-job')}
                        className="px-4 py-1.5 rounded-lg border border-brand-500/40 hover:border-brand-500 bg-brand-600/20 hover:bg-brand-600/30 text-xs font-semibold text-brand-300 transition shadow-sm"
                      >
                        [ Add Target Job ]
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-1.5 rounded-lg border border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-600 cursor-not-allowed"
                      >
                        [ Add Target Job ]
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ┌─────────────────────────────────────────────────────────┐
                  │                    YOUR NEXT STEP                       │
                  │                                                         │
                  │  Your resume and target job are ready.                 │
                  │  Analyze your profile to identify your skill gaps.     │
                  │                                                         │
                  │                  [ Start AI Analysis ]                  │
                  └─────────────────────────────────────────────────────────┘ */}
              <div className="glass-panel p-8 rounded-3xl border border-slate-800/90 shadow-xl text-center space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {nextStep?.title || 'YOUR NEXT STEP'}
                </h3>

                {/* State-Based Messages (States 1 to 6) */}
                <div className="space-y-1 max-w-md mx-auto">
                  {stage === 1 && (
                    <>
                      <p className="text-sm font-medium text-slate-200">
                        Upload your resume
                      </p>
                      <p className="text-xs text-slate-400">
                        Upload your resume to extract skills and begin placement preparation.
                      </p>
                    </>
                  )}

                  {stage === 2 && (
                    <>
                      <p className="text-sm font-medium text-slate-200">
                        Add your target job
                      </p>
                      <p className="text-xs text-slate-400">
                        Add your target company, role, and drive date to tailor your interview roadmap.
                      </p>
                    </>
                  )}

                  {stage === 3 && (
                    <>
                      <p className="text-sm font-medium text-slate-200">
                        Your resume and target job are ready.
                      </p>
                      <p className="text-xs text-slate-400">
                        Analyze your profile to identify your skill gaps.
                      </p>
                    </>
                  )}

                  {stage === 4 && (
                    <>
                      <p className="text-sm font-medium text-slate-200">
                        Review your skill-gap recommendations
                      </p>
                      <p className="text-xs text-slate-400">
                        AI analysis completed. Review your matched skills, missing skills, and prioritized topics.
                      </p>
                    </>
                  )}

                  {stage === 5 && (
                    <>
                      <p className="text-sm font-medium text-slate-200">
                        Review what you should prepare
                      </p>
                      <p className="text-xs text-slate-400">
                        Review what you should prepare before taking the assessment.
                      </p>
                    </>
                  )}

                  {stage === 6 && (
                    <>
                      <p className="text-sm font-medium text-slate-200">
                        Round 1 Technical Assessment
                      </p>
                      <p className="text-xs text-slate-400">
                        You have confirmed readiness. Complete your timed 20-minute Technical Assessment.
                      </p>
                    </>
                  )}
                </div>

                {/* Action Buttons for States 1 to 6 */}
                <div className="pt-2">
                  {stage === 1 && (
                    <button
                      onClick={() => setActiveNav('resume')}
                      className="px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 inline-flex items-center space-x-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>[ Upload Resume ]</span>
                    </button>
                  )}

                  {stage === 2 && (
                    <button
                      onClick={() => setActiveNav('target-job')}
                      className="px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 inline-flex items-center space-x-2"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>[ Add Target Job ]</span>
                    </button>
                  )}

                  {stage === 3 && (
                    <button
                      onClick={handleStartAnalysis}
                      disabled={actionLoading}
                      className="px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 active:scale-[0.99] inline-flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 text-brand-200" />
                      <span>{actionLoading ? 'Analyzing Profile...' : '[ Start AI Analysis ]'}</span>
                    </button>
                  )}

                  {stage === 4 && (
                    <button
                      onClick={() => setActiveNav('preparation')}
                      className="px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 inline-flex items-center space-x-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>[ View Recommendations ]</span>
                    </button>
                  )}

                  {stage === 5 && (
                    <button
                      onClick={() => setActiveNav('preparation')}
                      className="px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 inline-flex items-center space-x-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>[ Continue Prep ]</span>
                    </button>
                  )}

                  {stage === 6 && (
                    <button
                      onClick={() => setActiveNav('assessment')}
                      className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/40 inline-flex items-center space-x-2"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>[ Start Round 1 ]</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Resume (Clean Student-Facing Upload & Confirmation) */}
          {activeNav === 'resume' && (
            <div className="space-y-4">
              <div className="flex items-center justify-end pb-2">
                <button
                  onClick={() => setActiveNav('dashboard')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  ← Back to Dashboard
                </button>
              </div>

              <ResumeUploader
                authToken={token}
                hasResume={hasResume}
                resumeDetails={dashboardData?.resumeDetails}
                onUploadSuccess={loadDashboard}
                onDeleteSuccess={loadDashboard}
                onNavigateToNext={() => setActiveNav('target-job')}
              />
            </div>
          )}

          {/* TAB 3: Target Job (Clean Student-Facing Upload & Confirmation) */}
          {activeNav === 'target-job' && (
            <div className="space-y-4">
              <div className="flex items-center justify-end pb-2">
                <button
                  onClick={() => setActiveNav('dashboard')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  ← Back to Dashboard
                </button>
              </div>

              <TargetJobSetup
                hasResume={hasResume}
                targetJobDetails={dashboardData?.jobTargetDetails}
                onSaveSuccess={loadDashboard}
                onNavigateToResume={() => setActiveNav('resume')}
                onNavigateToDashboard={() => setActiveNav('dashboard')}
                onContinueToAnalysis={handleStartAnalysis}
              />
            </div>
          )}

          {/* TAB 4: Preparation (Real AI Analysis & Mock Quizzes) */}
          {activeNav === 'preparation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-end pb-2">
                <button
                  onClick={() => setActiveNav('dashboard')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  ← Back to Dashboard
                </button>
              </div>

              {stage < 4 ? (
                /* Gated state if analysis has not been run */
                <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-4 max-w-xl mx-auto">
                  <Lock className="w-10 h-10 text-slate-500 mx-auto" />
                  <h3 className="text-lg font-bold text-white">Analysis Not Completed</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Complete your resume upload and target job setup, then trigger AI Analysis on the Dashboard to view your prioritized preparation topics and mock quizzes.
                  </p>
                  <button
                    onClick={() => setActiveNav('dashboard')}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-500/20"
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : (
                <PreparationView
                  aiAnalysisData={dashboardData?.aiAnalysisData}
                  companyName={companyName || 'Target Company'}
                  targetRole={targetRoleText}
                  onBackToDashboard={() => setActiveNav('dashboard')}
                  onRefreshDashboard={loadDashboard}
                />
              )}
            </div>
          )}

          {/* TAB: Technical Interview */}
          {activeNav === 'technical-interview' && (
            <TechnicalInterviewView
              companyName={companyName}
              targetRole={targetRoleText}
              onBackToDashboard={() => setActiveNav('dashboard')}
            />
          )}

          {/* TAB: Admin Directory View */}
          {activeNav === 'admin' && isAdmin && (
            <div className="space-y-6">
              <AdminDashboardView />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
