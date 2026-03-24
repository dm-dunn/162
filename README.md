# MLB162 - Daily MLB Picker Game

A web-based game for picking MLB games throughout the 162-game season.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Cache:** Redis (optional)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional)

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
npm install
```

2. Create `.env` file (copy from `.env.example`)

3. Set up database:
```bash
createdb mlb162
psql mlb162 < migrations/001_initial_schema.sql
```

4. Start server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
npm install
```

2. Create `.env` file (copy from `.env.example`)

3. Start dev server:
```bash
npm run dev
```

## Deployment

### Backend (Render)

1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add environment variables
6. Add PostgreSQL database

### Frontend (Vercel)

1. Import GitHub repo
2. Set root directory: `frontend`
3. Set VITE_API_URL environment variable
4. Deploy

### Scheduled Jobs

Use cron-job.org or GitHub Actions to hit admin endpoints:

- `POST /api/admin/jobs/fetch-games` - Daily at 6 AM
- `POST /api/admin/jobs/update-lineups` - Every 30 min during games
- `POST /api/admin/jobs/grade-results` - Daily at midnight
- `POST /api/admin/jobs/update-leaderboard` - Daily at 12:30 AM

## Features

- Daily MLB game picks
- Moneyline and Spread betting
- Real-time leaderboard
- Automated grading
- Season-long tracking

## License

MIT
