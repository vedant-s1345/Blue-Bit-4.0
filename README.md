# 🌌 GitLens — Git History Time Traveller

## 🎥 Demo

[![GitLens Demo](https://img.shields.io/badge/▶_Watch_Demo-Google_Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)](https://drive.google.com/file/d/1C-g5UdlTdABOoTOaVO70SFQbd0UOV3Zs/view?usp=drivesdk)

> **BLUEBIT 4.0 · Problem Statement 10 (PS10)**  
> SDG 9 — Industry, Innovation & Infrastructure  
> SDG 4 — Quality Education · SDG 8 — Decent Work & Economic Growth

Transform boring git logs into **cinematic animations, heatmaps, contributor graphs & AI-powered insights** — instantly.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://mysql.com)

---

## 🎯 Problem Statement

100M+ developers use GitHub globally. Yet understanding how a project evolved is painful:

- New developers spend **10+ hours** understanding project history when onboarding
- **Technical debt** accumulates invisibly until it causes production issues
- **Bus factor risk** goes undetected until a key contributor leaves
- No visual tools exist to make git history **engaging and actionable**

**GitLens solves this** — paste any GitHub URL and get a full cinematic breakdown of the project's history in seconds.

---

## ✨ Features

### 🎬 Cinematic Timeline (Option A)
- Watch commits play like a **movie** with play / pause / step controls
- Each bar colored by contributor — see who dominated each period
- Click any bar or commit card to **jump to that point in history**
- Scrub through 300+ commits instantly

### 🔥 File Hotspot Heatmap (Option B)
- See which files are touched most frequently
- **Color intensity** = change frequency (green → red risk scale)
- Sort by **churn**, **additions**, or **deletions**
- Hover any file to see exact stats — additions, deletions, risk level

### ⏰ Day × Hour Commit Heatmap (Option D - Activity Patterns)
- GitHub-style **7 × 24 grid** showing when your team commits most
- Hover any cell for exact commit count
- Daily summary cards showing total commits and peak hour per day
- Instantly reveals team working patterns and timezone distribution

### 🌌 Contributor Graph (Option D - Full)
Four sub-tabs in one view:

| Sub-tab | What it shows |
|---|---|
| 🌌 **Network** | Animated orbit graph — node size = commits, arc width = collaboration strength, particles = active handoffs |
| ⏰ **Activity** | Bar charts — commits by hour of day, day of week, and month |
| 📝 **Who & When** | Scrollable commit list filtered by author — exactly who wrote what and when |
| 📊 **% Share** | Stacked contribution bar + per-author percentage breakdown |

**Author filter pills** — click any author to filter ALL sub-tabs simultaneously.

### 🤖 AI Insights
- **Bus Factor Warning** — detects when one person owns too much of the codebase
- **Hotspot Detection** — flags files with dangerously high churn rates
- **Collaboration Analysis** — identifies strongest contributor pairs
- **Risk Scoring** — critical / high / medium / low per file
- Expandable cards with detailed explanations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  User Input (GitHub URL)                │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                React Frontend (Vite)                    │
│                                                         │
│   Landing.jsx ──► GitHub REST API ──► Dashboard.jsx     │
│                                                         │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────────┐ │
│  │ 🎬 Timeline │ │ 🔥 Heatmaps  │ │ 🌌 Contributors   │ │
│  │ CommitGrid  │ │ FileHotspot  │ │ Galaxy + Activity │ │
│  │ TimelineBars│ │ DayxHour     │ │ WhoWroteWhat      │ │
│  └─────────────┘ └──────────────┘ └───────────────────┘ │
│                                                         │
│                  🤖 AI Insights Panel                   │
└────────────────────────┬────────────────────────────────┘
                         │ REST APIs (planned integration)
┌────────────────────────▼────────────────────────────────┐
│              Spring Boot Backend (Java 17)              │
│                                                         │
│   JGit Parser → Analytics Engine → MySQL DB             │
│   LangChain4j → Gemini API (AI Summaries)               │
│   Spring WebSocket → Real-time Progress Updates         │
│   Redis → Caching (24hr TTL)                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
GitLens/
│
├── src/                              # ── Spring Boot Backend ──
│   └── main/
│       ├── java/
│       │   ├── controller/           # REST API endpoints
│       │   ├── service/              # Git parsing, analytics engine
│       │   ├── model/                # JPA entities
│       │   └── config/               # WebSocket, Redis, Cache config
│       └── resources/
│           └── application.properties
├── pom.xml                           # Maven dependencies
│
└── frontend/                         # ── React Frontend ──
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx                  # React entry point
        ├── App.jsx                   # Root component + routing state
        ├── styles/
        │   └── global.css            # Global reset + fonts
        ├── utils/
        │   ├── github.js             # GitHub REST API fetcher + pagination
        │   ├── mockData.js           # Demo dataset (no token needed)
        │   └── constants.js          # Shared colors, helpers
        └── components/
            ├── StarField.jsx         # Animated canvas starfield background
            ├── Landing.jsx           # URL input, token field, progress loader
            ├── Dashboard.jsx         # Main layout, tab system, commit player
            ├── TimelineBars.jsx      # Playable commit bar chart
            ├── CommitGrid.jsx        # Commit card grid for timeline tab
            ├── FileHeatmap.jsx       # File churn visualization with risk scores
            ├── DayHourHeatmap.jsx    # 7×24 commit frequency grid
            ├── Galaxy.jsx            # Full contributor graph (4 sub-tabs)
            └── AIInsights.jsx        # Expandable AI insight cards
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Java 17+
- MySQL 8+

### Frontend (React + Vite)

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Open in browser → http://localhost:5173
```

Paste any public GitHub URL (e.g. `facebook/react`) and hit **ANALYSE**.

> **⚠️ GitHub Token Required for large repos:**  
> Without a token you get only 60 API requests/hour.  
> Add your token in `src/utils/github.js`:
> ```js
> const DEFAULT_TOKEN = 'ghp_yourTokenHere'
> ```
> Get a free token: GitHub → Settings → Developer Settings → Tokens (classic) → Generate (no scopes needed) → upgrades to 5000 req/hr

### Backend (Spring Boot)

```bash
# From project root
./mvnw spring-boot:run
# → Runs on http://localhost:8080
```

Configure your database in `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/gitlens
spring.datasource.username=root
spring.datasource.password=yourpassword
```

---

## ✅ PS10 Success Criteria

| Requirement | Status | Details |
|---|---|---|
| Accept GitHub URL | ✅ | Live GitHub REST API integration |
| Parse git history | ✅ | Commits, authors, dates, file changes |
| Handle 100+ commits | ✅ | Paginated fetch up to 300 commits |
| Timeline Animation (Option A) | ✅ | Play / pause / scrub commit player |
| Heatmap (Option B) | ✅ | File hotspot + Day × Hour grid |
| Contributor Graph (Option D) | ✅ | Network + Activity + Who & When + % Share |
| Time scrubbing | ✅ | Jump to any commit instantly |
| Filter by author | ✅ | Author filter pills across all views |
| Click for commit details | ✅ | Commit cards with full metadata |
| Smooth rendering | ✅ | Canvas API + CSS transitions |
| Color-coded information | ✅ | Risk colors, contributor palette |
| Professional aesthetic | ✅ | Dark cinematic space theme |
| AI-powered insights | ✅ | Bus factor, churn risk, collaboration patterns |
| Multiple visualization types | ✅ | 5 distinct views |

---

## 🛠️ Tech Stack

### Frontend
| Tech | Purpose |
|---|---|
| React 18 + Vite 5 | Core UI framework, fast dev server |
| Canvas API | Animated galaxy graph, starfield, particles |
| GitHub REST API | Live repository data fetching |
| Syne + JetBrains Mono | Display + monospace typography |

### Backend
| Tech | Purpose |
|---|---|
| Spring Boot 3 · Java 17 | Core backend framework |
| JGit | Git repository parsing |
| Spring Data JPA + MySQL | Data persistence |
| Redis | Result caching (24hr TTL) |
| Spring WebSocket + STOMP | Real-time progress updates |
| LangChain4j + Gemini API | AI-powered commit summaries |
| Flyway | Database schema migrations |

---

## 🌿 Branches

| Branch | Contents |
|---|---|
| `master` | Spring Boot backend (Java) |
| `frontend` | React frontend (this code) |

---

## 👥 Team

Built for **BLUEBIT 4.0** National Level Hackathon  
Problem Statement 10 — Git History Time Traveller

---

## 📄 License

MIT
