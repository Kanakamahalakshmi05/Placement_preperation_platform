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

  // Extract skills & topics from actual Resume + JD AI analysis (strictly from API)
  const rawMatched = aiAnalysisData?.matchedSkillsDetailed && aiAnalysisData.matchedSkillsDetailed.length > 0
    ? aiAnalysisData.matchedSkillsDetailed
    : aiAnalysisData?.matchedSkills || aiAnalysisData?.strongSkills || [];

  const matchedSkills = rawMatched.map((item) =>
    typeof item === 'object' && item !== null
      ? item
      : { skill: item, strength: 'strong', evidence: 'Verified proficiency from your resume.' }
  );

  const rawMissing = aiAnalysisData?.missingSkillsDetailed && aiAnalysisData.missingSkillsDetailed.length > 0
    ? aiAnalysisData.missingSkillsDetailed
    : aiAnalysisData?.missingSkills || aiAnalysisData?.skillsToImprove || [];

  const missingSkills = rawMissing.map((item) =>
    typeof item === 'object' && item !== null
      ? item
      : { skill: item, importance: 'high', reason: 'Required by company JD; prepare for interview questions.' }
  );

  const rawFocusAreas = aiAnalysisData?.areasToFocusDetailed && aiAnalysisData.areasToFocusDetailed.length > 0
    ? aiAnalysisData.areasToFocusDetailed
    : aiAnalysisData?.areasToFocus || aiAnalysisData?.importantTopics || aiAnalysisData?.recommendedTopics || [];

  const areasToFocus = rawFocusAreas.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return item;
    }
    const isHigh = typeof item === 'string' && item.includes('— HIGH');
    const cleanTopic = (item || '').replace(/\s*—\s*(HIGH|MEDIUM|LOW)/i, '');
    return {
      topic: cleanTopic,
      priority: isHigh ? 'HIGH' : 'MEDIUM',
      whyFocus: 'Key technical requirement from the company job description.',
      actionPlan: 'Review core concepts, practice common interview questions, and study practical implementation patterns.',
    };
  });

  // Re-run AI analysis on demand
  const handleReanalyze = async () => {
    setRefreshingAnalysis(true);
    setError(null);
    try {
      const res = await triggerAIAnalysis();
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

  // Start a mock quiz
  const handleStartQuiz = async (difficulty) => {
    setLoadingQuiz(true);
    setQuizDifficulty(difficulty);
    setError(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);

    try {
      const res = await fetchMockQuiz(difficulty);
      if (res.success && res.data?.questions?.length > 0) {
        setQuizId(res.data.quizId || null);
        setQuizQuestions(res.data.questions);
        setActiveView('quiz');
      } else {
        setError('Failed to generate mock quiz questions. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load quiz. Ensure your Resume and Target Job are configured.');
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Option selection
  const handleSelectOption = (optionIndex) => {
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id || currentQ.questionId]: optionIndex,
    }));
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    setSubmittingQuiz(true);
    setError(null);
    try {
      const res = await submitMockQuiz({
        quizId,
        difficulty: quizDifficulty,
        questions: quizQuestions,
        userAnswers,
      });

      if (res.success && res.data) {
        setQuizResult(res.data);
        setActiveView('result');
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

  const getDifficultyTitle = (diff) => {
    switch (diff) {
      case 'easy':
        return 'Easy Mock Quiz';
      case 'medium':
        return 'Medium Mock Quiz';
      case 'difficult':
        return 'Difficult Mock Quiz';
      default:
        return 'Mock Quiz';
    }
  };

  // =========================================================================
  // VIEW 2: QUIZ PAGE (10 MCQs)
  // =========================================================================
  if (activeView === 'quiz') {
    const currentQ = quizQuestions[currentQuestionIndex] || {};
    const selectedOption = userAnswers[currentQ.id];
    const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;
    const progressPercent = Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto py-4 space-y-6">
        {/* Quiz Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {getDifficultyTitle(quizDifficulty)}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Targeted for {companyName} • 10 Questions
            </p>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to exit? Your quiz progress will be lost.')) {
                setActiveView('overview');
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-semibold flex items-center space-x-1"
          >
            <X className="w-4 h-4" />
            <span>Exit Quiz</span>
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </span>
            <span className="text-brand-400">{progressPercent}% Completed</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Quiz Result</h2>
          <p className="text-xs text-slate-400 mt-1">
            {getDifficultyTitle(quizResult.difficulty)} • {companyName}
          </p>
        </div>

        {/* Big Score Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800/90 shadow-2xl text-center space-y-2">
          <div className="text-4xl font-extrabold text-white tracking-tight">
            {quizResult.score} / {quizResult.total}
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
              {(quizResult.strongAreas || []).map((area, idx) => (
                <li key={idx} className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Needs Improvement */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Needs Improvement</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-200">
              {(quizResult.needsImprovement || []).map((area, idx) => (
                <li key={idx} className="flex items-center space-x-2">
                  <span className="text-amber-400 font-bold">⚠</span>
                  <span>{area}</span>
                </li>
              ))}
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
            {quizResult.aiPerformanceAnalysis}
          </p>
        </div>

        {/* What to Improve */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            <span>What to Improve</span>
          </h4>
          <ol className="space-y-2 text-xs text-slate-200">
            {(quizResult.whatToImprove || []).map((item, idx) => (
              <li
                key={idx}
                className="flex items-center space-x-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800"
              >
                <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 font-bold flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Result Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setActiveView('overview')}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-750 inline-flex items-center space-x-2"
          >
            <span>[ Back to Preparation ]</span>
          </button>
          <button
            onClick={() => handleStartQuiz(quizDifficulty)}
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-lg shadow-brand-500/20 inline-flex items-center space-x-2"
          >
            <span>[ Start New Quiz (10 New Questions) ]</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const getSkillLabel = (item) => (typeof item === 'object' && item !== null ? item.skill : item);
  const getTopicLabel = (item) => (typeof item === 'object' && item !== null ? item.topic : item);
  const getTopicPriority = (item) => {
    if (typeof item === 'object' && item !== null && item.priority) return item.priority;
    if (typeof item === 'string' && item.includes('— HIGH')) return 'HIGH';
    if (typeof item === 'string' && item.includes('— MEDIUM')) return 'MEDIUM';
    return null;
  };

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
          SECTION 3 — MOCK QUIZZES
          ========================================================================= */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Mock Quizzes
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Test your preparation with personalized quizzes.
          </p>
        </div>

        {/* 3 Horizontal Cards: Easy, Medium, Difficult */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: EASY */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition flex flex-col justify-between h-56 shadow-lg text-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                EASY
              </span>
              <p className="text-base font-bold text-white">10 Questions</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Basic interview concepts and core fundamentals.
              </p>
            </div>

            <button
              onClick={() => handleStartQuiz('easy')}
              disabled={loadingQuiz}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-md shadow-brand-500/20"
            >
              {loadingQuiz && quizDifficulty === 'easy' ? 'Generating Quiz...' : '[ Start Quiz ]'}
            </button>
          </div>

          {/* Card 2: MEDIUM */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition flex flex-col justify-between h-56 shadow-lg text-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                MEDIUM
              </span>
              <p className="text-base font-bold text-white">10 Questions</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Practical and scenario-based interview questions.
              </p>
            </div>

            <button
              onClick={() => handleStartQuiz('medium')}
              disabled={loadingQuiz}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-md shadow-brand-500/20"
            >
              {loadingQuiz && quizDifficulty === 'medium' ? 'Generating Quiz...' : '[ Start Quiz ]'}
            </button>
          </div>

          {/* Card 3: DIFFICULT */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-rose-500/40 transition flex flex-col justify-between h-56 shadow-lg text-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
                DIFFICULT
              </span>
              <p className="text-base font-bold text-white">10 Questions</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Interview-level reasoning, system design, and edge cases.
              </p>
            </div>

            <button
              onClick={() => handleStartQuiz('difficult')}
              disabled={loadingQuiz}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-md shadow-brand-500/20"
            >
              {loadingQuiz && quizDifficulty === 'difficult' ? 'Generating Quiz...' : '[ Start Quiz ]'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreparationView;
