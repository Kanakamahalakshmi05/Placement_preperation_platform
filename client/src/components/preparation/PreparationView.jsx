import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Zap,
  HelpCircle,
  Award,
  TrendingUp,
  X,
  Target,
  Flame,
  Check,
  Compass,
  Play,
} from 'lucide-react';
import { fetchMockQuiz, submitMockQuiz, triggerAIAnalysis } from '../../services/api';

const PreparationView = ({
  aiAnalysisData,
  companyName = 'Target Company',
  targetRole = 'Software Engineer',
  onBackToDashboard,
  onRefreshDashboard,
}) => {
  // Navigation states: 'overview' | 'quiz' | 'result'
  const [activeView, setActiveView] = useState('overview');
  const [quizDifficulty, setQuizDifficulty] = useState('easy');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizId, setQuizId] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [error, setError] = useState(null);
  const [refreshingAnalysis, setRefreshingAnalysis] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(aiAnalysisData);

  useEffect(() => {
    if (aiAnalysisData) {
      setCurrentAnalysis(aiAnalysisData);
    }
  }, [aiAnalysisData]);

  // Helper functions for safe extraction from objects or strings
  const getSkillLabel = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      return item.skill || item.name || item.topic || item.title || '';
    }
    return String(item);
  };

  const getTopicLabel = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item.replace(/\s*—\s*(HIGH|MEDIUM|LOW)/i, '');
    if (typeof item === 'object') {
      return item.topic || item.skill || item.name || item.title || '';
    }
    return String(item);
  };

  const getTopicPriority = (item) => {
    if (typeof item === 'object' && item !== null && item.priority) return String(item.priority).toUpperCase();
    if (typeof item === 'string' && item.includes('— HIGH')) return 'HIGH';
    if (typeof item === 'string' && item.includes('— MEDIUM')) return 'MEDIUM';
    return 'MEDIUM';
  };

  // Extract skills & topics from actual Resume + JD AI analysis (strictly from API)
  const activeData = currentAnalysis || aiAnalysisData;
  const rawMatched = activeData?.matchedSkillsDetailed && activeData.matchedSkillsDetailed.length > 0
    ? activeData.matchedSkillsDetailed
    : activeData?.matchedSkills || activeData?.strongSkills || [];

  const matchedSkills = rawMatched.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return {
        skill: getSkillLabel(item),
        strength: item.strength || 'strong',
        evidence: item.evidence || 'Verified proficiency from your resume.',
        jdContext: item.jdContext || null,
      };
    }
    return {
      skill: String(item),
      strength: 'strong',
      evidence: 'Verified proficiency from your resume.',
      jdContext: null,
    };
  }).filter((item) => Boolean(item.skill));

  const rawMissing = activeData?.missingSkillsDetailed && activeData.missingSkillsDetailed.length > 0
    ? activeData.missingSkillsDetailed
    : activeData?.missingSkills || activeData?.skillsToImprove || [];

  const missingSkills = rawMissing.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return {
        skill: getSkillLabel(item),
        importance: (item.importance || 'high').toLowerCase(),
        reason: item.reason || 'Required by company JD; prepare for interview questions.',
      };
    }
    return {
      skill: String(item),
      importance: 'high',
      reason: 'Required by company JD; prepare for interview questions.',
    };
  }).filter((item) => Boolean(item.skill));

  const rawFocusAreas = activeData?.areasToFocusDetailed && activeData.areasToFocusDetailed.length > 0
    ? activeData.areasToFocusDetailed
    : activeData?.areasToFocus || activeData?.importantTopics || activeData?.recommendedTopics || [];

  const areasToFocus = rawFocusAreas.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return {
        topic: getTopicLabel(item),
        priority: getTopicPriority(item),
        whyFocus: item.whyFocus || 'Key technical requirement from the company job description.',
        actionPlan: item.actionPlan || 'Review core concepts, practice common interview questions, and study practical implementation patterns.',
        skill: item.skill ? getSkillLabel(item.skill) : null,
      };
    }
    const isHigh = typeof item === 'string' && item.includes('— HIGH');
    const cleanTopic = (item || '').replace(/\s*—\s*(HIGH|MEDIUM|LOW)/i, '');
    return {
      topic: cleanTopic,
      priority: isHigh ? 'HIGH' : 'MEDIUM',
      whyFocus: 'Key technical requirement from the company job description.',
      actionPlan: 'Review core concepts, practice common interview questions, and study practical implementation patterns.',
      skill: null,
    };
  }).filter((item) => Boolean(item.topic));

  // Re-run AI analysis on demand
  const handleReanalyze = async () => {
    setRefreshingAnalysis(true);
    setError(null);
    try {
      const res = await triggerAIAnalysis();
      if (res.success && res.data?.aiAnalysisData) {
        setCurrentAnalysis(res.data.aiAnalysisData);
      }
      if (res.success && onRefreshDashboard) {
        await onRefreshDashboard();
      }
    } catch (err) {
      setError(err.message || 'Failed to re-run AI analysis.');
    } finally {
      setRefreshingAnalysis(false);
    }
  };

  // Automatically refresh AI analysis if skills are not yet populated
  useEffect(() => {
    if (
      (!aiAnalysisData || (!matchedSkills.length && !missingSkills.length)) &&
      onRefreshDashboard
    ) {
      handleReanalyze();
    }
  }, [aiAnalysisData]);

  // Start or Refresh Practice Quiz (30 Questions)
  const handleStartPracticeQuiz = async (isRefresh = false) => {
    setLoadingQuiz(true);
    setError(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);

    try {
      const res = await fetchMockQuiz({ count: 30, refresh: isRefresh });
      if (res.success && res.data?.questions?.length > 0) {
        setQuizId(res.data.quizId || null);
        setQuizQuestions(res.data.questions);
        setActiveView('quiz');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError('Failed to generate practice quiz questions. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load practice quiz. Ensure your Resume and Target Job are configured.');
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleStartQuiz = handleStartPracticeQuiz;

  // Option selection
  const handleSelectOption = (optionIndex) => {
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ) return;
    const qKey = currentQ.questionId || currentQ.id;
    setUserAnswers((prev) => ({
      ...prev,
      [qKey]: optionIndex,
    }));
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    setSubmittingQuiz(true);
    setError(null);
    try {
      const res = await submitMockQuiz({
        quizId,
        difficulty: 'mixed',
        questions: quizQuestions,
        userAnswers,
      });

      if (res.success && res.data) {
        setQuizResult(res.data);
        setActiveView('result');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (onRefreshDashboard) {
          onRefreshDashboard();
        }
      } else {
        setError('Failed to evaluate quiz results.');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit quiz.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // =========================================================================
  // VIEW 2: QUIZ PAGE (30 MCQs with Quick-Jump Navigation)
  // =========================================================================
  if (activeView === 'quiz') {
    const currentQ = quizQuestions[currentQuestionIndex] || {};
    const qKey = currentQ.questionId || currentQ.id;
    const selectedOption = userAnswers[qKey];
    const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;
    const totalQCount = quizQuestions.length || 30;
    const answeredCount = Object.keys(userAnswers).length;
    const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQCount) * 100);

    return (
      <div className="max-w-3xl mx-auto py-4 space-y-6">
        {/* Quiz Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Practice Technical Assessment
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {totalQCount} Questions
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Customized for <strong className="text-slate-200">{companyName}</strong> • {targetRole}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleStartPracticeQuiz(true)}
              disabled={loadingQuiz}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-semibold flex items-center space-x-1.5 border border-slate-800"
              title="Refresh Questions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingQuiz ? 'animate-spin text-brand-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to exit? Your quiz progress will be lost.')) {
                  setActiveView('overview');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-semibold flex items-center space-x-1 border border-slate-800"
            >
              <X className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* 30 Questions Quick-Jump Grid */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-1">
            <span>Question Navigator ({answeredCount}/{totalQCount} Answered)</span>
            <span className="text-brand-400">Question {currentQuestionIndex + 1} of {totalQCount}</span>
          </div>

          <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5 pt-1">
            {quizQuestions.map((q, idx) => {
              const itemKey = q.questionId || q.id;
              const isAnswered = userAnswers[itemKey] !== undefined;
              const isCurrent = idx === currentQuestionIndex;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`h-8 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                    isCurrent
                      ? 'bg-brand-500 text-white border-brand-400 shadow-md shadow-brand-500/30 scale-105 ring-2 ring-brand-400/50'
                      : isAnswered
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/90 shadow-xl space-y-5">
          {currentQ.topic && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {currentQ.topic}
            </span>
          )}

          <h3 className="text-base font-semibold text-white leading-relaxed">
            {currentQ.question}
          </h3>

          {/* Options A, B, C, D */}
          <div className="space-y-3 pt-2">
            {(currentQ.options || []).map((optText, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const optionLetters = ['A', 'B', 'C', 'D'];
              const letter = optionLetters[optIdx] || `${optIdx + 1}`;

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full p-3.5 rounded-xl border text-left transition flex items-start space-x-3 text-xs leading-relaxed ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10 text-white font-medium shadow-md shadow-brand-500/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? 'border-brand-400 bg-brand-500 text-white'
                        : 'border-slate-600 text-slate-400'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="flex-1">{optText}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Quiz Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>[ Previous ]</span>
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={submittingQuiz}
              className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center space-x-2 disabled:opacity-50"
            >
              {submittingQuiz ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answers...</span>
                </>
              ) : (
                <>
                  <span>[ Submit Quiz ]</span>
                  <Award className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(quizQuestions.length - 1, prev + 1))}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-500/20 flex items-center space-x-1.5"
            >
              <span>[ Next ]</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: QUIZ RESULT PAGE
  // =========================================================================
  if (activeView === 'result' && quizResult) {
    return (
      <div className="max-w-2xl mx-auto py-4 space-y-6">
        {/* Header */}
        <div className="text-center pb-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Practice Assessment Result</h2>
          <p className="text-xs text-slate-400 mt-1">
            30 Questions Evaluation • {companyName}
          </p>
        </div>

        {/* Big Score Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800/90 shadow-2xl text-center space-y-2">
          <div className="text-4xl font-extrabold text-white tracking-tight">
            {quizResult.score} / {quizResult.totalQuestions || quizResult.total || 30}
          </div>
          <div className="text-lg font-bold text-brand-400">
            {quizResult.percentage}%
          </div>
          <p className="text-xs text-slate-400 pt-1">
            {quizResult.percentage >= 80
              ? 'Great performance! You have a solid grasp of these core concepts.'
              : quizResult.percentage >= 50
              ? 'Good effort! Focus on the improvement recommendations below.'
              : 'Keep preparing! Dedicated study in the weak areas will help you excel.'}
          </p>
        </div>

        {/* Strong Areas & Needs Improvement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strong Areas */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Strong Areas</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-200">
              {(quizResult.strongAreas || []).map((area, idx) => {
                const label = typeof area === 'object' && area !== null ? area.skill || area.topic || area.name || JSON.stringify(area) : String(area || '');
                return (
                  <li key={idx} className="flex items-center space-x-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Needs Improvement */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Needs Improvement</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-200">
              {(quizResult.needsImprovement || []).map((area, idx) => {
                const label = typeof area === 'object' && area !== null ? area.skill || area.topic || area.name || JSON.stringify(area) : String(area || '');
                return (
                  <li key={idx} className="flex items-center space-x-2">
                    <span className="text-amber-400 font-bold">⚠</span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* AI Performance Analysis */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>AI Performance Analysis</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {typeof quizResult.aiPerformanceAnalysis === 'object' && quizResult.aiPerformanceAnalysis !== null
              ? JSON.stringify(quizResult.aiPerformanceAnalysis)
              : String(quizResult.aiPerformanceAnalysis || '')}
          </p>
        </div>

        {/* What to Improve */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            <span>What to Improve</span>
          </h4>
          <ol className="space-y-2 text-xs text-slate-200">
            {(quizResult.whatToImprove || []).map((item, idx) => {
              const label = typeof item === 'object' && item !== null ? item.topic || item.actionPlan || item.skill || JSON.stringify(item) : String(item || '');
              return (
                <li
                  key={idx}
                  className="flex items-center space-x-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Result Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              setActiveView('overview');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 inline-flex items-center space-x-2"
          >
            <span>Back to Preparation Roadmap</span>
          </button>
          <button
            onClick={() => handleStartPracticeQuiz(true)}
            disabled={loadingQuiz}
            className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 inline-flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingQuiz ? 'animate-spin' : ''}`} />
            <span>Retake / Refresh 30 Questions</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: PREPARATION OVERVIEW (FINAL UI)
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto py-2 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Skills & Interview Preparation</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              AI Analysis
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grounded in your resume and the requirements for <strong className="text-slate-200">{targetRole}</strong> at <strong className="text-slate-200">{companyName}</strong>.
          </p>
        </div>

        <button
          onClick={handleReanalyze}
          disabled={refreshingAnalysis}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-semibold transition flex items-center space-x-2 shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshingAnalysis ? 'animate-spin text-brand-400' : 'text-slate-400'}`} />
          <span>{refreshingAnalysis ? 'Re-analyzing...' : 'Re-run AI Analysis'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Summary Score/Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Matched Skills</span>
            <p className="text-xs text-slate-300 font-medium">Found in Resume & JD</p>
          </div>
          <span className="text-2xl font-extrabold text-emerald-300">{matchedSkills.length}</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-rose-500/25 bg-rose-500/5 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Missing Skills</span>
            <p className="text-xs text-slate-300 font-medium">Required in JD / Needs Prep</p>
          </div>
          <span className="text-2xl font-extrabold text-rose-300">{missingSkills.length}</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-brand-500/25 bg-brand-500/5 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider">Areas to Focus</span>
            <p className="text-xs text-slate-300 font-medium">Prioritized Focus Modules</p>
          </div>
          <span className="text-2xl font-extrabold text-brand-300">{areasToFocus.length}</span>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1 — SKILLS ANALYSIS (MATCHED VS MISSING)
          ========================================================================= */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            1. Skills Analysis (Resume vs JD)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Direct comparison between what the company requires in the JD and your resume evidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: ✓ MATCHED SKILLS */}
          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-slate-950/70 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Matched Skills (Resume + JD)</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {matchedSkills.length} Verified
              </span>
            </div>

            {matchedSkills.length > 0 ? (
              <div className="space-y-3.5">
                {matchedSkills.map((item, i) => {
                  const label = getSkillLabel(item);
                  const evidence = typeof item === 'object' ? item.evidence : null;
                  const jdContext = typeof item === 'object' ? item.jdContext : null;
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-1.5 transition hover:border-emerald-500/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                            ✓
                          </span>
                          <h4 className="text-xs font-bold text-emerald-300">{label}</h4>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                          Matched
                        </span>
                      </div>

                      {evidence && (
                        <p className="text-[11px] text-slate-300 pl-7 leading-relaxed">
                          <span className="text-slate-400 font-semibold">Resume Evidence: </span>
                          {evidence}
                        </p>
                      )}

                      {jdContext && (
                        <p className="text-[10px] text-slate-400 pl-7 italic">
                          <span className="text-slate-500 font-medium">JD Requirement: </span>
                          {jdContext}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic p-3">No direct matches identified for this JD.</p>
            )}
          </div>

          {/* Card 2: ⚠ MISSING SKILLS */}
          <div className="glass-panel p-6 rounded-3xl border border-rose-500/30 bg-slate-950/70 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Missing Skills (Required by JD)</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                {missingSkills.length} To Prepare
              </span>
            </div>

            {missingSkills.length > 0 ? (
              <div className="space-y-3.5">
                {missingSkills.map((item, i) => {
                  const label = getSkillLabel(item);
                  const reason = typeof item === 'object' ? item.reason : null;
                  const isHigh = typeof item === 'object' && (item.importance === 'high' || item.importance === 'HIGH');
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/15 space-y-1.5 transition hover:border-rose-500/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold">
                            !
                          </span>
                          <h4 className="text-xs font-bold text-rose-300">{label}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isHigh
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isHigh ? 'HIGH PRIORITY' : 'MEDIUM'}
                        </span>
                      </div>

                      {reason && (
                        <p className="text-[11px] text-slate-300 pl-7 leading-relaxed">
                          <span className="text-slate-400 font-semibold">Why Required: </span>
                          {reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-300 font-semibold">All core skills from the JD are matched in your resume!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2 — AREAS TO FOCUS SEPARATELY
          ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center space-x-2">
              <Compass className="w-4 h-4 text-brand-400" />
              <span>2. Areas to Focus Separately (Targeted Preparation Roadmap)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Specific, prioritized focus modules designed to bridge your skill gaps for {companyName}.
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800/90 shadow-xl space-y-4 bg-slate-950/60">
          {areasToFocus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {areasToFocus.map((item, i) => {
                const topicTitle = getTopicLabel(item);
                const priority = getTopicPriority(item) || (typeof item === 'object' ? item.priority : 'MEDIUM');
                const whyFocus = typeof item === 'object' ? item.whyFocus : null;
                const actionPlan = typeof item === 'object' ? item.actionPlan : null;
                const skillTag = typeof item === 'object' ? item.skill : null;
                const isHigh = priority === 'HIGH';

                return (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5 transition hover:border-brand-500/40"
                  >
                    {/* Topic Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <span className="w-6 h-6 rounded-xl bg-brand-500/15 text-brand-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white leading-snug">{topicTitle}</h4>
                          {skillTag && (
                            <span className="inline-block text-[10px] font-semibold text-slate-400 mt-0.5">
                              Skill: <strong className="text-slate-200">{skillTag}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                          isHigh
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {isHigh ? 'HIGH PRIORITY' : 'MEDIUM'}
                      </span>
                    </div>

                    {/* Why to Focus */}
                    {whyFocus && (
                      <p className="text-[11px] text-slate-300 pl-8 leading-relaxed">
                        <span className="text-slate-400 font-semibold">Why Focus: </span>
                        {whyFocus}
                      </p>
                    )}

                    {/* Action Plan */}
                    {actionPlan && (
                      <div className="ml-8 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                        <div className="flex items-center space-x-1.5 text-brand-300 font-bold text-[10px] uppercase tracking-wider">
                          <Zap className="w-3 h-3 text-brand-400" />
                          <span>Preparation Strategy:</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                          {actionPlan}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Review your core engineering fundamentals and requirements for {targetRole}.
            </p>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3 — PRACTICE 30 QUESTIONS & DYNAMIC REFRESH
          ========================================================================= */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Practice 30 Technical Questions
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                30 MCQs
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Personalized assessment generated strictly from your target job skills and preparation roadmap for <strong className="text-slate-200">{companyName}</strong>.
            </p>
          </div>

          <button
            onClick={() => handleStartPracticeQuiz(true)}
            disabled={loadingQuiz}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 text-slate-300 text-xs font-semibold transition flex items-center space-x-2 shrink-0 disabled:opacity-50"
            title="Generate a brand new set of 30 questions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingQuiz ? 'animate-spin text-brand-400' : 'text-slate-400'}`} />
            <span>{loadingQuiz ? 'Refreshing Questions...' : 'Refresh 30 Questions'}</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-rose-500/20"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Practice Assessment Hero Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 shadow-2xl space-y-6">
          {/* Top Info Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">30 Technical MCQs</p>
                <p className="text-[11px] text-slate-400">Comprehensive Evaluation</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Skill-Aligned Questions</p>
                <p className="text-[11px] text-slate-400">Grounded in {companyName} JD</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Dynamic Refresh</p>
                <p className="text-[11px] text-slate-400">Unlimited Unique Sets</p>
              </div>
            </div>
          </div>

          {/* Skills Covered Preview */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Skills Tested in this Assessment
              </span>
              <span className="text-[11px] text-slate-400">
                {matchedSkills.length + missingSkills.length} Total Skills Covered
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(() => {
                const previewList = [];
                const seen = new Set();

                missingSkills.forEach((item) => {
                  const name = getSkillLabel(item);
                  if (name && !seen.has(name.toLowerCase())) {
                    seen.add(name.toLowerCase());
                    previewList.push({ name, isMissing: true });
                  }
                });

                matchedSkills.forEach((item) => {
                  const name = getSkillLabel(item);
                  if (name && !seen.has(name.toLowerCase())) {
                    seen.add(name.toLowerCase());
                    previewList.push({ name, isMissing: false });
                  }
                });

                return previewList.slice(0, 16).map((item, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 ${
                      item.isMissing
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.isMissing ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    <span>{item.name}</span>
                  </span>
                ));
              })()}
            </div>
          </div>

          {/* Big Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleStartPracticeQuiz(false)}
              disabled={loadingQuiz}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-bold transition shadow-xl shadow-emerald-600/25 flex items-center justify-center space-x-2"
            >
              {loadingQuiz ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preparing 30 Practice Questions...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Practice Quiz (30 Questions)</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleStartPracticeQuiz(true)}
              disabled={loadingQuiz}
              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 text-xs font-semibold transition border border-slate-700 flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loadingQuiz ? 'animate-spin' : ''}`} />
              <span>Refresh Questions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreparationView;
