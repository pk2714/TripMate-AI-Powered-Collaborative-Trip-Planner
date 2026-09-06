require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { registerChatHandlers } = require("./sockets/chatSocket");

const authRoutes = require("./routes/authRoutes");
const tripRoutes = require("./routes/tripRoutes");
const aiRoutes = require("./routes/aiRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");
const userRoutes = require("./routes/userRoutes");
const mapRoutes = require("./routes/mapRoutes");
const chatRoutes = require("./routes/chatRoutes"); //added(phase 8)

const {
  tripScopedRouter: tripReviewRoutes,
  userScopedRouter: userReviewRoutes,
} = require("./routes/reviewRoutes");

const app = express();
const server = http.createServer(app);

const IS_PROD = process.env.NODE_ENV === "production";

// ── Trust the Render reverse-proxy so secure cookies & rate-limiting work ──
if (IS_PROD) {
  app.set("trust proxy", 1);
}

// Test Route
app.get("/test", (req, res) => {
  res.json({ ok: true });
});

// ── CORS origin ──
// Normalise CLIENT_URL (strip trailing slash if present)
const clientOrigin = (process.env.CLIENT_URL || "").replace(/\/+$/, "");

const io = new Server(server, {
  cors: {
    origin: clientOrigin || false,
    credentials: true,
  },
});

connectDB();

// ── Middleware ──
// Helmet — disable contentSecurityPolicy so OpenStreetMap tiles, Cloudinary
// images, and the PWA service worker are not blocked.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: clientOrigin || false,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// ── API Routes ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/maps", mapRoutes);
app.use("/api/trips/:tripId/expenses", expenseRoutes);
app.use("/api/trips/:tripId/reviews", tripReviewRoutes);
app.use("/api/users", userReviewRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/chat", chatRoutes);// added (phase 8)

// ── Serve React frontend if it's built ──
const fs = require("fs");
const distPath = path.join(__dirname, "..", "frontend", "dist");

if (fs.existsSync(distPath)) {
  // Serve static assets (JS, CSS, images, manifest, SW, etc.)
  app.use(express.static(distPath));

  // SPA catch-all — any non-API route returns index.html so client-side
  // routing (React Router) works on page refresh / direct navigation.
  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // In development, the Vite dev server handles the frontend.
  // This catch-all avoids confusing 404 JSON for browser requests.
  app.use(notFound);
}

// Error Handlers
app.use(errorHandler);

// Socket.IO
registerChatHandlers(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`TripMate API running on port ${PORT}`);
});