# CampusX 🎓⚡

> **Your Campus. Your Skills. Your Next Big Thing.**  
> A gamified, college-exclusive ecosystem empowering students to exchange skills, borrow lab equipment and study gear, discover mentors, form dream teams, and thrive together.

---

## ✨ Features Implemented

1. **⚡ SkillSwap Hub (`/skills`)**
   - Browse skills offered by peers (Web Dev, DSA, AI/ML, Design, Music, Career Guidance, and more).
   - Filter by skill category and proficiency level (Beginner to Expert).
   - Create new skill teaching listings with duration, format, and language.
   - Request 1-on-1 peer learning sessions.

2. **📦 Borrow Hub (`/borrow`)**
   - List and borrow physical campus resources: calculators, lab kits, drawing drafters, DSLR cameras, textbooks, and sensor kits.
   - Specify pickup spots on campus, max loan durations, condition grades, and tags.
   - Request to borrow with proposed pickup date, duration, and personal note.

3. **🕸️ Campus Skill Graph (`/skill-graph`)**
   - Visual network powered by **React Flow**.
   - Nodes represent Students, Skills, Resources, and Projects with custom color tokens.
   - Visual edges show who teaches what, who wants to learn what, and project dependencies.
   - Interactive Node drawer on click with student information & exchange triggers.
   - Dual view: switch effortlessly between the interactive **Visual Graph** and the **Directory List**.
   - Smart peer recommendation engine matching your wishlist with student offers.

4. **🚀 Dream Team Builder (`/dream-team`)**
   - Launch collaborative student projects for Hackathons, Capstones, Research, or Startups.
   - Tag required roles, technical skills, and target team sizes.
   - Submit pitch applications with your skill set and motivation.

5. **💬 Real-Time Messaging (`/messages`)**
   - Private student-to-student conversations with instant unread badges.
   - Fast polling for live updates while chatting.
   - Direct messaging integration from profiles and exchange listings.

6. **🏆 Quests, Badges & Skill Credits (`/quests`)**
   - **Level & XP Progress Bar** with real-time level calculation.
   - **Quests Log**: Complete exchanges, teach peers, and earn bonus XP.
   - **Badges Gallery**: Showcase achievements (First Exchange, Helpful Mentor, Knowledge Sharer, etc.).
   - **Campus Honor Roll Leaderboard**: See who leads the university in peer contributions.
   - **Skill Credits Ledger**: Track earned non-monetary currency for platform exchanges.

7. **🔄 Exchange Center (`/exchanges`)**
   - Unified dashboard for managing incoming and outgoing requests.
   - Full state machine: Accept, Approve, Complete, Confirm Handover, Return, and Cancel.
   - Automatic XP and Skill Credit payouts upon exchange completion.
   - Peer review & star rating system.

8. **🛡️ Admin Moderation Center (`/admin`)**
   - Platform health metrics: total students, active listings, completed exchanges.
   - Student user directory with suspend / unsuspend moderation controls.
   - Safety queue for resolving flagged content and community disputes.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+) with the virtual environment at `./venv`

---

### 1. Start the Backend API (FastAPI)

In a terminal:
```powershell
cd backend
..\venv\Scripts\uvicorn app.main:app --reload --port 8000
```
- API will be live at: `http://localhost:8000`
- Interactive Swagger API Docs: `http://localhost:8000/api/docs`
- *Note:* The backend features an **automatic in-memory database fallback (`mongomock-motor`)** and automatically seeds sample student profiles, skills, equipment, and projects if no external MongoDB URI is supplied. You can immediately run and test the app without setting up local Mongo!

---

### 2. Start the Frontend (Vite + React)

In a second terminal:
```powershell
cd frontend
npm run dev
```
- Web Application will be live at: `http://localhost:5173`

---

### 3. Run Automated Tests

To run the backend test suite:
```powershell
cd backend
..\venv\Scripts\python.exe -m pytest tests/test_api.py -v
```
*(All 5 test suites pass cleanly!)*

To verify the frontend TypeScript production bundle:
```powershell
cd frontend
npm run build
```

---

## 🔑 Pre-Seeded Demo Accounts

You can log in immediately using any of the following pre-seeded test accounts (Password for all accounts is: `CampusPass123!`):

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@campus.edu` | `CampusPass123!` | Admin role, access to `/admin` console |
| **Student (CS)** | `arjun.sharma@campus.edu` | `CampusPass123!` | Year 3, teaches Python/FastAPI/React, has CLRS textbook |
| **Student (Design)** | `priya.patel@campus.edu` | `CampusPass123!` | Year 2, teaches Figma/UI/UX, has DSLR Camera |
| **Student (ECE)** | `rohit.verma@campus.edu` | `CampusPass123!` | Year 4, teaches Arduino/IoT, has Casio Calculator & Pi 4 |
| **Student (MBA)** | `ananya.sen@campus.edu` | `CampusPass123!` | Year 3, teaches Startup Pitch Decks & Finance |

Or click **Register** to create your own student account and experience the **7-Step Onboarding Walkthrough**!

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router 7, TanStack React Query v5, Zustand v5, React Flow 11, Lucide React, Custom CSS Design System with vibrant campus tokens.
- **Backend**: FastAPI (Python), Motor (Async MongoDB Driver) + `mongomock-motor` for in-memory fallback, PyJWT, bcrypt, Pydantic v2.
- **Testing**: Pytest, Pytest-AsyncIO, HTTPX ASGI Client.
