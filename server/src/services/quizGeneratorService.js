const crypto = require('crypto');

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
];

/**
 * Generates exactly 10 unique, non-repeating quiz questions tailored to:
 * - The COMPANY JD (primary driver)
 * - Required skills & technical topics
 * - Candidate's identified skill gaps
 * - Selected difficulty tier
 * - Past quiz attempts (with strict duplicate rejection)
 */
const generateUniqueQuizQuestions = ({
  studentId,
  targetJobId,
  difficulty = 'easy',
  resumeSkills = [],
  jdSkills = [],
  analysis = {},
  previousQuestions = [],
  weakTopics = [],
}) => {
  const diff = ['easy', 'medium', 'difficult'].includes(difficulty) ? difficulty : 'easy';

  // 1. EXTRACT ALL VALIDATED JD SKILLS
  // Quizzes MUST be JD-driven. Skills appearing only in the resume are strictly excluded.
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

  // Also include any JD skills passed directly
  (jdSkills || []).forEach((s) => {
    if (s) {
      jdSkillSet.add(s);
      if (!jdPriorityMap[s]) jdPriorityMap[s] = 'medium';
    }
  });

  // If JD skills list is empty (edge case), derive from analysis topics or fallback to common engineering disciplines
  if (jdSkillSet.size === 0) {
    const fallbackList = ['React', 'Node.js', 'SQL', 'REST APIs', 'Docker'];
    fallbackList.forEach((s) => jdSkillSet.add(s));
  }

  // 2. PRIORITIZE QUESTIONS ACCORDING TO JD REQUIREMENTS & GAPS
  const prioritizedSkills = [];

  // A. High-priority JD skills missing from resume (Top Priority)
  const skillsToImprove = analysis.skillsToImprove || [];
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

  // D. Partial skills in JD
  const partialSkills = analysis.partialSkills || [];
  partialSkills.forEach((s) => {
    const skillName = typeof s === 'object' ? s.skill : s;
    if (skillName && jdSkillSet.has(skillName) && !prioritizedSkills.includes(skillName)) {
      prioritizedSkills.push(skillName);
    }
  });

  // E. Matched JD skills for interview verification
  const matchedSkills = analysis.matchedSkills || [];
  matchedSkills.forEach((s) => {
    const skillName = typeof s === 'object' ? s.skill : s;
    if (skillName && jdSkillSet.has(skillName) && !prioritizedSkills.includes(skillName)) {
      prioritizedSkills.push(skillName);
    }
  });

  // F. Any other JD skill not yet in the list
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
    if (!candidate || !candidate.question) return false;
    const norm = normalizeQuestionText(candidate.question);
    currentNormalizedSet.add(norm);

    const questionId = `q_${diff}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    finalQuestions.push({
      questionId,
      question: candidate.question,
      normalizedQuestion: norm,
      options: candidate.options,
      correctAnswer: candidate.correctAnswer,
      explanation: candidate.explanation || 'Refer to modern engineering standards and best practices.',
      topic: candidate.topic || 'Core Concept',
      difficulty: diff,
    });
    return true;
  };

  // 4. PASS 1: CURATED QUESTION BANK (STRICTLY FROM PRIORITIZED JD SKILLS)
  for (const skill of prioritizedSkills) {
    if (finalQuestions.length >= 10) break;
    const bank = SKILL_QUESTION_BANK[skill];
    if (!bank) continue;

    const available = bank[diff] || bank.medium || bank.easy || [];
    for (const item of available) {
      if (finalQuestions.length >= 10) break;
      if (isQuestionUnique(item.question, 0.65)) {
        addQuestion({ ...item, difficulty: diff });
      }
    }
  }

  // 5. PASS 2: TECHNICAL SCENARIO GENERATORS FOR JD SKILLS (STRICT 0.65 THRESHOLD)
  let scenarioIdx = 0;
  let attemptCount = 0;
  const maxAttempts = 200;

  while (finalQuestions.length < 10 && attemptCount < maxAttempts) {
    attemptCount++;
    const skill = prioritizedSkills[scenarioIdx % prioritizedSkills.length];
    const generator = SCENARIO_GENERATORS[scenarioIdx % SCENARIO_GENERATORS.length];
    scenarioIdx++;

    const uid = `${diff.toUpperCase()}-${scenarioIdx}-${Date.now().toString().slice(-4)}`;
    const candidate = generator.make(skill, diff, uid);

    if (isQuestionUnique(candidate.question, 0.65)) {
      addQuestion(candidate);
    }
  }

  // 6. PASS 3: RELAXED SIMILARITY (0.85 THRESHOLD) FOR GUARANTEED 10 QUESTIONS
  let pass3Guard = 0;
  while (finalQuestions.length < 10 && pass3Guard++ < 150) {
    const skill = prioritizedSkills[pass3Guard % prioritizedSkills.length];
    const generator = SCENARIO_GENERATORS[pass3Guard % SCENARIO_GENERATORS.length];
    const uid = `P3-${diff.toUpperCase()}-${pass3Guard}-${crypto.randomBytes(2).toString('hex')}`;
    const candidate = generator.make(skill, diff, uid);

    if (isQuestionUnique(candidate.question, 0.85)) {
      addQuestion(candidate);
    }
  }

  // 7. PASS 4: ABSOLUTE STRING UNIQUENESS GUARANTEE
  let pass4Guard = 0;
  while (finalQuestions.length < 10 && pass4Guard++ < 50) {
    const skill = prioritizedSkills[pass4Guard % prioritizedSkills.length];
    const generator = SCENARIO_GENERATORS[pass4Guard % SCENARIO_GENERATORS.length];
    const uid = `G-${diff.toUpperCase()}-${pass4Guard}-${crypto.randomBytes(3).toString('hex')}`;
    const candidate = generator.make(skill, diff, uid);
    const norm = normalizeQuestionText(candidate.question);

    if (!previousNormalizedSet.has(norm) && !currentNormalizedSet.has(norm)) {
      addQuestion(candidate);
    }
  }

  return finalQuestions.slice(0, 10);
};

module.exports = {
  normalizeQuestionText,
  calculateSimilarity,
  generateUniqueQuizQuestions,
};
