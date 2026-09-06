# TripMate — AI Powered Collaborative Trip Planner

A starter MERN-stack implementation of the TripMate SRS: user auth, trip
planning, AI itineraries (Gemini), collaboration/join-requests, real-time group
chat (Socket.IO), expense splitting, and an emergency-resources API.

**Read `IMPLEMENTATION_GUIDE.md` first.** It's the step-by-step build order —
this README only covers running what's already scaffolded.

## What's included vs. what's left

This scaffold gives you a **working, runnable skeleton** covering the core
loop (register → login → create/join a trip → chat → AI itinerary → split
expenses). It intentionally does **not** implement every module from the SRS
(maps UI, offline PWA, identity verification upload flow, notifications UI,
reviews UI) — those are built step-by-step in the guide, on top of this
foundation, so you understand each piece rather than inheriting a black box.

## Project structure

```
tripmate/
├── backend/          Express API (MongoDB, sessions, Socket.IO)
│   ├── config/        DB connection
│   ├── models/        Mongoose schemas (User, Trip, TripMember, Message, ...)
│   ├── controllers/    Route handler logic
│   ├── routes/          Route definitions
│   ├── middleware/    Auth guard, error handling
│   ├── sockets/        Socket.IO chat handler
│   ├── utils/          Email sending
│   └── server.js       Entry point
└── frontend/         React (Vite) SPA
    ├── src/pages/     Login, Register, Dashboard, CreateTrip, TripDetails, Profile
    ├── src/components/ Navbar, TripCard, ProtectedRoute
    ├── src/context/    AuthContext (global user state)
    └── src/api/        Axios client
```

## Prerequisites

- Node.js 18+ and npm
- A MongoDB database — easiest option is a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster
- (Optional, for AI itineraries) A [Gemini API key](https://ai.google.dev)
- (Optional, for emails) SMTP credentials, e.g. a Gmail account with an [App Password](https://myaccount.google.com/apppasswords)

## Quickstart

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set MONGO_URI to your Atlas connection string, and SESSION_SECRET
# to any long random string (e.g. `openssl rand -hex 32`)
npm install
npm run dev
```

The API starts on `http://localhost:5000`. Check `http://localhost:5000/api/health`
— it should return `{"status":"ok"}`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend
(see `vite.config.js`), so no CORS setup is needed in development.

### 3. Try it out

1. Register an account (check your backend terminal — if SMTP isn't
   configured, the verification email is just logged to the console instead
   of sent).
2. Log in.
3. Click "Plan a trip" and create one.
4. Open the trip, try the **AI** tab (needs `GEMINI_API_KEY` in `backend/.env`),
   the **Chat** tab (open the same trip in two browser windows, logged in as
   two different users, to see real-time messages), and the **Expenses** tab.

## Next steps

Follow `IMPLEMENTATION_GUIDE.md` for the full phased build order, including
the modules not yet wired into the UI (maps, offline support, identity
verification, notifications, reviews) and how to deploy to Vercel + Render.
