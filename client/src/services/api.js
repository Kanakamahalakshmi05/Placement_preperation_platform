import axios from 'axios';

// When using Vite proxy, relative '/api' works across any host/port without CORS conflicts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: Automatically attach Authorization header if token exists in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Clean error formatting & handling 401 token expiry
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If 401 Unauthorized occurs on a protected endpoint, clear stale token
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      // Clean stale session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    let message = error.response?.data?.message || error.message || 'Network error occurred';

    // Handle timeout cleanly so user doesn't see raw "timeout of 10000ms exceeded"
    if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
      message = 'Request timed out: The server or database took too long to respond. Please make sure your current IP address is whitelisted in MongoDB Atlas Network Access.';
    }

    const customError = {
      message,
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(customError);
  }
);

export const checkHealth = async () => {
  return await api.get('/health');
};

export const fetchAdminOverview = async () => {
  return await api.get('/admin/overview');
};

export const fetchAdminStudents = async () => {
  return await api.get('/admin/students');
};

export const fetchStudentDashboard = async () => {
  return await api.get('/student/dashboard');
};

export const saveTargetJob = async (jobData) => {
  if (jobData instanceof FormData) {
    return await api.post('/target-job', jobData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return await api.post('/target-job', jobData);
};

export const fetchTargetJob = async () => {
  return await api.get('/target-job');
};

export const deleteTargetJob = async () => {
  return await api.delete('/target-job');
};

export const triggerAIAnalysis = async () => {
  return await api.post('/student/trigger-analysis');
};

export const startPreparing = async () => {
  return await api.post('/student/start-preparing');
};

export const setReadyForRound1 = async () => {
  return await api.post('/student/ready-for-round1');
};

export const resetProgress = async () => {
  return await api.post('/student/reset-progress');
};

export const deleteResume = async () => {
  return await api.delete('/resume/me');
};

export const fetchMockQuiz = async (difficulty = 'easy') => {
  return await api.post('/quizzes/generate', { difficulty });
};

export const submitMockQuiz = async (payload) => {
  return await api.post('/quizzes/submit', payload);
};

// Technical & HR Mock Interview Endpoints
export const createInterviewSession = async (interviewType = 'technical') => {
  return await api.post('/interviews/session', { interviewType });
};

export const startInterviewSession = async (id) => {
  return await api.post(`/interviews/${id}/start`);
};

export const fetchInterviewStatus = async (id) => {
  return await api.get(`/interviews/${id}/status`);
};

export const fetchNextInterviewQuestion = async (id) => {
  return await api.post(`/interviews/${id}/next-question`);
};

export const submitInterviewAnswer = async (id, payload) => {
  return await api.post(`/interviews/${id}/answer`, payload);
};

export const endInterviewSession = async (id, payload = {}) => {
  return await api.post(`/interviews/${id}/end`, payload);
};

export const fetchInterviewHistory = async (interviewType) => {
  const url = interviewType ? `/interviews/history?type=${interviewType}` : '/interviews/history';
  return await api.get(url);
};

export const fetchInterviewEvaluation = async (id) => {
  return await api.get(`/interviews/${id}/evaluation`);
};

export default api;
