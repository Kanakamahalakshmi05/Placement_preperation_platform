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

  // 3. GENERATE DYNAMIC TOPICS DIRECTLY FROM JD REQUIREMENTS & SKILL GAPS
  const topicMap = {
    React: 'React Component Architecture & State Management',
    'Node.js': 'Node.js Event Loop, Streams & Middleware',
    SQL: 'SQL Joins, Indexing & Query Optimization',
    'REST APIs': 'RESTful API Design, Status Codes & Idempotency',
    Docker: 'Docker Containerization, Multi-Stage Builds & Layers',
    Kubernetes: 'Kubernetes Pod Architecture, Services & Scaling',
    Go: 'Go Goroutines, Channels & Concurrency Patterns',
    GCP: 'Google Cloud Platform Services & Architecture',
    AWS: 'AWS Core Services (EC2, S3, IAM) & Serverless',
    MongoDB: 'MongoDB Document Modeling, Indexing & Aggregation',
    DSA: 'Data Structures and Algorithms (Arrays, Graphs, DP)',
    'System Design': 'Distributed System Design & High Concurrency',
    JavaScript: 'JavaScript Async/Await, Event Loop & Closures',
    TypeScript: 'TypeScript Generics, Utility Types & Type Guards',
    Python: 'Python Object-Oriented Patterns & Generators',
    'Machine Learning': 'Machine Learning Algorithms & Model Validation',
    Pandas: 'Pandas DataFrames, Vectorization & Data Cleaning',
    NumPy: 'NumPy Array Manipulation & Matrix Operations',
    'Model Evaluation': 'Model Evaluation Metrics (ROC-AUC, Precision, Recall)',
    Microservices: 'Microservices Communication, Sagas & Resiliency',
  };

  // Prioritize preparation topics based on JD requirements
  const importantTopics = [];
  const preparationPriority = [];

  // A. High-importance missing JD skills get top priority
  skillsToImprove
    .filter((s) => s.importance === 'high')
    .forEach((s) => {
      const topicName = topicMap[s.skill] || `${s.skill} Core Principles & Best Practices`;
      importantTopics.push({ topic: topicName, priority: 'HIGH', skill: s.skill });
      preparationPriority.push(`${topicName} — HIGH`);
    });

  // B. Medium-importance missing skills or partial skills
  skillsToImprove
    .filter((s) => s.importance !== 'high')
    .forEach((s) => {
      const topicName = topicMap[s.skill] || `${s.skill} Implementation & Interview Questions`;
      importantTopics.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill });
      preparationPriority.push(`${topicName} — MEDIUM`);
    });

  // C. Matched skills for interview verification
  matchedSkills.forEach((s) => {
    if (importantTopics.length < 5) {
      const topicName = topicMap[s.skill] || `${s.skill} Advanced Patterns & Optimization`;
      importantTopics.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill });
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
    partialSkills: partialSkills.map((p) => p.skill),
    partialSkillsDetailed: partialSkills,
    skillsToImprove: skillsToImproveNames,
    skillsToImproveDetailed: skillsToImprove,
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
