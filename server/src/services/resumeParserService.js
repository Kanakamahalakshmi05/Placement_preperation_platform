const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Universal Canonical Skills Knowledge Graph across 9 Tech Domains:
 * 1. Programming Languages
 * 2. Frontend Web
 * 3. Backend & APIs
 * 4. Databases & Caching
 * 5. Cloud, DevOps & Infrastructure
 * 6. AI, Machine Learning & Data Science
 * 7. Big Data & Data Engineering
 * 8. Mobile & Embedded Systems
 * 9. Core Computer Science & Security
 */
const CANONICAL_SKILLS = [
  // 1. Programming Languages
  { name: 'JavaScript', aliases: ['javascript', 'js', 'es6', 'es2015', 'ecmascript'] },
  { name: 'TypeScript', aliases: ['typescript', 'ts'] },
  { name: 'Python', aliases: ['python', 'python3', 'py'] },
  { name: 'Java', aliases: ['java', 'core java', 'j2ee', 'jdk'] },
  { name: 'C++', aliases: ['c++', 'cpp'] },
  { name: 'C', aliases: ['c', 'c language', 'embedded c', 'ansi c'] },
  { name: 'C#', aliases: ['c#', 'csharp', '.net', 'dotnet', 'asp.net', 'asp.net core', 'c sharp'] },
  { name: 'Go', aliases: ['go', 'golang'] },
  { name: 'Rust', aliases: ['rust', 'rustlang'] },
  { name: 'Ruby', aliases: ['ruby', 'ruby on rails', 'rails'] },
  { name: 'PHP', aliases: ['php', 'laravel', 'symfony', 'codeigniter'] },
  { name: 'Swift', aliases: ['swift', 'swiftui', 'ios development'] },
  { name: 'Kotlin', aliases: ['kotlin', 'android development'] },
  { name: 'Dart', aliases: ['dart'] },
  { name: 'Scala', aliases: ['scala'] },
  { name: 'R', aliases: ['r', 'r programming', 'r language', 'r-project'] },
  { name: 'SQL', aliases: ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'pl/sql', 't-sql', 'rdbms', 'relational database', 'relational databases', 'oracle db', 'sql server'] },
  { name: 'HTML/CSS', aliases: ['html', 'html5', 'css', 'css3', 'responsive design'] },

  // 2. Frontend
  { name: 'React', aliases: ['react', 'react.js', 'reactjs', 'react-router', 'react hooks'] },
  { name: 'Next.js', aliases: ['next.js', 'nextjs', 'next'] },
  { name: 'Vue', aliases: ['vue', 'vue.js', 'vuejs', 'vuex', 'pinia'] },
  { name: 'Nuxt.js', aliases: ['nuxt', 'nuxt.js', 'nuxtjs'] },
  { name: 'Angular', aliases: ['angular', 'angularjs', 'angular 2+'] },
  { name: 'Svelte', aliases: ['svelte', 'sveltekit'] },
  { name: 'Redux', aliases: ['redux', 'redux toolkit', 'rtk', 'zustand', 'recoil', 'mobx'] },
  { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwind css', 'tailwindcss'] },
  { name: 'Bootstrap', aliases: ['bootstrap', 'bootstrap 5', 'bootstrap 4'] },
  { name: 'Sass/SCSS', aliases: ['sass', 'scss'] },
  { name: 'Webpack/Vite', aliases: ['webpack', 'vite', 'vite.js', 'turbopack', 'rollup', 'esbuild'] },

  // 3. Backend & APIs
  { name: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { name: 'Express', aliases: ['express', 'express.js', 'expressjs'] },
  { name: 'NestJS', aliases: ['nestjs', 'nest.js'] },
  { name: 'Django', aliases: ['django', 'django rest framework', 'drf'] },
  { name: 'Flask', aliases: ['flask'] },
  { name: 'FastAPI', aliases: ['fastapi'] },
  { name: 'Spring Boot', aliases: ['spring boot', 'spring framework', 'spring', 'spring mvc', 'spring cloud'] },
  { name: 'REST APIs', aliases: ['rest apis', 'rest api', 'restful apis', 'restful api', 'restful', 'rest', 'api design', 'web api', 'web apis', 'apis', 'crud apis'] },
  { name: 'GraphQL', aliases: ['graphql', 'apollo', 'apollo client', 'relay'] },
  { name: 'gRPC', aliases: ['grpc', 'protobuf', 'protocol buffers'] },
  { name: 'WebSockets', aliases: ['websockets', 'websocket', 'socket.io', 'socketio'] },
  { name: 'Microservices', aliases: ['microservices', 'microservice', 'microservice architecture', 'soa', 'service oriented architecture'] },
  { name: 'Serverless', aliases: ['serverless', 'lambda functions', 'cloud functions', 'azure functions', 'faas'] },

  // 4. Databases & Caching
  { name: 'MongoDB', aliases: ['mongodb', 'mongo', 'nosql', 'mongoose', 'mern'] },
  { name: 'PostgreSQL', aliases: ['postgresql', 'postgres', 'psql'] },
  { name: 'MySQL', aliases: ['mysql'] },
  { name: 'Redis', aliases: ['redis', 'caching', 'in-memory cache', 'memcached'] },
  { name: 'DynamoDB', aliases: ['dynamodb', 'amazon dynamodb'] },
  { name: 'Cassandra', aliases: ['cassandra', 'apache cassandra'] },
  { name: 'Elasticsearch', aliases: ['elasticsearch', 'elastic search', 'elk stack', 'opensearch'] },
  { name: 'Firebase', aliases: ['firebase', 'firestore', 'realtime database'] },
  { name: 'Supabase', aliases: ['supabase'] },

  // 5. Cloud, DevOps & Infrastructure
  { name: 'AWS', aliases: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'ecs', 'eks', 'rds', 'iam', 'cloudfront', 'route53'] },
  { name: 'Azure', aliases: ['azure', 'microsoft azure', 'azure devops', 'azure app service', 'aks'] },
  { name: 'GCP', aliases: ['gcp', 'google cloud', 'google cloud platform', 'cloud run', 'gke', 'pub/sub'] },
  { name: 'Docker', aliases: ['docker', 'containerization', 'containers', 'docker-compose', 'dockerfile'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s', 'helm', 'kubectl', 'k8s cluster'] },
  { name: 'Terraform', aliases: ['terraform', 'iac', 'infrastructure as code'] },
  { name: 'Ansible', aliases: ['ansible'] },
  { name: 'CI/CD', aliases: ['ci/cd', 'jenkins', 'github actions', 'gitlab ci', 'circleci', 'argo cd', 'argocd', 'continuous integration', 'continuous deployment'] },
  { name: 'Git', aliases: ['git', 'github', 'gitlab', 'bitbucket', 'version control'] },
  { name: 'Linux', aliases: ['linux', 'unix', 'bash', 'shell', 'shell scripting', 'ubuntu', 'debian', 'centos', 'redhat'] },
  { name: 'Prometheus/Grafana', aliases: ['prometheus', 'grafana', 'datadog', 'new relic', 'monitoring', 'observability'] },

  // 6. AI, Machine Learning & Data Science
  { name: 'Machine Learning', aliases: ['machine learning', 'ml', 'supervised learning', 'unsupervised learning', 'predictive modeling', 'reinforcement learning'] },
  { name: 'Deep Learning', aliases: ['deep learning', 'neural networks', 'ann', 'cnn', 'rnn', 'lstm', 'transformer', 'transformers'] },
  { name: 'PyTorch', aliases: ['pytorch', 'torch'] },
  { name: 'TensorFlow', aliases: ['tensorflow', 'tf', 'keras'] },
  { name: 'Scikit-Learn', aliases: ['scikit-learn', 'sklearn'] },
  { name: 'Pandas', aliases: ['pandas'] },
  { name: 'NumPy', aliases: ['numpy'] },
  { name: 'Computer Vision', aliases: ['computer vision', 'cv', 'opencv', 'object detection', 'yolo', 'image segmentation'] },
  { name: 'NLP', aliases: ['nlp', 'natural language processing', 'spacy', 'nltk', 'text classification', 'bert', 'huggingface'] },
  { name: 'Generative AI', aliases: ['generative ai', 'genai', 'gen ai', 'llm', 'llms', 'large language models', 'openai', 'prompt engineering', 'langchain', 'llamaindex', 'rag', 'ai-powered', 'ai powered'] },
  { name: 'Model Evaluation', aliases: ['model evaluation', 'model validation', 'model testing', 'cross-validation', 'precision-recall', 'roc-auc', 'hyperparameter tuning', 'evaluation metrics', 'confusion matrix', 'f1 score'] },
  { name: 'MLOps', aliases: ['mlops', 'mlflow', 'wandb', 'weights and biases', 'kubeflow', 'dvc', 'model deployment'] },

  // 7. Big Data & Data Engineering
  { name: 'Apache Spark', aliases: ['apache spark', 'spark', 'pyspark', 'spark sql', 'spark streaming'] },
  { name: 'Apache Kafka', aliases: ['apache kafka', 'kafka', 'event streaming', 'message queue', 'pub/sub messaging', 'rabbitmq'] },
  { name: 'Apache Airflow', aliases: ['apache airflow', 'airflow', 'dag', 'workflow orchestration'] },
  { name: 'Snowflake', aliases: ['snowflake', 'data warehousing', 'data warehouse'] },
  { name: 'BigQuery', aliases: ['bigquery', 'google bigquery'] },
  { name: 'ETL/Pipelines', aliases: ['etl', 'elt', 'data pipelines', 'data ingestion', 'dbt', 'data modeling'] },

  // 8. Mobile Development & Systems
  { name: 'Flutter', aliases: ['flutter', 'flutter sdk'] },
  { name: 'React Native', aliases: ['react native', 'react-native', 'expo'] },
  { name: 'Android', aliases: ['android', 'android studio', 'jetpack compose', 'android sdk'] },
  { name: 'iOS', aliases: ['ios', 'uikit', 'xcode', 'cocoapods'] },

  // 9. Core Computer Science, Cybersecurity & Testing
  { name: 'DSA', aliases: ['dsa', 'data structures', 'algorithms', 'data structures and algorithms', 'data structures & algorithms', 'problem solving', 'problem-solving', 'coding assessment', 'coding round', 'technical test', 'algorithmic problem solving'] },
  { name: 'System Design', aliases: ['system design', 'distributed systems', 'high level design', 'low level design', 'hld', 'lld', 'prd-based', 'project-based', 'architecture design', 'scalable architecture', 'high availability'] },
  { name: 'OOP', aliases: ['oop', 'object-oriented programming', 'object oriented programming', 'oops concepts', 'inheritance', 'polymorphism', 'encapsulation'] },
  { name: 'DBMS', aliases: ['dbms', 'database management', 'database management systems', 'acid properties', 'normalization', 'transactions', 'indexing'] },
  { name: 'Operating Systems', aliases: ['operating systems', 'os', 'threads', 'concurrency', 'deadlocks', 'process management', 'virtual memory'] },
  { name: 'Computer Networks', aliases: ['computer networks', 'networking', 'tcp/ip', 'http/https', 'dns', 'osi model', 'udp', 'network protocols'] },
  { name: 'Cybersecurity', aliases: ['cybersecurity', 'information security', 'network security', 'cryptography', 'owasp', 'penetration testing', 'jwt', 'oauth2', 'encryption', 'tls/ssl', 'vulnerability assessment'] },
  { name: 'Testing/QA', aliases: ['testing', 'unit testing', 'integration testing', 'jest', 'pytest', 'junit', 'cypress', 'selenium', 'playwright', 'postman', 'tdd', 'test driven development'] },
];

/**
 * Skill Implication Graph: If candidate demonstrates Skill A,
 * it logically proves or strongly implies Competency B.
 */
const IMPLIED_SKILLS = {
  'Next.js': ['React', 'JavaScript', 'HTML/CSS'],
  'React Native': ['React', 'JavaScript', 'Mobile'],
  'React': ['JavaScript', 'HTML/CSS'],
  'Vue': ['JavaScript', 'HTML/CSS'],
  'Angular': ['TypeScript', 'JavaScript', 'HTML/CSS'],
  'Svelte': ['JavaScript', 'HTML/CSS'],
  'Express': ['Node.js', 'JavaScript', 'REST APIs'],
  'NestJS': ['Node.js', 'TypeScript', 'REST APIs'],
  'FastAPI': ['Python', 'REST APIs'],
  'Django': ['Python', 'REST APIs'],
  'Flask': ['Python', 'REST APIs'],
  'Spring Boot': ['Java', 'REST APIs'],
  'PyTorch': ['Python', 'Machine Learning', 'Deep Learning'],
  'TensorFlow': ['Python', 'Machine Learning', 'Deep Learning'],
  'Keras': ['Python', 'Machine Learning', 'Deep Learning'],
  'Scikit-Learn': ['Python', 'Machine Learning'],
  'Pandas': ['Python'],
  'NumPy': ['Python'],
  'Flutter': ['Dart'],
  'PostgreSQL': ['SQL'],
  'MySQL': ['SQL'],
  'SQLite': ['SQL'],
  'Kubernetes': ['Docker'],
  'Apache Spark': ['Python', 'Big Data'],
  'Snowflake': ['SQL'],
  'BigQuery': ['SQL'],
};

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
 * Helper to build safe boundary regex for a keyword or alias.
 * Handles tricky symbols like C++, C#, .NET, Node.js without breaking.
 */
const buildBoundaryRegex = (alias) => {
  const escaped = alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp(`(^|[^a-zA-Z0-9_#+])${escaped}(?=[^a-zA-Z0-9_#+]|$)`, 'i');
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
      const regex = buildBoundaryRegex(alias);
      if (regex.test(text)) {
        matched.add(skill.name);
        break;
      }
    }
  }

  // Also resolve implied skills
  matched.forEach((skillName) => {
    const implied = IMPLIED_SKILLS[skillName];
    if (implied && Array.isArray(implied)) {
      implied.forEach((imp) => matched.add(imp));
    }
  });

  return Array.from(matched);
};

const extractSkills = (text) => extractCanonicalSkills(text);

/**
 * Searches the resume text for concrete evidence of a given skill.
 * Correctly handles multi-line project blocks, tech headers, implied technologies, and coursework.
 */
const findResumeSkillEvidence = (resumeText, skillName) => {
  if (!resumeText || !skillName) return { found: false, strength: 'missing', evidence: '' };

  const skillDef = CANONICAL_SKILLS.find(
    (s) => s.name.toLowerCase() === skillName.toLowerCase()
  );
  const aliases = skillDef ? skillDef.aliases : [skillName.toLowerCase()];

  // Clean split into semantic lines/bullets
  const rawLines = resumeText
    .split(/\r?\n|[•\-\*\u2022\u2023\u25E6\u2043\u2219|]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const actionVerbs = [
    'developed', 'built', 'created', 'implemented', 'designed', 'architected',
    'engineered', 'maintained', 'optimized', 'deployed', 'utilized', 'worked on',
    'integrated', 'spearheaded', 'automated', 'delivered', 'managed', 'constructed',
    'project', 'experience', 'production', 'application', 'service', 'stack', 'trained', 'classify',
    'skilled in', 'experience with', 'knowledge of', 'certified', 'coursework', 'projects',
    'proficient in', 'fluent in', 'fine-tuned', 'evaluated', 'modeled', 'analyzed', 'orchestrated'
  ];

  let strongEvidence = '';
  let verifiedEvidence = '';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const lowerLine = line.toLowerCase();

    const containsSkill = aliases.some((alias) => {
      const regex = buildBoundaryRegex(alias);
      return regex.test(lowerLine);
    });

    if (containsSkill) {
      const hasAction = actionVerbs.some((v) => lowerLine.includes(v));

      // Also check surrounding lines if part of a project/experience block
      let nearbyAction = '';
      if (i + 1 < rawLines.length) {
        const nextLine = rawLines[i + 1].toLowerCase();
        if (actionVerbs.some((v) => nextLine.includes(v))) {
          nearbyAction = rawLines[i + 1];
        }
      }
      if (i > 0 && !nearbyAction) {
        const prevLine = rawLines[i - 1].toLowerCase();
        if (actionVerbs.some((v) => prevLine.includes(v))) {
          nearbyAction = rawLines[i - 1];
        }
      }

      if (hasAction && line.length > 15) {
        strongEvidence = line.substring(0, 160);
        break; // Direct strong sentence evidence found
      } else if (nearbyAction && nearbyAction.length > 15) {
        strongEvidence = `${line} — ${nearbyAction}`.substring(0, 160);
        break; // Contextual project evidence found
      } else if (!verifiedEvidence) {
        verifiedEvidence = line.substring(0, 140);
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

  if (verifiedEvidence) {
    return {
      found: true,
      strength: 'verified',
      evidence: verifiedEvidence,
    };
  }

  // Check whole resume text direct regex
  for (const alias of aliases) {
    const regex = buildBoundaryRegex(alias);
    if (regex.test(resumeText)) {
      return {
        found: true,
        strength: 'verified',
        evidence: `${skillName} verified in candidate resume.`,
      };
    }
  }

  // Check if any implied parent skill in the resume covers this skill
  for (const [parentSkill, childSkills] of Object.entries(IMPLIED_SKILLS)) {
    if (childSkills.includes(skillName)) {
      const parentCheck = findResumeSkillEvidence(resumeText, parentSkill);
      if (parentCheck.found) {
        return {
          found: true,
          strength: parentCheck.strength === 'strong' ? 'strong' : 'verified',
          evidence: `Implied by ${parentSkill}: ${parentCheck.evidence}`,
        };
      }
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

    const isRequiredSection =
      lowerJd.includes('required') ||
      lowerJd.includes('must have') ||
      lowerJd.includes('qualifications') ||
      lowerJd.includes('core requirements') ||
      lowerJd.includes('minimum qualifications');

    const occurrences = (lowerJd.match(new RegExp(lowerSkill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')) || []).length;

    if (occurrences >= 2 || (isRequiredSection && lowerJd.indexOf(lowerSkill) < lowerJd.length / 2)) {
      importance = 'high';
    } else if (lowerJd.includes('preferred') || lowerJd.includes('plus') || lowerJd.includes('bonus') || lowerJd.includes('good to have')) {
      const prefIdx = Math.max(lowerJd.indexOf('preferred'), lowerJd.indexOf('good to have'), lowerJd.indexOf('nice to have'));
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
 * Rich Domain Topic Map for Personalized Action Plans
 */
const TOPIC_MAP = {
  React: {
    topic: 'React Component Architecture & State Management',
    whyFocus: 'Essential frontend requirement for interactive component lifecycles and state.',
    actionPlan: 'Review hooks (useState, useEffect, useMemo, useCallback), Context API, and state machines.',
  },
  'Next.js': {
    topic: 'Next.js App Router, SSR & Server Components',
    whyFocus: 'Key framework requirement for high-performance enterprise web applications.',
    actionPlan: 'Study Server Components (RSC), dynamic routing, API routes, and caching strategies.',
  },
  'Node.js': {
    topic: 'Node.js Event Loop, Streams & Middleware Architecture',
    whyFocus: 'Core backend requirement in JD for high-throughput microservices.',
    actionPlan: 'Study non-blocking I/O, event emitters, custom middleware, streams, and async error handling.',
  },
  Express: {
    topic: 'Express RESTful Routing, Middleware & Security',
    whyFocus: 'Standard web service layer for Node.js backends.',
    actionPlan: 'Review router chaining, authentication middleware, error handling filters, and rate limiters.',
  },
  SQL: {
    topic: 'SQL Joins, Indexing & Query Optimization',
    whyFocus: 'Core database requirement in JD for transactional queries and schema design.',
    actionPlan: 'Practice complex multi-table joins, subqueries, B-tree indexing strategies, and normalization.',
  },
  PostgreSQL: {
    topic: 'PostgreSQL ACID Transactions, Concurrency & Indexing',
    whyFocus: 'Primary relational database required by target company for enterprise workloads.',
    actionPlan: 'Review MVCC, EXPLAIN ANALYZE query plans, JSONB columns, and connection pooling.',
  },
  MySQL: {
    topic: 'MySQL InnoDB Engine, Transactions & Indexing',
    whyFocus: 'High-volume relational store required in job description.',
    actionPlan: 'Study indexing B+ trees, isolation levels, replication, and query execution plans.',
  },
  'REST APIs': {
    topic: 'RESTful API Design, Status Codes & Idempotency',
    whyFocus: 'Required for clean backend service contracts and frontend integration.',
    actionPlan: 'Review HTTP verbs, pagination, status codes, authentication headers, and rate limiting.',
  },
  GraphQL: {
    topic: 'GraphQL Schema Design, Resolvers & N+1 Problem',
    whyFocus: 'Modern API layer used by target company for efficient client querying.',
    actionPlan: 'Study DataLoader patterns, schema stitching, query complexity limits, and mutations.',
  },
  Docker: {
    topic: 'Docker Containerization, Multi-Stage Builds & Layers',
    whyFocus: 'Required by JD for standardized deployment and microservice isolation.',
    actionPlan: 'Practice writing optimized Dockerfiles, multi-stage builds, and Docker Compose networking.',
  },
  Kubernetes: {
    topic: 'Kubernetes Pod Architecture, Services & Scaling',
    whyFocus: 'Required in JD for managing container orchestration and production deployments.',
    actionPlan: 'Review Pods, Deployments, Services, Ingress, ConfigMaps, and horizontal pod autoscaling (HPA).',
  },
  Terraform: {
    topic: 'Terraform Infrastructure as Code & State Management',
    whyFocus: 'Required for automated multi-cloud provisioning and infrastructure repeatability.',
    actionPlan: 'Practice writing modular Terraform configurations, remote state locking, and plan execution.',
  },
  'CI/CD': {
    topic: 'CI/CD Pipeline Automation & Quality Gates',
    whyFocus: 'Crucial for automated testing, build artifact creation, and zero-downtime deployment.',
    actionPlan: 'Build GitHub Actions / Jenkins pipelines with automated linting, test suites, and staging deploys.',
  },
  AWS: {
    topic: 'AWS Core Services (EC2, S3, IAM) & Serverless Architecture',
    whyFocus: 'Target cloud infrastructure specified in company job requirements.',
    actionPlan: 'Review Lambda, S3 security policies, DynamoDB, API Gateway, and IAM least-privilege roles.',
  },
  Azure: {
    topic: 'Microsoft Azure Cloud Services & Enterprise Architecture',
    whyFocus: 'Enterprise cloud infrastructure required by target company.',
    actionPlan: 'Review Azure App Services, Azure Functions, Blob Storage, and Azure AD authentication.',
  },
  GCP: {
    topic: 'Google Cloud Platform Services & Serverless Architecture',
    whyFocus: 'Target cloud infrastructure specified in company job requirements.',
    actionPlan: 'Review Cloud Run, Cloud Functions, Pub/Sub, BigQuery, and IAM permissions.',
  },
  MongoDB: {
    topic: 'MongoDB Document Modeling, Indexing & Aggregation Framework',
    whyFocus: 'Core NoSQL document database requirement in company JD.',
    actionPlan: 'Practice aggregation pipelines ($match, $group, $lookup) and compound indexing strategies.',
  },
  Redis: {
    topic: 'Redis In-Memory Caching & Distributed Data Structures',
    whyFocus: 'Required for low-latency caching, session management, and rate limiting.',
    actionPlan: 'Review cache-aside patterns, cache invalidation, Redis pub/sub, sets, and sorted sets.',
  },
  'Apache Kafka': {
    topic: 'Apache Kafka Event Streaming, Partitions & Consumer Groups',
    whyFocus: 'Key distributed messaging backbone required in target company architecture.',
    actionPlan: 'Study topic partitioning, consumer group rebalancing, offset commits, and exactly-once semantics.',
  },
  'Apache Spark': {
    topic: 'Apache Spark Distributed Computing & DataFrame Optimization',
    whyFocus: 'Essential big data processing framework required for analytics and ETL workloads.',
    actionPlan: 'Study RDDs vs DataFrames, catalyst optimizer, partitioning, shuffles, and broadcast joins.',
  },
  Snowflake: {
    topic: 'Snowflake Data Warehousing, Clustering & Virtual Warehouses',
    whyFocus: 'Modern cloud data warehouse requirement for analytics and business intelligence.',
    actionPlan: 'Review zero-copy cloning, micro-partitioning, clustering keys, and performance scaling.',
  },
  'Apache Airflow': {
    topic: 'Apache Airflow DAG Authoring & Workflow Orchestration',
    whyFocus: 'Standard workflow engine required for batch data pipelines and ETL orchestration.',
    actionPlan: 'Practice writing custom operators, DAG dependencies, task retries, and backfilling.',
  },
  Java: {
    topic: 'Java Core Principles, Memory Management & Multithreading',
    whyFocus: 'Primary enterprise language required for high-throughput backend services.',
    actionPlan: 'Review JVM memory model, garbage collection, thread pools, CompletableFuture, and streams.',
  },
  'Spring Boot': {
    topic: 'Spring Boot Dependency Injection, JPA & Microservice Architecture',
    whyFocus: 'Enterprise framework requirement for building production REST services and microservices.',
    actionPlan: 'Study Spring IoC, Spring Data JPA repositories, transaction management, and actuator metrics.',
  },
  Python: {
    topic: 'Python Object-Oriented Patterns, Generators & Concurrency',
    whyFocus: 'Primary backend scripting, automation, and data processing requirement in JD.',
    actionPlan: 'Review decorators, generators, list comprehensions, asyncio, and OOP design patterns.',
  },
  FastAPI: {
    topic: 'FastAPI Asynchronous Endpoints, Pydantic & Dependency Injection',
    whyFocus: 'Modern high-performance Python API framework required by company.',
    actionPlan: 'Study async/await route handlers, Pydantic validation models, and OpenAPI docs.',
  },
  'Machine Learning': {
    topic: 'Machine Learning Algorithms & Model Validation',
    whyFocus: 'Key domain requirement for AI/ML engineering positions.',
    actionPlan: 'Review supervised/unsupervised models, cross-validation, and bias-variance tradeoff.',
  },
  'Deep Learning': {
    topic: 'Deep Learning Architectures (Transformers, CNNs & Attention)',
    whyFocus: 'Required for state-of-the-art vision, NLP, and multimodal AI solutions.',
    actionPlan: 'Review self-attention mechanisms, transformer encoders/decoders, backpropagation, and loss functions.',
  },
  PyTorch: {
    topic: 'PyTorch Tensors, Autograd & Custom Neural Network Modules',
    whyFocus: 'Standard deep learning framework required for AI modeling and research.',
    actionPlan: 'Practice creating custom nn.Module classes, custom datasets/dataloaders, and training loops.',
  },
  'Generative AI': {
    topic: 'Generative AI, LLM Fine-Tuning & Retrieval-Augmented Generation (RAG)',
    whyFocus: 'Cutting-edge requirement for building conversational AI and document retrieval pipelines.',
    actionPlan: 'Study vector databases (Pinecone, Chroma), embedding models, LangChain chains, and prompt strategies.',
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
  Flutter: {
    topic: 'Flutter Widget Tree, State Management & Native Channels',
    whyFocus: 'Required cross-platform framework for building high-performance mobile applications.',
    actionPlan: 'Study Riverpod/Bloc state management, custom painting, platform channels, and animation controllers.',
  },
  Dart: {
    topic: 'Dart Asynchronous Programming, Streams & Type System',
    whyFocus: 'Language foundation required for Flutter mobile development.',
    actionPlan: 'Review Futures, Streams, null safety, sound typing, and async/await error handling.',
  },
  'C++': {
    topic: 'C++ Modern Standards (C++17/20), Memory Pointers & STL',
    whyFocus: 'Required for high-performance low-level systems, games, and embedded applications.',
    actionPlan: 'Review smart pointers (unique_ptr, shared_ptr), RAII, move semantics, and STL containers.',
  },
  Cybersecurity: {
    topic: 'Security Principles, OWASP Top 10 & Cryptographic Protocols',
    whyFocus: 'Essential requirement for securing application layers and network infrastructure.',
    actionPlan: 'Study SQL injection, XSS, CSRF, JWT signing/verification, and TLS handshake security.',
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
  OOP: {
    topic: 'Object-Oriented Design Principles (SOLID & Design Patterns)',
    whyFocus: 'Foundation for building maintainable, modular, and extensible software.',
    actionPlan: 'Review Single Responsibility, Open/Closed, Liskov Substitution, and Factory/Observer patterns.',
  },
  DBMS: {
    topic: 'Database Management Systems (ACID, Concurrency & Normalization)',
    whyFocus: 'Core CS foundation tested heavily in campus placement technical rounds.',
    actionPlan: 'Study transaction isolation levels, 1NF-BCNF normalization, indexing, and deadlock handling.',
  },
  'Operating Systems': {
    topic: 'Operating Systems (Process Scheduling, Concurrency & Virtual Memory)',
    whyFocus: 'Core systems concept tested in engineering interviews.',
    actionPlan: 'Study synchronization primitives (semaphores/mutexes), virtual memory paging, and CPU scheduling.',
  },
  'Computer Networks': {
    topic: 'Computer Networks (TCP/IP, HTTP/3, Routing & Socket Flow)',
    whyFocus: 'Core infrastructure concept tested in backend and systems interviews.',
    actionPlan: 'Review TCP 3-way handshake, UDP vs TCP trade-offs, DNS resolution flow, and TLS/HTTPS security.',
  },
};

/**
 * Semantic Skill Gap Analyzer strictly driven by the Company Job Description (JD).
 */
const analyzeSkillGap = ({ resumeText = '', jdText = '', resumeSkills = [], jdSkills = [] }) => {
  let cleanJdText = jdText || '';
  if (cleanJdText.startsWith('PK\x03\x04') || cleanJdText.startsWith('PK')) {
    cleanJdText = '';
  }

  // 1. EXTRACT REQUIREMENTS FROM JD FIRST
  const jdRequirements = extractJdRequirements(cleanJdText, jdSkills);

  if (jdRequirements.length === 0) {
    const genericFallback = extractCanonicalSkills(cleanJdText);
    genericFallback.forEach((s) => jdRequirements.push({ skill: s, importance: 'high' }));
  }

  const matchedSkills = [];
  const missingSkills = [];

  // 2. EXTRACT ACTUAL RESUME EVIDENCE FOR EVERY JD SKILL
  jdRequirements.forEach((req) => {
    const evidenceCheck = findResumeSkillEvidence(resumeText, req.skill);

    if (evidenceCheck.found) {
      matchedSkills.push({
        skill: req.skill,
        evidence: evidenceCheck.evidence || `Verified from candidate resume.`,
        strength: evidenceCheck.strength || 'strong',
        importance: req.importance,
      });
    } else {
      missingSkills.push({
        skill: req.skill,
        importance: req.importance,
        reason: 'Required by company JD but not found in candidate resume',
        isPartial: false,
      });
    }
  });

  // 3. GENERATE DYNAMIC TOPICS & AREAS TO FOCUS DIRECTLY FROM JD REQUIREMENTS & SKILL GAPS
  const importantTopics = [];
  const areasToFocusDetailed = [];
  const preparationPriority = [];

  // A. High-importance missing JD skills get top priority
  missingSkills
    .filter((s) => s.importance === 'high')
    .forEach((s) => {
      const meta = TOPIC_MAP[s.skill];
      const topicName = meta?.topic || `${s.skill} Core Principles & Best Practices`;
      const whyFocus = meta?.whyFocus || `High-priority skill explicitly required in the company JD.`;
      const actionPlan = meta?.actionPlan || `Review fundamental concepts, common interview questions, and practical code patterns in ${s.skill}.`;

      importantTopics.push({ topic: topicName, priority: 'HIGH', skill: s.skill, whyFocus, actionPlan });
      areasToFocusDetailed.push({ topic: topicName, priority: 'HIGH', skill: s.skill, whyFocus, actionPlan });
      preparationPriority.push(`${topicName} — HIGH`);
    });

  // B. Medium-importance missing skills
  missingSkills
    .filter((s) => s.importance !== 'high')
    .forEach((s) => {
      const meta = TOPIC_MAP[s.skill];
      const topicName = meta?.topic || `${s.skill} Implementation & Interview Questions`;
      const whyFocus = meta?.whyFocus || `Preferred skill listed in the company JD.`;
      const actionPlan = meta?.actionPlan || `Prepare project examples and review practical use cases for ${s.skill}.`;

      importantTopics.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill, whyFocus, actionPlan });
      areasToFocusDetailed.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill, whyFocus, actionPlan });
      preparationPriority.push(`${topicName} — MEDIUM`);
    });

  // C. Matched skills for interview verification
  matchedSkills.forEach((s) => {
    if (importantTopics.length < 6) {
      const meta = TOPIC_MAP[s.skill];
      const topicName = meta?.topic || `${s.skill} Advanced Patterns & Optimization`;
      const whyFocus = meta?.whyFocus || `Strong match from your resume; prepare for deep-dive technical questions on your past implementations.`;
      const actionPlan = meta?.actionPlan || `Be ready to explain architectural trade-offs and code implementation details for your ${s.skill} projects.`;

      importantTopics.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill, whyFocus, actionPlan });
      areasToFocusDetailed.push({ topic: topicName, priority: 'MEDIUM', skill: s.skill, whyFocus, actionPlan });
      preparationPriority.push(`${topicName} — MEDIUM`);
    }
  });

  const matchedSkillNames = matchedSkills.map((m) => m.skill);
  const missingSkillNames = missingSkills.map((s) => s.skill);
  const importantTopicNames = importantTopics.map((t) => t.topic);

  return {
    jdRequirements,
    matchedSkills: matchedSkillNames,
    matchedSkillsDetailed: matchedSkills,
    missingSkills: missingSkillNames,
    missingSkillsDetailed: missingSkills,
    partialSkills: [],
    partialSkillsDetailed: [],
    skillsToImprove: missingSkillNames,
    skillsToImproveDetailed: missingSkills,
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
  CANONICAL_SKILLS,
  IMPLIED_SKILLS,
  TOPIC_MAP,
};
