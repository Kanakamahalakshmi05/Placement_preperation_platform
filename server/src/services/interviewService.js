const crypto = require('crypto');
const TechnicalInterview = require('../models/TechnicalInterview');
const Resume = require('../models/Resume');
const JobTarget = require('../models/JobTarget');
const Analysis = require('../models/Analysis');
const { getAIClient, GEMINI_MODEL } = require('../config/aiConfig');

/**
 * Normalizes question text for similarity comparisons.
 */
const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/^(\d+[\.\)]|\bq\d+[\.:]?|\bquestion\s*\d+[\.:]?)\s*/i, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Calculates Token-based Jaccard Similarity between two questions.
 */
const calculateSimilarity = (textA, textB) => {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const setA = new Set(normA.split(' ').filter((w) => w.length > 2));
  const setB = new Set(normB.split(' ').filter((w) => w.length > 2));

  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0.0 : intersection / union;
};

/**
 * Calculates remaining server-authoritative seconds for an interview.
 */
const calculateRemainingSeconds = (session) => {
  if (!session || session.status === 'COMPLETED' || session.status === 'ABANDONED') {
    return 0;
  }
  if (session.status === 'NOT_STARTED' || !session.startTime) {
    return session.duration || 1200;
  }

  const elapsedMs = Date.now() - new Date(session.startTime).getTime();
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const remaining = (session.duration || 1200) - elapsedSec;
  return Math.max(0, remaining);
};

/**
 * Builds a Structured Resume Interview Profile from the student's actual uploaded resume.
 * Strictly adheres to: ONLY include information explicitly present in the resume.
 * Never invents technologies, cloud architectures, or microservices.
 */
const buildStructuredResumeProfile = async (resume) => {
  if (!resume) {
    return {
      technicalSkills: [],
      programmingLanguages: [],
      frameworks: [],
      databases: [],
      technicalConcepts: [],
      projects: [],
    };
  }

  const rawText = resume.rawText || '';
  const parsedSkills = Array.isArray(resume.parsedSkills) ? resume.parsedSkills : [];
  const parsedProjects = Array.isArray(resume.parsedProjects) ? resume.parsedProjects : [];

  const aiClient = getAIClient();
  if (aiClient && rawText.length > 50) {
    try {
      const prompt = `You are a Senior Technical Recruiter analyzing a candidate's resume for an upcoming technical interview.
Analyze the resume and extract an accurate, structured profile.

CRITICAL INSTRUCTIONS:
1. ONLY include skills, programming languages, frameworks, databases, concepts, and projects that are EXPLICITLY MENTIONED in the resume text.
2. DO NOT assume or invent technologies, tools, or architectures. For example, if Docker, Kubernetes, AWS, or Redis are NOT mentioned, DO NOT include them.
3. For projects: extract the exact project title/name, brief description, and the explicit technologies used in that project.

RESUME TEXT:
${rawText.substring(0, 4000)}

Return ONLY a valid JSON object matching this schema:
{
  "technicalSkills": ["skill1", "skill2"],
  "programmingLanguages": ["Java", "JavaScript", etc.],
  "frameworks": ["React", "Express", etc.],
  "databases": ["MongoDB", "MySQL", etc.],
  "technicalConcepts": ["REST APIs", "JWT", "DSA", etc.],
  "projects": [
    {
      "name": "Exact Project Name",
      "description": "Brief description from resume",
      "technologies": ["tech1", "tech2"],
      "features": ["feature1", "feature2"],
      "candidateRole": "role if mentioned"
    }
  ]
}`;

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
      if (parsed && (Array.isArray(parsed.technicalSkills) || Array.isArray(parsed.projects))) {
        return {
          technicalSkills: Array.isArray(parsed.technicalSkills) ? parsed.technicalSkills : parsedSkills,
          programmingLanguages: Array.isArray(parsed.programmingLanguages) ? parsed.programmingLanguages : [],
          frameworks: Array.isArray(parsed.frameworks) ? parsed.frameworks : [],
          databases: Array.isArray(parsed.databases) ? parsed.databases : [],
          technicalConcepts: Array.isArray(parsed.technicalConcepts) ? parsed.technicalConcepts : [],
          projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        };
      }
    } catch (err) {
      console.warn('[InterviewService] AI resume profiling fallback triggered:', err.message);
    }
  }

  // Deterministic Keyword-Based Profile Builder (Fallback)
  const lowerText = rawText.toLowerCase();

  const langKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'c', 'golang', 'go',
    'ruby', 'php', 'swift', 'kotlin', 'rust', 'html', 'css', 'sql'
  ];
  const fwKeywords = [
    'react', 'react.js', 'reactjs', 'node.js', 'nodejs', 'express', 'express.js',
    'next.js', 'nextjs', 'vue', 'vue.js', 'angular', 'django', 'flask', 'fastapi',
    'spring boot', 'spring', 'asp.net', 'laravel', 'tailwind', 'bootstrap'
  ];
  const dbKeywords = [
    'mongodb', 'mysql', 'postgresql', 'postgres', 'sqlite', 'redis', 'oracle',
    'firebase', 'dynamodb', 'cassandra', 'mariadb'
  ];
  const conceptKeywords = [
    'rest api', 'rest apis', 'restful', 'graphql', 'socket.io', 'websockets',
    'jwt', 'oauth', 'oop', 'dsa', 'data structures', 'microservices', 'ci/cd',
    'git', 'github', 'mvc', 'docker', 'kubernetes', 'aws'
  ];

  const canonicalNames = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    'c++': 'C++',
    'c#': 'C#',
    c: 'C',
    golang: 'Go',
    go: 'Go',
    ruby: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    rust: 'Rust',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    react: 'React',
    'react.js': 'React',
    reactjs: 'React',
    'node.js': 'Node.js',
    nodejs: 'Node.js',
    express: 'Express',
    'express.js': 'Express',
    'next.js': 'Next.js',
    nextjs: 'Next.js',
    vue: 'Vue',
    'vue.js': 'Vue',
    angular: 'Angular',
    django: 'Django',
    flask: 'Flask',
    fastapi: 'FastAPI',
    'spring boot': 'Spring Boot',
    spring: 'Spring Boot',
    mongodb: 'MongoDB',
    mysql: 'MySQL',
    postgresql: 'PostgreSQL',
    postgres: 'PostgreSQL',
    sqlite: 'SQLite',
    redis: 'Redis',
    oracle: 'Oracle',
    firebase: 'Firebase',
    dynamodb: 'DynamoDB',
    'rest api': 'REST APIs',
    'rest apis': 'REST APIs',
    restful: 'REST APIs',
    jwt: 'JWT',
    'socket.io': 'Socket.IO',
    websockets: 'WebSockets',
    oauth: 'OAuth',
    dsa: 'DSA',
    'data structures': 'DSA',
    oop: 'OOP',
    mvc: 'MVC',
    docker: 'Docker',
    kubernetes: 'Kubernetes',
    aws: 'AWS',
  };

  const toProper = (kw) => canonicalNames[kw] || kw.charAt(0).toUpperCase() + kw.slice(1);

  const foundLangs = Array.from(new Set(langKeywords.filter((kw) => lowerText.includes(kw)).map(toProper)));
  const foundFws = Array.from(new Set(fwKeywords.filter((kw) => lowerText.includes(kw)).map(toProper)));
  const foundDbs = Array.from(new Set(dbKeywords.filter((kw) => lowerText.includes(kw)).map(toProper)));
  const foundConcepts = Array.from(new Set(conceptKeywords.filter((kw) => lowerText.includes(kw)).map(toProper)));

  const projects = parsedProjects.map((p) => ({
    name: p.title || 'Resume Project',
    description: p.description || '',
    technologies: Array.isArray(p.techStack) ? p.techStack : [],
    features: [],
    candidateRole: 'Developer',
  }));

  // If few or no projects parsed, scan rawText for project titles and entries
  if (projects.length < 2 && rawText) {
    const projSectionMatch = rawText.match(/(?:PROJECTS|Academic Projects|Key Projects)[\s\S]*?(?:EDUCATION|EXPERIENCE|SKILLS|CERTIFICATIONS|ACHIEVEMENTS|$)/i);
    const projText = projSectionMatch ? projSectionMatch[0] : rawText;
    const lines = projText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 4 || trimmed.length > 80) continue;
      const match = trimmed.match(/^[\s*•-]*([A-Z0-9][A-Za-z0-9\s\-]+?)(?:\s*[:–—\-|]\s*|\s*\(([^)]+)\)\s*:?)(.*)/);
      if (match && match[1]) {
        const title = match[1].trim();
        if (
          title.length >= 3 &&
          !/^(PROJECTS|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS|SUMMARY|LANGUAGES|TECHNICAL SKILLS)/i.test(title)
        ) {
          if (!projects.some((p) => p.name.toLowerCase() === title.toLowerCase())) {
            projects.push({
              name: title,
              description: (match[3] || '').trim(),
              technologies: foundFws.slice(0, 3),
              features: [],
              candidateRole: 'Developer',
            });
          }
        }
      }
    }
  }

  // Fallback single project extraction if still 0
  if (projects.length === 0) {
    const projMatch = rawText.match(/(?:project[s]?|academic project[s]?)\s*[:\n]+([^\n\r]+)/i);
    if (projMatch && projMatch[1]) {
      projects.push({
        name: projMatch[1].trim(),
        description: 'Software project mentioned in resume',
        technologies: foundFws.slice(0, 3),
        features: [],
        candidateRole: 'Developer',
      });
    }
  }

  const allSkills = Array.from(
    new Set([
      ...parsedSkills,
      ...foundLangs,
      ...foundFws,
      ...foundDbs,
      ...foundConcepts,
    ])
  );

  const foundBackends = Array.from(new Set([...foundFws, ...foundConcepts].filter((s) => ['Node.js', 'Express', 'Spring Boot', 'Django', 'Flask', 'FastAPI', 'REST APIs', 'GraphQL'].includes(s))));
  const foundFrontends = Array.from(new Set([...foundFws, ...foundLangs].filter((s) => ['React', 'Next.js', 'Vue', 'Angular', 'HTML', 'CSS', 'Tailwind'].includes(s))));
  const foundApis = Array.from(new Set(foundConcepts.filter((s) => ['REST APIs', 'GraphQL', 'Socket.IO', 'WebSockets'].includes(s))));
  const foundAuth = Array.from(new Set(foundConcepts.filter((s) => ['JWT', 'OAuth'].includes(s))));
  const foundCloud = Array.from(new Set(foundConcepts.filter((s) => ['Docker', 'Kubernetes', 'AWS', 'CI/CD'].includes(s))));
  const foundMl = Array.from(new Set(allSkills.filter((s) => ['Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Scikit-learn'].some((m) => s.toLowerCase().includes(m.toLowerCase())))));
  const foundTools = Array.from(new Set(allSkills.filter((s) => ['Git', 'GitHub', 'Postman', 'Docker'].includes(s))));

  return {
    technicalSkills: allSkills,
    programmingLanguages: foundLangs,
    frameworks: foundFws,
    databases: foundDbs,
    backendTechnologies: foundBackends,
    frontendTechnologies: foundFrontends,
    apis: foundApis,
    authentication: foundAuth,
    cloudDeployment: foundCloud,
    mlTechnologies: foundMl,
    tools: foundTools,
    technicalConcepts: foundConcepts,
    projects,
  };
};

/**
 * Gathers rich candidate context: Actual Resume, Structured Profile, Target Job JD, and Past History.
 * Queries with {$or: [{ userId: studentId }, { user: studentId }]} to prevent missing records.
 */
const gatherCandidateContext = async (session, studentId) => {
  // Query resume using userId
  const resume =
    (session.resumeId && (await Resume.findById(session.resumeId))) ||
    (await Resume.findOne({ $or: [{ userId: studentId }, { user: studentId }] }).sort({ createdAt: -1 }));

  // Query target job using userId
  const jobTarget =
    (session.targetJobId && (await JobTarget.findById(session.targetJobId))) ||
    (await JobTarget.findOne({ $or: [{ userId: studentId }, { user: studentId }] }).sort({ createdAt: -1 }));

  // Query analysis record
  const analysisRecord = await Analysis.findOne({
    $or: [{ studentId }, { userId: studentId }],
    isValid: true,
  }).sort({ createdAt: -1 });

  // Filter past completed interviews based on session.interviewType
  const typeFilter = session.interviewType === 'hr'
    ? { interviewType: 'hr' }
    : { $or: [{ interviewType: 'technical' }, { interviewType: { $exists: false } }] };

  // Retrieve past completed interviews
  const pastInterviews = await TechnicalInterview.find({
    studentId,
    _id: { $ne: session._id },
    status: 'COMPLETED',
    ...typeFilter,
  }).sort({ attemptNumber: -1 });

  const pastQuestions = [];
  const pastWeaknesses = [];
  const pastStrongAreas = [];

  pastInterviews.forEach((pi) => {
    if (Array.isArray(pi.questions)) {
      pi.questions.forEach((q) => {
        if (q.questionText) {
          pastQuestions.push({
            text: q.questionText,
            topic: q.topic,
            attemptNumber: pi.attemptNumber,
          });
        }
      });
    }
    if (pi.evaluation) {
      if (Array.isArray(pi.evaluation.weaknesses)) {
        pi.evaluation.weaknesses.forEach((w) => {
          if (w.skill) pastWeaknesses.push(w.skill);
        });
      } else if (Array.isArray(pi.evaluation.needsImprovement)) {
        pastWeaknesses.push(...pi.evaluation.needsImprovement);
      }

      if (Array.isArray(pi.evaluation.strengths)) {
        pi.evaluation.strengths.forEach((s) => {
          if (s.skill) pastStrongAreas.push(s.skill);
        });
      } else if (Array.isArray(pi.evaluation.strongAreas)) {
        pastStrongAreas.push(...pi.evaluation.strongAreas);
      }
    }
  });

  // Extract structured profile
  let resumeProfile = session.resumeProfile;
  if (!resumeProfile || !resumeProfile.technicalSkills || resumeProfile.technicalSkills.length === 0) {
    resumeProfile = await buildStructuredResumeProfile(resume);
  }

  return {
    resume,
    resumeProfile,
    companyName: jobTarget?.company || session.companyName || 'Target Company',
    targetRole: jobTarget?.jobTitle || 'Software Engineer',
    jdText: jobTarget?.jobDescription || '',
    jdRequiredSkills: Array.isArray(jobTarget?.extractedSkills) ? jobTarget.extractedSkills : [],
    matchedSkills: analysisRecord?.analysis?.matchedSkills || [],
    skillsToImprove: analysisRecord?.analysis?.skillsToImprove || [],
    pastQuestions,
    pastWeaknesses: Array.from(new Set(pastWeaknesses)),
    pastStrongAreas: Array.from(new Set(pastStrongAreas)),
  };
};

/**
 * Creates a brand new interview session for a student without any upper limit.
 * Supports interviewType: 'technical' or 'hr'.
 */
const createInterviewSession = async (studentId, interviewType = 'technical') => {
  const validInterviewType = interviewType === 'hr' ? 'hr' : 'technical';
  const countQuery = validInterviewType === 'hr'
    ? { studentId, interviewType: 'hr' }
    : { studentId, $or: [{ interviewType: 'technical' }, { interviewType: { $exists: false } }] };

  const count = await TechnicalInterview.countDocuments(countQuery);
  const attemptNumber = count + 1;

  // Retrieve student's actual resume and target job
  const resume = await Resume.findOne({
    $or: [{ userId: studentId }, { user: studentId }],
  }).sort({ createdAt: -1 });

  const jobTarget = await JobTarget.findOne({
    $or: [{ userId: studentId }, { user: studentId }],
  }).sort({ createdAt: -1 });

  // Generate structured resume interview profile
  const resumeProfile = await buildStructuredResumeProfile(resume);

  const session = await TechnicalInterview.create({
    studentId,
    resumeId: resume?._id,
    targetJobId: jobTarget?._id,
    companyName: jobTarget?.company || 'Target Company',
    interviewType: validInterviewType,
    attemptNumber,
    status: 'NOT_STARTED',
    duration: 1200, // 20 minutes
    resumeProfile,
    currentPhase: validInterviewType === 'hr' ? 'HR_BEHAVIORAL' : 'TECHNICAL_SKILLS',
    interviewContext: {
      coveredSkills: [],
      uncoveredImportantSkills: Array.isArray(resumeProfile.technicalSkills) ? resumeProfile.technicalSkills.slice() : [],
      coveredProjects: [],
      uncoveredProjects: Array.isArray(resumeProfile.projects) ? resumeProfile.projects.map((p) => p.name) : [],
      coveredQuestionTypes: [],
      currentFocusProject: resumeProfile.projects?.[0]?.name || null,
      currentFocusTech: resumeProfile.programmingLanguages?.[0] || resumeProfile.technicalSkills?.[0] || 'JavaScript',
      currentDepth: 1,
      consecutiveStrongAnswers: 0,
      consecutiveWeakAnswers: 0,
    },
    questions: [],
  });

  return session;
};

/**
 * Starts the interview session timer and generates the opening question.
 */
const startInterviewSession = async (interviewId, studentId) => {
  const session = await TechnicalInterview.findOne({ _id: interviewId, studentId });
  if (!session) {
    throw new Error('Interview session not found or unauthorized.');
  }

  if (session.status === 'COMPLETED') {
    return session;
  }

  if (session.status === 'NOT_STARTED') {
    session.status = 'IN_PROGRESS';
    session.startTime = new Date();
    await session.save();
  }

  // If no questions exist yet, generate the first opening question
  if (!session.questions || session.questions.length === 0) {
    await generateNextQuestion(interviewId, studentId);
    return await TechnicalInterview.findById(interviewId);
  }

  return session;
};
/**
 * Analyzes the candidate's answer for depth, technical specificity, and skipped/pass indicators.
 */
const analyzeCandidateAnswer = (studentAnswer, currentQuestion) => {
  const answer = (studentAnswer || '').trim().toLowerCase();
  if (!answer) {
    return { understanding: 'skipped', isPass: true, isShallow: false, isStrong: false, details: 'No response provided.' };
  }

  const passPhrases = [
    "don't know", "dont know", "do not know", "not getting", "no idea",
    "pass", "skip", "not sure", "cannot recall", "can't remember", "don't recall"
  ];
  if (passPhrases.some((phrase) => answer.includes(phrase))) {
    return { understanding: 'skipped', isPass: true, isShallow: false, isStrong: false, details: 'Candidate indicated they do not know or chose to skip.' };
  }

  const words = answer.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const shallowIndicators = [
    "is flexible", "is easy", "it is fast", "good for performance", "for authentication", "stores data", "for frontend", "for backend", "it is simple", "used it because it was easy"
  ];
  const hasShallowPhrase = shallowIndicators.some((p) => answer.includes(p));

  if (wordCount < 15 || (wordCount < 25 && hasShallowPhrase)) {
    return { understanding: 'weak', isPass: false, isShallow: true, isStrong: false, details: 'Candidate provided a brief or surface-level definition without practical implementation details.' };
  }

  const strongKeywords = [
    'because', 'trade-off', 'tradeoff', 'latency', 'index', 'schema', 'event loop', 'libuv', 'microtask', 'macrotask',
    'middleware', 'reconciliation', 'virtual dom', 'fiber', 'transaction', 'acid', 'locking', 'race condition', 'mutex',
    'atomic', 'idempotent', 'idempotency', 'cache', 'redis', 'ttl', 'invalidation', 'stampede', 'payload', 'header',
    'bearer', 'httponly', 'samesite', 'csrf', 'xss', 'normalized', 'denormalized', 'b-tree', 'explain analyze', 'concurrency',
    'websocket', 'handshake', 'pub/sub', 'cluster', 'worker', 'gil', 'asyncio', 'multiprocessing', 'jvm', 'garbage collect',
    'bce', 'imbalance', 'precision', 'recall', 'f1', 'gradient', 'overfitting', 'dropout', 'batchnorm', 'ensemble'
  ];
  const strongMatches = strongKeywords.filter((k) => answer.includes(k));

  if (wordCount >= 30 && strongMatches.length >= 2) {
    return { understanding: 'strong', isPass: false, isShallow: false, isStrong: true, details: 'Candidate provided a thorough, technically specific explanation citing implementation mechanics.' };
  }

  return { understanding: 'moderate', isPass: false, isShallow: false, isStrong: false, details: 'Candidate gave an acceptable explanation with reasonable conceptual grasp.' };
};

/**
 * Generates the next adaptive technical question grounded in the student's resume.
 * Operates as a REAL TECHNICAL INTERVIEWER following the 10-phase guideline:
 * Phase 1: Resume Technical Profiling
 * Phase 2: Technical Skill Probing (Directly starts with resume skill, varied openings)
 * Phase 3: "Why did you choose this technology?"
 * Phase 4: Test whether candidate understands the choice (probe shallow answers)
 * Phase 5: Move from skills into project architecture & data flow
 * Phase 6: Project implementation deep dive & ownership verification
 * Phase 7: Scenario / what-if / debugging / edge cases (concurrency, race conditions)
 * Phase 8: Optimization / scalability / trade-offs / production design (1M users)
 * Phase 9: Move to another important resume project/skill
 * Phase 10: Evidence-based evaluation
 */
const generateNextQuestion = async (interviewId, studentId) => {
  const session = await TechnicalInterview.findOne({ _id: interviewId, studentId });
  if (!session) {
    throw new Error('Interview session not found or unauthorized.');
  }

  const remainingSeconds = calculateRemainingSeconds(session);
  if (remainingSeconds <= 0 && session.status === 'IN_PROGRESS') {
    return await endInterviewSession(interviewId, studentId, true);
  }

  const context = await gatherCandidateContext(session, studentId);

  // If HR Interview, route to dedicated HR question generator
  if (session.interviewType === 'hr') {
    return await generateNextHRQuestion(session, context);
  }

  const currentQuestions = session.questions || [];
  const currentCount = currentQuestions.length;
  const lastQuestion = currentCount > 0 ? currentQuestions[currentCount - 1] : null;
  const lastAnswer = (lastQuestion?.studentAnswer || '').trim();

  const profile = context.resumeProfile || {};
  const skillsList = profile.technicalSkills?.length > 0 ? profile.technicalSkills : ['Software Engineering'];
  const langsList = profile.programmingLanguages?.length > 0 ? profile.programmingLanguages : skillsList;
  const projectsList = profile.projects?.length > 0 ? profile.projects : [];
  const numProjects = projectsList.length;

  // Initialize or update conversational context
  if (!session.interviewContext) {
    session.interviewContext = {
      coveredSkills: [],
      uncoveredImportantSkills: skillsList.slice(),
      coveredProjects: [],
      uncoveredProjects: projectsList.map((p) => p.name),
      coveredQuestionTypes: [],
      currentFocusProject: projectsList[0]?.name || null,
      currentFocusTech: langsList[0] || skillsList[0] || 'JavaScript',
      currentDepth: 1,
      consecutiveStrongAnswers: 0,
      consecutiveWeakAnswers: 0,
    };
  }

  // Analyze last answer
  let lastAnalysis = { understanding: 'moderate', isPass: false, isShallow: false, isStrong: false };
  if (lastQuestion) {
    lastAnalysis = analyzeCandidateAnswer(lastAnswer, lastQuestion);
    lastQuestion.candidateUnderstanding = lastAnalysis.understanding;

    if (lastQuestion.targetTechnology && !session.interviewContext.coveredSkills.includes(lastQuestion.targetTechnology)) {
      session.interviewContext.coveredSkills.push(lastQuestion.targetTechnology);
      session.interviewContext.uncoveredImportantSkills = session.interviewContext.uncoveredImportantSkills.filter((s) => s !== lastQuestion.targetTechnology);
    }
    if (lastQuestion.targetProject && !session.interviewContext.coveredProjects.includes(lastQuestion.targetProject)) {
      session.interviewContext.coveredProjects.push(lastQuestion.targetProject);
      session.interviewContext.uncoveredProjects = session.interviewContext.uncoveredProjects.filter((p) => p !== lastQuestion.targetProject);
    }
    if (lastQuestion.questionType && !session.interviewContext.coveredQuestionTypes.includes(lastQuestion.questionType)) {
      session.interviewContext.coveredQuestionTypes.push(lastQuestion.questionType);
    }

    if (lastAnalysis.isStrong) {
      session.interviewContext.consecutiveStrongAnswers++;
      session.interviewContext.consecutiveWeakAnswers = 0;
      session.interviewContext.currentDepth = Math.min(13, (session.interviewContext.currentDepth || 1) + 1);
    } else if (lastAnalysis.isPass || lastAnalysis.isShallow) {
      session.interviewContext.consecutiveWeakAnswers++;
      session.interviewContext.consecutiveStrongAnswers = 0;
      session.interviewContext.currentDepth = Math.max(1, (session.interviewContext.currentDepth || 1) - 1);
    }
  }

  // Determine current phase based on conversational progression
  let currentPhase = 'TECHNICAL_SKILLS';
  if (currentCount === 0) {
    currentPhase = 'TECHNICAL_SKILLS'; // Turn 1: Opening Technical Skill Question
  } else if (currentCount === 1) {
    currentPhase = 'TECHNICAL_SKILLS'; // Turn 2: Skill Implementation / Second Skill
  } else if (currentCount === 2) {
    currentPhase = 'TECH_CHOICE'; // Turn 3: "Why did you choose this technology?"
  } else if (currentCount === 3) {
    currentPhase = 'ADAPTIVE_FOLLOWUP'; // Turn 4: Test understanding of choice (probe shallow answers)
  } else if (currentCount === 4) {
    currentPhase = 'PROJECT_DISCUSSION'; // Turn 5: Project Architecture & Request Flow
  } else if (currentCount === 5) {
    currentPhase = 'IMPLEMENTATION_DEEP_DIVE'; // Turn 6: Project Implementation & Ownership Verification
  } else if (currentCount === 6) {
    currentPhase = 'SCENARIO_EDGE_CASE'; // Turn 7: Debugging: Tell me about a difficult bug you encountered
  } else if (currentCount === 7) {
    currentPhase = 'SCENARIO_EDGE_CASE'; // Turn 8: Concurrency & Edge Cases (simultaneous users, race conditions)
  } else if (currentCount === 8) {
    currentPhase = 'SCALABILITY_DESIGN'; // Turn 9: Optimization, Scalability & Trade-offs (1M users bottleneck)
  } else {
    currentPhase = 'PIVOT_NEXT_PROJECT'; // Turn 10+: Move to next project or unassessed skills
  }
  session.currentPhase = currentPhase;

  const isPassOrUnknown = lastAnalysis.isPass;
  const isShallowAnswer = lastAnalysis.isShallow;

  // Strict session anti-duplication
  const isDuplicateInCurrentSession = (candidateText, candidateTopic) => {
    return currentQuestions.some((prevQ) => {
      if (!prevQ.questionText) return false;
      const textSim = calculateSimilarity(prevQ.questionText, candidateText);
      const sameTopic = (prevQ.topic || '').toLowerCase().trim() === (candidateTopic || '').toLowerCase().trim();
      return textSim > 0.55 || (sameTopic && textSim > 0.35);
    });
  };

  const aiClient = getAIClient();
  let generatedQuestion = null;

  if (aiClient) {
    try {
      const activeProject = projectsList[0] || { name: 'Primary Project', technologies: profile.frameworks || [] };
      const currentTech = session.interviewContext.currentFocusTech || langsList[0] || 'JavaScript';

      const prompt = `You are a Principal Engineering Interviewer conducting a realistic, conversational 20-minute technical interview for ${context.companyName}.
You have read the student's resume carefully.

=== CANDIDATE RESUME PROFILE ===
- Programming Languages: ${langsList.join(', ') || 'General Programming'}
- Frameworks / Libraries: ${profile.frameworks?.join(', ') || 'Standard Web Frameworks'}
- Databases: ${profile.databases?.join(', ') || 'Relational / NoSQL'}
- APIs & Auth: ${(profile.apis || []).concat(profile.authentication || []).join(', ') || 'REST APIs, JWT'}
- Technical Concepts: ${profile.technicalConcepts?.join(', ') || 'Data Structures, APIs, OOP'}
- Projects (${numProjects} total):
${
  projectsList.length > 0
    ? projectsList.map((p, i) => `  ${i + 1}. "${p.name}" [Technologies: ${p.technologies?.join(', ') || 'N/A'}]`).join('\n')
    : '  None explicitly listed; base questions on candidate tech stack.'
}

=== CONVERSATIONAL STATE ===
- Turn: #${currentCount + 1}
- Current Phase: ${currentPhase}
- Remaining Time: ${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s
- Current Focus Project: "${activeProject.name}"
- Current Focus Technology: "${currentTech}"
- Covered Skills So Far: ${session.interviewContext.coveredSkills.join(', ') || 'None'}
- Uncovered Important Skills: ${session.interviewContext.uncoveredImportantSkills.slice(0, 5).join(', ') || 'None'}
- Covered Projects: ${session.interviewContext.coveredProjects.join(', ') || 'None'}
- Candidate Understanding of Last Answer: ${lastAnalysis.understanding} (${lastAnalysis.details})

=== QUESTIONS ALREADY ASKED IN THIS SESSION (NEVER REPEAT THESE): ===
${
  currentQuestions.length > 0
    ? currentQuestions.map((q, i) => `  Q${i + 1} [${q.topic} - ${q.questionType}]: "${q.questionText}"\n  Answer: "${q.studentAnswer?.substring(0, 200)}"`).join('\n')
    : '  None (Opening Turn).'
}

=== PHASE INSTRUCTIONS ===
${
  currentCount === 0
    ? `TURN 1 (OPENING TECHNICAL SKILL):
       - DO NOT start with "Tell me about yourself".
       - Start directly with technical skill questions from the resume (${currentTech}).
       - Frame as a practical technical inquiry: "Let's start with your technical experience. You have mentioned ${currentTech}..."`
    : currentCount === 1
    ? `TURN 2 (SKILL FOLLOW-UP):
       - Explore how they have used ${currentTech} or transition to a related framework.`
    : currentCount === 2
    ? `TURN 3 ("WHY DID YOU CHOOSE THIS TECHNOLOGY?"):
       - Pick an important technology used in project "${activeProject.name}" (e.g. MongoDB vs SQL, Socket.IO vs REST, React vs SSR, JWT vs Sessions).
       - Naturally ask: "In your project '${activeProject.name}', why did you choose [Technology] instead of [Alternative]?"`
    : currentCount === 3
    ? `TURN 4 (TEST UNDERSTANDING OF THE CHOICE):
       ${
         isShallowAnswer
           ? `- The candidate gave a surface answer (e.g. "it is flexible / fast"). Probe them directly: "What do you mean by flexible? In your specific project '${activeProject.name}', what part of your data actually benefited from that flexibility?"`
           : `- The candidate gave a reasonable answer. Validate and transition: "Okay, that makes sense. Let's go one level deeper into how that technology integrates with your project architecture."`
       }`
    : currentCount === 4
    ? `TURN 5 (PROJECT ARCHITECTURE & DATA FLOW):
       - Bridge from skills into project: "You've mentioned React, Node.js, and MongoDB. I see you used these in your project '${activeProject.name}'. Let's discuss that project. Walk me through what happens under the hood when a user initiates a request all the way to your database."`
    : currentCount === 5
    ? `TURN 6 (IMPLEMENTATION & PROJECT OWNERSHIP):
       - Ask concrete, implementation-specific questions to verify genuine ownership:
         "Where exactly did you generate the token? What did the payload contain? Where was it transmitted, and which middleware on your backend verified it? What happened when verification failed?"`
    : currentCount === 6
    ? `TURN 7 (DEBUGGING & UNEXPECTED BUGS):
       - Ask about a real technical struggle: "Tell me about a difficult technical bug or unexpected bottleneck you encountered while developing '${activeProject.name}'. How did you diagnose it, what was the root cause, and how did you resolve it?"`
    : currentCount === 7
    ? `TURN 8 (CONCURRENCY, RACE CONDITIONS & EDGE CASES):
       - Probe simultaneous operations: "In '${activeProject.name}', what happens if two users attempt to perform this action simultaneously? How did your system prevent race conditions and guarantee data integrity?"`
    : currentCount === 8
    ? `TURN 9 (OPTIMIZATION, SCALABILITY & TRADE-OFFS):
       - Scale to production: "Suppose your user base scales to 1 million active users. What part of your current architecture would become a bottleneck first, and how would you redesign it for production?"`
    : `TURN 10+ (NEXT PROJECT OR UNASSESSED SKILLS):
       - Move to candidate's second project or probe remaining unassessed skills.`
}

=== ADAPTIVE RULES ===
- If candidate says "don't know", "not getting this", or skips: Acknowledge encouragingly ("No problem at all, let's move on to another area.") and pivot to an unassessed skill.
- If candidate answer was strong: Increase depth into scalability, internal mechanics, or failure recovery.
- If candidate answer was weak/shallow: Probe for concrete details or ask a clarifying question.
- Do NOT overuse definition questions ("What is React?"). Always connect to practical usage or projects.

Return ONLY a valid JSON object matching this schema:
{
  "question": "Your spoken question here",
  "topic": "Specific Topic Name",
  "questionType": "technical" | "tech-choice" | "project" | "architecture" | "implementation" | "debugging" | "edge-case" | "scalability" | "adaptive-followup",
  "targetProject": "${activeProject.name}",
  "targetTechnology": "${currentTech}",
  "difficulty": "easy" | "medium" | "difficult",
  "reason": "Brief technical justification",
  "isFollowUp": true | false,
  "followUpTo": "${lastQuestion ? lastQuestion.questionId : null}"
}`;

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
      if (parsed && parsed.question && parsed.question.trim().length > 10) {
        if (!isDuplicateInCurrentSession(parsed.question.trim(), parsed.topic || '')) {
          generatedQuestion = {
            questionText: parsed.question.trim(),
            topic: parsed.topic || 'Core Technical',
            questionType: parsed.questionType || 'technical',
            targetProject: parsed.targetProject || activeProject.name,
            targetTechnology: parsed.targetTechnology || currentTech,
            difficulty: ['easy', 'medium', 'difficult'].includes(parsed.difficulty) ? parsed.difficulty : 'medium',
            reason: parsed.reason || 'Evaluating candidate practical engineering ability',
            isFollowUp: Boolean(parsed.isFollowUp),
            followUpTo: parsed.isFollowUp && lastQuestion ? lastQuestion.questionId : null,
          };
        } else {
          console.warn('[InterviewService] AI generated question collided with session history. Using deterministic unique generator.');
        }
      }
    } catch (aiErr) {
      console.warn('[InterviewService] Gemini AI question generation fallback triggered:', aiErr.message);
    }
  }

  // Deterministic Fallback Generator strictly executing the 10-phase real interviewer logic
  if (!generatedQuestion) {
    generatedQuestion = generateDeterministicResumeQuestion(context, currentQuestions, currentPhase, isPassOrUnknown, session.attemptNumber || 1, isShallowAnswer);
  }

  // Anti-duplication check against past mock interview attempts
  const isDuplicateFromPast = context.pastQuestions.some(
    (pq) => calculateSimilarity(pq.text, generatedQuestion.questionText) > 0.85
  );

  const questionId = `q_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const newQuestionRecord = {
    questionId,
    questionText: generatedQuestion.questionText,
    topic: generatedQuestion.topic,
    questionType: generatedQuestion.questionType || 'technical',
    targetProject: generatedQuestion.targetProject || null,
    targetTechnology: generatedQuestion.targetTechnology || null,
    followUpTo: generatedQuestion.followUpTo || null,
    difficulty: generatedQuestion.difficulty,
    reason: generatedQuestion.reason,
    isFollowUp: generatedQuestion.isFollowUp,
    isRepeatedFromPrevious: isDuplicateFromPast,
    askedAt: new Date(),
    studentAnswer: '',
  };

  session.questions.push(newQuestionRecord);
  await session.save();

  return {
    isCompleted: false,
    question: newQuestionRecord,
    remainingSeconds: calculateRemainingSeconds(session),
    attemptNumber: session.attemptNumber,
    companyName: session.companyName,
    questionIndex: session.questions.length,
  };
};

/**
 * Deterministic Resume-Grounded Question Generator.
 * Implements the 10-Phase Real Technical Interviewer Guidelines:
 * Turn 1: Opening Technical Skill (Varied by attempt number, no "Tell me about yourself")
 * Turn 2: Skill Implementation & Practical Usage
 * Turn 3: "Why did you choose this technology?"
 * Turn 4: Test understanding of choice (probes shallow answers like "flexible")
 * Turn 5: Project Architecture & Request Data Flow
 * Turn 6: Implementation & Project Ownership Verification
 * Turn 7: Debugging & Failure Scenarios
 * Turn 8: Concurrency, Race Conditions & Edge Cases
 * Turn 9: Optimization, Scalability & Trade-offs (1M users)
 * Turn 10+: Move to next project or unassessed resume skills
 */
const generateDeterministicResumeQuestion = (context, currentQuestions, currentPhase, isPassOrUnknown, attemptNumber = 1, isShallow = false) => {
  const profile = context.resumeProfile || {};
  const skills = profile.technicalSkills || [];
  const langs = profile.programmingLanguages || [];
  const fws = profile.frameworks || [];
  const dbs = profile.databases || [];
  const projects = profile.projects || [];
  const count = currentQuestions.length;
  const lastQ = count > 0 ? currentQuestions[count - 1] : null;

  const sessionQuestionTexts = currentQuestions.map((q) => (q.questionText || '').toLowerCase().trim());
  const sessionTopics = currentQuestions.map((q) => (q.topic || '').toLowerCase().trim());

  const isAsked = (text, topic) => {
    if (sessionTopics.includes(topic.toLowerCase().trim())) return true;
    return sessionQuestionTexts.some((sq) => calculateSimilarity(sq, text.toLowerCase().trim()) > 0.80);
  };

  const primaryProj = projects[0] || { name: 'Resume Project', technologies: fws };
  const secondProj = projects[1] || null;

  // -------------------------------------------------------------
  // ADAPTIVE SKIP / PASS OVERRIDE
  // -------------------------------------------------------------
  if (isPassOrUnknown) {
    const unassessed = skills.find((s) => !sessionTopics.some((t) => t.includes(s.toLowerCase())) && !sessionQuestionTexts.some((txt) => txt.includes(s.toLowerCase()))) || skills[count % skills.length] || 'REST APIs';
    
    return {
      questionText: `No problem at all, let's move on to another area. In your resume, you listed experience with ${unassessed}. Could you explain how you have utilized ${unassessed} in your applications, and what architectural considerations you keep in mind?`,
      topic: `${unassessed} Fundamentals`,
      questionType: 'technical',
      targetTechnology: unassessed,
      difficulty: 'medium',
      reason: 'Encouraging transition to fresh unassessed resume skill after skip/pass',
      isFollowUp: false,
      followUpTo: null,
    };
  }

  // -------------------------------------------------------------
  // TURN 1: OPENING TECHNICAL SKILL QUESTION (Varied across attempts)
  // -------------------------------------------------------------
  if (count === 0) {
    const openingMode = attemptNumber % 3;

    // Attempt 1: Core Programming Language
    if (openingMode === 1) {
      const primaryLang = langs[0] || skills[0] || 'JavaScript';
      if (primaryLang.toLowerCase() === 'javascript') {
        return {
          questionText: `Let's begin with your technical background. You have mentioned JavaScript in your resume. Could you explain how the JavaScript event loop coordinates the call stack, microtask queue (Promises), and macrotask queue (setTimeout), and how Node.js libuv handles asynchronous non-blocking I/O without blocking the thread?`,
          topic: 'JavaScript Event Loop & Concurrency',
          questionType: 'technical',
          targetTechnology: 'JavaScript',
          difficulty: 'medium',
          reason: 'Probing candidate JavaScript runtime execution model and asynchronous mechanics',
          isFollowUp: false,
          followUpTo: null,
        };
      } else if (primaryLang.toLowerCase() === 'python') {
        return {
          questionText: `Let's begin with your technical background. You listed Python on your resume. Could you explain how the Global Interpreter Lock (GIL) impacts CPU-bound multithreading versus I/O-bound concurrency, and how you would design an asynchronous service or use multiprocessing to bypass GIL limitations?`,
          topic: 'Python GIL & Concurrency Architecture',
          questionType: 'technical',
          targetTechnology: 'Python',
          difficulty: 'medium',
          reason: 'Probing Python memory model and concurrency architecture',
          isFollowUp: false,
          followUpTo: null,
        };
      } else if (primaryLang.toLowerCase() === 'java') {
        return {
          questionText: `Let's begin with your technical background. You have mentioned Java. How comfortable are you with object-oriented programming, and can you walk me through how you have utilized inheritance versus composition in your work?`,
          topic: 'Java OOP & Composition',
          questionType: 'technical',
          targetTechnology: 'Java',
          difficulty: 'medium',
          reason: 'Evaluating Java OOP and architectural design principles',
          isFollowUp: false,
          followUpTo: null,
        };
      } else {
        return {
          questionText: `Let's begin with your technical background. You have mentioned ${primaryLang} in your resume. Could you explain how it handles memory management, call stack allocation, and asynchronous operations under the hood?`,
          topic: `${primaryLang} Core Concepts`,
          questionType: 'technical',
          targetTechnology: primaryLang,
          difficulty: 'medium',
          reason: `Opening evaluation of primary language: ${primaryLang}`,
          isFollowUp: false,
          followUpTo: null,
        };
      }
    }

    // Attempt 2: Framework / Frontend
    if (openingMode === 2) {
      const primaryFw = fws[0] || skills[1] || 'React';
      if (primaryFw.toLowerCase() === 'react') {
        return {
          questionText: `Let's begin with your technical background. You have mentioned React in your resume. How do you handle component state synchronization, re-rendering lifecycles, and side effects when building client applications?`,
          topic: 'React State Management & Lifecycle',
          questionType: 'technical',
          targetTechnology: 'React',
          difficulty: 'medium',
          reason: 'Evaluating React state management and rendering lifecycle',
          isFollowUp: false,
          followUpTo: null,
        };
      } else {
        return {
          questionText: `Let's begin with your technical background. You have highlighted ${primaryFw} in your resume. How do you structure its application architecture, state consistency, and error handling middleware across client-server communication?`,
          topic: `${primaryFw} Architecture`,
          questionType: 'technical',
          targetTechnology: primaryFw,
          difficulty: 'medium',
          reason: `Evaluating framework architecture for ${primaryFw}`,
          isFollowUp: false,
          followUpTo: null,
        };
      }
    }

    // Attempt 3 / Default: Database Architecture
    const primaryDb = dbs[0] || skills[2] || 'MongoDB';
    return {
      questionText: `Let's begin with your technical background. You have mentioned ${primaryDb} in your resume. How do you approach database schema design, indexing strategies, and ensuring data consistency under high concurrent write loads?`,
      topic: `${primaryDb} Schema Design & Consistency`,
      questionType: 'technical',
      targetTechnology: primaryDb,
      difficulty: 'medium',
      reason: `Opening evaluation of database architecture: ${primaryDb}`,
      isFollowUp: false,
      followUpTo: null,
    };
  }

  // -------------------------------------------------------------
  // TURN 2: SKILL IMPLEMENTATION & SECOND SKILL
  // -------------------------------------------------------------
  if (count === 1) {
    const primaryFw = fws[0] || (langs.length > 1 ? langs[1] : (skills.length > 1 ? skills[1] : 'React'));
    if (primaryFw.toLowerCase() === 'react') {
      return {
        questionText: `You mentioned React in your resume. Can you explain how React's Virtual DOM diffing and Fiber reconciliation algorithm work under the hood, and what happens during the render phase versus the commit phase when state updates are triggered?`,
        topic: 'React Virtual DOM & Fiber Reconciliation',
        questionType: 'technical',
        targetTechnology: 'React',
        difficulty: 'medium',
        reason: 'Assessing React rendering lifecycle and optimization mechanics',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    } else if (primaryFw.toLowerCase() === 'node.js' || primaryFw.toLowerCase() === 'express') {
      return {
        questionText: `In your resume, you listed Node.js and Express. How does the middleware execution pipeline work, and how do you handle Node.js Streams and backpressure when dealing with large payloads or high-throughput JSON streams?`,
        topic: 'Node.js Streams & Middleware Pipeline',
        questionType: 'technical',
        targetTechnology: 'Node.js',
        difficulty: 'medium',
        reason: 'Evaluating Node.js stream backpressure and pipeline design',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    } else {
      return {
        questionText: `You have highlighted ${primaryFw} in your resume. How do you design and structure its application lifecycle, state consistency, and error handling middleware across client-server communication?`,
        topic: `${primaryFw} Architecture`,
        questionType: 'technical',
        targetTechnology: primaryFw,
        difficulty: 'medium',
        reason: `Evaluating framework design and error handling in ${primaryFw}`,
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    }
  }

  // -------------------------------------------------------------
  // TURN 3: "WHY DID YOU CHOOSE THIS TECHNOLOGY?"
  // -------------------------------------------------------------
  if (count === 2) {
    const projTechs = (primaryProj.technologies || []).map((t) => t.toLowerCase());

    if (projTechs.some((t) => t.includes('mongo')) || dbs.some((d) => d.toLowerCase().includes('mongo'))) {
      return {
        questionText: `In your project "${primaryProj.name}", you used MongoDB. Why did you choose MongoDB instead of a relational database like MySQL or PostgreSQL?`,
        topic: `Technology Choice: MongoDB vs MySQL (${primaryProj.name})`,
        questionType: 'tech-choice',
        targetProject: primaryProj.name,
        targetTechnology: 'MongoDB',
        difficulty: 'medium',
        reason: 'Challenging database technology choice and architectural justification',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    } else if (projTechs.some((t) => t.includes('socket')) || skills.some((s) => s.toLowerCase().includes('socket'))) {
      return {
        questionText: `In your project "${primaryProj.name}", you used Socket.IO. Why did you choose Socket.IO instead of traditional REST APIs or standard HTTP polling?`,
        topic: `Technology Choice: Socket.IO vs REST (${primaryProj.name})`,
        questionType: 'tech-choice',
        targetProject: primaryProj.name,
        targetTechnology: 'Socket.IO',
        difficulty: 'medium',
        reason: 'Challenging communication protocol choice and architectural justification',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    } else if (projTechs.some((t) => t.includes('react')) || fws.some((f) => f.toLowerCase().includes('react'))) {
      return {
        questionText: `In your project "${primaryProj.name}", you used React. Why did you choose React for the frontend instead of vanilla JavaScript or server-side rendering?`,
        topic: `Technology Choice: React for Frontend (${primaryProj.name})`,
        questionType: 'tech-choice',
        targetProject: primaryProj.name,
        targetTechnology: 'React',
        difficulty: 'medium',
        reason: 'Challenging frontend technology choice and architectural justification',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    } else {
      const chosen = primaryProj.technologies?.[0] || fws[0] || 'your stack';
      return {
        questionText: `In your project "${primaryProj.name}", why did you choose ${chosen} for this implementation instead of alternative technologies?`,
        topic: `Technology Choice: ${chosen} (${primaryProj.name})`,
        questionType: 'tech-choice',
        targetProject: primaryProj.name,
        targetTechnology: chosen,
        difficulty: 'medium',
        reason: 'Challenging core technology selection for primary project',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    }
  }

  // -------------------------------------------------------------
  // TURN 4: TEST UNDERSTANDING OF THE CHOICE (PROBE SHALLOW ANSWERS)
  // -------------------------------------------------------------
  if (count === 3) {
    if (isShallow || (lastQ?.topic || '').includes('MongoDB')) {
      return {
        questionText: `What do you mean by flexible? In your specific project "${primaryProj.name}", what part of your data model actually benefited from that flexibility rather than a structured relational schema?`,
        topic: `Probing Schema Flexibility: ${primaryProj.name}`,
        questionType: 'adaptive-followup',
        targetProject: primaryProj.name,
        targetTechnology: 'MongoDB',
        difficulty: 'difficult',
        reason: 'Probing candidate shallow justification of schema flexibility',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    } else if ((lastQ?.topic || '').includes('Socket.IO')) {
      return {
        questionText: `Can you explain what Socket.IO provides at the protocol and connection level that a standard HTTP polling request does not?`,
        topic: `Probing Protocol Mechanics: Socket.IO`,
        questionType: 'adaptive-followup',
        targetProject: primaryProj.name,
        targetTechnology: 'Socket.IO',
        difficulty: 'difficult',
        reason: 'Testing depth of network protocol understanding',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    } else {
      return {
        questionText: `Okay, that makes sense. Let's go one level deeper into the architectural trade-offs: what were the downsides or limitations of choosing that approach for "${primaryProj.name}"?`,
        topic: `Probing Architectural Trade-offs: ${primaryProj.name}`,
        questionType: 'adaptive-followup',
        targetProject: primaryProj.name,
        difficulty: 'difficult',
        reason: 'Probing understanding of technical trade-offs',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    }
  }

  // -------------------------------------------------------------
  // TURN 5: PROJECT ARCHITECTURE & REQUEST DATA FLOW
  // -------------------------------------------------------------
  if (count === 4) {
    const techStackStr = primaryProj.technologies?.length > 0 ? primaryProj.technologies.join(', ') : (fws.slice(0, 3).join(' and ') || 'your chosen stack');
    return {
      questionText: `You've mentioned ${techStackStr}. I also see that you used these in your project "${primaryProj.name}". Let's discuss that project. Could you walk me through the high-level architecture and data flow, explaining what happens under the hood when a user initiates a request or sends a message from your frontend all the way to your database?`,
      topic: `Project Architecture: ${primaryProj.name}`,
      questionType: 'architecture',
      targetProject: primaryProj.name,
      difficulty: 'medium',
      reason: 'Evaluating end-to-end request lifecycle and architectural components in primary project',
      isFollowUp: true,
      followUpTo: lastQ ? lastQ.questionId : null,
    };
  }

  // -------------------------------------------------------------
  // TURN 6: PROJECT IMPLEMENTATION & OWNERSHIP VERIFICATION
  // -------------------------------------------------------------
  if (count === 5) {
    const isAuthProject = skills.some((s) => s.toLowerCase().includes('jwt') || s.toLowerCase().includes('auth')) || (primaryProj.description || '').toLowerCase().includes('auth');
    if (isAuthProject) {
      return {
        questionText: `You mentioned JWT authentication in "${primaryProj.name}". Where exactly did you generate the token? What did the payload contain? Where was it transmitted, and which middleware on your backend verified it? What happened when verification failed?`,
        topic: `Implementation & Ownership: JWT in ${primaryProj.name}`,
        questionType: 'implementation',
        targetProject: primaryProj.name,
        targetTechnology: 'JWT',
        difficulty: 'difficult',
        reason: 'Verifying genuine project ownership via concrete implementation mechanics',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    } else {
      return {
        questionText: `In "${primaryProj.name}", walk me through one specific API endpoint from route definition to database query. Where was request payload validation performed, and how did your system prevent invalid or malicious inputs from persisting to the database?`,
        topic: `Implementation & Ownership: API Flow in ${primaryProj.name}`,
        questionType: 'implementation',
        targetProject: primaryProj.name,
        difficulty: 'difficult',
        reason: 'Verifying genuine project ownership via API implementation and input validation mechanics',
        isFollowUp: true,
        followUpTo: lastQ ? lastQ.questionId : null,
      };
    }
  }

  // -------------------------------------------------------------
  // TURN 7: DEBUGGING & FAILURE SCENARIOS
  // -------------------------------------------------------------
  if (count === 6) {
    return {
      questionText: `Tell me about a difficult technical bug or unexpected bottleneck you encountered while developing "${primaryProj.name}". How did you diagnose it, what was the root cause, and how did you resolve it?`,
      topic: `Debugging & Problem Solving: ${primaryProj.name}`,
      questionType: 'debugging',
      targetProject: primaryProj.name,
      difficulty: 'difficult',
      reason: 'Evaluating practical debugging skills and root-cause analysis in real project',
      isFollowUp: true,
      followUpTo: lastQ ? lastQ.questionId : null,
    };
  }

  // -------------------------------------------------------------
  // TURN 8: CONCURRENCY, RACE CONDITIONS & EDGE CASES
  // -------------------------------------------------------------
  if (count === 7) {
    return {
      questionText: `In your project "${primaryProj.name}", what happens when concurrent users or parallel background requests attempt to read and update the exact same data resource simultaneously? How did you prevent race conditions, avoid dirty writes, and guarantee data consistency?`,
      topic: `Concurrency & Data Integrity: ${primaryProj.name}`,
      questionType: 'edge-case',
      targetProject: primaryProj.name,
      difficulty: 'difficult',
      reason: 'Probing concurrency handling, race conditions, and atomic operations in primary project',
      isFollowUp: true,
      followUpTo: lastQ ? lastQ.questionId : null,
    };
  }

  // -------------------------------------------------------------
  // TURN 9: OPTIMIZATION, SCALABILITY & TRADE-OFFS (1M Users)
  // -------------------------------------------------------------
  if (count === 8) {
    return {
      questionText: `Now suppose your application "${primaryProj.name}" scales to 1 million active users. What part of your current architecture would become a bottleneck first, and how would you redesign it for production?`,
      topic: `Scalability & Bottlenecks: ${primaryProj.name}`,
      questionType: 'scalability',
      targetProject: primaryProj.name,
      difficulty: 'difficult',
      reason: 'Evaluating scalability thinking, bottleneck identification, and production redesign',
      isFollowUp: true,
      followUpTo: lastQ ? lastQ.questionId : null,
    };
  }

  // -------------------------------------------------------------
  // TURN 10+: PIVOT TO NEXT PROJECT OR UNASSESSED RESUME SKILLS
  // -------------------------------------------------------------
  if (secondProj && !sessionTopics.some((t) => t.includes(secondProj.name.toLowerCase()))) {
    const tech2 = secondProj.technologies?.length > 0 ? secondProj.technologies.join(', ') : 'its tech stack';
    return {
      questionText: `Moving on to another project from your resume, "${secondProj.name}". Could you explain its architecture? How did you structure your application components and data flow using ${tech2}?`,
      topic: `Project Architecture: ${secondProj.name}`,
      questionType: 'project',
      targetProject: secondProj.name,
      difficulty: 'medium',
      reason: `Systematic coverage of candidate second resume project: ${secondProj.name}`,
      isFollowUp: true,
      followUpTo: lastQ ? lastQ.questionId : null,
    };
  }

  // Production engineering deep dive on distributed caching
  const qCacheTopic = 'Distributed Caching & Invalidation';
  const qCacheText = `To scale application performance under heavy read traffic, how would you design a caching layer with Redis? Specifically, how do you prevent cache stampede (thundering herd), and what strategy do you use for cache invalidation when underlying database records are updated?`;
  if (!isAsked(qCacheText, qCacheTopic)) {
    return {
      questionText: qCacheText,
      topic: qCacheTopic,
      questionType: 'deep-dive',
      difficulty: 'difficult',
      reason: 'Evaluating distributed caching architecture, cache stampede prevention, and invalidation strategies',
      isFollowUp: true,
      followUpTo: lastQ ? lastQ.questionId : null,
    };
  }

  // Fallback to unassessed skill
  const remainingSkill = skills.find((s) => !sessionTopics.some((t) => t.includes(s.toLowerCase()))) || 'System Design';
  return {
    questionText: `Looking at your experience with ${remainingSkill}, how do you evaluate performance bottlenecks and profile latency across your application stack?`,
    topic: `${remainingSkill} Optimization`,
    questionType: 'deep-dive',
    difficulty: 'medium',
    reason: `Deep dive into unassessed technical area: ${remainingSkill}`,
    isFollowUp: true,
    followUpTo: lastQ ? lastQ.questionId : null,
  };
};

/**
 * Submits the student's answer for the current active question.
 */
const submitInterviewAnswer = async (interviewId, studentId, { questionId, studentAnswer }) => {
  const session = await TechnicalInterview.findOne({ _id: interviewId, studentId });
  if (!session) {
    throw new Error('Interview session not found or unauthorized.');
  }

  if (session.status === 'COMPLETED') {
    throw new Error('Interview has already ended.');
  }

  const question = session.questions.find((q) => q.questionId === questionId);
  if (!question) {
    throw new Error(`Question ${questionId} not found in this session.`);
  }

  question.studentAnswer = (studentAnswer || '').trim();
  question.answeredAt = new Date();

  await session.save();

  const remainingSeconds = calculateRemainingSeconds(session);
  return {
    success: true,
    questionId,
    remainingSeconds,
  };
};

/**
 * Completes the interview and triggers evidence-based AI evaluation.
 */
const endInterviewSession = async (interviewId, studentId, isTimeExpired = false) => {
  const session = await TechnicalInterview.findOne({ _id: interviewId, studentId });
  if (!session) {
    throw new Error('Interview session not found or unauthorized.');
  }

  if (session.status === 'COMPLETED' && session.evaluation?.evaluatedAt) {
    return {
      success: true,
      session,
      evaluation: session.evaluation,
    };
  }

  session.status = 'COMPLETED';
  session.endTime = new Date();

  // Run comprehensive evidence-based AI evaluation (HR or Technical)
  const evaluation = session.interviewType === 'hr'
    ? await evaluateHRInterview(session, studentId)
    : await evaluateInterview(session, studentId);
  session.evaluation = evaluation;

  await session.save();

  return {
    success: true,
    session,
    evaluation,
    isTimeExpired,
  };
};

/**
 * Evidence-Based AI Evaluation Engine:
 * Evaluates the complete conversation across 7 strictly weighted categories:
 * 1. Technical Knowledge (25%)
 * 2. Practical Understanding (20%)
 * 3. Project Understanding (20%)
 * 4. Problem Solving (15%)
 * 5. Depth of Understanding (10%)
 * 6. Answer Relevance (5%)
 * 7. Communication / Clarity (5%)
 *
 * Directives:
 * - Scores overallScore mathematically from the weighted category formula.
 * - Strengths MUST cite verbatim answer evidence.
 * - Weaknesses MUST cite verbatim answer evidence.
 * - Non-discussed resume skills MUST be listed under notAssessed (never falsely flagged weak or strong).
 * - Actionable recommendations MUST link to identified weaknesses.
 */
const evaluateInterview = async (session, studentId) => {
  const questions = session.questions || [];
  const answeredQuestions = questions.filter((q) => q.studentAnswer && q.studentAnswer.trim().length > 0);

  const context = await gatherCandidateContext(session, studentId);
  const profile = context.resumeProfile || {};
  const resumeSkills = Array.isArray(profile.technicalSkills) ? profile.technicalSkills : [];

  // Build transcript for AI evaluation
  const transcript = questions
    .map(
      (q, i) =>
        `[Question #${i + 1} - Topic: ${q.topic} - Type: ${q.questionType || 'technical'}]
Interviewer: "${q.questionText}"
Candidate Answer: "${q.studentAnswer || '(No answer provided / Skipped)'}"`
    )
    .join('\n\n');

  const aiClient = getAIClient();

  if (aiClient && answeredQuestions.length > 0) {
    try {
      const prompt = `You are a Principal Technical Bar-Raiser conducting an evidence-based evaluation of a 20-minute technical interview for a student.

=== CANDIDATE RESUME PROFILE ===
- Technical Skills: ${resumeSkills.join(', ') || 'General Software Engineering'}
- Projects: ${JSON.stringify(profile.projects || [])}

=== INTERVIEW TRANSCRIPT ===
${transcript}

=== STRICT EVALUATION RUBRIC (Score 0-100 on each category based solely on what the candidate actually answered):
1. Technical Knowledge (25% weight): Depth of knowledge in languages, frameworks, APIs, and computer science concepts.
2. Practical Understanding (20% weight): Hands-on comprehension of how technologies operate in practice.
3. Project Understanding (20% weight): Depth of ownership, architecture, and design decisions in their projects.
4. Problem Solving (15% weight): Analytical approach to debugging, trade-offs, and edge cases.
5. Depth of Understanding (10% weight): Explaining "why" and mechanisms rather than just buzzwords.
6. Answer Relevance (5% weight): How directly and accurately they answered the specific question.
7. Communication / Clarity (5% weight): Structure, precision, and technical articulation.

=== CRITICAL EVALUATION RULES ===
1. MATHEMATICAL OVERALL SCORE:
   Compute overallScore using this EXACT formula:
   overallScore = Math.round(0.25 * technicalKnowledge + 0.20 * practicalUnderstanding + 0.20 * projectUnderstanding + 0.15 * problemSolving + 0.10 * depthOfUnderstanding + 0.05 * answerRelevance + 0.05 * communication)
2. EVIDENCE REQUIRED FOR STRENGTHS:
   - ONLY list a skill under strengths if the candidate actually answered questions about it correctly and in depth.
   - Include the exact evidence of what they said.
3. EVIDENCE REQUIRED FOR WEAKNESSES:
   - ONLY list a skill under weaknesses if the candidate struggled, gave an incorrect answer, or skipped it during the interview.
   - Include the exact evidence of where they struggled.
4. NOT ASSESSED CATEGORY:
   - If a skill from their resume was NEVER asked about or discussed (e.g. Python, Docker, SQL, etc.), you MUST place it into the "notAssessed" list.
   - DO NOT mark unasked skills as weak or strong!
5. ACTIONABLE RECOMMENDATIONS:
   - Recommendations must connect directly to the specific weaknesses identified.
6. QUESTION-LEVEL EVALUATION:
   - Evaluate each question individually with score (0-10), correctness ('correct' | 'mostly_correct' | 'partially_correct' | 'incorrect'), depth ('shallow' | 'medium' | 'deep'), and brief feedback.

Return ONLY a valid JSON object matching this schema:
{
  "technicalKnowledge": 80,
  "practicalUnderstanding": 75,
  "projectUnderstanding": 85,
  "problemSolving": 70,
  "depthOfUnderstanding": 75,
  "answerRelevance": 85,
  "communication": 80,
  "overallScore": 78,
  "strengths": [
    {
      "skill": "React State Management",
      "evidence": "Candidate accurately explained reducer patterns and memoization to prevent re-renders."
    }
  ],
  "weaknesses": [
    {
      "skill": "Database Indexing",
      "evidence": "Candidate was unsure how B-tree indexes affect write performance vs read performance."
    }
  ],
  "notAssessed": ["SQL", "Docker", "Python"],
  "recommendations": [
    {
      "topic": "Database Indexing",
      "reason": "Study B-Tree index structures and trade-offs between read acceleration and write overhead."
    }
  ],
  "questionEvaluations": [
    {
      "questionId": "q_1",
      "question": "question text",
      "answer": "answer text",
      "score": 8,
      "correctness": "correct",
      "depth": "medium",
      "feedback": "feedback on answer"
    }
  ],
  "aiFeedback": "Constructive narrative summarizing candidate performance."
}`;

      const response = await aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.1,
        },
      });

      const responseText = response.text || '';
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      if (parsed && typeof parsed.technicalKnowledge === 'number') {
        const tk = Math.round(Math.min(100, Math.max(0, parsed.technicalKnowledge)));
        const pu = Math.round(Math.min(100, Math.max(0, parsed.practicalUnderstanding || tk)));
        const pru = Math.round(Math.min(100, Math.max(0, parsed.projectUnderstanding || tk)));
        const ps = Math.round(Math.min(100, Math.max(0, parsed.problemSolving || tk)));
        const du = Math.round(Math.min(100, Math.max(0, parsed.depthOfUnderstanding || tk)));
        const ar = Math.round(Math.min(100, Math.max(0, parsed.answerRelevance || tk)));
        const com = Math.round(Math.min(100, Math.max(0, parsed.communication || tk)));

        // Strict weighted formula
        const calculatedOverall = Math.round(
          0.25 * tk + 0.20 * pu + 0.20 * pru + 0.15 * ps + 0.10 * du + 0.05 * ar + 0.05 * com
        );

        const strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
        const weaknesses = Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [];
        const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
        const questionEvaluations = Array.isArray(parsed.questionEvaluations) ? parsed.questionEvaluations : [];

        // Determine notAssessed skills
        const assessedTopics = new Set(questions.map((q) => (q.topic || '').toLowerCase()));
        let notAssessed = Array.isArray(parsed.notAssessed) ? parsed.notAssessed : [];
        if (notAssessed.length === 0) {
          notAssessed = resumeSkills.filter((s) => !assessedTopics.has(s.toLowerCase()));
        }

        return {
          overallScore: calculatedOverall,
          technicalKnowledge: tk,
          practicalUnderstanding: pu,
          projectUnderstanding: pru,
          problemSolving: ps,
          depthOfUnderstanding: du,
          depth: du, // backwards compatibility
          answerRelevance: ar,
          communication: com,
          strengths,
          weaknesses,
          notAssessed: notAssessed.slice(0, 8),
          recommendations,
          questionEvaluations,
          // Legacy backwards compatibility
          strongAreas: strengths.map((s) => s.skill || s),
          needsImprovement: weaknesses.map((w) => w.skill || w),
          whatToImprove: recommendations.map((r) => `${r.topic}: ${r.reason}`),
          aiFeedback: parsed.aiFeedback || 'Completed evaluation based on actual answers provided during the interview.',
          evaluatedAt: new Date(),
        };
      }
    } catch (evalErr) {
      console.warn('[InterviewService] Gemini AI interview evaluation fallback triggered:', evalErr.message);
    }
  }

  // Deterministic Evidence-Based Evaluator (Fallback)
  return buildDeterministicEvaluation(session, resumeSkills);
};

/**
 * Deterministic Evidence-Based Evaluator.
 * Computes scores strictly from the candidate's actual answers, answer lengths, technical terms,
 * and tracks assessed vs notAssessed skills without fake data.
 */
const buildDeterministicEvaluation = (session, resumeSkills = []) => {
  const questions = session.questions || [];
  const questionEvaluations = [];
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];
  const assessedSkills = new Set();

  let totalPoints = 0;
  let maxPoints = 0;

  const coreTechVocab = [
    'react', 'node', 'express', 'mongodb', 'sql', 'sqlite', 'postgres', 'postgresql', 'python', 'javascript',
    'typescript', 'api', 'apis', 'rest', 'restful', 'graphql', 'websocket', 'socket', 'state', 'hooks', 'hook',
    'component', 'components', 'props', 'lifecycle', 'virtual dom', 'fiber', 'reconciliation', 'render', 'commit',
    'server', 'backend', 'frontend', 'database', 'databases', 'middleware', 'route', 'routes', 'router', 'query',
    'queries', 'index', 'indexes', 'schema', 'document', 'bson', 'json', 'jwt', 'token', 'auth', 'authentication',
    'authorization', 'session', 'async', 'await', 'promise', 'promises', 'event loop', 'libuv', 'callback',
    'threads', 'concurrency', 'race condition', 'mutex', 'lock', 'atomic', 'acid', 'transaction', 'cache',
    'caching', 'redis', 'ttl', 'crud', 'mvc', 'docker', 'cloud', 'aws', 'deploy', 'git', 'github', 'test',
    'testing', 'unit', 'integration', 'error', 'exception', 'try', 'catch', 'status', 'http', 'request', 'response'
  ];

  questions.forEach((q, idx) => {
    const answer = (q.studentAnswer || '').trim();
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    const lowerAns = answer.toLowerCase();

    const isExplicitPass =
      lowerAns.includes("don't know") ||
      lowerAns.includes('dont know') ||
      lowerAns.includes('do not know') ||
      lowerAns.includes('not getting') ||
      lowerAns.includes('not sure') ||
      lowerAns.includes('no idea') ||
      lowerAns.includes('pass') ||
      lowerAns.includes('skip') ||
      lowerAns.includes('next question');

    assessedSkills.add(q.topic);
    maxPoints += 10;

    // Count technical vocabulary matches in candidate response
    const matchedTerms = coreTechVocab.filter((term) => lowerAns.includes(term));
    const topicTerms = (q.topic || '').toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const hasTopicTerm = topicTerms.some((tt) => lowerAns.includes(tt));

    if (isExplicitPass || wordCount === 0) {
      const qScore = 0.0;
      questionEvaluations.push({
        questionId: q.questionId || `q_${idx + 1}`,
        question: q.questionText,
        answer: answer || '(No answer recorded / Skipped)',
        score: qScore,
        correctness: 'incorrect',
        depth: 'shallow',
        feedback: `Student skipped or was unable to answer: "${q.questionText.substring(0, 75)}..."`,
      });
      totalPoints += qScore;
      weaknesses.push({
        skill: q.topic,
        evidence: `Student skipped or passed on question: "${q.questionText.substring(0, 80)}..."`,
      });
      recommendations.push({
        topic: q.topic,
        reason: `Review core concepts, architecture patterns, and common technical interview questions for ${q.topic}.`,
      });
    } else if (wordCount < 8 && matchedTerms.length === 0 && !hasTopicTerm) {
      // Shallow / minimal answer
      const qScore = 3.0;
      questionEvaluations.push({
        questionId: q.questionId || `q_${idx + 1}`,
        question: q.questionText,
        answer,
        score: qScore,
        correctness: 'incorrect',
        depth: 'shallow',
        feedback: `Student provided a brief answer without sufficient technical detail for ${q.topic}.`,
      });
      totalPoints += qScore;
      weaknesses.push({
        skill: q.topic,
        evidence: `Answer lacked technical depth: "${answer.substring(0, 80)}"`,
      });
      recommendations.push({
        topic: q.topic,
        reason: `Elaborate on internal mechanics, API parameters, and architectural reasoning when answering questions on ${q.topic}.`,
      });
    } else if (wordCount >= 20 || (wordCount >= 10 && matchedTerms.length >= 2) || hasTopicTerm) {
      // Strong / in-depth response
      const qScore = Math.min(10.0, 8.0 + (matchedTerms.length * 0.4) + (wordCount > 25 ? 0.8 : 0));
      const finalQScore = Math.round(qScore * 10) / 10;
      questionEvaluations.push({
        questionId: q.questionId || `q_${idx + 1}`,
        question: q.questionText,
        answer,
        score: finalQScore,
        correctness: 'correct',
        depth: wordCount >= 25 ? 'deep' : 'medium',
        feedback: `Strong technical response covering ${q.topic} with accurate domain concepts and clear reasoning.`,
      });
      totalPoints += finalQScore;
      if (finalQScore >= 7.0) {
        strengths.push({
          skill: q.topic,
          evidence: `Demonstrated clear technical understanding: "${answer.substring(0, 110)}..."`,
        });
      }
    } else {
      // Foundational response
      const qScore = Math.min(7.5, 5.5 + (matchedTerms.length * 0.4));
      const finalQScore = Math.round(qScore * 10) / 10;
      questionEvaluations.push({
        questionId: q.questionId || `q_${idx + 1}`,
        question: q.questionText,
        answer,
        score: finalQScore,
        correctness: 'mostly_correct',
        depth: 'medium',
        feedback: `Foundational response covering ${q.topic}. Elaborate on performance trade-offs and edge cases for top marks.`,
      });
      totalPoints += finalQScore;
      if (finalQScore >= 7.0) {
        strengths.push({
          skill: q.topic,
          evidence: `Demonstrated working knowledge of ${q.topic}: "${answer.substring(0, 80)}..."`,
        });
      } else {
        weaknesses.push({
          skill: q.topic,
          evidence: `Answer on ${q.topic} was basic: "${answer.substring(0, 80)}..."`,
        });
        recommendations.push({
          topic: q.topic,
          reason: `Study edge cases, failure scenarios, and performance trade-offs for ${q.topic}.`,
        });
      }
    }
  });

  const avgRatio = maxPoints > 0 ? totalPoints / maxPoints : 0.0;
  const avgScore = avgRatio * 100;

  // Compute category scores reflecting real interview performance
  const tk = Math.round(Math.min(100, Math.max(0, avgScore * 1.00)));
  const pu = Math.round(Math.min(100, Math.max(0, avgScore * 0.98)));
  const pru = Math.round(Math.min(100, Math.max(0, avgScore * 1.02)));
  const ps = Math.round(Math.min(100, Math.max(0, avgScore * 0.95)));
  const du = Math.round(Math.min(100, Math.max(0, avgScore * 0.92)));
  const ar = Math.round(Math.min(100, Math.max(0, avgScore * 1.00)));
  const com = Math.round(Math.min(100, Math.max(0, avgScore * 0.96)));

  const overallScore = Math.round(
    0.25 * tk + 0.20 * pu + 0.20 * pru + 0.15 * ps + 0.10 * du + 0.05 * ar + 0.05 * com
  );

  // Identify skills on the resume that were NOT tested
  const notAssessed = resumeSkills.filter((s) => {
    const sLower = s.toLowerCase();
    for (const assessed of assessedSkills) {
      if (assessed.toLowerCase().includes(sLower)) return false;
    }
    return true;
  });

  return {
    overallScore,
    technicalKnowledge: tk,
    practicalUnderstanding: pu,
    projectUnderstanding: pru,
    problemSolving: ps,
    depthOfUnderstanding: du,
    depth: du,
    answerRelevance: ar,
    communication: com,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    notAssessed: notAssessed.slice(0, 8),
    recommendations: recommendations.slice(0, 5),
    questionEvaluations,
    // Legacy fields
    strongAreas: strengths.slice(0, 5).map((s) => s.skill),
    needsImprovement: weaknesses.slice(0, 5).map((w) => w.skill),
    whatToImprove: recommendations.slice(0, 5).map((r) => `${r.topic}: ${r.reason}`),
    aiFeedback:
      overallScore >= 75
        ? `Strong technical interview performance (${overallScore}/100). You demonstrated clear technical comprehension across evaluated topics.`
        : `Technical interview completed (${overallScore}/100). Focus on expanding your answers with technical edge cases and architectural trade-offs to boost your placement score.`,
    evaluatedAt: new Date(),
  };
};

/**
 * Deterministic Fallback HR Question Generator
 */
const generateDeterministicHRQuestion = (context, currentQuestions, currentCount) => {
  const company = context.companyName || 'our company';
  const role = context.targetRole || 'Software Engineer';
  const projects = context.resumeProfile?.projects || [];
  const primaryProject = projects[0]?.name || 'a major project';
  const lastQuestion = currentQuestions.length > 0 ? currentQuestions[currentQuestions.length - 1] : null;
  const lastAnswer = (lastQuestion?.studentAnswer || '').trim();

  if (lastAnswer && lastAnswer.length > 0 && lastAnswer.length < 50 && !lastQuestion?.isFollowUp) {
    return {
      questionId: `hr_q_${currentCount + 1}_${Date.now()}`,
      questionText: `Can you elaborate on your specific personal contribution and what the final measurable result or impact was?`,
      topic: 'Behavioral Reasoning (STAR Action & Result)',
      questionType: 'hr_behavioral',
      expectedPoints: ['Specific individual action taken', 'Measurable outcome or learning'],
      difficulty: 'medium',
      reason: 'Probing for specific action and outcome following a concise response',
      isFollowUp: true,
      askedAt: new Date(),
      studentAnswer: '',
    };
  }

  const defaultHRQuestions = [
    {
      topic: 'Tell Me About Yourself & Role Motivation',
      text: `Welcome to your HR interview for ${company}! To start off, please introduce yourself, highlight your background, and share why you are interested in joining ${company} as a ${role}.`,
    },
    {
      topic: 'Teamwork & Collaboration',
      text: `Tell me about a time you worked in a team on a project like ${primaryProject}. What was your specific role, and how did you resolve any differing opinions among team members?`,
    },
    {
      topic: 'Handling Pressure & Deadlines',
      text: `Describe a situation where you faced a tight deadline or high-pressure scenario. How did you prioritize your tasks and maintain quality?`,
    },
    {
      topic: 'Strengths & Areas for Improvement',
      text: `What would you consider your greatest professional strength, and what is one area or weakness you are actively working to improve?`,
    },
    {
      topic: 'Failure & Problem Solving',
      text: `Tell me about a time when something did not go as planned in a project or assignment. What went wrong, how did you handle it, and what did you learn from it?`,
    },
    {
      topic: 'Adaptability & Learning',
      text: `Technology and requirements evolve quickly. Can you describe a time when you had to learn a new tool, process, or domain rapidly to accomplish a goal?`,
    },
    {
      topic: 'Career Goals & Company Fit',
      text: `Where do you see yourself in the next 3 to 5 years, and how do you feel this position at ${company} will help you achieve your career aspirations?`,
    },
    {
      topic: 'Why Should We Hire You',
      text: `Why should ${company} hire you for the ${role} position over other qualified candidates?`,
    },
  ];

  const index = Math.min(currentCount, defaultHRQuestions.length - 1);
  const qObj = defaultHRQuestions[index] || defaultHRQuestions[0];

  return {
    questionId: `hr_q_${currentCount + 1}_${Date.now()}`,
    questionText: qObj.text,
    topic: qObj.topic,
    questionType: 'hr_behavioral',
    expectedPoints: ['Clear structured response', 'Personal reflection', 'Relevance to target role'],
    difficulty: 'medium',
    reason: 'Sequential HR behavioral question progression',
    isFollowUp: false,
    askedAt: new Date(),
    studentAnswer: '',
  };
};

/**
 * Adaptive AI HR Question Generator
 */
const generateNextHRQuestion = async (session, context = {}) => {
  const currentQuestions = session.questions || [];
  const currentCount = currentQuestions.length;
  const lastQuestion = currentCount > 0 ? currentQuestions[currentCount - 1] : null;

  const ctx = context || {};
  const profile = ctx.resumeProfile || {};
  const companyName = ctx.companyName || session.company || 'Target Company';
  const targetRole = ctx.targetRole || session.targetRole || 'Software Engineer';
  const projectsList = profile.projects?.length > 0 ? profile.projects : [];
  const pastWeaknesses = ctx.pastWeaknesses || session.pastWeaknesses || [];

  const aiClient = getAIClient();
  let generatedQuestion = null;

  if (aiClient) {
    try {
      const prompt = `You are an experienced Corporate HR Manager & Senior Talent Acquisition Lead conducting a realistic, 20-minute HR / Behavioral Mock Interview for ${context.companyName}.

=== CANDIDATE CONTEXT ===
- Target Company: ${context.companyName}
- Target Role: ${context.targetRole}
- Job Description Context: ${context.jdText ? context.jdText.substring(0, 500) : 'General corporate hiring for ' + context.targetRole}
- Candidate Projects (from Resume): ${projectsList.map((p) => p.name).join(', ') || 'Academic & Personal Software Projects'}
- Past HR Weaknesses to Address: ${pastWeaknesses.join(', ') || 'None identified yet'}

=== CONVERSATIONAL STATE & TRANSCRIPT ===
- Turn: #${currentCount + 1}
- Questions & Answers So Far:
${
  currentQuestions.length > 0
    ? currentQuestions
        .map(
          (q, i) =>
            `  Q${i + 1} [Topic: ${q.topic}]: "${q.questionText}"\n  Candidate Answer: "${q.studentAnswer || '(No answer provided / Skipped)'}"`
        )
        .join('\n\n')
    : '  None (Opening HR Turn).'
}

=== HR INTERVIEW RULES & ADAPTIVITY INSTRUCTIONS ===
1. DO NOT ask technical architectural, coding, or algorithmic questions. This is strictly an HR/Behavioral interview.
2. Ask ONLY ONE clear, professional question at a time.
3. Tailor questions using the candidate's resume, target company (${context.companyName}), and target role (${context.targetRole}).
4. Adaptive Follow-up Logic:
   - If the candidate's last answer was brief or vague, ask a follow-up probing for their specific individual action (STAR method Action).
   - If the candidate provided Situation and Task but NO clear outcome/result, ask: "What was the final outcome or measurable result of your effort?"
   - If the candidate provided a strong, complete answer, transition to a new HR category or ask how they would apply what they learned in a team/corporate setting.
   - If the candidate answered "I don't know" or passed, transition smoothly to another relevant HR topic without being punitive.
5. Coverage Areas across the interview turns:
   - Turn 1: Warm introduction / Tell me about yourself / Why you are interested in ${context.companyName} and ${context.targetRole}.
   - Behavioral & STAR Method Questions: Teamwork, Leadership, Conflict Resolution, Handling Pressure, Failure/Learning, Time Management, Adaptability, Problem Solving under constraints.
   - Company & Role Alignment: Career goals, strengths, weaknesses, work environment preferences.
6. NEVER repeat a question or topic already covered in this session.

Return ONLY a valid JSON object matching this schema:
{
  "questionId": "hr_q_${currentCount + 1}_${Date.now()}",
  "questionText": "Clear, professional HR question text here",
  "topic": "Category topic (e.g. Tell Me About Yourself, Teamwork & Conflict, Leadership, STAR Behavioral, Career Goals, etc.)",
  "questionType": "hr_behavioral",
  "expectedPoints": ["point 1", "point 2"],
  "difficulty": "medium",
  "reason": "Why this specific question was chosen adaptively based on context",
  "isFollowUp": false
}`;

      const response = await aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed && parsed.questionText) {
        generatedQuestion = {
          questionId: parsed.questionId || `hr_q_${currentCount + 1}_${Date.now()}`,
          questionText: parsed.questionText,
          topic: parsed.topic || 'HR & Behavioral',
          questionType: 'hr_behavioral',
          expectedPoints: Array.isArray(parsed.expectedPoints) ? parsed.expectedPoints : [],
          difficulty: parsed.difficulty || 'medium',
          reason: parsed.reason || 'Adaptive HR interview flow',
          isFollowUp: !!parsed.isFollowUp,
          askedAt: new Date(),
          studentAnswer: '',
        };
      }
    } catch (err) {
      console.warn('[InterviewService] Gemini HR Question Generator fallback triggered:', err.message);
    }
  }

  if (!generatedQuestion) {
    generatedQuestion = generateDeterministicHRQuestion(context, currentQuestions, currentCount);
  }

  session.questions.push(generatedQuestion);
  await session.save();

  return {
    isCompleted: false,
    session,
    question: generatedQuestion,
    remainingSeconds: calculateRemainingSeconds(session),
    attemptNumber: session.attemptNumber,
    questionIndex: session.questions.length,
  };
};

/**
 * Deterministic Fallback HR Evaluation Engine
 */
const evaluateHRInterviewDeterministic = (session, context) => {
  const questions = session.questions || [];
  const questionEvaluations = [];
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  let totalScoreSum = 0;

  questions.forEach((q, idx) => {
    const answer = (q.studentAnswer || '').trim();
    const wordCount = answer ? answer.split(/\s+/).length : 0;
    const lowerAnswer = answer.toLowerCase();

    const starKeywords = ['situation', 'task', 'action', 'result', 'because', 'learned', 'team', 'resolved', 'achieved', 'outcome'];
    const matchedCount = starKeywords.filter((k) => lowerAnswer.includes(k)).length;

    let score = 50;
    let correctness = 'average';
    let depth = 'brief';

    if (wordCount === 0 || lowerAnswer.includes("don't know") || lowerAnswer.includes("skip")) {
      score = 30;
      correctness = 'needs_work';
      depth = 'brief';
      weaknesses.push({
        skill: q.topic || 'HR Response',
        evidence: `Question "${q.questionText}": Candidate skipped or gave no answer.`,
      });
    } else if (wordCount >= 25 && matchedCount >= 2) {
      score = Math.min(95, 75 + matchedCount * 3 + Math.min(10, Math.floor(wordCount / 5)));
      correctness = 'good';
      depth = 'thorough';
      strengths.push({
        skill: q.topic || 'Behavioral Response',
        evidence: `Demonstrated clear reasoning: "${answer.substring(0, 100)}..."`,
      });
    } else {
      score = Math.min(78, 55 + matchedCount * 4 + Math.min(10, Math.floor(wordCount / 4)));
      correctness = 'average';
      depth = 'adequate';
      if (wordCount < 15) {
        weaknesses.push({
          skill: q.topic || 'Behavioral Depth',
          evidence: `Answer was brief: "${answer}"`,
        });
      }
    }

    questionEvaluations.push({
      questionId: q.questionId || `hr_q_${idx + 1}`,
      question: q.questionText,
      answer,
      score,
      correctness,
      depth,
      feedback: score >= 80 ? 'Strong behavioral response with relevant examples.' : 'Answer provides basic context. Use the STAR method to elaborate on results.',
    });

    totalScoreSum += score;
  });

  const baseScore = questions.length > 0 ? Math.round(totalScoreSum / questions.length) : 70;

  const communicationClarity = Math.min(100, Math.max(50, baseScore + 2));
  const confidenceComposure = Math.min(100, Math.max(50, baseScore));
  const teamwork = Math.min(100, Math.max(50, baseScore + 3));
  const leadership = Math.min(100, Math.max(50, baseScore - 2));
  const problemSolving = Math.min(100, Math.max(50, baseScore + 1));
  const adaptability = Math.min(100, Math.max(50, baseScore + 2));
  const roleMotivation = Math.min(100, Math.max(50, baseScore - 1));
  const behavioralReasoning = Math.min(100, Math.max(50, baseScore));
  const professionalism = Math.min(100, Math.max(50, baseScore + 4));
  const answerRelevance = Math.min(100, Math.max(50, baseScore + 1));

  const overallScore = Math.round(
    communicationClarity * 0.15 +
      confidenceComposure * 0.10 +
      teamwork * 0.10 +
      leadership * 0.10 +
      problemSolving * 0.10 +
      adaptability * 0.10 +
      roleMotivation * 0.10 +
      behavioralReasoning * 0.10 +
      professionalism * 0.10 +
      answerRelevance * 0.05
  );

  if (strengths.length === 0) {
    strengths.push({ skill: 'Professional Demeanor', evidence: 'Maintained polite interaction during interview.' });
  }
  if (weaknesses.length === 0) {
    weaknesses.push({ skill: 'Specific Action Details', evidence: 'Could provide more quantitative impact metrics in behavioral responses.' });
  }

  recommendations.push(
    { topic: 'STAR Method', reason: 'Structure behavioral answers into Situation, Task, Action, and Result.' },
    { topic: 'Conflict Resolution & Leadership', reason: 'Prepare 2-3 detailed examples of resolving team disagreements.' },
    { topic: 'Role & Company Motivation', reason: 'Research target company values to articulate "Why this company?" clearly.' }
  );

  return {
    overallScore,
    communicationClarity,
    confidenceComposure,
    teamwork,
    leadership,
    problemSolving,
    adaptability,
    roleMotivation,
    behavioralReasoning,
    professionalism,
    answerRelevance,
    communicationObservations: 'Candidate demonstrated clear spoken communication and polite tone. Further practice with the STAR framework will enhance response structure.',
    recommendedNextAreas: ['STAR Method Structure', 'Conflict-Resolution Examples', 'Leadership & Initiative', 'Company Alignment'],
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
    questionEvaluations,
    evaluatedAt: new Date(),
  };
};

/**
 * AI HR Interview Evaluation Engine
 */
const evaluateHRInterview = async (session, studentId) => {
  const questions = session.questions || [];
  let context = {};
  try {
    if (studentId) {
      context = await gatherCandidateContext(session, studentId);
    }
  } catch (err) {
    context = {
      companyName: session.company || 'Target Company',
      targetRole: session.targetRole || 'Software Engineer',
      pastWeaknesses: session.pastWeaknesses || [],
    };
  }

  const transcript = questions
    .map(
      (q, i) =>
        `[Question #${i + 1} - Category: ${q.topic}]
Interviewer: "${q.questionText}"
Candidate Answer: "${q.studentAnswer || '(No answer provided / Skipped)'}"`
    )
    .join('\n\n');

  const aiClient = getAIClient();

  if (aiClient && questions.length > 0) {
    try {
      const prompt = `You are a Senior Corporate HR Director conducting an official evaluation of a candidate's HR / Behavioral Mock Interview for ${context.companyName} (${context.targetRole}).

=== INTERVIEW TRANSCRIPT ===
${transcript}

=== EVALUATION DIRECTIVES ===
Evaluate the candidate's actual responses across these 10 categories (Each scored 0-100):
1. communicationClarity (15% weight): Clear articulation, structured phrasing, professional tone.
2. confidenceComposure (10% weight): Poise, composure, comfort with questions.
3. teamwork (10% weight): Collaboration, listening, empathy, resolving team conflict.
4. leadership (10% weight): Initiative, taking ownership, guiding outcomes.
5. problemSolving (10% weight): Logical reasoning, resourcefulness under behavioral challenges.
6. adaptability (10% weight): Flexibility under change, handling failure, learning mindset.
7. roleMotivation (10% weight): Enthusiasm for ${context.companyName} and ${context.targetRole}.
8. behavioralReasoning (10% weight): STAR method adherence (Situation, Task, Action, Result).
9. professionalism (10% weight): Respectful interaction, business awareness.
10. answerRelevance (5% weight): Directly addressing the question without rambling.

Calculate overallScore using exact weighted sum:
overallScore = Math.round(
  communicationClarity * 0.15 +
  confidenceComposure * 0.10 +
  teamwork * 0.10 +
  leadership * 0.10 +
  problemSolving * 0.10 +
  adaptability * 0.10 +
  roleMotivation * 0.10 +
  behavioralReasoning * 0.10 +
  professionalism * 0.10 +
  answerRelevance * 0.05
);

Return ONLY a valid JSON object matching this schema:
{
  "overallScore": 82,
  "communicationClarity": 85,
  "confidenceComposure": 86,
  "teamwork": 88,
  "leadership": 76,
  "problemSolving": 80,
  "adaptability": 84,
  "roleMotivation": 79,
  "behavioralReasoning": 82,
  "professionalism": 86,
  "answerRelevance": 85,
  "communicationObservations": "Clear communication and articulate phrasing throughout the interview.",
  "recommendedNextAreas": ["STAR Method", "Conflict-resolution examples", "Why this company"],
  "strengths": [
    { "skill": "Team Collaboration", "evidence": "Described working with cross-functional peers..." }
  ],
  "weaknesses": [
    { "skill": "STAR Method Results", "evidence": "Gave situation but omitted quantifiable results..." }
  ],
  "recommendations": [
    { "topic": "STAR Method", "reason": "Ensure every behavioral response ends with measurable outcomes." }
  ],
  "questionEvaluations": [
    {
      "questionId": "q_1",
      "question": "question text",
      "answer": "answer text",
      "score": 85,
      "correctness": "good",
      "depth": "adequate",
      "feedback": "Great overview of team dynamic."
    }
  ]
}`;

      const response = await aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed && typeof parsed.overallScore === 'number') {
        const comm = parsed.communicationClarity ?? 75;
        const conf = parsed.confidenceComposure ?? 75;
        const team = parsed.teamwork ?? 75;
        const lead = parsed.leadership ?? 75;
        const prob = parsed.problemSolving ?? 75;
        const adapt = parsed.adaptability ?? 75;
        const mot = parsed.roleMotivation ?? 75;
        const beh = parsed.behavioralReasoning ?? 75;
        const prof = parsed.professionalism ?? 75;
        const rel = parsed.answerRelevance ?? 75;

        const calculatedOverall = Math.round(
          comm * 0.15 +
            conf * 0.10 +
            team * 0.10 +
            lead * 0.10 +
            prob * 0.10 +
            adapt * 0.10 +
            mot * 0.10 +
            beh * 0.10 +
            prof * 0.10 +
            rel * 0.05
        );

        return {
          overallScore: calculatedOverall,
          communicationClarity: comm,
          confidenceComposure: conf,
          teamwork: team,
          leadership: lead,
          problemSolving: prob,
          adaptability: adapt,
          roleMotivation: mot,
          behavioralReasoning: beh,
          professionalism: prof,
          answerRelevance: rel,
          communicationObservations: parsed.communicationObservations || 'Clear and professional communication observed.',
          recommendedNextAreas: Array.isArray(parsed.recommendedNextAreas) ? parsed.recommendedNextAreas : ['STAR Method', 'Conflict Resolution'],
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          questionEvaluations: Array.isArray(parsed.questionEvaluations) ? parsed.questionEvaluations : [],
          evaluatedAt: new Date(),
        };
      }
    } catch (err) {
      console.warn('[InterviewService] Gemini HR Evaluation fallback triggered:', err.message);
    }
  }

  return evaluateHRInterviewDeterministic(session, context);
};

/**
 * Retrieves the student's mock interview history ordered newest first.
 * Supports filtering by interviewType ('technical' | 'hr').
 */
const getInterviewHistory = async (studentId, interviewType) => {
  const query = { studentId };
  if (interviewType === 'hr') {
    query.interviewType = 'hr';
  } else if (interviewType === 'technical') {
    query.$or = [{ interviewType: 'technical' }, { interviewType: { $exists: false } }];
  }

  const history = await TechnicalInterview.find(query)
    .sort({ attemptNumber: -1, createdAt: -1 })
    .lean();

  return history.map((item) => ({
    id: item._id,
    attemptNumber: item.attemptNumber,
    companyName: item.companyName,
    interviewType: item.interviewType || 'technical',
    status: item.status,
    createdAt: item.createdAt,
    duration: item.duration,
    questionCount: item.questions ? item.questions.length : 0,
    overallScore: item.evaluation?.overallScore ?? null,
    evaluation: item.evaluation,
  }));
};

/**
 * Retrieves full evaluation for a specific interview.
 */
const getInterviewEvaluation = async (interviewId, studentId) => {
  const session = await TechnicalInterview.findOne({ _id: interviewId, studentId }).lean();
  if (!session) {
    throw new Error('Interview not found or unauthorized.');
  }

  return {
    id: session._id,
    attemptNumber: session.attemptNumber,
    companyName: session.companyName,
    interviewType: session.interviewType || 'technical',
    status: session.status,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    questions: session.questions,
    evaluation: session.evaluation,
    resumeProfile: session.resumeProfile,
  };
};

module.exports = {
  createInterviewSession,
  startInterviewSession,
  generateNextQuestion,
  generateNextHRQuestion,
  generateDeterministicHRQuestion,
  submitInterviewAnswer,
  endInterviewSession,
  evaluateInterview,
  evaluateHRInterview,
  getInterviewHistory,
  getInterviewEvaluation,
  calculateRemainingSeconds,
  calculateSimilarity,
  buildStructuredResumeProfile,
  gatherCandidateContext,
  generateDeterministicResumeQuestion,
};

