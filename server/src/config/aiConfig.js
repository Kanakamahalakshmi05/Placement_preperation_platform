const { GoogleGenAI } = require('@google/genai');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

let aiInstance = null;

const getAIClient = () => {
  if (aiInstance) return aiInstance;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.warn('[AI Config Warning] GEMINI_API_KEY is not configured in environment variables.');
    return null;
  }

  try {
    aiInstance = new GoogleGenAI({ apiKey: apiKey.trim() });
    return aiInstance;
  } catch (err) {
    console.error(`[AI Config Error] Failed to initialize GoogleGenAI: ${err.message}`);
    return null;
  }
};

const checkAIStatus = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);
  return {
    configured: isConfigured,
    model: GEMINI_MODEL,
    sdk: '@google/genai',
  };
};

module.exports = {
  getAIClient,
  checkAIStatus,
  GEMINI_MODEL,
};
