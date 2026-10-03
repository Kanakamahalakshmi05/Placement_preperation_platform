const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Canonical skills definition with aliases and variations
const CANONICAL_SKILLS = [
  // Programming Languages
  { name: 'JavaScript', aliases: ['javascript', 'js', 'es6', 'es2015', 'ecmascript'] },
  { name: 'TypeScript', aliases: ['typescript', 'ts'] },
  { name: 'Python', aliases: ['python', 'python3', 'py'] },
  { name: 'Java', aliases: ['java', 'core java', 'j2ee'] },
  { name: 'C++', aliases: ['c++', 'cpp'] },
  { name: 'C#', aliases: ['c#', 'csharp', '.net', 'dotnet', 'asp.net'] },
  { name: 'Go', aliases: ['go', 'golang'] },
  { name: 'Rust', aliases: ['rust'] },
  { name: 'Ruby', aliases: ['ruby', 'ruby on rails', 'rails'] },
  { name: 'PHP', aliases: ['php', 'laravel'] },
  { name: 'Swift', aliases: ['swift', 'swiftui', 'ios'] },
  { name: 'Kotlin', aliases: ['kotlin', 'android'] },
  { name: 'SQL', aliases: ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'pl/sql', 't-sql', 'rdbms', 'relational database', 'relational databases'] },
  { name: 'HTML/CSS', aliases: ['html', 'html5', 'css', 'css3'] },

  // Frontend
  { name: 'React', aliases: ['react', 'react.js', 'reactjs', 'react-router', 'react native'] },
  { name: 'Next.js', aliases: ['next.js', 'nextjs', 'next'] },
  { name: 'Vue', aliases: ['vue', 'vue.js', 'vuejs'] },
  { name: 'Angular', aliases: ['angular', 'angularjs'] },
  { name: 'Svelte', aliases: ['svelte', 'sveltekit'] },
  { name: 'Redux', aliases: ['redux', 'redux toolkit', 'zustand'] },
  { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwind css', 'tailwindcss'] },
  { name: 'Bootstrap', aliases: ['bootstrap'] },

  // Backend & APIs
  { name: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { name: 'Express', aliases: ['express', 'express.js', 'expressjs'] },
  { name: 'NestJS', aliases: ['nestjs'] },
  { name: 'Django', aliases: ['django'] },
  { name: 'Flask', aliases: ['flask'] },
  { name: 'FastAPI', aliases: ['fastapi'] },
  { name: 'Spring Boot', aliases: ['spring boot', 'spring framework', 'spring'] },
  { name: 'REST APIs', aliases: ['rest apis', 'rest api', 'restful apis', 'restful api', 'restful', 'rest', 'api design', 'web api', 'web apis', 'apis'] },
  { name: 'GraphQL', aliases: ['graphql', 'apollo'] },
  { name: 'WebSockets', aliases: ['websockets', 'websocket', 'socket.io', 'socketio'] },
  { name: 'Microservices', aliases: ['microservices', 'microservice', 'microservice architecture'] },

  // Databases & Caching
  { name: 'MongoDB', aliases: ['mongodb', 'mongo', 'nosql', 'mongoose', 'mern'] },
  { name: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { name: 'MySQL', aliases: ['mysql'] },
  { name: 'Redis', aliases: ['redis', 'caching'] },
  { name: 'Firebase', aliases: ['firebase', 'firestore'] },

  // Cloud, DevOps & Tools
  { name: 'AWS', aliases: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'] },
  { name: 'Azure', aliases: ['azure', 'microsoft azure'] },
  { name: 'GCP', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
  { name: 'Docker', aliases: ['docker', 'containerization', 'containers'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { name: 'CI/CD', aliases: ['ci/cd', 'jenkins', 'github actions', 'gitlab ci'] },
  { name: 'Git', aliases: ['git', 'github', 'gitlab', 'version control'] },
  { name: 'Linux', aliases: ['linux', 'unix', 'bash', 'shell'] },

  // Core Computer Science & AI / ML
  { name: 'DSA', aliases: ['dsa', 'data structures', 'algorithms', 'data structures and algorithms', 'data structures & algorithms', 'problem solving', 'problem-solving', 'coding assessment', 'coding round', 'technical test'] },
  { name: 'System Design', aliases: ['system design', 'distributed systems', 'high level design', 'low level design', 'hld', 'lld', 'prd-based', 'project-based', 'architecture design'] },
  { name: 'OOP', aliases: ['oop', 'object-oriented programming', 'object oriented programming'] },
  { name: 'DBMS', aliases: ['dbms', 'database management', 'database management systems'] },
  { name: 'Operating Systems', aliases: ['operating systems', 'os'] },
  { name: 'Computer Networks', aliases: ['computer networks', 'networking', 'tcp/ip', 'http/https'] },
  { name: 'Machine Learning', aliases: ['machine learning', 'ml', 'deep learning', 'artificial intelligence', 'nlp'] },
  { name: 'Pandas', aliases: ['pandas'] },
  { name: 'NumPy', aliases: ['numpy'] },
  { name: 'Model Evaluation', aliases: ['model evaluation', 'model validation', 'model testing', 'cross-validation', 'precision-recall', 'roc-auc', 'hyperparameter tuning', 'evaluation metrics'] },
  { name: 'Generative AI', aliases: ['generative ai', 'genai', 'gen ai', 'llm', 'llms', 'large language models', 'openai', 'prompt engineering', 'langchain', 'rag', 'ai-powered', 'ai powered'] },
];

/**
 * Extracts raw text from a document buffer based on MIME type and file signature.
 */
const extractTextFromBuffer = async (buffer, mimeType = '', originalName = '') => {
  if (!buffer || !Buffer.isBuffer(buffer)) return '';

  const name = (originalName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  // 1. PDF detection (by MIME, filename, or PDF magic bytes %PDF)
  const isPdf =
    mime === 'application/pdf' ||
    mime.includes('pdf') ||
    name.endsWith('.pdf') ||
    (buffer.length >= 4 && buffer.slice(0, 4).toString() === '%PDF');

  if (isPdf) {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (pdfErr) {
      console.warn('[PDF Parse Error]:', pdfErr.message);
    }
  }

  // 2. DOCX / Word detection (by MIME, filename, or ZIP/DOCX magic bytes PK\x03\x04)
  const isDocx =
    mime.includes('word') ||
    mime.includes('officedocument') ||
    name.endsWith('.docx') ||
    name.endsWith('.doc') ||
    (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b);

  if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result && typeof result.value === 'string' && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch (docxErr) {
      console.warn('[DOCX Parse Warning]:', docxErr.message);
    }
  }

  // 3. Fallback to UTF-8 text if it is clean text
  try {
    const text = buffer.toString('utf-8');
    if (text.startsWith('PK\x03\x04') || text.startsWith('PK')) {
      console.warn('[Text Extraction] Buffer is binary archive, skipping text decoding.');
      return '';
    }
    return text;
  } catch (err) {
    return '';
  }
};

/**
 * Extracts canonicalized, deduplicated skill names from text.
 * @param {string} text - Raw document text
 * @returns {string[]} Array of canonical skill names (e.g. ['React', 'Node.js', 'SQL'])
 */
const extractCanonicalSkills = (text) => {
  if (!text || typeof text !== 'string') return [];

  if (text.startsWith('PK\x03\x04') || text.startsWith('PK')) {
    return [];
  }

  const matched = new Set();

  for (const skill of CANONICAL_SKILLS) {
    for (const alias of skill.aliases) {
      const escaped = alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9_#+])${escaped}(?=[^a-zA-Z0-9_#+]|$)`, 'i');

      if (regex.test(text)) {
        matched.add(skill.name);
        break;
      }
    }
  }

  return Array.from(matched);
};

const extractSkills = (text) => extractCanonicalSkills(text);

/**
 * Searches the resume text for concrete evidence of a given skill.
 * Determines if evidence is 'strong' (project/experience/action verbs) or 'partial' (mere mention in skills list).
 */
const findResumeSkillEvidence = (resumeText, skillName) => {
  if (!resumeText || !skillName) return { found: false, strength: 'missing', evidence: '' };

  const skillDef = CANONICAL_SKILLS.find(
    (s) => s.name.toLowerCase() === skillName.toLowerCase()
  );
  const aliases = skillDef ? skillDef.aliases : [skillName.toLowerCase()];

  // Split resume into sentences/lines for contextual analysis
  const lines = resumeText
    .split(/[\r\n\.\•\-\*]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  let strongEvidence = '';
  let weakEvidence = '';

  const actionVerbs = [
    'developed', 'built', 'created', 'implemented', 'designed', 'architected',
    'engineered', 'maintained', 'optimized', 'deployed', 'utilized', 'worked on',
    'integrated', 'spearheaded', 'automated', 'delivered', 'managed', 'constructed',
    'project', 'experience', 'production', 'application', 'service', 'stack', 'trained', 'classify'
  ];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    const containsSkill = aliases.some((alias) => {
      const escaped = alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9_#+])${escaped}(?=[^a-zA-Z0-9_#+]|$)`, 'i');
      return regex.test(lowerLine);
    });

    if (containsSkill) {
      // Check if line contains strong action verbs or project context
      const hasAction = actionVerbs.some((v) => lowerLine.includes(v));

      // Check if line contains weak interest indicators without action verbs
      const hasWeakIndicator = (
        /\b(interested in|curious about|basic knowledge|familiar with|beginner in)\b/i.test(lowerLine) ||
        (/\blearning\b/i.test(lowerLine) && !/\b(machine learning|deep learning|reinforcement learning)\b/i.test(lowerLine))
      );

      if (hasAction && line.length > 15) {
        strongEvidence = line.substring(0, 140);
        break; // Found strong evidence
      } else if (hasWeakIndicator) {
        if (!weakEvidence) weakEvidence = line.substring(0, 120);
      } else if (!weakEvidence) {
        weakEvidence = line.substring(0, 120);
      }
    }
  }

  if (strongEvidence) {
    return {
      found: true,
      strength: 'strong',
      evidence: strongEvidence,
    };
  }

  if (weakEvidence) {
    return {
      found: true,
      strength: 'partial',
      evidence: weakEvidence,
    };
  }

  // Check fallback raw regex in resumeText
  for (const alias of aliases) {
    const escaped = alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9_#+])${escaped}(?=[^a-zA-Z0-9_#+]|$)`, 'i');
    if (regex.test(resumeText)) {
      return {
        found: true,
        strength: 'partial',
        evidence: `${skillName} listed in skills profile.`,
      };
    }
  }

  return {
    found: false,
    strength: 'missing',
    evidence: `Required by company JD but no evidence found in resume.`,
  };
};

/**
 * Extracts requirements and technical competencies directly from the Company JD.
 */
const extractJdRequirements = (jdText, jdSkills = []) => {
  let cleanJd = jdText || '';
  if (cleanJd.startsWith('PK\x03\x04') || cleanJd.startsWith('PK')) {
    cleanJd = '';
  }

  const fullJd = `${cleanJd} ${(jdSkills || []).join(' ')}`;
  const canonicalInJd = extractCanonicalSkills(fullJd);

  // Preserve any explicit user-entered skills in jdSkills that might be custom
  const allJdSkills = Array.from(
    new Set([...canonicalInJd, ...(jdSkills || []).filter(Boolean)])
  );

  const lowerJd = fullJd.toLowerCase();

  // Categorize importance (high, medium, low)
  const requirements = allJdSkills.map((skill) => {
    const lowerSkill = skill.toLowerCase();
    let importance = 'medium';

    // If mentioned under 'required', 'must have', 'minimum requirements', or repeated
    const isRequiredSection =
      lowerJd.includes('required') ||
      lowerJd.includes('must have') ||
      lowerJd.includes('qualifications') ||
      lowerJd.includes('core requirements');

    const occurrences = (lowerJd.match(new RegExp(lowerSkill, 'g')) || []).length;

    if (occurrences >= 2 || (isRequiredSection && lowerJd.indexOf(lowerSkill) < lowerJd.length / 2)) {
      importance = 'high';
    } else if (lowerJd.includes('preferred') || lowerJd.includes('plus') || lowerJd.includes('bonus')) {
      const prefIdx = Math.max(lowerJd.indexOf('preferred'), lowerJd.indexOf('good to have'));
      const skillIdx = lowerJd.indexOf(lowerSkill);
      if (prefIdx !== -1 && skillIdx > prefIdx) {
        importance = 'low';
      }
    }

    return {
      skill,
      importance,
    };
  });

  return requirements;
};

/**
 * Semantic Skill Gap Analyzer strictly driven by the Company Job Description (JD).
 *
 * Rules:
 * 1. The JD is extracted first to determine all required/preferred skills.
 * 2. Every JD skill is evaluated against the resume for strong vs partial evidence.
 * 3. Matched Skills ONLY contains skills that the JD requires AND resume has evidence for.
 * 4. Skills appearing ONLY in the resume are strictly ignored for JD matching.
 * 5. Skills to improve includes missing JD skills and weak/partial JD skills.
 * 6. Important topics are prioritized directly from JD requirements and gaps.
 */
const analyzeSkillGap = ({ resumeText = '', jdText = '', resumeSkills = [], jdSkills = [] }) => {
  let cleanJdText = jdText || '';
  if (cleanJdText.startsWith('PK\x03\x04') || cleanJdText.startsWith('PK')) {
    cleanJdText = '';
  }

  // 1. EXTRACT REQUIREMENTS FROM JD FIRST
  const jdRequirements = extractJdRequirements(cleanJdText, jdSkills);

  if (jdRequirements.length === 0) {
    // If no specific skills parsed from JD, fallback to core technical assessment keywords present in JD text
    const genericFallback = extractCanonicalSkills(cleanJdText);
    genericFallback.forEach((s) => jdRequirements.push({ skill: s, importance: 'high' }));
  }

  const matchedSkills = [];
  const partialSkills = [];
  const skillsToImprove = [];

  // 2. EXTRACT ACTUAL RESUME EVIDENCE FOR EVERY JD SKILL
  jdRequirements.forEach((req) => {
    const evidenceCheck = findResumeSkillEvidence(resumeText, req.skill);

    if (evidenceCheck.found && evidenceCheck.strength === 'strong') {
      matchedSkills.push({
        skill: req.skill,
        evidence: evidenceCheck.evidence,
        strength: 'strong',
        importance: req.importance,
      });
    } else if (evidenceCheck.found && evidenceCheck.strength === 'partial') {
      partialSkills.push({
        skill: req.skill,
        evidence: evidenceCheck.evidence,
        strength: 'partial',
        importance: req.importance,
      });
      // Partial skills need improvement / deeper interview verification
      skillsToImprove.push({
        skill: req.skill,
        importance: req.importance,
        reason: 'Mentioned with limited project evidence; prepare for in-depth questions',
        isPartial: true,
      });
    } else {
      skillsToImprove.push({
        skill: req.skill,
        importance: req.importance,
        reason: 'Required by company JD but not found in resume',
        isPartial: false,
      });
    }
  });

  // 3. GENERATE DYNAMIC TOPICS & AREAS TO FOCUS DIRECTLY FROM JD REQUIREMENTS & SKILL GAPS
  const topicMap = {
    React: {
      topic: 'React Component Architecture & State Management',
      whyFocus: 'Essential frontend requirement for interactive component lifecycles and state.',
      actionPlan: 'Review hooks (useState, useEffect, useMemo), Context API, and component composition.',
    },
    'Node.js': {
      topic: 'Node.js Event Loop, Streams & Middleware Architecture',
      whyFocus: 'Core backend requirement in JD for high-throughput microservices.',
      actionPlan: 'Study non-blocking I/O, event emitters, custom middleware, and async error handling.',
    },
    SQL: {
      topic: 'SQL Joins, Indexing & Query Optimization',
      whyFocus: 'Core database requirement in JD for transactional queries and schema design.',
      actionPlan: 'Practice complex multi-table joins, subqueries, indexing strategies, and normalization.',
    },
    'REST APIs': {
      topic: 'RESTful API Design, Status Codes & Idempotency',
      whyFocus: 'Required for clean backend service contracts and frontend integration.',
      actionPlan: 'Review HTTP verbs, pagination, status codes, authentication headers, and rate limiting.',
    },
    Docker: {
      topic: 'Docker Containerization, Multi-Stage Builds & Layers',
      whyFocus: 'Required by JD for standardized deployment and microservice isolation.',
      actionPlan: 'Practice writing optimized Dockerfiles, multi-stage builds, and Docker Compose networking.',
    },
    Kubernetes: {
      topic: 'Kubernetes Pod Architecture, Services & Scaling',
      whyFocus: 'Required in JD for managing container orchestration and production deployments.',
      actionPlan: 'Review Pods, Deployments, Services, ConfigMaps, and horizontal pod autoscaling.',
    },
    Go: {
      topic: 'Go Goroutines, Channels & Concurrency Patterns',
      whyFocus: 'Required in JD for high-performance concurrent backend microservices.',
      actionPlan: 'Review concurrency sync primitives, channels, select statements, and error handling.',
    },
    GCP: {
      topic: 'Google Cloud Platform Services & Serverless Architecture',
      whyFocus: 'Target cloud infrastructure specified in company job requirements.',
      actionPlan: 'Review Cloud Run, Cloud Functions, Pub/Sub, and IAM permissions.',
    },
    AWS: {
      topic: 'AWS Core Services (EC2, S3, IAM) & Serverless Architecture',
      whyFocus: 'Target cloud infrastructure specified in company job requirements.',
      actionPlan: 'Review Lambda, S3 security policies, DynamoDB, and API Gateway.',
    },
    MongoDB: {
      topic: 'MongoDB Document Modeling, Indexing & Aggregation Framework',
      whyFocus: 'Core NoSQL document database requirement in company JD.',
      actionPlan: 'Practice aggregation pipelines ($match, $group, $lookup) and indexing strategies.',
    },
    DSA: {
      topic: 'Data Structures and Algorithms (Arrays, Graphs, DP)',
      whyFocus: 'Core technical screening competency required for coding rounds.',
      actionPlan: 'Practice two-pointer techniques, graph traversals (BFS/DFS), and dynamic programming.',
    },
    'System Design': {
      topic: 'Distributed System Design & High Concurrency Architecture',
      whyFocus: 'Evaluated in technical interview rounds for scalability and reliability.',
      actionPlan: 'Study load balancing, caching tiers, database sharding, and message queues.',
    },
    JavaScript: {
      topic: 'JavaScript Async/Await, Event Loop & Closures',
      whyFocus: 'Core foundation required across full stack development.',
      actionPlan: 'Review prototype chains, promises, event loop microtasks, and ES6+ features.',
    },
    TypeScript: {
      topic: 'TypeScript Generics, Utility Types & Type Guards',
      whyFocus: 'Required in JD for type-safe frontend and backend enterprise systems.',
      actionPlan: 'Practice custom generics, Pick/Omit utility types, and discriminated unions.',
    },
    Python: {
      topic: 'Python Object-Oriented Patterns & Generators',
      whyFocus: 'Backend scripting and data processing requirement in JD.',
      actionPlan: 'Review decorators, generators, list comprehensions, and OOP design patterns.',
    },
    'Machine Learning': {
      topic: 'Machine Learning Algorithms & Model Validation',
      whyFocus: 'Key domain requirement for AI/ML engineering positions.',
      actionPlan: 'Review supervised/unsupervised models, cross-validation, and bias-variance tradeoff.',
    },
    Pandas: {
      topic: 'Pandas DataFrames, Vectorization & Data Cleaning',
      whyFocus: 'Required for tabular data processing and analytics pipelines.',
      actionPlan: 'Practice groupby aggregations, vectorization, handling missing values, and merges.',
    },
    NumPy: {
      topic: 'NumPy Array Manipulation & Matrix Operations',
      whyFocus: 'Fundamental numerical computation library in AI/data roles.',
      actionPlan: 'Review broadcasting, array indexing, matrix multiplication, and vector math.',
    },
    'Model Evaluation': {
      topic: 'Model Evaluation Metrics (ROC-AUC, Precision, Recall, F1)',
      whyFocus: 'Critical for evaluating production machine learning models.',
      actionPlan: 'Review confusion matrices, classification reports, and cross-validation techniques.',
    },
    Microservices: {
      topic: 'Microservices Communication, Sagas & Resiliency',
      whyFocus: 'Modern distributed architecture emphasized in company technical stack.',
      actionPlan: 'Study synchronous REST/gRPC vs asynchronous messaging and circuit breakers.',
    },
  };

  // Prioritize preparation topics based on JD requirements
  const importantTopics = [];
  const areasToFocusDetailed = [];
  const preparationPriority = [];

  // A. High-importance missing JD skills get top priority
  skillsToImprove
    .filter((s) => s.importance === 'high')
    .forEach((s) => {
      const meta = topicMap[s.skill];
      const topicName = meta?.topic || `${s.skill} Core Principles & Best Practices`;
      const whyFocus = meta?.whyFocus || `High-priority skill explicitly required in the company JD.`;
      const actionPlan = meta?.actionPlan || `Review fundamental concepts, common interview questions, and practical code patterns in ${s.skill}.`;

      importantTopics.push({ topic: topicName, priority: 'HIGH', skill: s.skill, whyFocus, actionPlan });
      areasToFocusDetailed.push({ topic: topicName, priority: 'HIGH', skill: s.skill, whyFocus, actionPlan });
      preparationPriority.push(`${topicName} — HIGH`);
    });

  // B. Medium-importance missing skills or partial skills
  skillsToImprove
    .filter((s) => s.importance !== 'high')
    .forEach((s) => {
      const meta = topicMap[s.skill];
      const topicName = meta?.topic || `${s.skill} Implementation & Interview Questions`;
      const whyFocus = meta?.whyFocus || (s.isPartial ? `Mentioned in resume with limited project depth; prepare for in-depth technical verification.` : `Preferred skill listed in the company JD.`);
      const actionPlan = meta?.actionPlan || `Prepare project examples and review practical use cases for ${s.skill}.`;

      importantTopics.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill, whyFocus, actionPlan });
      areasToFocusDetailed.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill, whyFocus, actionPlan });
      preparationPriority.push(`${topicName} — MEDIUM`);
    });

  // C. Matched skills for interview verification
  matchedSkills.forEach((s) => {
    if (importantTopics.length < 6) {
      const meta = topicMap[s.skill];
      const topicName = meta?.topic || `${s.skill} Advanced Patterns & Optimization`;
      const whyFocus = meta?.whyFocus || `Strong match from your resume; prepare for deep-dive technical questions on your past implementations.`;
      const actionPlan = meta?.actionPlan || `Be ready to explain architectural trade-offs and code implementation details for your ${s.skill} projects.`;

      importantTopics.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill, whyFocus, actionPlan });
      areasToFocusDetailed.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill, whyFocus, actionPlan });
      preparationPriority.push(`${topicName} — MEDIUM`);
    }
  });

  // Extract clean string arrays for components expecting array of strings
  const matchedSkillNames = matchedSkills.map((m) => m.skill);
  const skillsToImproveNames = skillsToImprove.map((s) => s.skill);
  const importantTopicNames = importantTopics.map((t) => t.topic);

  return {
    jdRequirements,
    matchedSkills: matchedSkillNames,
    matchedSkillsDetailed: matchedSkills,
    missingSkills: skillsToImproveNames,
    missingSkillsDetailed: skillsToImprove,
    partialSkills: partialSkills.map((p) => p.skill),
    partialSkillsDetailed: partialSkills,
    skillsToImprove: skillsToImproveNames,
    skillsToImproveDetailed: skillsToImprove,
    areasToFocus: importantTopicNames,
    areasToFocusDetailed,
    importantTopics: importantTopicNames,
    importantTopicsDetailed: importantTopics,
    recommendedTopics: importantTopicNames,
    preparationPriority,
  };
};

/**
 * Extracts project titles or bullet points from resume text.
 */
const extractProjects = (text) => {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/[\r\n]+/);
  const projects = [];
  let inProjectSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(projects?|academic projects?|personal projects?|key projects?)/i.test(trimmed)) {
      inProjectSection = true;
      continue;
    }
    if (inProjectSection && /^(skills|education|experience|certifications|achievements|summary)/i.test(trimmed)) {
      inProjectSection = false;
      break;
    }
    if (inProjectSection && trimmed.length > 5 && !trimmed.startsWith('•') && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
      projects.push({
        title: trimmed.substring(0, 100),
        description: trimmed,
        techStack: [],
      });
    }
  }

  return projects.slice(0, 5);
};

module.exports = {
  extractTextFromBuffer,
  extractCanonicalSkills,
  extractSkills,
  extractProjects,
  findResumeSkillEvidence,
  extractJdRequirements,
  analyzeSkillGap,
};
