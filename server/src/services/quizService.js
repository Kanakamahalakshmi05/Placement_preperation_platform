const { getAIClient, GEMINI_MODEL } = require('../config/aiConfig');

/**
 * Helper to clean and format skill names
 */
function cleanSkill(skill) {
  return String(skill || '')
    .trim()
    .replace(/^[-•*]\s*/, '');
}

/**
 * Generate 10 dynamic MCQ questions tailored to the student's Resume + Company JD + Skill Gap
 */
async function generateQuizQuestions({
  resumeText = '',
  jdText = '',
  company = 'Target Company',
  jobTitle = 'Software Engineer',
  matchedSkills = [],
  missingSkills = [],
  recommendedTopics = [],
  difficulty = 'easy',
}) {
  const normDifficulty = (difficulty || 'easy').toLowerCase();
  const allTargetTopics = [
    ...missingSkills,
    ...recommendedTopics,
    ...matchedSkills,
    'Problem Solving',
    'System Fundamentals',
  ].filter(Boolean);

  // Attempt generation using Gemini if client is initialized
  const aiClient = getAIClient();
  if (aiClient) {
    try {
      const difficultyGuidance = {
        easy: 'Focus on core definitions, syntax, fundamentals, and basic interview concepts.',
        medium: 'Focus on practical, hands-on, scenario-based questions, debugging, and common architectural patterns.',
        difficult: 'Focus on high-level reasoning, system design, performance tradeoffs, edge cases, and senior interview questions.',
      }[normDifficulty] || 'Focus on practical interview questions.';

      const prompt = `You are a Senior Technical Interviewer preparing a mock quiz for a student applying to ${company} for the role of ${jobTitle}.
Target Job Requirements / JD:
${jdText.substring(0, 1500)}

Candidate's Matched Skills: ${matchedSkills.slice(0, 8).join(', ') || 'General Software Engineering'}
Candidate's Skills to Improve / Missing: ${missingSkills.slice(0, 8).join(', ') || 'Advanced Concepts'}
Key Topics to Cover: ${recommendedTopics.slice(0, 6).join(', ') || allTargetTopics.slice(0, 6).join(', ')}

Difficulty Level: ${normDifficulty.toUpperCase()}.
Guidance: ${difficultyGuidance}

TASK:
Generate EXACTLY 10 multiple-choice questions (MCQs) relevant to the company's job requirements and the student's preparation topics.
Do not ask random questions. Every question must tie back to skills required in the JD or the identified gap topics.

Return ONLY a valid JSON array of 10 objects, with no markdown code blocks or surrounding text. Format:
[
  {
    "id": 1,
    "topic": "Specific skill or topic name",
    "question": "Question text here?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswerIndex": 0,
    "explanation": "Brief explanation of why this answer is correct."
  }
]`;

      const response = await aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length >= 8) {
        return parsed.slice(0, 10).map((q, idx) => ({
          id: idx + 1,
          topic: q.topic || allTargetTopics[idx % allTargetTopics.length] || 'Engineering',
          question: q.question,
          options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['A', 'B', 'C', 'D'],
          correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
          explanation: q.explanation || '',
        }));
      }
    } catch (err) {
      console.warn('[QuizService] Gemini generation fallback:', err.message);
    }
  }

  // Robust contextual dynamic generator using real Resume + JD topics
  return generateContextualQuiz({
    company,
    normDifficulty,
    missingSkills,
    matchedSkills,
    recommendedTopics,
    allTargetTopics,
  });
}

/**
 * Contextual generator that builds 10 custom questions from the actual Resume + JD extracted topics
 */
function generateContextualQuiz({
  company,
  normDifficulty,
  missingSkills,
  matchedSkills,
  recommendedTopics,
  allTargetTopics,
}) {
  const topicsPool = [
    ...missingSkills,
    ...recommendedTopics,
    ...matchedSkills,
  ].filter((t) => t && t.length > 1);

  const uniqueTopics = Array.from(new Set(topicsPool));
  if (uniqueTopics.length === 0) {
    uniqueTopics.push('Data Structures', 'REST APIs', 'SQL Database', 'System Architecture', 'Algorithms');
  }

  const templates = {
    easy: [
      (topic) => ({
        question: `In a ${company} technical screening, what is the primary purpose or defining characteristic of ${topic}?`,
        options: [
          `To manage and optimize specific workflows and data access related to ${topic}`,
          `To replace the underlying transport layer protocols permanently`,
          `To compile code directly into raw machine instructions without runtime interpretation`,
          `To bypass security and authentication layers for faster execution`,
        ],
        correctAnswerIndex: 0,
        explanation: `${topic} is primarily used to structure and optimize data access and application workflows.`,
      }),
      (topic) => ({
        question: `When designing software utilizing ${topic}, which of the following best represents standard industry convention?`,
        options: [
          `Coupling components directly without modular boundaries`,
          `Employing clean separation of concerns and appropriate abstraction layers`,
          `Hardcoding connection strings directly into clientside state`,
          `Disabling error logging to prevent memory leaks`,
        ],
        correctAnswerIndex: 1,
        explanation: `Modular abstractions and separation of concerns are core best practices when working with ${topic}.`,
      }),
      (topic) => ({
        question: `Which fundamental principle is most critical to keep in mind when writing or reviewing code that uses ${topic}?`,
        options: [
          `Maximizing runtime memory consumption to reserve CPU cycles`,
          `Ignoring asynchronous execution handling`,
          `Predictable state handling, idempotency, and robust error management`,
          `Restricting code execution strictly to single-threaded sequential loops`,
        ],
        correctAnswerIndex: 2,
        explanation: `Predictable state transitions and reliable error management ensure stability in ${topic}.`,
      }),
    ],
    medium: [
      (topic) => ({
        question: `During production deployment at ${company}, how would you diagnose and address a sudden latency spike involving ${topic}?`,
        options: [
          `Immediately restart all servers without inspecting profiling or error telemetry`,
          `Analyze query execution plans, thread pools, and cache hit ratios related to ${topic}`,
          `Disable SSL encryption across all public gateway endpoints`,
          `Convert all asynchronous operations into blocking synchronous calls`,
        ],
        correctAnswerIndex: 1,
        explanation: `Profiling telemetry and analyzing execution bottlenecks is standard practice for ${topic} issues.`,
      }),
      (topic) => ({
        question: `In a microservices architecture communicating with ${topic}, what is the best strategy to handle transient network failures?`,
        options: [
          `Fail immediately and return unhandled 500 exceptions to end users`,
          `Implement exponential backoff retries paired with a circuit breaker pattern`,
          `Continuously poll the downstream dependency without delay`,
          `Store sensitive credentials in plaintext headers to bypass handshake latency`,
        ],
        correctAnswerIndex: 1,
        explanation: `Circuit breakers and exponential backoff prevent cascading service degradation.`,
      }),
      (topic) => ({
        question: `When scaling ${topic} under high concurrent load, which architectural strategy yields the highest resilience?`,
        options: [
          `Vertical scaling to a single large instance with no redundancy`,
          `Horizontal scaling with stateless services, distributed caching, and connection pooling`,
          `Disabling database indexing to speed up write operations`,
          `Synchronously queuing all incoming requests in client memory`,
        ],
        correctAnswerIndex: 1,
        explanation: `Stateless horizontal scaling and caching decouple high-volume concurrency.`,
      }),
    ],
    difficult: [
      (topic) => ({
        question: `In a distributed system at ${company} with high write throughput, what tradeoff must you evaluate when ensuring consistency with ${topic}?`,
        options: [
          `Tradeoffs between strong consistency, partition tolerance, and write latency (CAP theorem)`,
          `Tradeoffs between using ASCII vs UTF-8 variable naming conventions`,
          `Whether to disable unit testing in production pipelines`,
          `Tradeoffs between running code in development versus production only`,
        ],
        correctAnswerIndex: 0,
        explanation: `Distributed state across ${topic} requires evaluating CAP theorem constraints and eventual consistency models.`,
      }),
      (topic) => ({
        question: `How would you architect a zero-downtime database migration involving schema changes for ${topic} in a 24/7 service?`,
        options: [
          `Execute destructive DROP COLUMN statements directly against the live primary database`,
          `Apply expand-and-contract (parallel run) migration with backward-compatible application releases`,
          `Shut down the entire platform for 6 hours without maintenance notifications`,
          `Ignore schema mismatches and rely on runtime type coercion`,
        ],
        correctAnswerIndex: 1,
        explanation: `Expand and contract (blue-green schema migration) prevents breaking active live traffic.`,
      }),
      (topic) => ({
        question: `Under heavy distributed contention, what concurrency control mechanism is most effective for ${topic} when conflicts are rare?`,
        options: [
          `Pessimistic table-level locking with long-running transactions`,
          `Optimistic concurrency control with version checking and atomic conditional updates`,
          `Completely disabling transaction isolation`,
          `Relying on random sleep intervals before committing state`,
        ],
        correctAnswerIndex: 1,
        explanation: `Optimistic concurrency control allows high throughput when collision frequency is low.`,
      }),
    ],
  };

  const pool = templates[normDifficulty] || templates.easy;
  const questions = [];

  for (let i = 0; i < 10; i++) {
    const topic = uniqueTopics[i % uniqueTopics.length];
    const templateFn = pool[i % pool.length];
    const questionObj = templateFn(topic);

    questions.push({
      id: i + 1,
      topic,
      question: questionObj.question,
      options: questionObj.options,
      correctAnswerIndex: questionObj.correctAnswerIndex,
      explanation: questionObj.explanation,
    });
  }

  return questions;
}

/**
 * Evaluate submitted answers, identify strong vs weak areas, and generate AI performance analysis
 */
function evaluateQuizSubmission({ questions = [], userAnswers = {}, difficulty = 'easy', company = 'Company' }) {
  let correctCount = 0;
  const total = questions.length || 10;
  const topicStats = {};

  questions.forEach((q, idx) => {
    const userAnswer = userAnswers[q.id] !== undefined ? Number(userAnswers[q.id]) : -1;
    const isCorrect = userAnswer === q.correctAnswerIndex;
    const topic = q.topic || `Topic ${idx + 1}`;

    if (!topicStats[topic]) {
      topicStats[topic] = { correct: 0, total: 0 };
    }
    topicStats[topic].total += 1;

    if (isCorrect) {
      correctCount += 1;
      topicStats[topic].correct += 1;
    }
  });

  const percentage = Math.round((correctCount / total) * 100);

  const strongAreas = [];
  const needsImprovement = [];

  Object.entries(topicStats).forEach(([topic, stat]) => {
    if (stat.correct === stat.total) {
      strongAreas.push(topic);
    } else {
      needsImprovement.push(topic);
    }
  });

  // Fallbacks if one list is empty
  if (strongAreas.length === 0 && correctCount > 0) {
    strongAreas.push(questions[0]?.topic || 'Core Concepts');
  }
  if (needsImprovement.length === 0 && correctCount < total) {
    needsImprovement.push(questions[questions.length - 1]?.topic || 'System Optimization');
  }

  // AI Performance Analysis Text
  let aiPerformanceAnalysis = '';
  if (percentage >= 80) {
    aiPerformanceAnalysis = `Your performance was strong in ${strongAreas.slice(0, 2).join(' and ') || 'the evaluated areas'}. You demonstrated solid interview-level grasp of these concepts for ${company}. Review the few edge cases in ${needsImprovement.slice(0, 2).join(' and ') || 'advanced topics'} to achieve mastery.`;
  } else if (percentage >= 50) {
    aiPerformanceAnalysis = `You showed a promising foundation in ${strongAreas.slice(0, 2).join(' and ') || 'fundamental topics'}, but need more targeted practice in ${needsImprovement.slice(0, 2).join(' and ') || 'core requirements'} before taking live interview rounds.`;
  } else {
    aiPerformanceAnalysis = `Your performance highlights significant skill gaps in ${needsImprovement.slice(0, 3).join(', ')}. Dedicate focused study time to these core requirements to align with the ${company} job description.`;
  }

  // What to Improve action list
  const whatToImprove = (needsImprovement.length > 0 ? needsImprovement : ['Advanced Scenario Handling', 'Edge Cases', 'System Design'])
    .slice(0, 4)
    .map((topic, i) => `${topic} fundamentals & interview patterns`);

  return {
    score: correctCount,
    total,
    percentage,
    difficulty,
    strongAreas: strongAreas.length > 0 ? strongAreas : ['Foundational Logic'],
    needsImprovement: needsImprovement.length > 0 ? needsImprovement : ['Edge Case Scenarios'],
    aiPerformanceAnalysis,
    whatToImprove,
    evaluatedAt: new Date(),
  };
}

module.exports = {
  generateQuizQuestions,
  evaluateQuizSubmission,
};
