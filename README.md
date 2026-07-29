# GoalTrack — Enterprise Goal Setting & Tracking Portal
A full-stack web application that manages the complete employee performance lifecycle — goal creation, manager approval, quarterly check-ins, and analytics — with role-based access for Employees, Managers, and HR Admins.

Built for the AtomQuest Hackathon 1.0 in-house Goal Setting & Tracking Portal challenge.

---

## Features

### Phase 1 — Goal Creation & Approval
- Employee-facing goal creation with **Thrust Area**, **Title**, **Description**, **UoM**, **Target**, and **Weightage**
- Four Unit-of-Measurement types: **Numeric Min**, **Numeric Max**, **Timeline**, **Zero-based**
- System-enforced validation rules:
  - Total weightage **must equal 100%** to submit
  - **Minimum 10%** per individual goal
  - **Maximum 8 goals** per employee
- Manager (L1) approval workflow with **inline target/weightage editing**
- Return-for-rework with structured feedback comments
- Goals **lock** on approval — only admin can reopen with audit trail
- **Shared Goals** — managers push a departmental KPI to multiple employees
  - Recipients can adjust **weightage only**; title and target are read-only
  - Primary owner's achievements **sync** across all linked goal sheets

### Phase 2 — Achievement Tracking & Check-ins
- Quarterly Actual vs Planned entry interface with live score updates
- Progress status: **Not Started / On Track / Completed**
- Manager check-in module with structured comments per quarter
- **Check-in window enforcement** — submissions blocked outside the active Cycle window (admin bypass available)
- Auto-computed scores using BRD formulas:
  - `numeric_min`: Achievement ÷ Target
  - `numeric_max`: Target ÷ Achievement
  - `timeline`: On-time → 100%, late → 0%
  - `zero`: Actual = 0 → 100%, else 0%

### Reporting & Governance
- **CSV export** of Planned vs Actual achievement reports
- Real-time **Completion Dashboard** for HR oversight
- Comprehensive **Audit Trail** capturing every change after lock:
  - Manager approval, rework requests, inline edits
  - Admin unlocks and post-lock edits
  - Each entry records who / what / when with full before/after snapshot

### Bonus Features Implemented (BRD §5)

#### 5.2 — Email Notification
- Transactional emails via **Brevo**:
  - Goal submission, approval, rework requests, check-in window opens, escalations
- Deep-links from email directly to the relevant goal sheet

#### 5.3 — Rule-Based Escalation Module
- Three configurable escalation rules in the admin UI:
  - **Goal Not Submitted** after N days of cycle open
  - **Goal Not Approved** after N days of submission
  - **Check-in Not Completed** in active quarter
- **Cascading escalation chain**: Level 1 → Level 2 → Level 3
  - Goal Not Submitted: Employee → Manager → HR Admin
  - Goal Not Approved: Manager → HR Admin
  - Check-in Not Completed: Employee → Manager → HR Admin
- Each rule has editable days-threshold and active/inactive toggle
- Run-on-demand from the admin panel; every escalation creates a log entry visible to HR
- Full **escalation history** preserved per log (who got emailed when, current level, next-hop date)

#### 5.4 — Analytics Module
- Quarter-on-Quarter (QoQ) score trend comparing current year vs previous year
- **Goal distribution** by status (bar chart)
- **Thrust-area performance** breakdown (horizontal bar)
- **Department performance** comparison
- **Check-in completion heatmap** — employees × quarters with status colors
- **Manager Effectiveness** dashboard ranking L1 managers by composite score (team performance + check-in discipline + approval rate)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | MongoDB Atlas + Mongoose ODM |
| Authentication | NextAuth.js with JWT sessions, bcrypt password hashing |
| Email | Brevo (transactional API) |
| Notifications | in-app notifications (real-time bell) |
| Charts | Recharts |
| Hosting | Vercel (serverless functions + edge) |

---

## Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free M0 tier works)
- Brevo account for transactional email (optional — app runs without it, emails just no-op)
- (Optional) Microsoft Teams workspace with an incoming webhook URL

### Setup

```bash
git clone <repository-url>
cd hackthon
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
# MongoDB Atlas connection string (standard or SRV format)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/goal-tracking?retryWrites=true&w=majority

# NextAuth — generate a 32+ char random string
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-32-plus-character-string>

# Brevo (email) — optional
BREVO_API_KEY=<your-brevo-key>
EMAIL_FROM=<verified-sender@yourdomain.com>
EMAIL_FROM_NAME=GoalTrack HR

# Microsoft Teams webhook — optional
TEAMS_WEBHOOK_URL=<your-incoming-webhook-url>
```

Then:

```bash
npm run seed        # seed demo users + sample data
npm run dev         # start dev server on http://localhost:3000
```

---

## Demo Credentials (after running `npm run seed`)

| Role     | Email                 | Password    |
|----------|-----------------------|-------------|
| HR Admin | admin@company.com     | password123 |
| Manager  | rajesh@company.com    | password123 |
| Employee | amit@company.com      | password123 |

---

## Project Structure

```
hackthon/
├── app/
│   ├── api/                          # All API routes
│   │   ├── auth/                     # NextAuth + custom verify
│   │   ├── goals/                    # Goal CRUD + submit
│   │   ├── achievements/             # Quarterly actuals (with window enforcement)
│   │   ├── checkins/                 # Manager check-in comments
│   │   ├── admin/                    # Cycles, users, audit, reports, analytics
│   │   ├── manager/                  # Team, approvals, shared goals
│   │   ├── escalations/              # Rules, logs, run engine
│   │   ├── analytics/                # Heatmap + manager effectiveness
│   │   └── notifications/            # In-app notification bell
│   ├── dashboard/                    # Employee dashboard
│   ├── goals/                        # Employee goals (list, new, detail)
│   ├── checkins/                     # Employee quarterly entry
│   ├── manager/                      # Manager dashboard, approvals, team, etc.
│   ├── admin/                        # Admin dashboard, users, cycles, reports, audit, analytics, escalations
│   ├── login/                        # Auth page
│   └── layout.tsx                    # Root layout with role-based nav
├── components/                       # Shared UI (Button, Card, Badge, Toast, etc.)
├── lib/
│   ├── mongodb.ts                    # Cached Mongoose connection (Vercel-safe)
│   ├── auth.ts                       # NextAuth configuration
│   ├── email.ts                      # Brevo + Teams helpers
│   ├── notify.ts                     # In-app notification helper
│   ├── scoring.ts                    # BRD score formulas
│   └── utils.ts                      # Date helpers, cn(), getCurrentQuarter()
├── models/
│   ├── User.ts                       # Employee/Manager/Admin
│   ├── Goal.ts                       # With shared-goal fields
│   ├── Achievement.ts                # Quarterly actuals
│   ├── CheckIn.ts                    # Manager check-in comments
│   ├── AuditLog.ts                   # All change history
│   ├── Cycle.ts                      # BRD §2.3 quarterly windows
│   ├── EscalationRule.ts             # Configurable rules
│   ├── EscalationLog.ts              # Chain with currentLevel + history
│   └── Notification.ts               # In-app bell notifications
├── middleware.ts                     # Role-based route protection
├── scripts/                          # Seed and one-off migration scripts
└── public/                           # Static assets
```

---

## Validation Rules (BRD-enforced)

| Rule | Enforced where |
|---|---|
| Total weightage = 100% on submit | `POST /api/goals/submit` |
| Min 10% per goal | `POST /api/goals` |
| Max 8 goals per employee (counts all statuses) | `POST /api/goals` |
| Locked goals cannot be edited by employees | `PUT /api/goals/[id]` |
| Locked goals can be edited by admin (logged) | `PUT /api/goals/[id]` |
| Check-in only inside active Cycle window | `POST /api/achievements` |

---

## Score Computation

```ts
// numeric_min — higher is better (e.g., sales revenue)
score = Math.min(100, (actual / target) * 100)

// numeric_max — lower is better (e.g., TAT, cost)
score = Math.min(100, (target / actual) * 100)

// timeline — date-based completion
score = (new Date(actual) <= new Date(target)) ? 100 : 0

// zero — zero = success (e.g., safety incidents)
score = (actual === 0) ? 100 : 0
```

Weighted aggregate score: `Σ (goalScore × goalWeightage) / 100`

---

## Key API Endpoints

### Auth
- `POST /api/auth/verify` — email/password login
- `[...nextauth]` — NextAuth session routes

### Goals
- `GET /api/goals` — scoped by session role
- `POST /api/goals` — create with validation
- `PUT /api/goals/[id]` — edit (admin can bypass lock with audit)
- `DELETE /api/goals/[id]` — only draft/rework
- `POST /api/goals/submit` — bulk submit, enforces 100%

### Achievements
- `GET /api/achievements?quarter=Q1&year=2026`
- `POST /api/achievements` — with window enforcement + shared-goal sync

### Manager
- `GET /api/manager/team`, `/api/manager/approvals`
- `POST /api/manager/shared-goals` — push KPI to team
- `POST /api/admin/goals/approve` — approve or rework (audit logged)

### Admin
- `GET/POST/PUT /api/admin/cycles` — BRD §2.3 quarterly windows
- `GET/POST/PUT/DELETE /api/admin/users`
- `POST /api/admin/goals/unlock` — emergency unlock with audit
- `GET /api/admin/reports?year=...` — Planned vs Actual data for CSV
- `GET /api/admin/audit` — full change history
- `GET /api/admin/stats`, `/api/admin/analytics`, `/api/admin/completion`

### Escalations (§5.3)
- `GET /api/escalations/rules` — seeds the 3 default rules if missing
- `PUT /api/escalations/rules/[id]` — edit threshold or activate/deactivate
- `POST /api/escalations/run` — execute the chain engine (advances pending + creates new)
- `GET /api/escalations/logs` — full history with `currentLevel` + `escalationHistory`
- `PUT /api/escalations/logs/[id]/resolve` — mark resolved

### Analytics (§5.4)
- `GET /api/analytics/heatmap` — employees × quarters completion grid
- `GET /api/analytics/manager-effectiveness` — composite ranking

---

## Architecture & Cost

```
[ Browser ]
    │
    ▼
[ Vercel Edge / Serverless (Next.js 14) ]
    │
    ├──▶ [ MongoDB Atlas — M0 free tier ]
    ├──▶ [ Brevo Transactional Email API ]
    └──▶ [ Microsoft Teams Incoming Webhook ]
```

**Monthly cost at hackathon scale: $0**
- Vercel Hobby — unlimited serverless invocations (free)
- MongoDB Atlas M0 — 512 MB storage (free)
- Brevo — 300 emails/day (free)
- Microsoft Teams webhook — free

Scales linearly: ~$25/month for 500 active users (upgrade Atlas to M2 + Vercel Pro if needed).

---

## Production Build & Deploy

```bash
npm run build   # production build with optimizations
npm start       # run production server locally
```

### Vercel Deployment

1. Push to GitHub
2. Import the repo at vercel.com
3. Add all environment variables (see `.env.example`)
4. Deploy
5. Set `NEXTAUTH_URL` to the Vercel-assigned URL after first deploy, then redeploy

---

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT sessions via NextAuth with HTTP-only cookies
- Role-based middleware on every route
- Server-side validation on all API endpoints
- All env secrets gitignored
- MongoDB connection cached via `global` (Vercel cold-start safe)

---

