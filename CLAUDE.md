# CLAUDE.md — mlb162

## ⚠️ Active Development Focus

**MOBILE ONLY.** The web frontend (`frontend/`) has been abandoned for now. All active UI/UX development is happening exclusively in `mobile/` (React Native / Expo). Do not suggest, modify, or reference frontend files unless explicitly asked.

The backend (`backend/`) is still active and supports the mobile app.

---

## Project Overview

**MLB162** is a full-stack MLB Daily Picker Game where users predict game outcomes and compete on leaderboards. Users make moneyline (+1 pt) or spread (+2/-1 pt) picks on daily MLB games, with auto-grading each night.

**Mono-repo with three sub-projects:**
```
mlb162/
├── backend/    # Node.js/Express REST API — ACTIVE
├── frontend/   # React/Vite web app — ABANDONED (do not touch)
├── mobile/     # React Native/Expo mobile app — ACTIVE FOCUS
└── migrations/ # PostgreSQL migration files (run from backend)
```

## Architecture

### Backend (`backend/`)
- **Runtime:** Node.js + Express 4
- **Database:** PostgreSQL 14+ via `pg` pool (`backend/src/config/database.js`)
- **Cache:** Redis (optional — falls back to in-memory if unavailable) (`backend/src/config/redis.js`)
- **Auth:** JWT access tokens (15m) + refresh tokens (7d), bcryptjs password hashing
- **Email:** Resend API (`backend/src/services/emailService.js`)
- **Scheduling:** node-cron (`backend/src/jobs/scheduler.js`)
- **Validation:** Joi schemas in `backend/src/middleware/validation.js`
- **Logging:** Winston (`backend/src/config/logger.js`)

**Key source layout:**
```
backend/src/
├── server.js           # Express app entry
├── config/             # database, redis, logger, mlb-api
├── middleware/         # auth.js, errorHandler.js, validation.js
├── models/             # User, Game, Pick, League
├── routes/             # auth, games, picks, leaderboard, leagues, admin, web
├── services/           # authService, mlbDataService, scoringService, cacheService, emailService
└── jobs/scheduler.js   # Cron job definitions
```

### Frontend (`frontend/`)
- **Stack:** React 18, Vite, Tailwind CSS 3, React Router 6, Axios, Recharts
- **Auth state:** `frontend/src/context/AuthContext.jsx`
- **API client:** `frontend/src/services/api.js` (Axios instance, auto-injects JWT)
- **Custom hooks:** `useGames`, `usePicks`, `useLeaderboard`, `useLeagues` in `frontend/src/hooks/`
- **Mock data toggle:** `frontend/src/utils/mockData.js` — set `USE_MOCK=true` for UI dev without backend

**Routing split:**
- Public: `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/leagues/join`
- Protected (via `ProtectedRoute`): `/dashboard`, `/leaderboard`, `/profile`, `/leagues`, `/leagues/:id`

### Mobile (`mobile/`)
- **Stack:** React Native 0.81 + Expo SDK 54, React Navigation (native-stack + bottom-tabs)
- **Auth state:** `mobile/src/context/AuthContext.jsx` — handles token storage via Expo Secure Store
- **Token storage:** `mobile/src/services/tokenStorage.js` — uses `expo-secure-store`
- **API client:** `mobile/src/services/api.js` — mirrors frontend Axios setup
- **Mock data toggle:** `EXPO_PUBLIC_USE_MOCK=false` in `.env`

**Navigation structure:**
```
AppNavigator (root)
├── AuthNavigator  → LoginScreen, RegisterScreen, ForgotPasswordScreen, ChangePasswordScreen
└── AppTabNavigator → Dashboard, Leaderboard, Leagues, Profile
```

## Development Commands

### Backend
```bash
cd backend
npm run dev          # nodemon dev server on :3000
npm start            # production server
npm run migrate:all  # run all pending SQL migrations
npm run migrate      # run single migration
npm run seed         # seed mock data
```

### Frontend
```bash
cd frontend
npm run dev          # Vite dev server on :5173
npm run build        # production build → dist/
npm run preview      # preview production build
```

### Mobile
```bash
cd mobile
npm start            # Expo dev server (scan QR with Expo Go)
npm run android      # Android simulator
npm run ios          # iOS simulator
# DO NOT use `npm run web` for style verification — it spawns a heavy Expo web server
```

## Environment Variables

### Backend (`backend/.env`)
```
NODE_ENV=
PORT=3000
DATABASE_URL=postgresql://...
DB_POOL_MAX=20
REDIS_URL=redis://localhost:6379   # optional
JWT_SECRET=
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
RESEND_API_KEY=
FROM_EMAIL=
APP_URL=
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:3000/api
```

### Mobile (`mobile/.env`)
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_USE_MOCK=false
```

## Database

**Migrations** live in `migrations/` and are run via backend scripts:
```bash
cd backend && npm run migrate:all
```

**Schema overview (8 migrations):**
| Migration | Purpose |
|-----------|---------|
| 001 | Core tables: users, games, picks, daily_scores |
| 002 | User color for leaderboard visualization |
| 003 | Email verification tokens |
| 004 | Leagues tables |
| 005 | Pick outcome tracking |
| 006 | Password reset tokens |
| 007 | JWT refresh token storage |
| 008 | `must_change_password` flag on users |

**Key constraints:** `picks(user_id, game_id)` is unique; games use JSONB for lineup/pitcher data.

## Scheduled Jobs

Four cron jobs defined in `backend/src/jobs/scheduler.js`, also triggerable via admin endpoints:

| Job | Schedule | Endpoint |
|-----|----------|---------|
| Fetch MLB games | Daily 6 AM | `POST /api/admin/jobs/fetch-games` |
| Update lineups | Every 30 min | `POST /api/admin/jobs/update-lineups` |
| Grade results | Daily midnight | `POST /api/admin/jobs/grade-results` |
| Update leaderboard | Daily 12:30 AM | `POST /api/admin/jobs/update-leaderboard` |

## Deployment

| Target | Platform | Notes |
|--------|----------|-------|
| Backend | Render | Build: `cd backend && npm install`; Start: `cd backend && npm start` |
| Frontend | Vercel | Root dir: `frontend/`; SPA routing via `vercel.json` |
| Mobile | Expo EAS | Dev → Preview (staging API) → Production (app stores) |

**EAS build profiles** (`mobile/eas.json`):
- `development` — internal distribution, dev client
- `preview` — internal, staging API
- `production` — App Store + Google Play, auto-increment version

**Production API:** `https://one62.onrender.com/api`

## Key Conventions

### Auth Flow
1. Register → email verification required before picking
2. Login returns `{ accessToken, refreshToken }`
3. Access token stored in memory (mobile: Secure Store); refresh token in DB + client
4. `POST /api/auth/refresh` rotates both tokens
5. `must_change_password` flag on user forces password change before any other action

### API Patterns
- All protected routes require `Authorization: Bearer <token>` header
- Middleware order: CORS → rate-limit → auth → route handler → errorHandler
- Errors follow `{ success: false, error: { message, code } }` shape
- Cache keys are route-specific; invalidated on writes

### Mobile-Specific
- Use `expo-secure-store` for any credential storage — never AsyncStorage for tokens
- Team logos via `mobile/src/utils/teamLogos.js` (URL map, not local assets)
- Deep links (`/join`) handled in `AppNavigator` for league invitations
- **Do not start Expo web server to verify style changes** — use device/simulator

### Frontend-Specific
- Mock data mode for UI dev: toggle `USE_MOCK` in `frontend/src/utils/mockData.js`
- `EmailVerificationBanner` shown globally for unverified accounts
- Tailwind theme uses custom navy/red/brown color palette (see `tailwind.config.js`)

### Database
- Always write migrations as new numbered SQL files — never edit existing ones
- Use `ON DELETE CASCADE` for user-owned data
- Index on `(user_id, game_date)` pattern for picks/scores queries

## Current WIP

- **`mobile/src/screens/auth/ChangePasswordScreen.jsx`** — new, untracked; part of the password-change-required workflow
- Recent commits focused on password reset flow (`must_change_password` flag, change-password endpoint, mobile screen)
- Modified files: `mobile/src/context/AuthContext.jsx`, `mobile/src/navigation/AppNavigator.jsx`, `mobile/src/services/auth.js`, `mobile/src/utils/teamLogos.js`
