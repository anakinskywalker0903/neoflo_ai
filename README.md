# 👁️ VisionPulse AI — Visual Agent & Productivity Monitor

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Node.js](https://img.shields.io/badge/Node.js-v24.0+-green.svg)](https://nodejs.org/)
[![Gemini Vision](https://img.shields.io/badge/AI-Google_Gemini_Vision-purple.svg)](https://ai.google.dev/)
[![Privacy First](https://img.shields.io/badge/Privacy-Privacy_First_Architecture-emerald.svg)](#-privacy--security-architecture)

> **VisionPulse AI** is a production-grade, privacy-first Visual AI Agent and Chrome Extension (Manifest V3) that monitors browser tab activity, extracts structured productivity events via Google Gemini Vision LLM, and presents insights on a Personal Productivity Timeline dashboard.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Chrome Extension                       │
│                     (Manifest V3 Plugin)                    │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │  Background Service     │   │   Glassmorphism Popup   │  │
│  │  Worker (chrome.alarms) │   │   Controls & Status     │  │
│  └────────────┬────────────┘   └─────────────────────────┘  │
└───────────────┼─────────────────────────────────────────────┘
                │ Screen Screenshot Base64 + Active Tab Context
                ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express Backend Server                  │
│                      (http://localhost:5000)                │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │   Privacy Redactor      │   │  Gemini Vision LLM      │  │
│  │   & Domain Blacklist    │   │  Structured JSON Service│  │
│  └────────────┬────────────┘   └────────────┬────────────┘  │
└───────────────┼─────────────────────────────┼───────────────┘
                │                             │ Structured JSON
                ▼                             ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│   Persistent Data Engine    │  │ React / Web Dashboard      │
│   (SQLite / JSON Store)     │ ◄┼┤ Personal Timeline Stream  │
└─────────────────────────────┘  │ AI Daily Summary Engine    │
                                 └────────────────────────────┘
```

---

## ✨ Key Features

1. **Automatic & On-Demand Tab Capture**: Captures visible browser tab screenshots on configurable intervals (15s, 30s, 60s, 120s) or via instant manual trigger in the popup.
2. **Gemini Vision LLM Structured Event Extraction**: Sends screen captures to Google Gemini Vision API to extract structured JSON metadata:
   - `website` & `domain`
   - `activity` (e.g. *"Editing React component in VS Code"*)
   - `category` (*Coding, Learning, Meetings, Distractions, Utility, Other*)
   - `confidence` score (e.g. `0.98`)
   - `summary` (1-2 sentence detailed overview)
   - `productivity_score` (*+1 Productive, 0 Neutral, -1 Distraction*)
3. **Personal Productivity Timeline Dashboard**: Interactive dark-mode web application providing:
   - **Productivity Score Gauge**: Normalized 0–100 session focus score.
   - **"What Did I Work On Today?"**: AI-generated executive work narrative.
   - **Filter & Search Bar**: Category chips (*Coding*, *Learning*, *Distractions*, etc.) and real-time search.
   - **Chronological Feed**: Visual timeline stream with category badges and impact indicators.
4. **Privacy-by-Design Safeguards**:
   - **Client-Side Blacklisting**: Automatically skips capture on banking (`bank`, `chase`, `paypal`), authentication (`auth`, `login`), and password managers (`1password`, `bitwarden`).
   - **Data Redaction**: Regex-sanitizes emails, credit card numbers, and API tokens before database persistence.
   - **Zero Raw Image Storage by Default**: Raw base64 screenshots are processed in memory and discarded unless configured by the user.

---

## 🔒 Privacy & Security Architecture

Unlike invasive monitoring software or spyware, **VisionPulse AI** is engineered around privacy:

- **Structured JSON Only**: Storage is restricted to structured metadata rather than raw video recordings or screenshots.
- **Client & Server Blacklists**: Immediate exclusion of sensitive domains.
- **Local Control**: User can pause tracking at any moment from the popup toggle or wipe log history with a single click.

```json
{
  "timestamp": "2026-07-30T22:35:00.000Z",
  "website": "github.com",
  "domain": "github.com",
  "activity": "Reviewing React Fiber Architecture PR",
  "category": "Coding",
  "confidence": 0.98,
  "summary": "User is actively reading and reviewing open-source code on GitHub.",
  "sensitive_content": false,
  "productivity_score": 1
}
```

---

## 🛠️ Tech Stack

- **Extension**: Chrome Manifest V3, `chrome.tabs`, `chrome.alarms`, `chrome.storage`, HTML5, CSS Glassmorphism.
- **Backend**: Node.js (v24+), Express.js, CORS, Dotenv.
- **Vision LLM**: Google Gemini Vision API (`@google/generative-ai` model `gemini-1.5-flash`) + Contextual Heuristic Analyzer.
- **Database**: Persistent Data Engine (`server/data/visionpulse.json`) providing SQLite-compatible query abstraction (`INSERT`, `SELECT`, `GROUP BY`, pagination).
- **Dashboard**: React / Web Application, Inter typography, CSS custom design system.

---

## 🚀 Quick Start & Setup Guide

### 1. Clone Repository & Install Backend Dependencies

```bash
git clone https://github.com/your-username/visionpulse-ai.git
cd visionpulse-ai/server
npm install
```

### 2. Configure Environment Variables (Optional)

Create a `.env` file inside `server/` (or copy `.env.example`):

```env
PORT=5000
GEMINI_API_KEY=your_google_gemini_api_key_here
```

> **Note**: If `GEMINI_API_KEY` is not provided, the backend seamlessly activates its **Contextual Heuristic Analyzer**, allowing full testing without external credentials!

### 3. Start the Backend Server & Dashboard

```bash
npm start
```

The backend server and dashboard will launch at:
👉 **http://localhost:5000**

---

### 4. Install Chrome Extension (Manifest V3)

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked**.
4. Select the `extension/` folder inside this repository.
5. Click on the **VisionPulse AI** extension icon in your Chrome toolbar to view the popup controls!

---

## 📡 API Reference Specs

### `POST /api/activity/analyze`
Analyzes active tab screenshot base64 and logs structured activity event.

**Payload**:
```json
{
  "image": "data:image/png;base64,...",
  "pageUrl": "https://github.com/facebook/react",
  "pageTitle": "facebook/react: The library for web user interfaces",
  "timestamp": "2026-07-30T22:35:00.000Z"
}
```

---

### `GET /api/activities`
Retrieves paginated activity timeline logs.

**Query Parameters**:
- `limit` (default: `50`)
- `offset` (default: `0`)
- `category` (`Coding`, `Learning`, `Meetings`, `Distractions`, `Utility`)
- `search` (Search text)

---

### `GET /api/stats`
Returns aggregated productivity metrics, category counts, top domains, and productivity score.

---

### `GET /api/summary/daily`
Generates an AI executive narrative summary (*"What Did I Work On Today?"*).

---

### `DELETE /api/activities`
Wipes all recorded activity logs.

---

## 🧪 Verification & Testing

Run automated unit and integration tests:

```bash
cd server
node test/api.test.js
```

---

## 📌 Development Git History Strategy

This project adheres strictly to **preserving full git commit history** without squashing merge commits to demonstrate granular engineering progression:

```
* feat(docs): add comprehensive README documentation & architecture diagrams
* test: add automated unit & integration test suite for Vision AI services
* fix(privacy): refine credential regex pattern for API key redacting
* feat(dashboard): build Personal Productivity Timeline web dashboard application
* feat(extension): add glassmorphism popup UI and options settings
* feat(extension): add Manifest V3 chrome extension configuration and background worker
* feat(api): add RESTful API routes for activity logging, stats, and AI daily summary
* feat(ai): integrate Gemini Vision API with structured JSON output and privacy filters
* feat(backend): setup Express server & database initialization
* chore: initialize project structure and git repository
```

---

## 💡 Future Roadmap

- [ ] **Multi-Monitor Desktop Capture**: Support full desktop OS monitoring via `desktopCapture` API.
- [ ] **Vector Database Semantic Search**: Integrate LanceDB or Pinecone for natural language semantic query across activity timeline.
- [ ] **Automated Work Report Export**: Export daily/weekly productivity summaries to PDF, Slack, or Notion.
