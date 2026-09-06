# 🚀 Deploying TripMate to Render

This guide covers deploying TripMate as a **single, unified Web Service** on Render
(Express serves the API + Socket.IO + the compiled React frontend from one URL).

---

## Prerequisites

Before you begin, make sure you have:

| Service | What you need | Where to get it |
|---------|--------------|-----------------|
| **MongoDB Atlas** | Connection string (`mongodb+srv://...`) | [atlas.mongodb.com](https://www.mongodb.com/cloud/atlas/register) |
| **Cloudinary** | Cloud name, API key, API secret | [cloudinary.com](https://cloudinary.com) |
| **Gemini API** *(optional)* | API key | [ai.google.dev](https://ai.google.dev) |
| **Google Maps** *(optional)* | API key | [console.cloud.google.com](https://console.cloud.google.com) |
| **SMTP** *(optional)* | Host, port, user, password | Gmail App Password or any SMTP provider |

> **⚠️ MongoDB Atlas Network Access**
>
> Render instances use dynamic IP addresses. In your Atlas dashboard go to
> **Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)**
> so the deployed backend can connect.

---

## Option 1 — One-Click Blueprint Deployment

1. Push this repository to GitHub (if not already done).
2. Go to [render.com/deploy](https://render.com/deploy).
3. Connect this repository.
4. Render will detect the `render.yaml` blueprint and auto-configure the service.
5. Fill in the required environment variables when prompted:
   - `MONGO_URI` — your Atlas connection string
   - `CLIENT_URL` — your Render service URL (e.g. `https://tripmate-xxxx.onrender.com`)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - *(Optional)* `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, SMTP vars
6. Click **Apply** and wait for the build to finish.

---

## Option 2 — Manual Dashboard Setup

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect your GitHub repository.
3. Configure:

| Field | Value |
|-------|-------|
| **Name** | `tripmate` |
| **Runtime** | `Node` |
| **Build Command** | `npm run render-build` |
| **Start Command** | `npm start` |
| **Plan** | Free |

4. Under **Environment → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/tripmate` |
| `SESSION_SECRET` | *(any long random string)* |
| `CLIENT_URL` | `https://your-service-name.onrender.com` |
| `CLOUDINARY_CLOUD_NAME` | your cloud name |
| `CLOUDINARY_API_KEY` | your API key |
| `CLOUDINARY_API_SECRET` | your API secret |
| `GEMINI_API_KEY` | *(optional)* |
| `GOOGLE_MAPS_API_KEY` | *(optional)* |
| `SMTP_HOST` | *(optional, e.g. `smtp.gmail.com`)* |
| `SMTP_PORT` | *(optional, e.g. `587`)* |
| `SMTP_USER` | *(optional)* |
| `SMTP_PASS` | *(optional)* |
| `EMAIL_FROM` | *(optional, e.g. `TripMate <no-reply@tripmate.com>`)* |

5. Click **Create Web Service**.

---

## How it Works

```
Render runs:
  1. npm run render-build
     → npm install --prefix backend
     → npm install --prefix frontend
     → npm run build  --prefix frontend   (produces frontend/dist/)

  2. npm start
     → node backend/server.js
       • Express API on /api/*
       • Socket.IO on the same port
       • Static files from frontend/dist/
       • SPA fallback: all non-API routes → index.html
```

Your entire app runs on **one URL**, no CORS or cross-site cookie issues.

---

## Troubleshooting

### Cold Starts (Free Tier)
Render's free tier spins down after 15 minutes of inactivity. The first request
after a cold start takes ~30–60 seconds. Upgrade to a paid plan for always-on.

### MongoDB Connection Failures
- Verify Atlas **Network Access** allows `0.0.0.0/0`.
- Check `MONGO_URI` format: `mongodb+srv://user:password@cluster.mongodb.net/tripmate`
- Make sure the database user has **readWrite** permissions.

### Session / Cookie Issues
- `CLIENT_URL` must exactly match your Render URL (no trailing slash).
- The server sets `cookie.secure = true` in production and uses `trust proxy`.

### Socket.IO Not Connecting
- In production the frontend connects to `window.location.origin` (same URL).
- Ensure WebSocket support is enabled (Render supports it by default).

### Build Failures
- Check Render build logs for missing dependencies.
- Ensure `node >= 18` is available (set `NODE_VERSION=20.11.0` in env vars).
