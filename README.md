# CityFlow — Smart Municipal Issue Management Platform
## Demo Video

https://github.com/user-attachments/assets/2c4cc8c2-210c-4dac-adcf-579b4b06e67c

---

> Built for **Ichalkaranji Municipal Corporation, Maharashtra, India**
> Hackathon project — CodeAkatsuki

CityFlow is a full-stack civic tech platform that lets citizens report municipal issues (roads, water, electricity, garbage, traffic), tracks them through resolution, and gives administrators real-time visibility into city health — powered by **Google Gemini AI** for automated issue detection and completion verification.

---

## Architecture

```
CityFlow/
├── backend/          Django REST API (Python)
├── client-app/       Expo React Native mobile app (citizens + workers)
└── frontend-admin/   Vite + React web dashboard (admins)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 6.0.3, Django REST Framework 3.16.1, SimpleJWT 5.5.1 |
| AI | Google Gemini (`gemini-flash-lite-latest`) via `google-genai` |
| Mobile | Expo 55 / React Native 0.83.2, Expo Router, Axios |
| Admin UI | Vite 7 + React 19, Tailwind CSS 3, Recharts 3, Leaflet (CDN) |
| Database | SQLite (dev) |
| Auth | JWT — access token 7 days, refresh 30 days |

---

## Features

### Citizen Mobile App
- **Report issues** with camera + live GPS geo-tag stamp (DMS coordinates watermarked on photo)
- **AI auto-detect** — Gemini classifies the photo and pre-fills category, title, and description
- **Civic feed** — browse all public issues, upvote, comment
- **Complaint tracking** — timeline view showing each status transition
- **AI completion score** — see Gemini's quality verdict (0–100) once a worker resolves your issue
- **Profile management** — photo upload, address, DOB, gender fields

### Worker Mobile App
- **Task dashboard** — priority-sorted task list with high-priority alert banner
- **Satellite map** — Leaflet map in WebView with live GPS and greedy nearest-neighbor route optimization (priority-tiered: High → Medium → Low), distance + ETA display
- **Mark resolved** — capture completion photo in-app; get a live AI preview score before final submission
- **Civic feed** — read-only view of public issue feed

### Admin Web Dashboard
- **KPI cards** — total issues, high priority count, avg resolution time, active workers, overflow bins
- **Issue table** — multi-filter by category / status / priority / ward / search; assign worker; update status
- **Satellite issue map** — Esri satellite + CartoDB labels via Leaflet; color-coded markers by status; filter panel
- **Workers** — add, edit, delete workers; view workload per worker
- **Garbage monitoring** — SVG circular fill gauges per bin; IoT simulation; custom geographic map of Ichalkaranji with geo-projected bin dots
- **Analytics** — monthly category trend (bar), resolution trend (line), category distribution (pie), ward-wise breakdown, worker performance table
- **Wards page** — resolution rate and pending count per ward
- **Civic feed** — before/after photo comparison cards with AI score panel

---

## Backend Setup

### Requirements
- Python 3.11+
- pip

### Install & Run

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables

Create `backend/.env`:

```env
SECRET_KEY=django-insecure-cityflow-dev-secret-key-change-in-production-2024
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com).

### Database & Seed

```bash
python manage.py migrate
python manage.py seed        # creates 1 admin + 10 workers + 3 citizens
```

### Run Server

```bash
python manage.py runserver 0.0.0.0:8000
```

---

## Client App Setup

### Requirements
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Android / iOS device or emulator with Expo Go

### Install

```bash
cd client-app
npm install
```

### Configure API URL

Open `client-app/src/services/api.js` and update the base URL to your machine's LAN IP:

```js
const BASE_URL = 'http://<YOUR_LAN_IP>:8000/api';
```

Both the backend server and the mobile device must be on the **same network**.

### Run

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or Camera (iOS).

---

## Admin Dashboard Setup

### Requirements
- Node.js 18+

### Install

```bash
cd frontend-admin
npm install
```

### Environment Variables

Create `frontend-admin/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Seed Credentials

Run `python manage.py seed` to populate the database with:

### Admin
| Email | Password |
|---|---|
| admin@cityflow.gov.in | admin1234 |

### Citizens
| Email | Password | Ward |
|---|---|---|
| rajesh@example.com | 1234 | Ward 5 |
| sunita@example.com | 1234 | Ward 3 |
| amol@example.com | 1234 | Ward 7 |

### Workers
| Email | Password | Specialization | Ward |
|---|---|---|---|
| dnyanesh@ichalkaranji.gov.in | 1234 | Infrastructure | 5 |
| prashant@ichalkaranji.gov.in | 1234 | Infrastructure | 2 |
| vishwas@ichalkaranji.gov.in | 1234 | Sanitation | 3 |
| suresh@ichalkaranji.gov.in | 1234 | Sanitation | 8 |
| santosh@ichalkaranji.gov.in | 1234 | Water Supply | 7 |
| ganesh@ichalkaranji.gov.in | 1234 | Water Supply | 1 |
| anil@ichalkaranji.gov.in | 1234 | Electrical | 5 |
| ravi@ichalkaranji.gov.in | 1234 | Electrical | 4 |
| mahesh@ichalkaranji.gov.in | 1234 | Traffic Control | 6 |
| prakash@ichalkaranji.gov.in | 1234 | Maintenance | 3 |

> **Note:** `seed` clears all existing users, issues, and bins before seeding. Issues and bins are **not** seeded — the database starts clean for users only.

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register/` | Public | Register new user |
| POST | `/api/auth/login/` | Public | Login — returns `access` + `refresh` tokens |
| POST | `/api/auth/token/refresh/` | Public | Refresh access token |
| GET | `/api/auth/me/` | Bearer | Get current user profile |
| PATCH | `/api/auth/profile/` | Bearer | Update name, ward, gender, DOB, address |
| POST | `/api/auth/profile-photo/` | Bearer | Upload profile photo |
| POST | `/api/auth/change-password/` | Bearer | Change password |
| GET | `/api/auth/workers/` | Admin | List all workers with task stats |

### Issues
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET/POST | `/api/issues/` | Bearer | List (filtered) or create issue |
| GET | `/api/issues/my/` | Citizen | Own reported issues |
| GET | `/api/issues/assigned/` | Worker | Assigned tasks |
| GET | `/api/issues/nearby/` | Bearer | Issues within radius (`lat`, `lng`, `radius_km`) |
| GET/PATCH | `/api/issues/<id>/` | Bearer | Issue detail / update status |
| POST | `/api/issues/<id>/upvote/` | Bearer | Toggle upvote |
| POST | `/api/issues/<id>/comments/` | Bearer | Add comment |

### Bins
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/bins/` | Bearer | List bins (filter by `ward`) |
| GET/PATCH | `/api/bins/<id>/` | Bearer | Bin detail / update fill level |

### Analytics (Admin only)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard-stats/` | KPI summary |
| GET | `/api/analytics/wards/` | Per-ward issue stats |
| GET | `/api/analytics/category-trend/` | Monthly category pivot |
| GET | `/api/analytics/resolution-trend/` | Monthly avg resolution hours |
| GET | `/api/analytics/activity-log/` | Recent 20 timeline entries |

### AI
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/detect-issue/` | Bearer | Classify image → category, title, description |
| POST | `/api/ai/verify-completion/<id>/` | Admin/Worker | Trigger AI completion verification (saves score) |
| POST | `/api/ai/preview-completion/<id>/` | Worker | Preview AI score without saving |

---

## Data Models

### User (accounts.User)
- `role` — `citizen` / `worker` / `admin`
- `ward` — municipal ward number
- `category` — worker specialization (Infrastructure, Sanitation, Water Supply, Electrical, Traffic Control, Maintenance)
- `display_id` — auto-generated (C-001, W-001, A-001)
- `profile_photo`, `gender`, `dob`, `street`, `landmark`

### Issue (issues.Issue)
- `display_id` — auto-incremented from CP-2001
- `category` — Road / Water Supply / Electricity / Garbage / Traffic / Public Facilities
- `status` — Submitted → Assigned → In Progress → Resolved → Closed
- `priority` — High / Medium / Low
- `priority_score` — 0–100, computed from: `(category_weight × 0.5) + (hours_since_report × 0.3) + (ward_frequency × 0.2)`
- `image` — before photo
- `completion_photo` — after photo (uploaded by worker)
- `ai_completion_score` — 0–100 Gemini verdict
- `ai_completion_verdict` — text explanation from Gemini
- `assigned_to` — FK to worker
- `upvotes` — count

### GarbageBin (bins.GarbageBin)
- `fill_level` — 0–100%
- `status` — Normal (<70%) / Near Capacity (70–89%) / Overflow (≥90%)
- `capacity` — liters
- `assigned_worker` — FK

---

## Auto-Assignment Logic

When an issue is created, `auto_assign.py` runs:
1. Maps issue category → compatible worker specializations
2. Filters for same-ward workers first
3. Picks the worker with the fewest active (non-resolved, non-closed) tasks

---

## AI Integration

Two Gemini flows:

**Issue Detection** (on report):
- Citizen takes photo → `POST /api/ai/detect-issue/`
- Gemini returns `{category, title, description, confidence}`
- Pre-fills the report form

**Completion Verification** (on resolve):
- Worker uploads completion photo → Gemini compares before vs. after
- Returns `completion_score` (0–100) and a `verdict` text
- Preview endpoint available to worker before final submission — score is not saved until confirmed

---

## Project Structure

```
backend/
├── cityflow/          Django project (settings, root urls)
├── accounts/          Custom user model, JWT auth, profile
├── issues/            Core issue model, CRUD, auto-assign, seed
├── bins/              Garbage bin IoT model and API
├── analytics/         Aggregation views for dashboard
└── ai/                Gemini service (detect + verify)

client-app/src/
├── app/               Expo Router entry + layout
├── context/           ClientContext (global state + API calls)
├── services/          Axios API layer
├── components/shared/ GeoCamera, FeedIssueCard
└── pages/             All screens (citizen + worker)

frontend-admin/src/
├── context/           AppContext (admin state + API calls)
├── services/          API layer
├── components/layout/ Sidebar, Navbar, AdminLayout
└── pages/             Dashboard, Issues, IssueMap, Workers,
                       GarbageMonitoring, Wards, Reports,
                       Feed, Settings, Login
```
