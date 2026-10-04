const assert = require('assert');
const { analyzeSkillGap, findResumeSkillEvidence } = require('./src/services/resumeParserService');

/**
 * Universal Multi-Case Test Matrix for AI Skill Gap Analysis Engine.
 * Tests 9 distinct real-world domains, complex candidate resumes, implication graphs, and varied company JDs.
 */
async function runUniversalTestMatrix() {
  console.log('================================================================');
  console.log('🚀 RUNNING UNIVERSAL AI SKILL GAP ANALYSIS MULTI-CASE TEST MATRIX');
  console.log('================================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const runCase = (caseNumber, title, resumeText, jdText, expectedMatches, expectedMissing, domainKey) => {
    totalTests++;
    console.log(`\n----------------------------------------------------------------`);
    console.log(`📌 CASE ${caseNumber}: ${title}`);
    console.log(`----------------------------------------------------------------`);

    const result = analyzeSkillGap({
      resumeText,
      jdText,
    });

    const matchedSet = new Set(result.matchedSkills.map((s) => s.toLowerCase()));
    const missingSet = new Set(result.missingSkills.map((s) => s.toLowerCase()));

    let caseFailed = false;

    // Check Expected Matches (Must be in matchedSkills, NOT in missingSkills)
    expectedMatches.forEach((skill) => {
      const lower = skill.toLowerCase();
      if (!matchedSet.has(lower)) {
        console.error(`  ❌ Match Verification Failed: '${skill}' should be MATCHED, but was NOT found in matchedSkills.`);
        caseFailed = true;
      } else if (missingSet.has(lower)) {
        console.error(`  ❌ False Missing Bug: '${skill}' is present in resume but was falsely categorized as MISSING.`);
        caseFailed = true;
      } else {
        console.log(`  ✅ Verified Match: '${skill}' correctly matched with evidence.`);
      }
    });

    // Check Expected Missing Skills (Must be in missingSkills, NOT in matchedSkills)
    expectedMissing.forEach((skill) => {
      const lower = skill.toLowerCase();
      if (!missingSet.has(lower)) {
        console.error(`  ❌ Missing Skill Verification Failed: '${skill}' should be MISSING, but was NOT found in missingSkills.`);
        caseFailed = true;
      } else if (matchedSet.has(lower)) {
        console.error(`  ❌ False Positive Match: '${skill}' is absent from resume but was marked as MATCHED.`);
        caseFailed = true;
      } else {
        console.log(`  ✅ Verified Gap: '${skill}' correctly identified as a missing requirement.`);
      }
    });

    // Check Action Plans & Topics Generation
    if (!result.areasToFocus || result.areasToFocus.length === 0) {
      console.error(`  ❌ Areas to Focus Failed: No preparation roadmap generated.`);
      caseFailed = true;
    } else {
      console.log(`  ✅ Roadmap Generated: ${result.areasToFocus.length} prioritized topics generated.`);
    }

    if (!caseFailed) {
      console.log(`🎉 CASE ${caseNumber} PASSED PERFECTLY (Zero Anomaly)!`);
      passedTests++;
    } else {
      console.error(`💥 CASE ${caseNumber} FAILED.`);
      failedTests++;
    }
  };

  // =========================================================================
  // CASE 1: FULL STACK WEB DEVELOPER (MERN Stack)
  // Target: Stripe / FinTech - Senior Full Stack Engineer
  // =========================================================================
  const resume1 = `
  EMILY ZHANG
  Full Stack Software Engineer | React, Node.js, Cloud Architectures
  
  EXPERIENCE & PROJECTS:
  - Developed scalable web applications using React.js, Redux Toolkit, and Tailwind CSS.
  - Built high-concurrency microservices using Node.js, Express, and REST APIs.
  - Integrated MongoDB document models with Mongoose, optimizing aggregation pipelines.
  - Managed version control workflows using Git and GitHub.
  
  TECHNICAL SKILLS:
  Languages: JavaScript, HTML/CSS
  Frameworks: React, Express, Node.js
  Databases & Tools: MongoDB, Git, Linux
  `;

  const jd1 = `
  COMPANY: Stripe
  ROLE: Senior Full Stack Engineer
  REQUIREMENTS:
  - Strong proficiency with React, JavaScript, HTML/CSS, Node.js, and REST APIs.
  - Experience with MongoDB or NoSQL databases.
  - Version control workflows using Git.
  - Required hands-on experience with TypeScript for type-safe applications.
  - Experience with Docker containerization and AWS cloud infrastructure.
  - Experience setting up automated CI/CD pipelines.
  `;

  runCase(
    1,
    'Full Stack Web (React / Node / MongoDB vs Stripe JD)',
    resume1,
    jd1,
    ['React', 'JavaScript', 'Node.js', 'REST APIs', 'MongoDB', 'Git', 'HTML/CSS'],
    ['TypeScript', 'Docker', 'AWS', 'CI/CD'],
    'FullStack'
  );

  // =========================================================================
  // CASE 2: AI / MACHINE LEARNING & DATA SCIENCE
  // Target: OpenAI / Research Lab - AI/ML Engineer
  // =========================================================================
  const resume2 = `
  DR. ARJUN PATEL
  Machine Learning Specialist & Deep Learning Researcher
  
  EXPERIENCE & PROJECTS:
  - Architected deep learning models in PyTorch for natural language processing and transformer attention.
  - Trained classification and regression pipelines using Python, Scikit-Learn, Pandas, and NumPy.
  - Analyzed and aggregated millions of tabular rows using SQL queries and relational databases.
  - Evaluated predictive accuracy using ROC-AUC, precision, recall, and cross-validation metrics.
  
  TECHNICAL SKILLS:
  Python, PyTorch, Scikit-Learn, Pandas, NumPy, SQL, Machine Learning, Model Evaluation
  `;

  const jd2 = `
  COMPANY: OpenAI Research
  ROLE: AI / ML Engineer
  REQUIREMENTS:
  - Strong hands-on proficiency in Python, PyTorch, Scikit-Learn, Pandas, and NumPy.
  - Solid database querying skills using SQL.
  - Expertise in Machine Learning and Model Evaluation metrics.
  - Hands-on experience with Docker containerization for model deployment.
  - Experience with Apache Spark for distributed big data processing.
  - Experience with Kubernetes orchestration.
  `;

  runCase(
    2,
    'AI / Machine Learning (PyTorch / Data Science vs OpenAI JD)',
    resume2,
    jd2,
    ['Python', 'PyTorch', 'Scikit-Learn', 'Pandas', 'NumPy', 'SQL', 'Machine Learning', 'Model Evaluation'],
    ['Docker', 'Apache Spark', 'Kubernetes'],
    'AI/ML'
  );

  // =========================================================================
  // CASE 3: CLOUD & DEVOPS INFRASTRUCTURE
  // Target: Netflix - Cloud Infrastructure & SRE
  // =========================================================================
  const resume3 = `
  MARCUS VANCE
  Cloud & DevOps Engineer | AWS, Kubernetes, Infrastructure as Code
  
  EXPERIENCE & PROJECTS:
  - Designed and deployed cloud infrastructure on AWS using EC2, S3, RDS, and IAM.
  - Containerized production services using Docker and orchestrated multi-region Kubernetes clusters.
  - Authored automated Infrastructure-as-Code modules with Terraform.
  - Wrote automated Bash shell scripts in Linux environments for system maintenance.
  - Maintained branch policies and code reviews using Git.
  
  TECHNICAL SKILLS:
  AWS, Docker, Kubernetes, Terraform, Linux, Git
  `;

  const jd3 = `
  COMPANY: Netflix
  ROLE: Cloud Infrastructure Engineer / SRE
  REQUIREMENTS:
  - Hands-on mastery of AWS cloud services, Docker, Kubernetes, Terraform, and Linux.
  - Strong Git version control practices.
  - Experience implementing automated CI/CD deployment pipelines (Jenkins / GitHub Actions).
  - Experience with Ansible configuration management.
  - Production experience with Prometheus/Grafana observability and monitoring.
  `;

  runCase(
    3,
    'Cloud & DevOps (AWS / K8s / Terraform vs Netflix JD)',
    resume3,
    jd3,
    ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Linux', 'Git'],
    ['CI/CD', 'Ansible', 'Prometheus/Grafana'],
    'DevOps'
  );

  // =========================================================================
  // CASE 4: JAVA ENTERPRISE & BACKEND ENGINEERING
  // Target: Goldman Sachs - Core Banking Platform Engineer
  // =========================================================================
  const resume4 = `
  PRIYA SHARMA
  Senior Java Developer | High-Throughput Microservices
  
  EXPERIENCE & PROJECTS:
  - Developed financial transaction services using Java 17 and Spring Boot microservice architecture.
  - Designed relational database schemas and optimized transactional queries using MySQL.
  - Implemented secure REST APIs with token-based authentication and rate limiting.
  - Utilized Git for version control and Agile team collaboration.
  
  TECHNICAL SKILLS:
  Java, Spring Boot, MySQL, REST APIs, Microservices, Git
  `;

  const jd4 = `
  COMPANY: Goldman Sachs
  ROLE: Senior Backend Engineer
  REQUIREMENTS:
  - Core competency in Java, Spring Boot, Microservices, and REST APIs.
  - Strong relational database experience with MySQL or SQL.
  - Version control with Git.
  - Experience with Apache Kafka for asynchronous event streaming and message queues.
  - In-memory caching expertise with Redis.
  - Deep understanding of Distributed System Design and high-availability architecture.
  `;

  runCase(
    4,
    'Java Enterprise (Spring Boot / Microservices vs Goldman Sachs JD)',
    resume4,
    jd4,
    ['Java', 'Spring Boot', 'Microservices', 'REST APIs', 'MySQL', 'Git'],
    ['Apache Kafka', 'Redis', 'System Design'],
    'JavaBackend'
  );

  // =========================================================================
  // CASE 5: MOBILE APPLICATION DEVELOPER
  // Target: Uber - Mobile Engineer
  // =========================================================================
  const resume5 = `
  LUCAS MENDES
  Mobile Application Developer | Flutter & Cross-Platform Specialist
  
  EXPERIENCE & PROJECTS:
  - Built responsive multi-screen mobile apps with Flutter and Dart for 500k+ downloads.
  - Integrated real-time backend notifications and data sync using Firebase Firestore.
  - Consumed REST APIs for ride-tracking, geolocation, and payment processing.
  - Managed codebases using Git version control.
  
  TECHNICAL SKILLS:
  Flutter, Dart, Firebase, REST APIs, Git
  `;

  const jd5 = `
  COMPANY: Uber
  ROLE: Mobile Engineer
  REQUIREMENTS:
  - Strong proficiency in Flutter, Dart, REST APIs, Firebase, and Git.
  - Experience with iOS native development (Swift/SwiftUI).
  - Experience with Android native development (Kotlin).
  - Experience with GraphQL API client integration.
  `;

  runCase(
    5,
    'Mobile Development (Flutter / Dart vs Uber JD)',
    resume5,
    jd5,
    ['Flutter', 'Dart', 'Firebase', 'REST APIs', 'Git'],
    ['iOS', 'Kotlin', 'GraphQL'],
    'Mobile'
  );

  // =========================================================================
  // CASE 6: DATA ENGINEERING & BIG DATA
  // Target: Databricks - Data Platform Engineer
  // =========================================================================
  const resume6 = `
  CHEN WEI
  Data Engineer | Distributed Pipelines & Warehousing
  
  EXPERIENCE & PROJECTS:
  - Engineered batch and streaming data pipelines using Python and Apache Spark.
  - Managed cloud data warehouse modeling and ETL transformations in Snowflake using SQL.
  - Orchestrated automated DAG workflows with Apache Airflow.
  - Version controlled pipeline code with Git.
  
  TECHNICAL SKILLS:
  Python, SQL, Apache Spark, Snowflake, Apache Airflow, Git
  `;

  const jd6 = `
  COMPANY: Databricks
  ROLE: Data Platform Engineer
  REQUIREMENTS:
  - Proficiency in Python, SQL, Apache Spark, Snowflake, Apache Airflow, and Git.
  - Experience with Apache Kafka for real-time streaming ingestion.
  - Hands-on experience with Docker containerization.
  - Experience with BigQuery or GCP cloud data tooling.
  `;

  runCase(
    6,
    'Data Engineering (Spark / Airflow / Snowflake vs Databricks JD)',
    resume6,
    jd6,
    ['Python', 'SQL', 'Apache Spark', 'Snowflake', 'Apache Airflow', 'Git'],
    ['Apache Kafka', 'Docker', 'BigQuery', 'GCP'],
    'DataEngineering'
  );

  // =========================================================================
  // CASE 7: SYSTEMS & CYBERSECURITY
  // Target: CrowdStrike - Systems Security Engineer
  // =========================================================================
  const resume7 = `
  VIKTOR KRAVCHENKO
  Systems & Security Software Engineer
  
  EXPERIENCE & PROJECTS:
  - Developed low-level daemon tools in C++ and C on Linux kernel environments.
  - Analyzed network traffic and socket streams adhering to Computer Networks (TCP/IP, UDP) protocols.
  - Implemented secure data transport with Cybersecurity and Cryptography standards.
  - Studied multi-threaded concurrency and memory paging in Operating Systems.
  
  TECHNICAL SKILLS:
  C++, C, Linux, Computer Networks, Cybersecurity, Operating Systems, Git
  `;

  const jd7 = `
  COMPANY: CrowdStrike
  ROLE: Systems Security Engineer
  REQUIREMENTS:
  - Expert C and C++ programming, Linux systems programming, and Operating Systems internals.
  - Strong Computer Networks protocol knowledge, Git, and Cybersecurity / Cryptography fundamentals.
  - Hands-on experience with Rust programming language.
  - Experience with Docker container isolation.
  - Experience with AWS cloud security.
  `;

  runCase(
    7,
    'Systems & Cybersecurity (C++ / Linux / Security vs CrowdStrike JD)',
    resume7,
    jd7,
    ['C++', 'C', 'Linux', 'Operating Systems', 'Computer Networks', 'Cybersecurity', 'Git'],
    ['Rust', 'Docker', 'AWS'],
    'Systems'
  );

  // =========================================================================
  // CASE 8: CAMPUS GRADUATE / FRESHER (SDE-1)
  // Target: Amazon - SDE-1 Graduate
  // =========================================================================
  const resume8 = `
  KANAKA MAHALAKSHMI
  Computer Science Engineering Student | SDE Aspirant
  
  COURSEWORK & PROJECTS:
  - Solved 400+ Data Structures and Algorithms (DSA) problems in Java and Python.
  - Built web application projects applying Object-Oriented Programming (OOP) principles.
  - Implemented relational database schemas and queries in DBMS (SQL).
  - Studied Computer Networks (TCP/IP, HTTP) and Operating Systems concurrency.
  - Built full stack student portal using React and JavaScript.
  
  TECHNICAL SKILLS:
  Java, Python, JavaScript, React, SQL, DSA, OOP, DBMS, Computer Networks, Operating Systems, Git
  `;

  const jd8 = `
  COMPANY: Amazon
  ROLE: Software Development Engineer I (SDE-1)
  REQUIREMENTS:
  - Strong problem-solving proficiency in DSA (Data Structures and Algorithms).
  - Strong object-oriented design fundamentals (OOP) in Java, Python.
  - Strong knowledge of DBMS, SQL, Computer Networks, and Operating Systems.
  - Experience with React, JavaScript, and Git.
  - Familiarity with Distributed System Design and scalable cloud services.
  - Hands-on experience with Docker containerization and AWS.
  - Experience with CI/CD deployment pipelines.
  `;

  runCase(
    8,
    'Campus Graduate / SDE-1 (DSA / OOP / Core CS vs Amazon SDE-1 JD)',
    resume8,
    jd8,
    ['DSA', 'OOP', 'Java', 'Python', 'SQL', 'DBMS', 'Computer Networks', 'Operating Systems', 'React', 'JavaScript', 'Git'],
    ['System Design', 'Docker', 'AWS', 'CI/CD'],
    'CampusFresher'
  );

  // =========================================================================
  // CASE 9: HIERARCHICAL IMPLICATION ENGINE TEST
  // (Next.js implies React & JavaScript; FastAPI implies Python & REST APIs)
  // =========================================================================
  const resume9 = `
  ALEXANDER POPE
  Modern Full Stack & API Engineer
  
  PROJECTS:
  - Architected full stack web app using Next.js with server-side rendering and Tailwind CSS.
  - Created high-speed microservices using FastAPI with asynchronous Pydantic validation.
  - Managed relational schemas and migration scripts in PostgreSQL.
  `;

  const jd9 = `
  COMPANY: Vercel Partner
  ROLE: Full Stack API Developer
  REQUIREMENTS:
  - Core languages & UI: React, JavaScript, Python, REST APIs, SQL.
  - Cloud / Containerization: Docker, AWS.
  `;

  runCase(
    9,
    'Hierarchical Implication Engine (Next.js/FastAPI/PostgreSQL implying React/Python/SQL/REST)',
    resume9,
    jd9,
    ['React', 'JavaScript', 'Python', 'REST APIs', 'SQL'],
    ['Docker', 'AWS'],
    'Implications'
  );

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log('📊 MULTI-CASE VALIDATION MATRIX SUMMARY');
  console.log('================================================================');
  console.log(`  Total Test Cases Evaluated : ${totalTests}`);
  console.log(`  Passed Cases               : ${passedTests} ✅`);
  console.log(`  Failed Cases               : ${failedTests} ❌`);
  console.log(`  Accuracy Rate              : ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runUniversalTestMatrix().catch((err) => {
  console.error('Unhandled Matrix Failure:', err);
  process.exit(1);
});
