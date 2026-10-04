const crypto = require('crypto');
const { getAIClient, GEMINI_MODEL } = require('../config/aiConfig');

/**
 * Normalizes question text for robust deduplication and variation checking.
 * Strips leading numbering, punctuation, extra whitespace, and lowercases.
 */
const normalizeQuestionText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/^(\d+[\.\)]|\bq\d+[\.:]?|\bquestion\s*\d+[\.:]?)\s*/i, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Calculates Token-based Jaccard Similarity between two normalized questions.
 * Returns a float between 0.0 (completely distinct) and 1.0 (identical words).
 */
const calculateSimilarity = (textA, textB) => {
  const normA = normalizeQuestionText(textA);
  const normB = normalizeQuestionText(textB);

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
 * Dynamically generates 30 distinct technical MCQ questions using Gemini AI
 */
async function generateGeminiAIQuizQuestions({
  company = 'Target Company',
  jobTitle = 'Software Engineer',
  jdText = '',
  matchedSkills = [],
  missingSkills = [],
  prioritizedSkills = [],
  previousQuestions = [],
  targetCount = 30,
  diff = 'mixed',
}) {
  const aiClient = getAIClient();
  if (!aiClient) return [];

  try {
    const recentAvoidList = previousQuestions
      .slice(-30)
      .map((q, idx) => `${idx + 1}. ${String(q).substring(0, 90)}`)
      .join('\n');

    const missingSkillList = missingSkills
      .slice(0, 10)
      .map((s) => (typeof s === 'object' ? s.skill : s))
      .join(', ');

    const prompt = `You are a Senior Technical Hiring Lead and Assessment Architect designing an on-demand technical practice exam for a candidate interviewing at ${company} for the role of ${jobTitle}.

Target Job Requirements Excerpt:
${jdText.substring(0, 1200)}

Candidate's Required Skill Gaps to Test (HIGH PRIORITY):
${missingSkillList || 'Core Backend & Frontend Engineering, Databases, System Design, Testing/QA'}

Candidate's Target Skills:
${prioritizedSkills.slice(0, 14).join(', ') || 'React, Node.js, SQL, AWS, Linux, System Design, DSA, Testing/QA'}

AVOID THESE RECENTLY ASKED QUESTIONS (Strictly generate fresh, DIFFERENT questions):
${recentAvoidList || 'None yet'}

TASK:
Generate EXACTLY ${targetCount} unique, high-quality, practical multiple-choice technical questions (MCQs) covering:
1. Architecture, coding, and real-world implementation trade-offs
2. Data structures, query optimization, indexing, and caching
3. Concurrency, fault tolerance, API design, Linux fundamentals, and QA testing strategies
4. Concepts directly mapped to the company's tech stack and JD skills.

Rules:
- Provide exactly 4 distinct, plausible options for each question.
- Explicitly define the "correctAnswerIndex" (0, 1, 2, or 3).
- Provide a clear, educational "explanation".
- Set "difficulty" to one of ["easy", "medium", "difficult"].

Return ONLY a valid JSON array of ${targetCount} objects with no markdown code blocks or surrounding text. Format:
[
  {
    "topic": "Skill / Topic Name",
    "question": "Question text here...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Why this answer is correct...",
    "difficulty": "medium"
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
    if (Array.isArray(parsed) && parsed.length >= 10) {
      return parsed;
    }
  } catch (err) {
    console.warn('[QuizGeneratorService] Gemini AI generation notice:', err.message);
  }
  return [];
}

// ----------------------------------------------------------------------------
// Curated Technical Question Bank for Common Engineering Disciplines
// ----------------------------------------------------------------------------
const SKILL_QUESTION_BANK = {
  // =========================================================================
  // FRONTEND DISCIPLINE
  // =========================================================================
  React: {
    easy: [
      {
        question: 'In React, what hook is used to manage localized component state in functional components?',
        options: ['useState', 'useEffect', 'useReducer', 'useContext'],
        correctAnswer: 0,
        explanation: '`useState` declares a state variable that persists across re-renders in a functional React component.',
        topic: 'React State Management',
      },
      {
        question: 'Why must lists rendered in React contain a unique `key` prop on each sibling element?',
        options: [
          'To help React Virtual DOM identify which items have changed, been added, or been removed during reconciliation',
          'To sort array elements in ascending order automatically',
          'To bind CSS animations to list items',
          'To enable browser localStorage persistence',
        ],
        correctAnswer: 0,
        explanation: 'Keys give elements a stable identity so React reconciliation can efficiently re-render only modified DOM nodes.',
        topic: 'React Reconciliation & Keys',
      },
      {
        question: 'Which lifecycle hook in React replaces `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount`?',
        options: ['useEffect', 'useMemo', 'useCallback', 'useLayout'],
        correctAnswer: 0,
        explanation: '`useEffect` handles side effects, subscription setup, and cleanup in functional components.',
        topic: 'React Hooks & Lifecycle',
      },
    ],
    medium: [
      {
        question: 'What is the primary difference between `useMemo` and `useCallback` in React?',
        options: [
          '`useMemo` memoizes the calculated result of a function, while `useCallback` memoizes the function definition instance itself',
          '`useCallback` triggers re-renders on every parent update, while `useMemo` blocks DOM painting',
          '`useMemo` can only store strings, while `useCallback` accepts numbers',
          'There is no functional difference; they are exact aliases',
        ],
        correctAnswer: 0,
        explanation: '`useMemo` caches computed values; `useCallback` caches function references to prevent unnecessary child re-renders.',
        topic: 'React Performance Optimization',
      },
      {
        question: 'How does React Context API prevent "prop drilling" across deep component hierarchies?',
        options: [
          'By providing a way to pass data through the component tree without manually passing props down at every level',
          'By storing global state in browser IndexedDB',
          'By converting functional components into Web Workers',
          'By automatically creating Redux slices',
        ],
        correctAnswer: 0,
        explanation: 'Context provides a Provider/Consumer pattern allowing nested children to consume shared state directly.',
        topic: 'React Context API',
      },
    ],
    difficult: [
      {
        question: 'How does React 18 Concurrent Mode with `useTransition` optimize user interaction responsiveness during heavy rendering?',
        options: [
          'It marks state updates as non-urgent transitions, allowing urgent user inputs (typing, clicking) to interrupt long-running renders',
          'It executes React components on the GPU using WebGL',
          'It turns off reconciliation entirely for background tabs',
          'It synchronizes state across browser tabs via SharedWorker',
        ],
        correctAnswer: 0,
        explanation: '`useTransition` lets developers differentiate between urgent updates (like typing) and deferred non-urgent state transitions.',
        topic: 'React Concurrent Rendering',
      },
    ],
  },

  JavaScript: {
    easy: [
      {
        question: 'What is the difference between `==` and `===` operators in JavaScript?',
        options: [
          '`===` performs strict equality checking without type coercion, whereas `==` converts types before comparing',
          '`==` is strictly faster in all JavaScript engines',
          '`===` only compares objects and arrays',
          '`==` compares memory references while `===` compares values',
        ],
        correctAnswer: 0,
        explanation: '`===` checks both value and type without implicit type conversion, preventing surprising coercion bugs.',
        topic: 'JavaScript Equality & Types',
      },
      {
        question: 'Which method creates a new array populated with the results of calling a provided function on every element in the calling array?',
        options: ['Array.prototype.map()', 'Array.prototype.forEach()', 'Array.prototype.filter()', 'Array.prototype.reduce()'],
        correctAnswer: 0,
        explanation: '`map()` creates and returns a new array containing transformed values, leaving the original array intact.',
        topic: 'JavaScript Array Methods',
      },
      {
        question: 'What is the keyword used to declare a block-scoped variable that cannot be reassigned?',
        options: ['const', 'let', 'var', 'immutable'],
        correctAnswer: 0,
        explanation: '`const` variables are block-scoped and cannot be reassigned after declaration.',
        topic: 'JavaScript Variable Scoping',
      },
    ],
    medium: [
      {
        question: 'How does the JavaScript Event Loop coordinate execution between the Microtask Queue and the Macrotask (Callback) Queue?',
        options: [
          'The engine empties the entire Microtask queue (Promises, queueMicrotask) before processing the next task from the Macrotask queue (setTimeout, I/O)',
          'Macrotasks always execute before microtasks',
          'Microtasks and macrotasks run concurrently on dual CPU threads',
          'Microtasks only execute once per window repaint cycle',
        ],
        correctAnswer: 0,
        explanation: 'After each macrotask completes, the JavaScript runtime drains the entire microtask queue before fetching the next macrotask.',
        topic: 'JavaScript Event Loop & Concurrency',
      },
      {
        question: 'What is a Closure in JavaScript and what capability does it provide?',
        options: [
          'A function bundled together with references to its lexical environment, allowing it to access outer scope variables even after the outer function returns',
          'A method to immediately terminate recursive call stacks',
          'A syntax error that closes the browser window',
          'A private class constructor that cannot be instantiated',
        ],
        correctAnswer: 0,
        explanation: 'Closures give inner functions access to outer function scope even after outer functions have finished executing.',
        topic: 'JavaScript Closures & Lexical Scope',
      },
    ],
    difficult: [
      {
        question: 'What does the `WeakMap` data structure provide in JavaScript compared to a standard `Map`?',
        options: [
          'Keys must be objects or non-registered symbols, and entries are weakly held allowing garbage collection when no other references exist',
          'WeakMap keys can only be primitive strings and numbers',
          'WeakMap values are automatically cloned to disk',
          'WeakMap enables iteration via for...of loops and size property',
        ],
        correctAnswer: 0,
        explanation: 'WeakMap references keys weakly, preventing memory leaks when storing metadata about object lifecycles.',
        topic: 'JavaScript Memory & WeakMap',
      },
    ],
  },

  'HTML/CSS': {
    easy: [
      {
        question: 'In the standard CSS Box Model, what is the correct order of layers from innermost content to outermost edge?',
        options: ['Content -> Padding -> Border -> Margin', 'Content -> Border -> Padding -> Margin', 'Padding -> Content -> Margin -> Border', 'Margin -> Border -> Padding -> Content'],
        correctAnswer: 0,
        explanation: 'The CSS box model layers are content area, padding, border, and external margin.',
        topic: 'CSS Box Model',
      },
      {
        question: 'Which CSS Flexbox property aligns flex items along the cross axis inside the flex container?',
        options: ['align-items', 'justify-content', 'flex-direction', 'align-content'],
        correctAnswer: 0,
        explanation: '`align-items` distributes flex items along the cross axis (perpendicular to `flex-direction`).',
        topic: 'CSS Flexbox Layout',
      },
      {
        question: 'Which semantic HTML5 tag should enclose primary navigation links on a website for optimal accessibility and SEO?',
        options: ['<nav>', '<header>', '<aside>', '<section>'],
        correctAnswer: 0,
        explanation: 'The `<nav>` element represents a section of a page whose purpose is to provide navigation links.',
        topic: 'Semantic HTML & Accessibility',
      },
    ],
    medium: [
      {
        question: 'How does the CSS property `box-sizing: border-box` change layout calculations compared to `content-box`?',
        options: [
          'Padding and border widths are included in the element specified width and height, preventing layout breakage when adding padding',
          'It eliminates all external margins completely',
          'It renders element borders inside parent containers only',
          'It forces elements to render in 3D perspective',
        ],
        correctAnswer: 0,
        explanation: '`border-box` ensures `width` and `height` properties specify the visible box dimensions inclusive of padding and border.',
        topic: 'CSS Box Sizing',
      },
    ],
    difficult: [
      {
        question: 'In modern CSS, how does the CSS `:has()` relational selector enhance component styling architecture?',
        options: [
          'It acts as a parent selector, allowing an element to be styled based on whether it contains descendants that match a specific selector',
          'It forces inline CSS styles to override all external stylesheets',
          'It imports remote CSS files asynchronously at runtime',
          'It accelerates browser GPU composite layers',
        ],
        correctAnswer: 0,
        explanation: '`:has()` allows conditional parent styling based on child states without requiring JavaScript DOM traversal.',
        topic: 'Advanced Modern CSS Selectors',
      },
    ],
  },

  TypeScript: {
    easy: [
      {
        question: 'What is the primary benefit of developing applications with TypeScript over plain JavaScript?',
        options: [
          'Static type checking at compile time to detect errors before code runs in production',
          'TypeScript runs directly on bare metal without node or V8 engine',
          'TypeScript automatically creates database schemas from variables',
          'TypeScript produces binary executable files (.exe)',
        ],
        correctAnswer: 0,
        explanation: 'TypeScript adds optional static typing and compile-time verification to identify bugs during development.',
        topic: 'TypeScript Core Benefits',
      },
      {
        question: 'Which TypeScript keyword is used to define an object contract or shape?',
        options: ['interface', 'contract', 'struct', 'schema'],
        correctAnswer: 0,
        explanation: '`interface` (and `type`) defines the shape and property requirements of JavaScript objects.',
        topic: 'TypeScript Interfaces',
      },
    ],
    medium: [
      {
        question: 'What is the difference between `unknown` and `any` types in TypeScript?',
        options: [
          '`unknown` is type-safe: you cannot perform operations on an `unknown` value without first narrowing its type via type guards, whereas `any` disables all type checking',
          '`any` can only be assigned to numbers, while `unknown` is for strings',
          '`unknown` was removed in TypeScript 4.0',
          'There is no difference; they are exact synonyms',
        ],
        correctAnswer: 0,
        explanation: '`unknown` represents any value safely; operations are disallowed until type narrowing or validation occurs.',
        topic: 'TypeScript Type Safety (unknown vs any)',
      },
    ],
    difficult: [
      {
        question: 'How do Mapped Types and the `keyof` operator allow developers to create dynamic utility types like `Partial<T>`?',
        options: [
          '`[P in keyof T]?: T[P]` iterates through all property keys of T and transforms them with the optional `?` modifier',
          'By generating runtime proxy objects that intercept method calls',
          'By inspecting the compiled JavaScript AST using reflection',
          'By downloading types dynamically from npm registry',
        ],
        correctAnswer: 0,
        explanation: 'Mapped types iterate over property keys produced by `keyof` to transform modifier attributes across all fields.',
        topic: 'TypeScript Advanced Generics & Mapped Types',
      },
    ],
  },

  // =========================================================================
  // MACHINE LEARNING DISCIPLINE
  // =========================================================================
  Python: {
    easy: [
      {
        question: 'In Python, which built-in data type is mutable and represents an ordered collection of elements?',
        options: ['list', 'tuple', 'string', 'frozenset'],
        correctAnswer: 0,
        explanation: 'Lists are mutable ordered sequences, whereas tuples and strings are immutable in Python.',
        topic: 'Python Data Structures',
      },
      {
        question: 'What keyword is used in Python to define a generator function that produces values lazily on demand?',
        options: ['yield', 'return', 'generate', 'emit'],
        correctAnswer: 0,
        explanation: 'The `yield` statement suspends function execution and returns a value to the caller, resuming state on subsequent iterations.',
        topic: 'Python Generators & Iterators',
      },
      {
        question: 'What is the purpose of the `__init__` method in Python classes?',
        options: [
          'It acts as the object constructor, initializing newly created object instance attributes',
          'It destroys the class instance from memory',
          'It imports external packages into the module',
          'It compiles the Python script to bytecode',
        ],
        correctAnswer: 0,
        explanation: '`__init__` is the initializer method called automatically when an object instance is instantiated.',
        topic: 'Python OOP Fundamentals',
      },
    ],
    medium: [
      {
        question: 'What is the Global Interpreter Lock (GIL) in standard CPython and what constraint does it impose on multi-threaded programs?',
        options: [
          'A mutex that allows only one native thread to execute Python bytecode at a time, preventing CPU-bound multi-threaded parallelism',
          'A security firewall that blocks unauthorized external network requests',
          'A database transaction lock used by SQLite',
          'A garbage collector mechanism that prevents cyclical references',
        ],
        correctAnswer: 0,
        explanation: 'The GIL prevents multiple native threads from executing Python bytecodes concurrently, necessitating multiprocessing for CPU parallelism.',
        topic: 'Python CPython Architecture & GIL',
      },
    ],
    difficult: [
      {
        question: 'How do Python Metaclasses differ from standard class inheritance?',
        options: [
          'A metaclass defines how classes themselves are created and structured (the class of a class), whereas inheritance defines behavior of object instances',
          'Metaclasses can only be executed on Linux systems',
          'Metaclasses convert Python code to C++ header files',
          'Metaclasses disable object garbage collection',
        ],
        correctAnswer: 0,
        explanation: 'Metaclasses inherit from `type` and intercept class creation to validate, modify, or auto-register classes dynamically.',
        topic: 'Python Metaclasses & Metaprogramming',
      },
    ],
  },

  'Machine Learning': {
    easy: [
      {
        question: 'What is the fundamental difference between Supervised Learning and Unsupervised Learning?',
        options: [
          'Supervised learning trains models on labeled input-output pairs, while unsupervised learning discovers patterns from unlabeled data',
          'Unsupervised learning requires 10x more GPU memory',
          'Supervised learning cannot be used for classification problems',
          'Supervised models never overfit on training datasets',
        ],
        correctAnswer: 0,
        explanation: 'Supervised learning learns a mapping from features to labeled targets; unsupervised algorithms group or cluster unlabelled data.',
        topic: 'ML Paradigm Fundamentals',
      },
      {
        question: 'What phenomenon occurs when a machine learning model learns training data noise and performs poorly on unseen test data?',
        options: ['Overfitting', 'Underfitting', 'Feature Scaling', 'Data Imputation'],
        correctAnswer: 0,
        explanation: 'Overfitting occurs when a high-variance model memorizes training noise rather than generalizable underlying patterns.',
        topic: 'ML Overfitting & Generalization',
      },
    ],
    medium: [
      {
        question: 'In gradient descent optimization, what is the role of the Learning Rate hyperparameter?',
        options: [
          'It scales the step size taken in the direction of the negative gradient towards the loss function minimum',
          'It determines the number of hidden layers in neural networks',
          'It specifies the random seed for dataset splitting',
          'It sets the maximum tree depth in Random Forest',
        ],
        correctAnswer: 0,
        explanation: 'The learning rate determines how far weights move along the gradient vector at each optimization step.',
        topic: 'ML Optimization & Gradient Descent',
      },
    ],
    difficult: [
      {
        question: 'How does L1 Regularization (Lasso) differ from L2 Regularization (Ridge) in linear models?',
        options: [
          'L1 adds absolute value penalties encouraging sparse feature weights (driving irrelevant weights to zero), while L2 adds squared penalties shrinking weights smoothly',
          'L2 removes features entirely while L1 doubles feature counts',
          'L1 can only be applied to decision trees',
          'L2 is incompatible with gradient descent',
        ],
        correctAnswer: 0,
        explanation: 'L1 regularization produces sparse feature selection due to diamond-shaped constraint boundaries, whereas L2 prevents extreme weight values without zeroing them.',
        topic: 'ML Regularization (L1 vs L2)',
      },
    ],
  },

  Pandas: {
    easy: [
      {
        question: 'Which Pandas function is most commonly used to load a comma-separated values file into a DataFrame?',
        options: ['pd.read_csv()', 'pd.load_csv()', 'pd.import_csv()', 'pd.parse_csv()'],
        correctAnswer: 0,
        explanation: '`pd.read_csv()` parses tabular data from CSV files and constructs a 2-dimensional labeled DataFrame.',
        topic: 'Pandas Data Ingestion',
      },
      {
        question: 'What is the primary 2-dimensional, size-mutable tabular data structure in Pandas?',
        options: ['DataFrame', 'Series', 'Panel', 'Matrix'],
        correctAnswer: 0,
        explanation: '`DataFrame` is the standard 2D labeled data structure with columns of potentially different types.',
        topic: 'Pandas Data Structures',
      },
    ],
    medium: [
      {
        question: 'In Pandas, what is the crucial difference between `.loc[]` and `.iloc[]` indexing operators?',
        options: [
          '`.loc[]` selects data by label or boolean condition, while `.iloc[]` selects by integer zero-based position index',
          '`.iloc[]` can only select single columns while `.loc[]` selects rows',
          '`.loc[]` modifies data on disk immediately',
          '`.iloc[]` is deprecated in modern Pandas versions',
        ],
        correctAnswer: 0,
        explanation: '`.loc` is label-based indexing (inclusive of slice endpoints); `.iloc` is integer position-based indexing (exclusive of stop index).',
        topic: 'Pandas Indexing & Slicing',
      },
    ],
    difficult: [
      {
        question: 'Why does vectorized operations in Pandas/NumPy drastically outperform iterative Python `for` loops across millions of rows?',
        options: [
          'Vectorized operations execute in compiled C/Fortran code operating on contiguous memory buffers without Python interpreter overhead and boxing',
          'Vectorized operations bypass RAM and run directly on SSD controllers',
          'Python for loops convert numeric floats into string characters',
          'Pandas automatically distributes every for loop across AWS EC2 instances',
        ],
        correctAnswer: 0,
        explanation: 'Vectorization pushes computation to low-level compiled SIMD machine instructions over contiguous memory blocks.',
        topic: 'Pandas Performance & Vectorization',
      },
    ],
  },

  NumPy: {
    easy: [
      {
        question: 'What is the core array object in NumPy that provides N-dimensional homogeneous array computation?',
        options: ['ndarray', 'arraylist', 'vector', 'dataframe'],
        correctAnswer: 0,
        explanation: 'The `ndarray` (N-dimensional array) is NumPy core object representing a homogeneous collection of elements in contiguous memory.',
        topic: 'NumPy ndarray Architecture',
      },
      {
        question: 'How do you create a 3x3 identity matrix using NumPy?',
        options: ['np.eye(3)', 'np.identity_matrix(3)', 'np.ones(3, 3)', 'np.zeros(3)'],
        correctAnswer: 0,
        explanation: '`np.eye(N)` creates a 2D array with ones on the main diagonal and zeros elsewhere.',
        topic: 'NumPy Matrix Creation',
      },
    ],
    medium: [
      {
        question: 'What is NumPy "Broadcasting" and how does it handle arrays of different shapes during arithmetic operations?',
        options: [
          'A set of rules allowing arithmetic operations on arrays of different dimensions without copying data if their trailing dimensions match or equal 1',
          'Transmitting array values across network sockets to other cluster nodes',
          'Converting integers to floating point numbers automatically',
          'Saving arrays to cloud storage buckets asynchronously',
        ],
        correctAnswer: 0,
        explanation: 'Broadcasting stretches dimensions of size 1 across compatible shapes without allocating redundant memory copies.',
        topic: 'NumPy Broadcasting Mechanism',
      },
    ],
    difficult: [
      {
        question: 'What is the difference between a NumPy array "View" and a "Copy" when slicing or reshaping data?',
        options: [
          'A View shares the underlying memory buffer with the original array (modifying it alters original data), while a Copy allocates a brand new memory buffer',
          'A View converts data into immutable tuples',
          'A Copy is 100x faster because it bypasses memory allocation',
          'NumPy never creates views under any circumstances',
        ],
        correctAnswer: 0,
        explanation: 'Slicing produces views that reference existing memory strides; explicit `copy()` allocates separate heap memory.',
        topic: 'NumPy Memory Layout & Strides',
      },
    ],
  },

  'Model Evaluation': {
    easy: [
      {
        question: 'For an imbalanced binary classification dataset (e.g. 99% negative, 1% fraud), why is Accuracy a misleading metric?',
        options: [
          'A naive model predicting negative for every sample achieves 99% accuracy while catching 0% of fraud cases',
          'Accuracy calculation causes division by zero errors on imbalanced data',
          'Accuracy cannot be calculated as a percentage',
          'Accuracy is only applicable to regression models',
        ],
        correctAnswer: 0,
        explanation: 'High accuracy is trivially achieved by majority class predictions; metrics like Precision, Recall, and PR-AUC are critical for imbalanced data.',
        topic: 'Model Evaluation Metrics',
      },
      {
        question: 'What is the formula for Precision in binary classification?',
        options: [
          'True Positives / (True Positives + False Positives)',
          'True Positives / (True Positives + False Negatives)',
          '(True Positives + True Negatives) / Total Samples',
          'False Positives / (False Positives + False Negatives)',
        ],
        correctAnswer: 0,
        explanation: 'Precision answers: "Of all instances the model predicted as positive, how many were actually positive?".',
        topic: 'Classification Metrics (Precision vs Recall)',
      },
    ],
    medium: [
      {
        question: 'What does the Area Under the ROC Curve (ROC-AUC) measure across classification thresholds?',
        options: [
          'The model ability to rank a randomly chosen positive instance higher than a randomly chosen negative instance across all decision thresholds',
          'The training speed in samples per second',
          'The exact amount of memory consumed by model weights',
          'The probability that test data contains outliers',
        ],
        correctAnswer: 0,
        explanation: 'ROC-AUC plots True Positive Rate against False Positive Rate across all classification thresholds, evaluating rank discrimination.',
        topic: 'ROC-AUC Evaluation',
      },
    ],
    difficult: [
      {
        question: 'Why should K-Fold Cross Validation feature scaling (e.g. StandardScaler) be fit strictly inside each cross-validation fold rather than on the whole dataset prior to splitting?',
        options: [
          'Fitting scalers on the whole dataset causes Data Leakage, transferring mean/variance statistics from validation folds into model training',
          'StandardScaler crashes when running on cross-validation folds',
          'K-Fold requires all numbers to remain unscaled integers',
          'It has no effect and is merely a stylistic preference',
        ],
        correctAnswer: 0,
        explanation: 'Data leakage occurs if validation data influences training preprocessing; transformations must be learned strictly inside the training fold.',
        topic: 'Data Leakage & Cross-Validation Rigor',
      },
    ],
  },

  // =========================================================================
  // BACKEND / CLOUD / CORE DISCIPLINE
  // =========================================================================
  'Node.js': {
    easy: [
      {
        question: 'What underlying C++ library provides the asynchronous event-driven I/O engine in Node.js?',
        options: ['libuv', 'V8 engine', 'libc', 'openssl'],
        correctAnswer: 0,
        explanation: 'libuv handles the event loop, thread pool, file system operations, and networking in Node.js.',
        topic: 'Node.js Internals (libuv)',
      },
      {
        question: 'What is the purpose of middleware functions in Express.js backend applications?',
        options: [
          'Functions that have access to request (req) and response (res) objects to execute code, modify objects, or terminate the request-response cycle',
          'Database drivers that manage PostgreSQL tables',
          'Compiler plugins that transpile JavaScript to C',
          'Frontend stylesheet bundlers',
        ],
        correctAnswer: 0,
        explanation: 'Middleware functions execute in pipeline order to process requests, authenticate tokens, parse bodies, and route traffic.',
        topic: 'Express.js Middleware Architecture',
      },
    ],
    medium: [
      {
        question: 'What is the difference between `process.nextTick()` and `setImmediate()` in Node.js event loop scheduling?',
        options: [
          '`process.nextTick()` fires immediately after current synchronous code before the event loop advances to the next phase; `setImmediate()` runs in the Check phase',
          '`setImmediate()` fires before any microtasks run',
          '`process.nextTick()` runs on an external worker thread',
          'They are exact aliases created for backward compatibility',
        ],
        correctAnswer: 0,
        explanation: '`process.nextTick` executes at the end of the current tick, while `setImmediate` is scheduled in the check phase of the event loop.',
        topic: 'Node.js Event Loop Microtasks',
      },
    ],
    difficult: [
      {
        question: 'When piping high-volume HTTP download streams to disk in Node.js, what problem does Stream Backpressure solve?',
        options: [
          'It pauses the fast reading source stream when the slow writing consumer buffer exceeds its highWaterMark, preventing memory exhaustion (OOM)',
          'It doubles the network bandwidth of the server',
          'It encrypts stream chunks with AES-256',
          'It converts binary streams into JSON strings automatically',
        ],
        correctAnswer: 0,
        explanation: 'Backpressure coordinates read and write speeds so slow writable streams are not flooded by faster readable streams.',
        topic: 'Node.js Streams & Backpressure',
      },
    ],
  },

  'REST APIs': {
    easy: [
      {
        question: 'Which HTTP method should be used according to RESTful standards when creating a brand new resource?',
        options: ['POST', 'GET', 'PUT', 'DELETE'],
        correctAnswer: 0,
        explanation: 'POST is standard for submitting entity representations to create new resources on the server.',
        topic: 'HTTP Methods in REST',
      },
      {
        question: 'Which HTTP response status code indicates that a requested resource was successfully created on the server?',
        options: ['201 Created', '200 OK', '204 No Content', '301 Moved Permanently'],
        correctAnswer: 0,
        explanation: 'HTTP 201 indicates the request succeeded and a new resource was created, typically returning a Location header.',
        topic: 'HTTP Status Codes',
      },
    ],
    medium: [
      {
        question: 'What is the definition of an Idempotent HTTP method in RESTful API design?',
        options: [
          'A method that produces the exact same server side-effect regardless of whether it is executed once or multiple times consecutively (e.g. GET, PUT, DELETE)',
          'A method that only works over HTTPS connections',
          'A method that caches responses in the browser for 24 hours',
          'A method that does not accept request headers',
        ],
        correctAnswer: 0,
        explanation: 'Idempotence means multiple identical requests have the same intended effect on the server state as a single request.',
        topic: 'REST API Idempotency',
      },
    ],
    difficult: [
      {
        question: 'What is HATEOAS (Hypermedia as the Engine of Application State) in Richardson Maturity Level 3 REST APIs?',
        options: [
          'Responses include hypermedia links (URIs) that inform the client dynamically of available actions and state transitions from that resource',
          'A schema migration tool for relational databases',
          'A JWT authentication protocol for OAuth 2.0',
          'A binary WebSocket compression format',
        ],
        correctAnswer: 0,
        explanation: 'HATEOAS provides self-descriptive hypermedia navigation links inside resource payloads for decoupled client navigation.',
        topic: 'Advanced REST Architecture (HATEOAS)',
      },
    ],
  },

  MongoDB: {
    easy: [
      {
        question: 'What format does MongoDB use internally to store flexible, schema-free documents?',
        options: ['BSON (Binary JSON)', 'XML', 'YAML', 'Plain Text CSV'],
        correctAnswer: 0,
        explanation: 'MongoDB stores records as BSON, a binary representation of JSON documents that supports additional data types like Date and BinData.',
        topic: 'MongoDB Document Model',
      },
    ],
    medium: [
      {
        question: 'In MongoDB aggregation framework, which pipeline stage groups documents by a specified key and calculates accumulated statistics?',
        options: ['$group', '$match', '$project', '$unwind'],
        correctAnswer: 0,
        explanation: '`$group` groups input documents by specified identifier expression and applies accumulator expressions.',
        topic: 'MongoDB Aggregation Framework',
      },
    ],
    difficult: [
      {
        question: 'How do Compound Indexes in MongoDB adhere to the "Equality, Sort, Range" (ESR) rule for optimal query performance?',
        options: [
          'Index fields should be ordered with exact equality matches first, followed by sort fields, and range filters last',
          'Range filters must always appear before equality filters',
          'Sort keys are always placed at index position 0',
          'ESR only applies to replica set secondary nodes',
        ],
        correctAnswer: 0,
        explanation: 'Following the ESR rule minimizes index scanning by filtering equality matches, avoiding in-memory sorts, and applying ranges last.',
        topic: 'MongoDB Indexing & ESR Rule',
      },
    ],
  },

  SQL: {
    easy: [
      {
        question: 'Which SQL clause is used to filter rows returned by a query before any grouping takes place?',
        options: ['WHERE', 'HAVING', 'ORDER BY', 'GROUP BY'],
        correctAnswer: 0,
        explanation: 'The WHERE clause filters individual rows before grouping, while HAVING filters groups after aggregation.',
        topic: 'SQL Filtering & Clauses',
      },
      {
        question: 'What is the key difference between INNER JOIN and LEFT JOIN in SQL?',
        options: [
          'INNER JOIN returns only matching rows from both tables, while LEFT JOIN returns all rows from the left table plus matches from the right',
          'LEFT JOIN returns only records where values are NULL in the right table',
          'INNER JOIN creates new table schemas dynamically',
          'LEFT JOIN is twice as fast because it ignores relational indexes',
        ],
        correctAnswer: 0,
        explanation: 'INNER JOIN outputs intersection; LEFT JOIN preserves all left-table rows, populating right-table columns with NULL if no match exists.',
        topic: 'SQL Joins & Relationships',
      },
    ],
    medium: [
      {
        question: 'How does a B-Tree index accelerate SQL query lookup performance?',
        options: [
          'It organizes sorted keys in a balanced tree allowing logarithmic O(log N) search time instead of full table scans O(N)',
          'It compresses table columns into zip archives in memory',
          'It executes queries in parallel across GPU threads',
          'It caches the entire database table into browser local storage',
        ],
        correctAnswer: 0,
        explanation: 'B-Tree indexes keep keys ordered in balanced nodes, reducing disk I/O operations required to locate rows.',
        topic: 'SQL Indexing & B-Trees',
      },
    ],
    difficult: [
      {
        question: 'In database ACID properties, what anomaly does the "Serializable" isolation level prevent that "Repeatable Read" permits?',
        options: [
          'Phantom Reads (concurrent transaction inserting new rows that match a range condition)',
          'Dirty Writes',
          'Dirty Reads',
          'Non-repeatable Reads',
        ],
        correctAnswer: 0,
        explanation: 'Serializable isolation guarantees concurrent transactions behave as if executed sequentially, preventing Phantom Reads.',
        topic: 'SQL ACID & Transaction Isolation Levels',
      },
    ],
  },

  Docker: {
    easy: [
      {
        question: 'In a Dockerfile, which instruction specifies the base image to build upon?',
        options: ['FROM', 'BASE', 'IMAGE', 'ROOT'],
        correctAnswer: 0,
        explanation: 'The `FROM` instruction initializes a new build stage and sets the base image for subsequent instructions.',
        topic: 'Docker Image Building',
      },
      {
        question: 'What is the main purpose of Docker multi-stage builds in continuous delivery pipelines?',
        options: [
          'To separate compile-time build dependencies from runtime assets, drastically minimizing production image size',
          'To run multiple containers on a single host network adapter simultaneously',
          'To automatically convert Linux containers into Windows binaries',
          'To bypass layer caching during automated CI builds',
        ],
        correctAnswer: 0,
        explanation: 'Multi-stage builds allow you to use intermediate images with compilers/build tools, copying only the final binary to a slim production image.',
        topic: 'Docker Multi-Stage Builds',
      },
    ],
    medium: [
      {
        question: 'How do Linux kernel cgroups and namespaces differ in their container isolation roles?',
        options: [
          'Namespaces isolate what a process can see (network, mount points, PIDs), while cgroups limit how much resource capacity it can use (CPU, memory, I/O)',
          'cgroups provide virtual disk filesystems while namespaces manage RAM allocation',
          'Namespaces manage CPU clock speeds while cgroups isolate network interfaces',
          'cgroups run in user-space while namespaces run in container firmware',
        ],
        correctAnswer: 0,
        explanation: 'Namespaces provide process boundary isolation; cgroups (control groups) provide resource accounting and limitation.',
        topic: 'Container Internals (cgroups & namespaces)',
      },
    ],
    difficult: [
      {
        question: 'How does Docker build cache invalidation work when executing consecutive `RUN` and `COPY` instructions?',
        options: [
          'Modifying a file in a `COPY` instruction invalidates the cache for that step and all subsequent instructions in the Dockerfile',
          'Docker rebuilds only the modified instruction and reuses downstream cached layers without re-evaluating them',
          'The cache is strictly timestamp-based and expires every 24 hours regardless of content changes',
          'Docker computes checksums for all files on the host before every command',
        ],
        correctAnswer: 0,
        explanation: 'When an instruction cache is busted (e.g. file content changed in COPY), all subsequent build layers must be re-executed.',
        topic: 'Docker Layer Caching & Invalidation',
      },
    ],
  },

  // =========================================================================
  // CLOUD, SYSTEMS, DATABASES & TESTING
  // =========================================================================
  DynamoDB: {
    easy: [
      {
        question: 'What type of database is Amazon DynamoDB and what is its primary data model?',
        options: [
          'A fully managed NoSQL key-value and document database providing single-digit millisecond latency at any scale',
          'A relational database with foreign key constraints and SQL joins',
          'A file storage system similar to NFS',
          'An in-memory Redis cache replacement that requires manual sharding',
        ],
        correctAnswer: 0,
        explanation: 'DynamoDB is a managed NoSQL database built for low-latency key-value and document queries.',
        topic: 'DynamoDB Core Model',
      },
    ],
    medium: [
      {
        question: 'In DynamoDB, what is the primary difference between a Partition Key (Hash Key) and a Composite Primary Key (Partition Key + Sort Key)?',
        options: [
          'Partition Key determines physical storage partition distribution, while the Sort Key allows range queries (`begins_with`, `between`, `<`) within that partition',
          'Partition keys store encrypted passwords while sort keys store usernames',
          'Partition keys are stored on disk while sort keys are stored in browser memory',
          'There is no difference; they are exact aliases',
        ],
        correctAnswer: 0,
        explanation: 'Partition keys determine partition hashing; sort keys organize items within the partition for range queries.',
        topic: 'DynamoDB Primary Keys & Range Queries',
      },
    ],
    difficult: [
      {
        question: 'Why should DynamoDB Global Secondary Indexes (GSI) be designed with sparse index patterns in mind?',
        options: [
          'Only items containing the GSI partition and sort key attributes are replicated into the index, saving write throughput and storage',
          'Sparse indexes disable eventual consistency on read replicas',
          'Sparse indexes convert DynamoDB tables into PostgreSQL tables automatically',
          'Sparse indexes prevent tables from autoscaling',
        ],
        correctAnswer: 0,
        explanation: 'DynamoDB only projects items into a GSI if the item contains the index key attributes (sparse indexing).',
        topic: 'DynamoDB GSI Index Design',
      },
    ],
  },

  Linux: {
    easy: [
      {
        question: 'In Linux / Unix, which command is used to display live process resource utilization, memory usage, and CPU load?',
        options: ['top (or htop)', 'grep', 'mkdir', 'chmod'],
        correctAnswer: 0,
        explanation: '`top` and `htop` display real-time Linux processes and system resource statistics.',
        topic: 'Linux Process Management',
      },
      {
        question: 'What does the `chmod 755 filename` command do in Linux permissions?',
        options: [
          'Grants Read, Write, Execute (rwx) to the Owner, and Read & Execute (r-x) to Group and Others',
          'Encrypts the file with AES-256',
          'Deletes the file permanently',
          'Changes the file owner to root',
        ],
        correctAnswer: 0,
        explanation: '7 (rwx) for user, 5 (r-x) for group, 5 (r-x) for others.',
        topic: 'Linux Permissions & Security',
      },
    ],
    medium: [
      {
        question: 'How do standard Linux file descriptors `0`, `1`, and `2` map to stream channels?',
        options: [
          '0 = STDIN (Standard Input), 1 = STDOUT (Standard Output), 2 = STDERR (Standard Error)',
          '0 = Root, 1 = User, 2 = Guest',
          '0 = HTTP, 1 = HTTPS, 2 = SSH',
          '0 = Read, 1 = Write, 2 = Execute',
        ],
        correctAnswer: 0,
        explanation: 'Standard Unix file descriptors: 0 is standard input, 1 is standard output, and 2 is standard error.',
        topic: 'Linux I/O Redirection & Streams',
      },
    ],
    difficult: [
      {
        question: 'What is the purpose of the Linux `/proc` pseudo-filesystem in operating system architecture?',
        options: [
          'It provides a real-time virtual interface to kernel data structures, hardware info, and per-process memory metrics without consuming disk space',
          'It stores boot sector binary images on the hard drive',
          'It is a temporary directory that is emptied on every reboot',
          'It acts as a swap space partition for virtual memory paging',
        ],
        correctAnswer: 0,
        explanation: '`/proc` is an in-memory virtual filesystem generated by the kernel exposing system and process states.',
        topic: 'Linux Kernel & Proc Filesystem',
      },
    ],
  },

  'System Design': {
    easy: [
      {
        question: 'What is the fundamental difference between Horizontal Scaling (Scaling Out) and Vertical Scaling (Scaling Up)?',
        options: [
          'Horizontal scaling adds more machines/instances to the pool, while vertical scaling adds more CPU/RAM to a single existing server',
          'Vertical scaling adds more network routers, while horizontal scaling adds fiber optic cables',
          'Horizontal scaling is only possible with relational databases',
          'Vertical scaling requires serverless architecture',
        ],
        correctAnswer: 0,
        explanation: 'Scaling out adds more commodity server nodes behind a load balancer, providing virtually unlimited elasticity.',
        topic: 'System Design Scaling Fundamentals',
      },
    ],
    medium: [
      {
        question: 'According to the CAP Theorem, in the presence of a Network Partition (P), what trade-off must distributed data systems make?',
        options: [
          'Choose between Consistency (C) (all nodes return latest data or error) or Availability (A) (all nodes return responses though not guaranteed latest)',
          'Choose between Security and Performance',
          'Choose between SQL and NoSQL databases',
          'Choose between HTTP/1.1 and HTTP/2',
        ],
        correctAnswer: 0,
        explanation: 'When network partitions occur in distributed systems, a system must choose between Consistency (CP) and Availability (AP).',
        topic: 'Distributed Systems & CAP Theorem',
      },
    ],
    difficult: [
      {
        question: 'How does Consistent Hashing minimize data movement when caching nodes or database shards are dynamically added or removed?',
        options: [
          'By mapping both keys and servers to a virtual ring hash space ($0$ to $2^{32}-1$), so node addition/removal only relocates $K/N$ keys on average',
          'By broadcasting every read request to all nodes concurrently',
          'By keeping all keys in a central Redis master instance',
          'By sorting keys in alphabetical order across disks',
        ],
        correctAnswer: 0,
        explanation: 'Consistent hashing bounds key redistribution to $K/N$ keys rather than reshuffling all keys ($K$).',
        topic: 'Consistent Hashing & Partitioning',
      },
    ],
  },

  'Testing/QA': {
    easy: [
      {
        question: 'What is the core distinction between Unit Testing and Integration Testing in software engineering?',
        options: [
          'Unit tests verify individual isolated functions/modules in memory, while integration tests verify cross-module communication and database/network interactions',
          'Unit tests are performed manually by QA engineers while integration tests are run by end users',
          'Integration tests only test CSS visual styles',
          'Unit tests cannot test asynchronous JavaScript promises',
        ],
        correctAnswer: 0,
        explanation: 'Unit tests isolate specific logic units; integration tests validate multiple collaborating components.',
        topic: 'Testing Hierarchy & Unit Testing',
      },
    ],
    medium: [
      {
        question: 'In Test-Driven Development (TDD), what is the correct sequence of the "Red-Green-Refactor" cycle?',
        options: [
          '1. Write a failing test (Red), 2. Write minimal code to pass the test (Green), 3. Clean and optimize the code (Refactor)',
          '1. Refactor production code, 2. Deploy to staging, 3. Write unit tests if errors occur',
          '1. Write documentation, 2. Write all tests, 3. Delete failing tests',
          '1. Ship to production (Green), 2. Wait for user bugs (Red), 3. Refactor',
        ],
        correctAnswer: 0,
        explanation: 'TDD follows Red (fail test), Green (pass test with simplest code), and Refactor (improve design).',
        topic: 'Test-Driven Development (TDD)',
      },
    ],
    difficult: [
      {
        question: 'What is the primary objective of Chaos Engineering and automated fault injection in production microservices?',
        options: [
          'To proactively uncover systemic weaknesses and verify resiliency mechanisms (circuit breakers, fallbacks) before natural production outages occur',
          'To test if load balancers can handle corrupted TCP packets',
          'To format database disks in staging environments',
          'To test server physical hardware temperatures',
        ],
        correctAnswer: 0,
        explanation: 'Chaos Engineering builds confidence in a distributed system’s capability to withstand turbulent production conditions.',
        topic: 'Resilience Testing & Chaos Engineering',
      },
    ],
  },
};

// ----------------------------------------------------------------------------
// Technical Scenario Generator for any validated JD skill
// ----------------------------------------------------------------------------
const SCENARIO_GENERATORS = [
  {
    type: 'concurrency',
    make: (skill, diff, uid) => ({
      question: `When designing high-concurrency systems using ${skill}, what technique prevents race conditions and data corruption under heavy parallel traffic? [Ref: ${uid}]`,
      options: [
        'Atomic operations or mutual exclusion locks with defined lock acquisition ordering',
        'Disabling thread context switching in operating system kernels',
        'Executing all operations synchronously in a single unbuffered loop',
        'Increasing client HTTP timeout durations',
      ],
      correctAnswer: 0,
      explanation: 'Synchronizing critical shared sections with atomic primitives or locks avoids race conditions.',
      topic: `${skill} Concurrency & Synchronization`,
    }),
  },
  {
    type: 'resilience',
    make: (skill, diff, uid) => ({
      question: `In a production ${skill} environment, what pattern protects upstream services from cascading failures when an external dependency is timing out? [Ref: ${uid}]`,
      options: [
        'Circuit Breaker with exponential backoff and jitter on retries',
        'Immediate infinite retries with zero delay',
        'Blocking threads indefinitely until the remote service responds',
        'Restarting the primary database container on every error',
      ],
      correctAnswer: 0,
      explanation: 'Circuit breakers fail fast to preserve local resources, while exponential backoff prevents thundering herds.',
      topic: `${skill} Fault Tolerance & Resiliency`,
    }),
  },
  {
    type: 'observability',
    make: (skill, diff, uid) => ({
      question: `When diagnosing performance bottlenecks and tail latency in a ${skill} application, what is the most effective approach? [Ref: ${uid}]`,
      options: [
        'Distributed tracing with OpenTelemetry and P99 latency monitoring across spans',
        'Reading raw console print statements on production servers',
        'Increasing CPU clock speed on virtual machines',
        'Disabling health check endpoints',
      ],
      correctAnswer: 0,
      explanation: 'Distributed tracing correlates end-to-end request durations across distributed microservice boundaries.',
      topic: `${skill} Observability & Monitoring`,
    }),
  },
  {
    type: 'security',
    make: (skill, diff, uid) => ({
      question: `Which defensive programming practice in ${skill} prevents unauthorized data exposure and injection vulnerabilities? [Ref: ${uid}]`,
      options: [
        'Strict schema validation, parameterized queries, and least-privilege access control',
        'Concatenating raw inputs into query strings',
        'Trusting client-side form validation without backend checks',
        'Disabling SSL certificates in development environments',
      ],
      correctAnswer: 0,
      explanation: 'Parameterized queries and input validation prevent code/command injection vulnerabilities.',
      topic: `${skill} Application Security`,
    }),
  },
  {
    type: 'architecture',
    make: (skill, diff, uid) => ({
      question: `When architecting a scalable service with ${skill}, why is stateless component design preferred? [Ref: ${uid}]`,
      options: [
        'It allows instances to be horizontally scaled up or down behind a load balancer without losing user session state',
        'It eliminates the need for RAM and CPU memory',
        'Databases can only accept connections from a single server IP',
        'Stateless services do not use network ports',
      ],
      correctAnswer: 0,
      explanation: 'Stateless services externalize state to datastores, enabling seamless horizontal autoscaling.',
      topic: `${skill} Architecture & Scalability`,
    }),
  },
  {
    type: 'caching',
    make: (skill, diff, uid) => ({
      question: `When optimizing high-throughput read paths in a ${skill} system, how does the Cache-Aside pattern prevent stale database reads? [Ref: ${uid}]`,
      options: [
        'The application reads from cache first; on cache miss, it loads from DB, populates the cache with a defined TTL, and explicitly invalidates on write updates',
        'It writes all records to local disk files before database commits',
        'It queries the database every 10 milliseconds in a polling background worker',
        'It converts all queries into HTTP GET requests',
      ],
      correctAnswer: 0,
      explanation: 'Cache-aside loads data on demand and pairs TTL expiration with explicit write-invalidation.',
      topic: `${skill} Caching & Performance`,
    }),
  },
  {
    type: 'data_integrity',
    make: (skill, diff, uid) => ({
      question: `In a distributed transaction involving ${skill}, what mechanism guarantees that duplicate network requests do not result in double execution? [Ref: ${uid}]`,
      options: [
        'Idempotency Keys stored with unique constraints in a transactional store',
        'Randomizing request timestamps on the client',
        'Ignoring HTTP POST responses and proceeding immediately',
        'Increasing connection pool sizes to infinity',
      ],
      correctAnswer: 0,
      explanation: 'Idempotency keys ensure identical operations can be safely retried without unintended side-effects.',
      topic: `${skill} Data Integrity & Idempotency`,
    }),
  },
  {
    type: 'database_indexing',
    make: (skill, diff, uid) => ({
      question: `When querying large datasets in ${skill}, why does creating composite indexes with appropriate column ordering dramatically reduce query latency? [Ref: ${uid}]`,
      options: [
        'It allows B-tree index traversal matching the query WHERE filter and sort order directly, eliminating expensive full table scans',
        'It compresses all database rows into a single zip file in memory',
        'It bypasses operating system security policies',
        'It enables asynchronous execution on client GPUs',
      ],
      correctAnswer: 0,
      explanation: 'Composite indexes provide direct tree lookups matching equality and range filters in order.',
      topic: `${skill} Database & Indexing Strategy`,
    }),
  },
  {
    type: 'error_handling',
    make: (skill, diff, uid) => ({
      question: `What is the recommended design practice in ${skill} for handling unexpected runtime errors without crashing the main service thread? [Ref: ${uid}]`,
      options: [
        'Centralized error-handling middleware, structured error logging, and graceful process degradation with health checks',
        'Catching errors with empty try/catch blocks and silently ignoring all failures',
        'Terminating the operating system immediately upon any warning',
        'Sending all error stack traces directly to untrusted client browsers',
      ],
      correctAnswer: 0,
      explanation: 'Centralized error filters log diagnostics safely and ensure clean status codes and graceful degradation.',
      topic: `${skill} Error Handling & Reliability`,
    }),
  },
  {
    type: 'testing_strategy',
    make: (skill, diff, uid) => ({
      question: `When writing automated integration tests for a ${skill} service, what is the best practice for isolating third-party external APIs? [Ref: ${uid}]`,
      options: [
        'Mocking external network boundaries using test doubles or mock HTTP servers with realistic response payloads',
        'Calling live third-party production endpoints on every commit test run',
        'Disabling test assertions in CI/CD pipelines',
        'Testing only happy-path scenarios without failure cases',
      ],
      correctAnswer: 0,
      explanation: 'Mocking external boundaries guarantees fast, deterministic test suites without external flakiness.',
      topic: `${skill} Testing & Quality Assurance`,
    }),
  },
  {
    type: 'acid_transactions',
    make: (skill, diff, uid) => ({
      question: `When executing critical transactional writes in a ${skill} application, which isolation level provides the strongest guarantee against dirty reads, non-repeatable reads, and phantom reads? [Ref: ${uid}]`,
      options: [
        'Serializable',
        'Read Uncommitted',
        'Read Committed',
        'Repeatable Read without predicate locks',
      ],
      correctAnswer: 0,
      explanation: 'Serializable isolation provides the strictest consistency by completely isolating concurrent transaction execution.',
      topic: `${skill} ACID Transactions & Isolation`,
    }),
  },
  {
    type: 'rate_limiting',
    make: (skill, diff, uid) => ({
      question: `To protect a public ${skill} API endpoint against burst traffic spikes while maintaining steady throughput, which rate-limiting algorithm is most suitable? [Ref: ${uid}]`,
      options: [
        'Token Bucket algorithm with configurable bucket capacity and constant refill rate',
        'Fixed Window Counter with immediate reset on every request',
        'Disabling HTTP status code 429 Too Many Requests',
        'Blocking all client IP addresses on high CPU utilization',
      ],
      correctAnswer: 0,
      explanation: 'Token bucket smoothly handles temporary burst traffic while enforcing average rate ceilings over time.',
      topic: `${skill} Rate Limiting & API Protection`,
    }),
  },
  {
    type: 'distributed_locking',
    make: (skill, diff, uid) => ({
      question: `When synchronizing critical resource execution across multiple distributed instances in a ${skill} microservices environment, what mechanism ensures mutual exclusion with auto-recovery on node crashes? [Ref: ${uid}]`,
      options: [
        'Distributed lock manager (e.g. Redlock or etcd/Consul leases) with time-to-live (TTL) and heartbeat renewers',
        'Local in-memory mutex variable on one container instance',
        'Sleep timers on client web applications',
        'Ignoring concurrent execution conflicts',
      ],
      correctAnswer: 0,
      explanation: 'Distributed leases with TTL prevent deadlocks if the lock holder fails before releasing.',
      topic: `${skill} Distributed Locking & Consensus`,
    }),
  },
  {
    type: 'memory_profiling',
    make: (skill, diff, uid) => ({
      question: `When investigating an escalating heap memory leak in a long-running production ${skill} server, what is the most reliable debugging workflow? [Ref: ${uid}]`,
      options: [
        'Capturing differential heap snapshots over time to identify retained objects that fail garbage collection',
        'Increasing physical server RAM without inspecting code',
        'Restarting the server automatically every 5 minutes',
        'Disabling garbage collection in the runtime flags',
      ],
      correctAnswer: 0,
      explanation: 'Heap snapshot diffs pinpoint growing retainers and uncleared object references.',
      topic: `${skill} Memory Management & Profiling`,
    }),
  },
  {
    type: 'rest_idempotency',
    make: (skill, diff, uid) => ({
      question: `According to standard RESTful API conventions in ${skill}, which set of HTTP methods must be implemented as strictly idempotent? [Ref: ${uid}]`,
      options: [
        'GET, PUT, DELETE, and HEAD',
        'POST and PATCH only',
        'POST, CONNECT, and TRACE only',
        'No HTTP methods are idempotent by definition',
      ],
      correctAnswer: 0,
      explanation: 'Idempotent methods produce the exact same server state regardless of whether they are executed once or multiple times.',
      topic: `${skill} RESTful Architecture & Idempotency`,
    }),
  },
  {
    type: 'linux_signals',
    make: (skill, diff, uid) => ({
      question: `When running a containerized ${skill} service on Linux, which OS signal should the application handle to gracefully drain in-flight requests before terminating? [Ref: ${uid}]`,
      options: [
        'SIGTERM (Signal 15) to trigger graceful server drain and cleanup before SIGKILL (Signal 9) force-kills the process',
        'SIGKILL directly to terminate all threads instantly',
        'SIGSTOP to pause background tasks indefinitely',
        'SIGHUP to restart the operating system kernel',
      ],
      correctAnswer: 0,
      explanation: 'SIGTERM notifies applications to stop accepting new requests, finish active workloads, and close database connections cleanly.',
      topic: `${skill} Linux Process Signals & Lifecycle`,
    }),
  },
  {
    type: 'git_branching',
    make: (skill, diff, uid) => ({
      question: `In modern engineering workflows using ${skill}, what is the primary benefit of rebasing feature branches against main before opening a pull request? [Ref: ${uid}]`,
      options: [
        'It produces a clean, linear commit history that simplifies code reviews and git bisect debugging',
        'It compresses all Git files to zero bytes on disk',
        'It automatically approves all pull request reviews',
        'It disables merge conflict detection',
      ],
      correctAnswer: 0,
      explanation: 'Rebasing replays feature commits on top of current main, avoiding noisy merge bubbles.',
      topic: `${skill} Git Workflow & Version Control`,
    }),
  },
  {
    type: 'load_balancing',
    make: (skill, diff, uid) => ({
      question: `When deploying multiple backend instances of a ${skill} application behind a load balancer, how does Consistent Hashing minimize cache invalidation during horizontal node scaling? [Ref: ${uid}]`,
      options: [
        'It maps both servers and keys to a virtual hash ring, remapping only K/N keys when a server joins or leaves',
        'It re-encrypts all database passwords on every request',
        'It converts all TCP traffic into UDP datagrams',
        'It forces all clients to connect to a single IP address',
      ],
      correctAnswer: 0,
      explanation: 'Consistent hashing avoids remapping the entire key space when cluster capacity changes dynamically.',
      topic: `${skill} Load Balancing & Distributed Architecture`,
    }),
  },
  {
    type: 'solid_principles',
    make: (skill, diff, uid) => ({
      question: `In software architecture and OOP with ${skill}, what is the core mandate of the Dependency Inversion Principle (DIP)? [Ref: ${uid}]`,
      options: [
        'High-level modules should depend on abstractions/interfaces rather than concrete low-level implementations',
        'Subclasses should override all parent methods with empty functions',
        'Every class must have exactly one line of code',
        'All variables must be declared as global singletons',
      ],
      correctAnswer: 0,
      explanation: 'DIP decouples high-level business rules from specific infrastructure implementations through interfaces.',
      topic: `${skill} SOLID Design Principles`,
    }),
  },
  {
    type: 'dsa_complexity',
    make: (skill, diff, uid) => ({
      question: `When searching or inserting items in an AVL Tree or Red-Black Tree data structure in ${skill}, what is the worst-case time complexity guaranteed by self-balancing? [Ref: ${uid}]`,
      options: [
        'O(log n) time complexity because tree height is strictly bounded by logarithmic depth',
        'O(n^2) quadratic time complexity',
        'O(1) constant time with zero memory lookups',
        'O(n!) factorial time complexity',
      ],
      correctAnswer: 0,
      explanation: 'Balanced BSTs guarantee O(log n) height by performing rotations on insertions and deletions.',
      topic: `${skill} Data Structures & Complexity`,
    }),
  },
  {
    type: 'event_driven_saga',
    make: (skill, diff, uid) => ({
      question: `In an event-driven distributed system involving ${skill}, how does the Saga pattern maintain data consistency across decoupled services without distributed two-phase commit (2PC) locks? [Ref: ${uid}]`,
      options: [
        'By executing a sequence of local transactions where failures trigger explicit compensating transactions in reverse order',
        'By acquiring exclusive database table locks across all microservices simultaneously',
        'By storing all service data in a single global CSV spreadsheet',
        'By disabling transaction rollbacks completely',
      ],
      correctAnswer: 0,
      explanation: 'Sagas coordinate local transactions and compensating actions via choreographies or orchestrators.',
      topic: `${skill} Distributed Sagas & Event Architecture`,
    }),
  },
];

/**
 * Generates exactly 30 unique, non-repeating quiz questions tailored to:
 * - The COMPANY JD (primary driver)
 * - Required skills & technical topics
 * - Candidate's identified skill gaps & areas to focus
 * - Dynamic refresh seeds with strict duplicate rejection
 */
const generateUniqueQuizQuestions = async ({
  studentId,
  targetJobId,
  difficulty = 'mixed',
  count = 30,
  company = 'Target Company',
  jobTitle = 'Software Engineer',
  jdText = '',
  resumeSkills = [],
  jdSkills = [],
  analysis = {},
  previousQuestions = [],
  weakTopics = [],
}) => {
  const targetCount = Math.max(1, count || 30);
  const diff = ['easy', 'medium', 'difficult'].includes(difficulty) ? difficulty : 'mixed';

  // 1. EXTRACT ALL VALIDATED JD SKILLS
  const jdSkillSet = new Set();
  const jdPriorityMap = {};

  if (analysis && Array.isArray(analysis.jdRequirements)) {
    analysis.jdRequirements.forEach((r) => {
      const skillName = typeof r === 'object' ? r.skill : r;
      if (skillName) {
        jdSkillSet.add(skillName);
        jdPriorityMap[skillName] = (typeof r === 'object' && r.importance) || 'medium';
      }
    });
  }

  // Also include skills from areasToFocus / importantTopics
  const focusAreas = analysis.areasToFocus || analysis.importantTopics || [];
  focusAreas.forEach((item) => {
    const skillName = typeof item === 'object' ? item.skill : item;
    if (skillName && typeof skillName === 'string') {
      jdSkillSet.add(skillName);
      if (!jdPriorityMap[skillName]) jdPriorityMap[skillName] = 'high';
    }
  });

  // Also include any JD skills passed directly
  (jdSkills || []).forEach((s) => {
    if (s) {
      jdSkillSet.add(s);
      if (!jdPriorityMap[s]) jdPriorityMap[s] = 'medium';
    }
  });

  // If JD skills list is empty (edge case), fallback to standard placement competencies
  if (jdSkillSet.size === 0) {
    const fallbackList = ['React', 'Node.js', 'SQL', 'REST APIs', 'Docker', 'DSA', 'System Design', 'Linux', 'AWS'];
    fallbackList.forEach((s) => jdSkillSet.add(s));
  }

  // 2. PRIORITIZE QUESTIONS ACCORDING TO JD REQUIREMENTS & GAPS
  const prioritizedSkills = [];

  // A. High-priority missing JD skills from resume (Top Priority)
  const skillsToImprove = analysis.skillsToImprove || analysis.missingSkills || [];
  skillsToImprove.forEach((s) => {
    const skillName = typeof s === 'object' ? s.skill : s;
    if (skillName && jdSkillSet.has(skillName) && !prioritizedSkills.includes(skillName)) {
      if (jdPriorityMap[skillName] === 'high') {
        prioritizedSkills.push(skillName);
      }
    }
  });

  // B. Weak topics from previous quizzes IF relevant to the current JD
  (weakTopics || []).forEach((topic) => {
    for (const jdSkill of jdSkillSet) {
      if (topic && topic.toLowerCase().includes(jdSkill.toLowerCase()) && !prioritizedSkills.includes(jdSkill)) {
        prioritizedSkills.push(jdSkill);
      }
    }
  });

  // C. Remaining skills to improve in JD
  skillsToImprove.forEach((s) => {
    const skillName = typeof s === 'object' ? s.skill : s;
    if (skillName && jdSkillSet.has(skillName) && !prioritizedSkills.includes(skillName)) {
      prioritizedSkills.push(skillName);
    }
  });

  // D. Matched JD skills for interview verification
  const matchedSkills = analysis.matchedSkills || [];
  matchedSkills.forEach((s) => {
    const skillName = typeof s === 'object' ? s.skill : s;
    if (skillName && jdSkillSet.has(skillName) && !prioritizedSkills.includes(skillName)) {
      prioritizedSkills.push(skillName);
    }
  });

  // E. Any other JD skill not yet in the list
  for (const s of jdSkillSet) {
    if (!prioritizedSkills.includes(s)) prioritizedSkills.push(s);
  }

  // 3. TRACK PREVIOUS QUESTIONS FOR STRICT DEDUPLICATION
  const previousNormalizedSet = new Set();
  (previousQuestions || []).forEach((q) => {
    const norm = normalizeQuestionText(q);
    if (norm) previousNormalizedSet.add(norm);
  });

  const currentNormalizedSet = new Set();
  const finalQuestions = [];

  const isQuestionUnique = (text, threshold = 0.65) => {
    const norm = normalizeQuestionText(text);
    if (!norm) return false;

    if (previousNormalizedSet.has(norm) || currentNormalizedSet.has(norm)) {
      return false;
    }

    for (const prev of previousNormalizedSet) {
      if (calculateSimilarity(norm, prev) > threshold) return false;
    }

    for (const curr of currentNormalizedSet) {
      if (calculateSimilarity(norm, curr) > threshold) return false;
    }

    return true;
  };

  const addQuestion = (candidate) => {
    if (!candidate || !candidate.question || !Array.isArray(candidate.options)) return false;
    const norm = normalizeQuestionText(candidate.question);
    currentNormalizedSet.add(norm);

    // Shuffle options so correct answer is randomly distributed among A, B, C, D
    const originalOptions = candidate.options.map((opt) => (typeof opt === 'object' ? opt.text : opt));
    const correctIdx = typeof candidate.correctAnswer === 'number'
      ? candidate.correctAnswer
      : typeof candidate.correctAnswerIndex === 'number'
      ? candidate.correctAnswerIndex
      : 0;

    const indexedOptions = originalOptions.map((text, idx) => ({ text, isCorrect: idx === correctIdx }));
    // Shuffle
    const shuffled = [...indexedOptions].sort(() => Math.random() - 0.5);
    const finalOptionsList = shuffled.map((o) => o.text);
    const finalCorrectIndex = shuffled.findIndex((o) => o.isCorrect);

    const questionDifficulty = candidate.difficulty || (diff === 'mixed' ? ['easy', 'medium', 'difficult'][finalQuestions.length % 3] : diff);
    const questionId = `q_p30_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    finalQuestions.push({
      questionId,
      question: candidate.question,
      normalizedQuestion: norm,
      options: finalOptionsList,
      correctAnswer: finalCorrectIndex !== -1 ? finalCorrectIndex : 0,
      explanation: candidate.explanation || 'Refer to modern engineering standards and best practices.',
      topic: candidate.topic || 'Core Concept',
      difficulty: questionDifficulty,
    });
    return true;
  };

  // -------------------------------------------------------------------------
  // PASS 0: DYNAMIC GEMINI AI GENERATION (Real AI-generated tailored questions)
  // -------------------------------------------------------------------------
  const geminiQuestions = await generateGeminiAIQuizQuestions({
    company,
    jobTitle,
    jdText,
    matchedSkills: analysis.matchedSkills || [],
    missingSkills: analysis.skillsToImprove || analysis.missingSkills || [],
    prioritizedSkills,
    previousQuestions,
    targetCount,
    diff,
  });

  for (const gq of geminiQuestions) {
    if (finalQuestions.length >= targetCount) break;
    if (isQuestionUnique(gq.question, 0.65)) {
      addQuestion(gq);
    }
  }

  // -------------------------------------------------------------------------
  // PASS 1: CURATED QUESTION BANK (RANDOM SHUFFLE PER SKILL & TIER)
  // -------------------------------------------------------------------------
  const shuffledSkills = [...prioritizedSkills].sort(() => Math.random() - 0.3);

  for (const skill of shuffledSkills) {
    if (finalQuestions.length >= targetCount) break;
    const bank = SKILL_QUESTION_BANK[skill];
    if (!bank) continue;

    const tiers = diff === 'mixed' ? ['easy', 'medium', 'difficult'] : [diff, 'medium', 'easy'];
    for (const t of tiers) {
      const available = bank[t] || [];
      const shuffledAvailable = [...available].sort(() => Math.random() - 0.5);
      for (const item of shuffledAvailable) {
        if (finalQuestions.length >= targetCount) break;
        if (isQuestionUnique(item.question, 0.65)) {
          addQuestion({ ...item, difficulty: t });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // PASS 2: TECHNICAL SCENARIO GENERATORS (RANDOM START OFFSET & SEEDS)
  // -------------------------------------------------------------------------
  let scenarioIdx = Math.floor(Math.random() * 1000);
  let attemptCount = 0;
  const maxAttempts = 300;

  while (finalQuestions.length < targetCount && attemptCount < maxAttempts) {
    attemptCount++;
    const skill = prioritizedSkills[scenarioIdx % prioritizedSkills.length];
    const generator = SCENARIO_GENERATORS[scenarioIdx % SCENARIO_GENERATORS.length];
    const currentDiff = diff === 'mixed' ? ['easy', 'medium', 'difficult'][scenarioIdx % 3] : diff;
    scenarioIdx++;

    const uid = `S${scenarioIdx}-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString('hex')}`;
    const candidate = generator.make(skill, currentDiff, uid);

    if (isQuestionUnique(candidate.question, 0.65)) {
      addQuestion(candidate);
    }
  }

  // -------------------------------------------------------------------------
  // PASS 3: RELAXED SIMILARITY (0.85 THRESHOLD) FOR GUARANTEED TARGET QUESTIONS
  // -------------------------------------------------------------------------
  let pass3Guard = Math.floor(Math.random() * 500);
  let pass3Count = 0;
  while (finalQuestions.length < targetCount && pass3Count++ < 200) {
    pass3Guard++;
    const skill = prioritizedSkills[pass3Guard % prioritizedSkills.length];
    const generator = SCENARIO_GENERATORS[pass3Guard % SCENARIO_GENERATORS.length];
    const currentDiff = diff === 'mixed' ? ['easy', 'medium', 'difficult'][pass3Guard % 3] : diff;
    const uid = `P3-${pass3Guard}-${crypto.randomBytes(2).toString('hex')}`;
    const candidate = generator.make(skill, currentDiff, uid);

    if (isQuestionUnique(candidate.question, 0.85)) {
      addQuestion(candidate);
    }
  }

  // -------------------------------------------------------------------------
  // PASS 4: ABSOLUTE STRING UNIQUENESS GUARANTEE (FALLBACK FILLER)
  // -------------------------------------------------------------------------
  let pass4Guard = Math.floor(Math.random() * 500);
  let pass4Count = 0;
  while (finalQuestions.length < targetCount && pass4Count++ < 100) {
    pass4Guard++;
    const skill = prioritizedSkills[pass4Guard % prioritizedSkills.length];
    const generator = SCENARIO_GENERATORS[pass4Guard % SCENARIO_GENERATORS.length];
    const currentDiff = diff === 'mixed' ? ['easy', 'medium', 'difficult'][pass4Guard % 3] : diff;
    const uid = `G-${pass4Guard}-${crypto.randomBytes(3).toString('hex')}`;
    const candidate = generator.make(skill, currentDiff, uid);
    const norm = normalizeQuestionText(candidate.question);

    if (!previousNormalizedSet.has(norm) && !currentNormalizedSet.has(norm)) {
      addQuestion(candidate);
    }
  }

  return finalQuestions.slice(0, targetCount);
};

module.exports = {
  normalizeQuestionText,
  calculateSimilarity,
  generateUniqueQuizQuestions,
};
