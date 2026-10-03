import React, { useState, useEffect, useRef } from 'react';
import {
  createInterviewSession,
  startInterviewSession,
  fetchNextInterviewQuestion,
  submitInterviewAnswer,
  endInterviewSession,
  fetchInterviewHistory,
  fetchInterviewEvaluation,
} from '../../services/api';
import {
  Video,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Square,
  Award,
  TrendingUp,
  Sparkles,
  Bot,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Check,
  ChevronRight,
  FastForward,
  Maximize2,
  Code2,
  User as UserIcon,
  UserCheck,
} from 'lucide-react';

const TechnicalInterviewView = ({
  initialInterviewType = 'technical',
  companyName,
  targetRole,
  onBackToDashboard,
}) => {
  // Active interview mode state: 'technical' | 'hr'
  const [selectedInterviewType, setSelectedInterviewType] = useState(initialInterviewType);
  const [historyFilter, setHistoryFilter] = useState(initialInterviewType === 'hr' ? 'hr' : 'technical');

  useEffect(() => {
    setSelectedInterviewType(initialInterviewType);
    setHistoryFilter(initialInterviewType === 'hr' ? 'hr' : 'technical');
  }, [initialInterviewType]);

  // Navigation states: 'landing' | 'check' | 'interview' | 'evaluating' | 'evaluation'
  const [viewState, setViewState] = useState('landing');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Active Session State
  const [currentSession, setCurrentSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(1200);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [endingInterview, setEndingInterview] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(null);

  // Evaluation Data State
  const [evaluationData, setEvaluationData] = useState(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);

  // Hardware Media Stream, Video Mode & Speech State
  const [mediaStream, setMediaStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [videoMode, setVideoMode] = useState('split'); // 'split' (side-by-side) or 'pip'
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100

  const videoPreviewRef = useRef(null);
  const videoLiveRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const autoSubmitTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const restartSpeechTimeoutRef = useRef(null);
  const speechFallbackTimerRef = useRef(null);
  const shouldListenRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const studentAnswerRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  const ttsKeepAliveRef = useRef(null);
  const currentSessionRef = useRef(null);
  const currentQuestionRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const isLoadingQuestionRef = useRef(false);

  // AudioContext for Real-Time Microphone Sound Level Meter
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    studentAnswerRef.current = studentAnswer;
  }, [studentAnswer]);

  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking;
  }, [isAiSpeaking]);

  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  const [humanVoices, setHumanVoices] = useState([]);

  // Pre-load and cache natural human voices for realistic interviewer speech
  useEffect(() => {
    if (!window.speechSynthesis) return;

    const populateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setHumanVoices(v);
      }
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const getBestHumanVoice = () => {
    if (!window.speechSynthesis) return null;
    const voices = (humanVoices.length > 0 ? humanVoices : window.speechSynthesis.getVoices()) || [];
    if (voices.length === 0) return null;

    const naturalFemale = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online')) &&
        (v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Emma') || v.name.includes('Sonia') || v.name.includes('Ava'))
    );
    if (naturalFemale) return naturalFemale;

    const googleVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google UK English Female') ||
          v.name.includes('Google US English') ||
          v.name.includes('Google English'))
    );
    if (googleVoice) return googleVoice;

    const anyNatural = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))
    );
    if (anyNatural) return anyNatural;

    const appleVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen') || v.name.includes('Moira'))
    );
    if (appleVoice) return appleVoice;

    const ziraVoice = voices.find(
      (v) => v.lang.startsWith('en') && v.name.includes('Zira')
    );
    if (ziraVoice) return ziraVoice;

    const nonDavid = voices.find(
      (v) => v.lang.startsWith('en') && !v.name.includes('David')
    );
    if (nonDavid) return nonDavid;

    return voices.find((v) => v.lang.startsWith('en')) || voices[0];
  };

  // Load past interviews
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetchInterviewHistory();
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch (err) {
      console.warn('Failed to load interview history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Cleanup timers & media streams on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
      stopAudioVisualizer();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (restartSpeechTimeoutRef.current) clearTimeout(restartSpeechTimeoutRef.current);
      if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      stopSpeechRecognition();
    };
  }, []);

  const startAudioVisualizer = (stream) => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('AudioContext sound meter init error:', e);
    }
  };

  const stopAudioVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const stopMediaStream = () => {
    stopAudioVisualizer();
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
      setCameraReady(false);
      setMicReady(false);
    }
  };

  // Initialize camera and mic with fallback constraints & sound meter
  const initMediaCheck = async () => {
    setMediaError(null);
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (firstErr) {
        console.warn('Initial ideal getUserMedia failed, trying standard constraints:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }

      setMediaStream(stream);
      setCameraReady(true);
      setMicReady(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.play().catch(() => {});
      }
      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = stream;
        videoLiveRef.current.muted = true;
        videoLiveRef.current.play().catch(() => {});
      }

      startAudioVisualizer(stream);
      return stream;
    } catch (err) {
      console.warn('Media devices not fully accessible:', err.name, err.message);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMediaStream(audioOnly);
        setMicReady(true);
        setCameraReady(false);
        startAudioVisualizer(audioOnly);
        return audioOnly;
      } catch (audioErr) {
        setMediaError(
          'Camera or microphone access was blocked. Please click the Camera icon in your browser URL bar to allow access.'
        );
        setCameraReady(false);
        setMicReady(false);
        return null;
      }
    }
  };

  const setPreviewVideoRef = (el) => {
    videoPreviewRef.current = el;
    if (el && mediaStream) {
      el.srcObject = mediaStream;
      el.muted = true;
      el.play().catch(() => {});
    }
  };

  const setLiveVideoRef = (el) => {
    videoLiveRef.current = el;
    if (el && mediaStream) {
      el.srcObject = mediaStream;
      el.muted = true;
      el.play().catch(() => {});
    }
  };

  // Re-attach media stream to active video elements when state changes
  useEffect(() => {
    let isMounted = true;
    const attachMedia = async () => {
      let activeStream = mediaStream;
      if (!activeStream || !activeStream.active || activeStream.getTracks().length === 0) {
        activeStream = await initMediaCheck();
      }
      if (isMounted && activeStream) {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = activeStream;
          videoPreviewRef.current.muted = true;
          videoPreviewRef.current.play().catch(() => {});
        }
        if (videoLiveRef.current) {
          videoLiveRef.current.srcObject = activeStream;
          videoLiveRef.current.muted = true;
          videoLiveRef.current.play().catch(() => {});
        }
      }
    };

    if (viewState === 'interview' || viewState === 'check') {
      attachMedia();
    }

    return () => {
      isMounted = false;
    };
  }, [viewState, mediaStream, videoMode]);

  // Handle hardware / physical mic mute on headset
  useEffect(() => {
    if (!mediaStream) return;
    const audioTracks = mediaStream.getAudioTracks();
    const handlePhysicalMute = () => {
      const currentAns = (studentAnswerRef.current || studentAnswer || '').trim();
      if (currentAns && !isSubmittingRef.current && !isLoadingQuestionRef.current) {
        triggerAutoSubmit(currentAns);
      }
    };

    audioTracks.forEach((track) => {
      track.addEventListener('mute', handlePhysicalMute);
    });

    return () => {
      audioTracks.forEach((track) => {
        track.removeEventListener('mute', handlePhysicalMute);
      });
    };
  }, [mediaStream]);

  // Speech Recognition Setup (Web Speech API) with continuous listening & generous 4.5s quiet window
  const initSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onresult = (event) => {
        let currentChunk = '';
        for (let i = 0; i < event.results.length; i++) {
          currentChunk += event.results[i][0].transcript + ' ';
        }
        const cleaned = (accumulatedTranscriptRef.current + ' ' + currentChunk).trim();
        if (cleaned) {
          setStudentAnswer(cleaned);
          studentAnswerRef.current = cleaned;

          const lower = cleaned.toLowerCase();
          const isDontKnow =
            lower.includes("don't know") ||
            lower.includes('dont know') ||
            lower.includes('do not know') ||
            lower.includes('not getting') ||
            lower.includes('no idea') ||
            lower.includes('not sure') ||
            lower.includes('pass') ||
            lower.includes('skip') ||
            lower.includes('next question');

          // Reset previous silence timers
          if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

          if (isDontKnow) {
            setAutoSubmitCountdown(1);
            autoSubmitTimerRef.current = setTimeout(() => {
              setAutoSubmitCountdown(null);
              triggerAutoSubmit(studentAnswerRef.current || cleaned);
            }, 800);
          } else {
            // Generous silence detection: 4.5s of sustained quiet lets candidate formulate multi-sentence technical answers
            let secsLeft = 4;
            setAutoSubmitCountdown(secsLeft);
            countdownIntervalRef.current = setInterval(() => {
              secsLeft -= 1;
              if (secsLeft <= 0) {
                clearInterval(countdownIntervalRef.current);
              } else {
                setAutoSubmitCountdown(secsLeft);
              }
            }, 1000);

            autoSubmitTimerRef.current = setTimeout(() => {
              clearInterval(countdownIntervalRef.current);
              setAutoSubmitCountdown(null);
              triggerAutoSubmit(studentAnswerRef.current || cleaned);
            }, 4500);
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          // Normal pause in speech, keep listening smoothly
          return;
        }
        console.warn('Speech recognition notice:', event.error);
      };

      recognition.onend = () => {
        if (shouldListenRef.current && !isAiSpeakingRef.current && !isSubmittingRef.current && !isLoadingQuestionRef.current) {
          accumulatedTranscriptRef.current = studentAnswerRef.current;
          if (restartSpeechTimeoutRef.current) clearTimeout(restartSpeechTimeoutRef.current);
          restartSpeechTimeoutRef.current = setTimeout(() => {
            if (shouldListenRef.current && !isAiSpeakingRef.current && !isSubmittingRef.current && !isLoadingQuestionRef.current) {
              startSpeechRecognition();
            }
          }, 200);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      return recognition;
    } catch (e) {
      console.warn('SpeechRecognition init error:', e);
      return null;
    }
  };

  const startSpeechRecognition = () => {
    if (isAiSpeakingRef.current || isSubmittingRef.current || isLoadingQuestionRef.current) return;
    shouldListenRef.current = true;

    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const rec = initSpeechRecognition();
    if (rec) {
      try {
        rec.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    }
  };

  const stopSpeechRecognition = () => {
    shouldListenRef.current = false;
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (restartSpeechTimeoutRef.current) clearTimeout(restartSpeechTimeoutRef.current);
    setAutoSubmitCountdown(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleSpeechRecognition = async () => {
    if (isListening) {
      stopSpeechRecognition();
      if (mediaStream) {
        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      const currentAns = (studentAnswerRef.current || studentAnswer || '').trim();
      if (currentAns && !isSubmittingRef.current && !isLoadingQuestionRef.current) {
        await triggerAutoSubmit(currentAns);
      }
    } else {
      if (mediaStream) {
        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      startSpeechRecognition();
    }
  };

  // Text-To-Speech (AI speaking question with realistic human voice)
  const speakQuestion = (text) => {
    if (!ttsEnabled || !window.speechSynthesis || !text) {
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
      accumulatedTranscriptRef.current = '';
      setStudentAnswer('');
      studentAnswerRef.current = '';
      setTimeout(() => {
        startSpeechRecognition();
      }, 300);
      return;
    }

    window.speechSynthesis.cancel();
    if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current);
    if (ttsKeepAliveRef.current) clearInterval(ttsKeepAliveRef.current);

    const utterance = new SpeechSynthesisUtterance(text);
    // Human-like cadence and pitch
    utterance.rate = 0.94;
    utterance.pitch = 1.02;

    const bestVoice = getBestHumanVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      setIsAiSpeaking(true);
      isAiSpeakingRef.current = true;
      stopSpeechRecognition(); // Do not listen while AI speaks

      // Chromium keep-alive so long questions don't freeze after 15 seconds
      ttsKeepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          if (ttsKeepAliveRef.current) clearInterval(ttsKeepAliveRef.current);
        }
      }, 7000);
    };

    const finishAiSpeech = () => {
      if (ttsKeepAliveRef.current) clearInterval(ttsKeepAliveRef.current);
      if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current);
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;

      // Clean transcript state for the student's turn
      accumulatedTranscriptRef.current = '';
      setStudentAnswer('');
      studentAnswerRef.current = '';

      // Automatically activate student mic to answer with voice!
      setTimeout(() => {
        startSpeechRecognition();
      }, 350);
    };

    utterance.onend = finishAiSpeech;
    utterance.onerror = finishAiSpeech;

    // Safety fallback timeout in case browser TTS stalls
    const wordCount = text.split(/\s+/).length;
    const estimatedTime = Math.max(3500, (wordCount / 2.0) * 1000 + 2500);
    speechFallbackTimerRef.current = setTimeout(() => {
      if (isAiSpeakingRef.current) {
        finishAiSpeech();
      }
    }, estimatedTime);

    // Chrome async cancel fix: brief timeout and resume before speaking
    setTimeout(() => {
      if (window.speechSynthesis) {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }
    }, 50);
  };

  // Auto-submit trigger
  const triggerAutoSubmit = async (forcedAnswer = null) => {
    if (isSubmittingRef.current || isLoadingQuestionRef.current) return;
    const textToSend = forcedAnswer || studentAnswerRef.current || studentAnswer;
    if (!textToSend || !textToSend.trim()) return;

    await handleSubmitResponse(textToSend.trim());
  };

  // Skip / "I don't know" handler
  const handleSkipOrDontKnow = async () => {
    if (isSubmittingRef.current || isLoadingQuestionRef.current) return;
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setAutoSubmitCountdown(null);

    const passMsg = "I am not getting this, let's move on to the next question.";
    setStudentAnswer(passMsg);
    studentAnswerRef.current = passMsg;

    await handleSubmitResponse(passMsg);
  };

  // 1. Take Mock Interview -> Create Session and go to Check
  const handleTakeMockInterview = async (overrideType) => {
    const typeToUse = overrideType || selectedInterviewType || 'technical';
    setMediaError(null);
    try {
      const res = await createInterviewSession(typeToUse);
      if (res.success && res.data) {
        currentSessionRef.current = res.data;
        setCurrentSession(res.data);
        setViewState('check');
        setTimeout(() => {
          initMediaCheck();
        }, 100);
      }
    } catch (err) {
      alert(err.message || 'Failed to create interview session. Please try again.');
    }
  };

  // 2. Start Interview officially
  const handleStartInterview = async () => {
    const session = currentSessionRef.current || currentSession;
    if (!session) return;
    const sessionId = session.id || session._id;
    if (!sessionId) return;

    isLoadingQuestionRef.current = true;
    setLoadingQuestion(true);
    setViewState('interview');

    try {
      const res = await startInterviewSession(sessionId);
      if (res.success && res.data) {
        currentSessionRef.current = res.data;
        setCurrentSession(res.data);

        currentQuestionRef.current = res.data.question;
        setCurrentQuestion(res.data.question);

        setQuestionIndex(res.data.questionIndex || 1);
        setRemainingSeconds(res.data.remainingSeconds || 1200);

        startTimer(res.data.remainingSeconds || 1200);

        if (res.data.question?.questionText) {
          setTimeout(() => {
            speakQuestion(res.data.question.questionText);
          }, 500);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to start interview.');
      setViewState('landing');
    } finally {
      isLoadingQuestionRef.current = false;
      setLoadingQuestion(false);
    }
  };

  // Server-Synchronized Timer
  const startTimer = (initialSeconds) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    let sec = initialSeconds;

    timerIntervalRef.current = setInterval(() => {
      sec -= 1;
      setRemainingSeconds(Math.max(0, sec));

      if (sec <= 0) {
        clearInterval(timerIntervalRef.current);
        handleEndInterview(true);
      }
    }, 1000);
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 3. Submit Response (automatic or manual) and fetch next adaptive question
  const handleSubmitResponse = async (explicitAnswer = null) => {
    if (isSubmittingRef.current || isLoadingQuestionRef.current) return;

    const answer = (explicitAnswer || studentAnswerRef.current || studentAnswer || '').trim();
    if (!answer) return;

    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setAutoSubmitCountdown(null);

    const session = currentSessionRef.current || currentSession;
    const question = currentQuestionRef.current || currentQuestion;
    const sessionId = session?.id || session?._id;
    const questionId = question?.questionId || question?.id || question?._id;

    if (!sessionId || !questionId) {
      console.warn('Cannot submit answer: missing sessionId or questionId', { sessionId, questionId, session, question });
      return;
    }

    isSubmittingRef.current = true;
    setSubmittingAnswer(true);
    stopSpeechRecognition();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    try {
      await submitInterviewAnswer(sessionId, {
        questionId: questionId,
        studentAnswer: answer,
      });

      setStudentAnswer('');
      studentAnswerRef.current = '';
      accumulatedTranscriptRef.current = '';

      isLoadingQuestionRef.current = true;
      setLoadingQuestion(true);
      const nextRes = await fetchNextInterviewQuestion(sessionId);

      if (nextRes.success) {
        if (nextRes.isCompleted) {
          handleEndInterview();
          return;
        }

        currentQuestionRef.current = nextRes.data.question;
        setCurrentQuestion(nextRes.data.question);
        setQuestionIndex(nextRes.data.questionIndex || questionIndex + 1);
        setRemainingSeconds(nextRes.data.remainingSeconds);

        if (nextRes.data.question?.questionText) {
          setTimeout(() => {
            speakQuestion(nextRes.data.question.questionText);
          }, 400);
        }
      }
    } catch (err) {
      console.error('Error submitting response:', err);
      // Resume listening on failure
      startSpeechRecognition();
    } finally {
      isSubmittingRef.current = false;
      setSubmittingAnswer(false);
      isLoadingQuestionRef.current = false;
      setLoadingQuestion(false);
    }
  };

  // 4. End Interview and view evaluation
  const handleEndInterview = async (isTimeExpired = false) => {
    setShowEndConfirm(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopSpeechRecognition();
    stopMediaStream();

    setEndingInterview(true);
    setViewState('evaluating');

    try {
      const session = currentSessionRef.current || currentSession;
      const sessionId = session?.id || session?._id;
      const res = await endInterviewSession(sessionId, { isTimeExpired });
      if (res.success && res.data) {
        setEvaluationData(res.data.evaluation);
        setViewState('evaluation');
        loadHistory();
      }
    } catch (err) {
      alert(err.message || 'Error evaluating interview.');
      setViewState('landing');
    } finally {
      setEndingInterview(false);
    }
  };

  // View past evaluation from history list
  const handleViewPastEvaluation = async (interviewId) => {
    setLoadingEvaluation(true);
    try {
      const res = await fetchInterviewEvaluation(interviewId);
      if (res.success && res.data) {
        setCurrentSession(res.data);
        setEvaluationData(res.data.evaluation);
        setViewState('evaluation');
      }
    } catch (err) {
      alert(err.message || 'Could not load evaluation report.');
    } finally {
      setLoadingEvaluation(false);
    }
  };

  // =========================================================================
  // VIEW 1: LANDING PAGE
  // =========================================================================
  if (viewState === 'landing') {
    const isHrLanding = selectedInterviewType === 'hr';

    // Filter history based on historyFilter tab
    const filteredHistory = history.filter((item) => {
      if (historyFilter === 'technical') return (item.interviewType || 'technical') === 'technical';
      if (historyFilter === 'hr') return item.interviewType === 'hr';
      return true;
    });

    return (
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        {/* Top Header with Mode Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isHrLanding ? 'HR Behavioral Interview' : 'Technical Mock Interview'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isHrLanding
                ? 'Practice realistic HR & behavioral interviews using your resume, target company, and target role context.'
                : 'Practice realistic technical interviews with an AI interviewer based on your resume and target company requirements.'}
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shrink-0">
            <button
              onClick={() => setSelectedInterviewType('technical')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                !isHrLanding
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Technical Interview</span>
            </button>
            <button
              onClick={() => setSelectedInterviewType('hr')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                isHrLanding
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>HR Mock Interview</span>
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className={`glass-panel p-8 rounded-3xl border border-slate-800 relative overflow-hidden bg-gradient-to-br ${
          isHrLanding
            ? 'from-slate-900/90 via-slate-950/80 to-emerald-950/20'
            : 'from-slate-900/90 via-slate-950/80 to-indigo-950/20'
        }`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4 max-w-xl">
              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isHrLanding
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
              }`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isHrLanding ? 'HR & Behavioral Assessment' : 'Technical Mock Interview'}</span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">
                  {isHrLanding ? '20-Minute AI HR Behavioral Interview' : '20-Minute AI Technical Interview'}
                </h2>
                <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                  <Clock className={`w-4 h-4 ${isHrLanding ? 'text-emerald-400' : 'text-brand-400'}`} />
                  <span>Duration: <strong>20 Minutes</strong></span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 pt-2">
                <p className="font-semibold text-slate-200">
                  {isHrLanding
                    ? 'The AI HR interviewer will evaluate you on:'
                    : 'The AI technical interviewer will ask questions based on:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  {isHrLanding ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Behavioral & STAR method</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Teamwork & leadership</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Conflict resolution & pressure</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Role & company motivation</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:col-span-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Previous HR interview weaknesses & adaptivity</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Your resume</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Your projects</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Your technical skills</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Company Job Description</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:col-span-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Your previous technical interview performance</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <button
                onClick={() => handleTakeMockInterview(selectedInterviewType)}
                className={`w-full md:w-auto px-8 py-4 text-white font-bold text-sm rounded-2xl shadow-xl transition transform hover:scale-[1.02] flex items-center justify-center space-x-2 ${
                  isHrLanding
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-brand-500/25'
                }`}
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Take {isHrLanding ? 'HR' : 'Technical'} Mock Interview</span>
              </button>
            </div>
          </div>
        </div>

        {/* Previous Mock Interviews Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white tracking-tight">
              Previous Mock Interviews
            </h2>

            {/* Filter Tabs: All | Technical | HR */}
            <div className="flex items-center space-x-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  historyFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({history.length})
              </button>
              <button
                onClick={() => setHistoryFilter('technical')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  historyFilter === 'technical' ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Technical ({history.filter((i) => (i.interviewType || 'technical') === 'technical').length})
              </button>
              <button
                onClick={() => setHistoryFilter('hr')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  historyFilter === 'hr' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                HR ({history.filter((i) => i.interviewType === 'hr').length})
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
              Loading your previous mock interviews...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center space-y-3">
              <Video className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No {historyFilter !== 'all' ? historyFilter.toUpperCase() : ''} mock interviews taken yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ready to prepare? Click <strong>Take {isHrLanding ? 'HR' : 'Technical'} Mock Interview</strong> above to begin your 20-minute session.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => {
                const isHrItem = item.interviewType === 'hr';
                const dateStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                const score = item.overallScore ?? item.evaluation?.overallScore ?? 0;
                const scoreColor =
                  score >= 75
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : score >= 60
                    ? 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

                return (
                  <div
                    key={item.id}
                    className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-extrabold text-sm ${
                        isHrItem
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                          : 'bg-brand-950/40 border-brand-500/30 text-brand-400'
                      }`}>
                        #{item.attemptNumber}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-white">
                            {isHrItem ? 'HR Mock Interview' : 'Technical Mock Interview'} #{item.attemptNumber}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isHrItem
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                          }`}>
                            {isHrItem ? 'HR' : 'Technical'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                          <span>Date: {dateStr}</span>
                          <span>•</span>
                          <span>{item.companyName || companyName || 'Target Company'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {item.status === 'COMPLETED' ? (
                        <div className={`px-3 py-1 rounded-xl text-xs font-bold border ${scoreColor}`}>
                          Score: {score}/100
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Incomplete</span>
                      )}

                      <button
                        onClick={() => handleViewPastEvaluation(item.id)}
                        disabled={loadingEvaluation}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                      >
                        <span>View Report</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: PRE-INTERVIEW CAMERA / MIC CHECK
  // =========================================================================
  if (viewState === 'check') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Get Ready for Your Interview
          </h2>
          <p className="text-xs text-slate-400">
            Mock Interview #{currentSession?.attemptNumber || 1} • {companyName || 'Target Company'}
          </p>
        </div>

        {/* Camera Preview Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Camera Preview
            </h3>
            <div className="w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative flex items-center justify-center">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!cameraReady ? 'hidden' : ''}`}
              />
              {!cameraReady && (
                <div className="text-center p-6 space-y-2 text-slate-500">
                  <Video className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs">Camera preview will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Readiness Indicators */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-3">
              {cameraReady ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
              <span className="text-xs font-semibold text-slate-200">
                {cameraReady ? '✓ Camera Ready' : 'Camera Off (Text Mode)'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-3">
              {micReady ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
              <span className="text-xs font-semibold text-slate-200">
                {micReady ? '✓ Microphone Ready' : 'Mic Off (Text Mode)'}
              </span>
            </div>
          </div>

          {mediaError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{mediaError}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>Your interview will last <strong>20 minutes</strong>.</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  stopMediaStream();
                  setViewState('landing');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleStartInterview}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5"
              >
                <span>Start Interview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ACTUAL INTERVIEW SCREEN (20-MINUTE RUNTIME)
  // =========================================================================
  if (viewState === 'interview') {
    const isCriticalTime = remainingSeconds <= 120; // Last 2 minutes

    return (
      <div className="space-y-5 max-w-6xl mx-auto pb-10">
        {/* Top Bar: Title on Left, 20:00 Timer on Right */}
        <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 px-6 py-3.5 rounded-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-brand-600/20 text-brand-400 rounded-lg">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Technical Interview</h2>
              <p className="text-[11px] text-slate-400">
                Mock #{currentSession?.attemptNumber || 1} • {companyName || 'Target Company'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Switcher: Split Screen vs PiP */}
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setVideoMode('split')}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1 ${
                  videoMode === 'split'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Split Screen (Side-by-Side): Best for seeing your face clearly"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>
              <button
                type="button"
                onClick={() => setVideoMode('pip')}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1 ${
                  videoMode === 'pip'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Floating Picture-in-Picture window"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>PiP View</span>
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className="text-xs text-slate-400 hover:text-slate-200 transition p-2 rounded-xl bg-slate-900 border border-slate-800"
              title={ttsEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4 text-brand-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Synchronized 20:00 Countdown Timer */}
            <div
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl font-mono text-sm font-bold border transition ${
                isCriticalTime
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <Clock className="w-4 h-4 text-brand-400" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Video Conference Stage */}
        {videoMode === 'split' ? (
          /* SPLIT VIEW (Side-by-Side 50/50 Stage) - Prominently displays candidate face next to AI interviewer */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-h-[460px]">
            {/* Candidate Camera Pane (Large Prominent Face Frame at Top / Left) */}
            <div className="relative aspect-video md:aspect-[4/3] rounded-3xl overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-2xl flex items-center justify-center group hover:border-brand-500/70 transition">
              <video
                ref={setLiveVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover -scale-x-100 ${!cameraReady ? 'hidden' : ''}`}
              />
              {!cameraReady && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-6 text-center space-y-3">
                  <Video className="w-10 h-10 text-slate-600 animate-bounce" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">Camera Offline or Pending Access</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">Allow camera permissions in browser or click below to retry camera stream.</p>
                  </div>
                  <button
                    type="button"
                    onClick={initMediaCheck}
                    className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition shadow-md"
                  >
                    Retry Camera Stream
                  </button>
                </div>
              )}

              {/* Candidate Status & Live Sound Meter Badge */}
              <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
                <div className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white text-[11px] font-bold flex items-center space-x-1.5 shadow-xl">
                  <span className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>You (Candidate) • Live HD</span>
                </div>
              </div>

              {/* Real-time Mic Activity Overlay */}
              <div className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-slate-700/80 text-[11px] font-semibold text-slate-200 flex items-center space-x-2 shadow-xl">
                <Mic className={`w-3.5 h-3.5 ${audioLevel > 5 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                <span>{audioLevel > 5 ? 'Mic Hearing Voice' : 'Mic Active'}</span>
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-brand-400 transition-all duration-75 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(8, audioLevel))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Technical Interviewer Pane */}
            <div className="relative aspect-video md:aspect-[4/3] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex items-center justify-center group">
              <img
                src="/ai_interviewer.jpg"
                alt="AI Technical Interviewer"
                className={`w-full h-full object-cover object-center transition-all duration-700 ${
                  isAiSpeaking ? 'scale-[1.02] filter brightness-105' : 'scale-100'
                }`}
              />
              <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
                <div className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white text-[11px] font-bold flex items-center space-x-1.5 shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>AI Interviewer • Tech Lead</span>
                </div>
                {isAiSpeaking && (
                  <div className="px-2.5 py-1 rounded-full bg-emerald-500/25 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold flex items-center space-x-1 animate-pulse">
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                    <span>Speaking...</span>
                  </div>
                )}
              </div>

              {/* Current Question Overlay in Split View */}
              <div className="absolute bottom-3 left-3 right-3 z-10 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-700/70 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold text-brand-400 uppercase tracking-wider">
                    Question #{questionIndex} • {currentQuestion?.topic || 'Assessment'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white line-clamp-2 leading-relaxed">
                  "{currentQuestion?.questionText || 'Loading question...'}"
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* PiP VIEW (Picture-in-Picture Floating Window) */
          <div className="relative w-full aspect-video sm:aspect-[16/9] min-h-[460px] max-h-[620px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex items-center justify-center">
            <img
              src="/ai_interviewer.jpg"
              alt="AI Technical Interviewer"
              className={`w-full h-full object-cover object-center transition-all duration-700 ${
                isAiSpeaking ? 'scale-[1.02] filter brightness-105' : 'scale-100'
              }`}
            />
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 pointer-events-none">
              <div className="px-3.5 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white text-xs font-bold flex items-center space-x-2 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>AI Interviewer • Tech Lead</span>
              </div>
            </div>

            {/* Floating Mirrored Candidate PiP Window */}
            <div className="absolute top-4 right-4 z-20 w-52 sm:w-64 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-700/90 shadow-2xl bg-slate-950/95 backdrop-blur-md transition-all group hover:border-brand-500/80">
              <video
                ref={setLiveVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover -scale-x-100 ${!cameraReady ? 'hidden' : ''}`}
              />
              {!cameraReady && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-2 text-center">
                  <Video className="w-5 h-5 mb-1 text-slate-500" />
                  <span className="text-[10px] font-semibold">Camera Offline</span>
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[10px] font-bold text-white flex items-center space-x-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${cameraReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>You (Candidate)</span>
              </div>
            </div>

            {/* Subtitle Banner in PiP view */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-700/70 shadow-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-brand-400 uppercase tracking-wider flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md bg-brand-500/20 border border-brand-500/30">
                      Question #{questionIndex}
                    </span>
                    <span>• {currentQuestion?.topic || 'Technical Assessment'}</span>
                  </span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                  "{currentQuestion?.questionText || 'Loading question...'}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Hands-Free Voice Response & Conference Controls */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 bg-gradient-to-br from-slate-950/95 to-slate-900/90 shadow-2xl">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-brand-500/20 text-brand-400 ring-2 ring-brand-500/40 animate-pulse'
                    : isAiSpeaking
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-sm font-bold text-white">Hands-Free Voice Interview</h3>
                  {isListening && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Live Audio Active</span>
                    </span>
                  )}
                  {/* Live Sound Meter Indicator */}
                  <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px]">
                    <span className="text-slate-400">Vol:</span>
                    <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(6, audioLevel))}%` }}
                      />
                    </div>
                  </div>
                  {autoSubmitCountdown && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 animate-pulse">
                      ⚡ Silence detected — auto-advancing in {autoSubmitCountdown}s...
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {submittingAnswer
                    ? 'Sending answer to AI interviewer...'
                    : loadingQuestion
                    ? 'AI interviewer is preparing the next adaptive question...'
                    : isAiSpeaking
                    ? 'Interviewer is speaking... Please listen carefully.'
                    : isListening
                    ? 'Speak your answer naturally. Click "Done Answering" when finished, or pause.'
                    : 'Microphone paused. Click "Start Speaking" to resume.'}
                </p>
              </div>
            </div>

            {/* Quick Actions: Submit, Pass & Mic Toggle */}
            <div className="flex items-center space-x-2.5">
              {/* Explicit Submit Answer Button */}
              {studentAnswer.trim().length > 0 && (
                <button
                  type="button"
                  disabled={submittingAnswer || loadingQuestion}
                  onClick={() => handleSubmitResponse(studentAnswer)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Done Answering & Submit</span>
                </button>
              )}

              {/* Skip / Not Getting It Button */}
              <button
                type="button"
                disabled={submittingAnswer || loadingQuestion}
                onClick={handleSkipOrDontKnow}
                className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold border border-amber-500/30 transition flex items-center space-x-1.5 shadow-sm disabled:opacity-40"
                title="Click or say 'Not getting it' to gracefully skip to a fresh topic"
              >
                <FastForward className="w-4 h-4 text-amber-400" />
                <span>Not getting it / Skip</span>
              </button>

              {/* Mic Pause / Resume Toggle */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  isListening
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mute Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-white" />
                    <span>Start Speaking</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real-Time Live Speech Caption Bubble */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Your Spoken Answer (Real-Time Voice Capture):
                </span>
                {isListening && (
                  <span className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-semibold">Capturing voice</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {studentAnswer.split(/\s+/).filter(Boolean).length} words spoken
              </span>
            </div>

            <div className="min-h-[48px] flex items-center">
              {studentAnswer ? (
                <p className="text-sm font-medium text-white leading-relaxed">
                  "{studentAnswer}"
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  {isListening
                    ? 'Speak your answer into the microphone now... Your speech will appear here in real time and submit automatically.'
                    : 'The microphone will automatically start when the interviewer finishes speaking.'}
                </p>
              )}
            </div>

            {/* Animated auto-advance progress indicator */}
            {autoSubmitCountdown && (
              <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-500 to-emerald-400 h-full w-full animate-[pulse_0.9s_ease-in-out_infinite]" />
              </div>
            )}
          </div>

          {/* Footer Controls: End Interview & Hands-Free Status (No Submit Button) */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/30 hover:text-rose-400 text-slate-400 text-xs font-semibold border border-slate-800 hover:border-rose-900/40 transition flex items-center space-x-1.5"
            >
              <Square className="w-3.5 h-3.5" />
              <span>End Interview</span>
            </button>

            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Automatic Voice Mode • System advances seamlessly upon speaking</span>
            </div>
          </div>
        </div>

        {/* End Interview Confirmation Modal */}
        {showEndConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 max-w-sm w-full space-y-4 text-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">End Interview?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to end this interview now? The AI will generate your complete performance evaluation based on your answers so far.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
                >
                  Continue Interview
                </button>
                <button
                  onClick={() => handleEndInterview(false)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
                >
                  End Interview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: EVALUATING IN PROGRESS
  // =========================================================================
  if (viewState === 'evaluating') {
    return (
      <div className="max-w-xl mx-auto text-center space-y-4 py-16">
        <div className="w-16 h-16 rounded-3xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          Interview Completed
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Your 20-minute technical mock interview is complete. The AI is analyzing your technical knowledge, problem solving, and project depth...
        </p>
      </div>
    );
  }

  // =========================================================================
  // VIEW 5: EVALUATION REPORT PAGE
  // =========================================================================
  if (viewState === 'evaluation' && evaluationData) {
    const isHrReport = currentSession?.interviewType === 'hr' || selectedInterviewType === 'hr';
    const overallScore = evaluationData.overallScore ?? 75;

    const metrics = isHrReport
      ? [
          { label: 'Communication & Clarity', value: evaluationData.communicationClarity ?? 75, weight: '15%' },
          { label: 'Confidence & Composure', value: evaluationData.confidenceComposure ?? 75, weight: '10%' },
          { label: 'Teamwork & Collaboration', value: evaluationData.teamwork ?? 75, weight: '10%' },
          { label: 'Leadership & Initiative', value: evaluationData.leadership ?? 75, weight: '10%' },
          { label: 'Problem Solving', value: evaluationData.problemSolving ?? 75, weight: '10%' },
          { label: 'Adaptability & Resilience', value: evaluationData.adaptability ?? 75, weight: '10%' },
          { label: 'Role & Company Motivation', value: evaluationData.roleMotivation ?? 75, weight: '10%' },
          { label: 'Behavioral Reasoning (STAR)', value: evaluationData.behavioralReasoning ?? 75, weight: '10%' },
          { label: 'Professionalism & Awareness', value: evaluationData.professionalism ?? 75, weight: '10%' },
          { label: 'Answer Relevance', value: evaluationData.answerRelevance ?? 75, weight: '5%' },
        ]
      : [
          { label: 'Technical Knowledge', value: evaluationData.technicalKnowledge ?? 80, weight: '25%' },
          { label: 'Practical Understanding', value: evaluationData.practicalUnderstanding ?? evaluationData.technicalKnowledge ?? 75, weight: '20%' },
          { label: 'Project Understanding', value: evaluationData.projectUnderstanding ?? 85, weight: '20%' },
          { label: 'Problem Solving', value: evaluationData.problemSolving ?? 70, weight: '15%' },
          { label: 'Depth of Understanding', value: evaluationData.depthOfUnderstanding ?? evaluationData.depth ?? 75, weight: '10%' },
          { label: 'Answer Relevance', value: evaluationData.answerRelevance ?? 80, weight: '5%' },
          { label: 'Communication / Clarity', value: evaluationData.communication ?? 78, weight: '5%' },
        ];

    // Normalize strengths and weaknesses
    const strengthsList = Array.isArray(evaluationData.strengths) && evaluationData.strengths.length > 0
      ? evaluationData.strengths
      : (evaluationData.strongAreas || []).map((s) => ({ skill: s, evidence: 'Demonstrated solid understanding in this topic.' }));

    const weaknessesList = Array.isArray(evaluationData.weaknesses) && evaluationData.weaknesses.length > 0
      ? evaluationData.weaknesses
      : (evaluationData.needsImprovement || []).map((w) => ({ skill: w, evidence: 'Candidate showed uncertainty or incomplete depth.' }));

    const notAssessedList = Array.isArray(evaluationData.notAssessed) ? evaluationData.notAssessed : [];

    const recommendationsList = Array.isArray(evaluationData.recommendations) && evaluationData.recommendations.length > 0
      ? evaluationData.recommendations
      : (evaluationData.whatToImprove || []).map((item) => ({ topic: 'Area to Refine', reason: item }));

    const recommendedNextAreas = Array.isArray(evaluationData.recommendedNextAreas) ? evaluationData.recommendedNextAreas : [];

    const qEvals = Array.isArray(evaluationData.questionEvaluations) ? evaluationData.questionEvaluations : [];

    return (
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {isHrReport ? 'HR Interview Evaluation Report' : 'Technical Interview Evaluation'}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                isHrReport ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-brand-500/15 text-brand-300 border-brand-500/30'
              }`}>
                {isHrReport ? 'HR Assessment' : 'Technical Assessment'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Mock #{currentSession?.attemptNumber || 1} • {companyName || 'Target Company'} • Grounded in Your Resume
            </p>
          </div>

          <button
            onClick={() => setViewState('landing')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition"
          >
            ← Back to Mock Interview
          </button>
        </div>

        {/* Overall Score Card */}
        <div className={`glass-panel p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl bg-gradient-to-br ${
          isHrReport ? 'from-slate-900/90 via-slate-950 to-emerald-950/20' : 'from-slate-900/90 to-slate-950'
        }`}>
          <div className="space-y-2 text-center md:text-left">
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${
              isHrReport ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isHrReport ? 'Overall HR Evaluation Score' : 'Evidence-Based Score'}</span>
            </div>
            <h2 className="text-4xl font-extrabold text-white">
              {overallScore} <span className="text-slate-500 text-2xl font-normal">/ 100</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              {overallScore >= 75
                ? isHrReport
                  ? 'Outstanding behavioral readiness! You communicated effectively, provided clear STAR-structured examples, and aligned with company expectations.'
                  : 'Strong performance! You demonstrated clear technical depth, accurate reasoning, and solid project ownership based on your resume.'
                : isHrReport
                ? 'Good effort! Review your communication observations and recommended preparation areas below to structure your answers using the STAR method.'
                : 'Good attempt. Review the evidence-backed strengths and improvement areas below to refine your technical depth before your target drive.'}
            </p>
          </div>

          <button
            onClick={() => handleTakeMockInterview(isHrReport ? 'hr' : 'technical')}
            className={`px-6 py-3 text-white rounded-xl text-xs font-bold shadow-lg transition whitespace-nowrap ${
              isHrReport
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-brand-500/20'
            }`}
          >
            Take Another {isHrReport ? 'HR' : 'Technical'} Interview
          </button>
        </div>

        {/* HR Communication & Behavioral Observations Banner */}
        {isHrReport && evaluationData.communicationObservations && (
          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>Communication & Behavioral Observations</span>
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              "{evaluationData.communicationObservations}"
            </p>
          </div>
        )}

        {/* Recommended Preparation Topics */}
        {isHrReport && recommendedNextAreas.length > 0 && (
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3 bg-slate-950/60">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              <span>Recommended Next Preparation Topics</span>
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {recommendedNextAreas.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-brand-300 text-xs font-semibold"
                >
                  🎯 {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Performance Breakdown Rubric */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {isHrReport ? '10-Category HR Assessment Rubric' : '7-Dimension Performance Rubric'}
            </h3>
            <span className="text-[11px] text-slate-500">Weighted Evaluation (100% Total)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <span>{m.label}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({m.weight})</span>
                  </span>
                  <span className="font-bold text-white">{m.value}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.value >= 80
                        ? 'bg-emerald-500'
                        : m.value >= 65
                        ? 'bg-brand-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence-Based Strengths & Needs Improvement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strong Areas */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Demonstrated Strengths (With Evidence)</span>
            </h3>

            <div className="space-y-3">
              {strengthsList.length > 0 ? (
                strengthsList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                      <h4 className="text-xs font-bold text-emerald-300">{item.skill}</h4>
                    </div>
                    {item.evidence && (
                      <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                        <span className="text-slate-400 font-semibold">Evidence: </span>
                        {item.evidence}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No specific strengths confirmed from answers.</p>
              )}
            </div>
          </div>

          {/* Needs Improvement */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Needs Improvement (With Evidence)</span>
            </h3>

            <div className="space-y-3">
              {weaknessesList.length > 0 ? (
                weaknessesList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">⚠</span>
                      <h4 className="text-xs font-bold text-amber-300">{item.skill}</h4>
                    </div>
                    {item.evidence && (
                      <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                        <span className="text-slate-400 font-semibold">Evidence: </span>
                        {item.evidence}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No critical weaknesses identified.</p>
              )}
            </div>
          </div>
        </div>

        {/* Resume Skills Not Assessed */}
        {notAssessedList.length > 0 && (
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3 bg-slate-950/60">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Resume Skills Not Assessed in this 20-Minute Session</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                These technologies are listed on your resume but were not reached during this session. They are NOT marked weak or strong and will be prioritized in your next mock interviews:
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {notAssessedList.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Personalized Narrative Feedback */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3 bg-gradient-to-br from-slate-900/60 to-indigo-950/10">
          <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>AI Interviewer Feedback</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {evaluationData.aiFeedback || 'Personalized feedback analyzing your interview answers.'}
          </p>
        </div>

        {/* Actionable Improvement Recommendations */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Targeted Actionable Recommendations
          </h3>

          <div className="space-y-3">
            {recommendationsList.length > 0 ? (
              recommendationsList.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start space-x-3 text-xs"
                >
                  <span className="w-6 h-6 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                    {idx + 1}
                  </span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-xs">{rec.topic}</h4>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{rec.reason}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No specific recommendations recorded.</p>
            )}
          </div>
        </div>

        {/* Question-by-Question Transcript & Review */}
        {qEvals.length > 0 && (
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Question-by-Question Detailed Review
            </h3>

            <div className="space-y-4">
              {qEvals.map((qe, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-400">
                      Question #{idx + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-semibold text-slate-300">
                        Score: {qe.score}/10
                      </span>
                      {qe.correctness && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          qe.correctness === 'correct'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : qe.correctness === 'mostly_correct'
                            ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        }`}>
                          {qe.correctness.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-white">"{qe.question}"</p>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300">
                    <span className="text-slate-500 font-semibold block mb-0.5">Your Response:</span>
                    "{qe.answer}"
                  </div>

                  {qe.feedback && (
                    <p className="text-[11px] text-slate-400 italic">
                      💡 {qe.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Navigation Actions */}
        <div className="pt-2 flex justify-between">
          <button
            onClick={() => setViewState('landing')}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition"
          >
            ← Back to Technical Interview
          </button>

          <button
            onClick={handleTakeMockInterview}
            className="px-8 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition"
          >
            Take Another Mock Interview
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default TechnicalInterviewView;

