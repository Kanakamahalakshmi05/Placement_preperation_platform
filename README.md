# PrepAI - AI-Powered Placement Preparation & Mock Interview Platform

PrepAI is a full-stack web platform designed to help students prepare for campus and off-campus technical placements. It provides AI-powered resume analysis, dynamic skill gap quizzes, adaptive multi-phase technical mock interviews with live camera and voice synthesis, and evidence-based performance evaluations.

---

## 🚀 Key Features

* **AI Resume Parser & Skill Extractor**: Upload PDF/DOCX resumes to extract verified skills, frameworks, databases, and project details.
* **Target Company & Role Alignment**: Set target job roles (e.g. Frontend Engineer, Full Stack Developer) with dynamic company-specific interview prompts.
* **Smart Placement Preparation Roadmap**: Practice dynamic topic-wise quizzes and targeted technical questions.
* **Real-time AI Technical Mock Interview**:
  * Adaptive 10-phase real interviewer logic (Technical fundamentals, architectural deep dives, edge cases, and follow-ups).
  * Video conference stage with mirrored candidate camera feed.
  * Web Speech API integration (voice question reading & speech-to-text voice answers).
  * Real-time microphone decibel activity visualizer (`AudioContext`).
  * Server-authoritative 20:00 countdown timer.
* **Evidence-Based Evaluation**: Detailed scoring across 7 weighted categories with transcript-backed strengths, weaknesses, recommendations, and unassessed skill tracking.
* **Role-Based Access Control (RBAC)**: Secure JWT authentication with separate Student and Admin portals.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, Tailwind CSS v4, Vite 8, Lucide React, Recharts, Axios, Socket.IO Client
* **Backend**: Node.js, Express.js, JWT, Bcrypt.js, Multer, `pdf-parse`, `mammoth`, Socket.IO
* **Database**: MongoDB Atlas with Mongoose ODM
* **AI Engine**: Google Gemini API (`@google/genai`)

---

## 📦 Project Structure

```
ai/
├── client/          # React 19 + Tailwind CSS Frontend
├── server/          # Node.js + Express + MongoDB Backend
├── .gitignore       # Root gitignore protecting secrets and node_modules
└── README.md        # Project documentation
```

---

## ⚙️ Quick Start Guide

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [MongoDB Atlas](https://www.mongodb.com/atlas) cluster URI
* (Optional) [Google Gemini API Key](https://aistudio.google.com/)

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Fill in your MONGO_URI, JWT_SECRET, and GEMINI_API_KEY in .env
npm start
```
The backend server will run on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` (or `http://localhost:5174`) in your web browser.

---

## 📄 License
ISC License
