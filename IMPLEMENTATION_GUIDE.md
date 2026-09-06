# TripMate — Step-by-Step Implementation Guide

This guide walks you from the SRS you already wrote through to a deployed
product, in the order you should actually build things. It assumes the
`backend/` and `frontend/` scaffold in this project as your starting point —
Phases 0–5 are already done for you there; read those sections to understand
*why* the code is structured the way it is, then pick up building for real at
Phase 6 onward.

Work through phases **in order**. Each one builds on the last, and each ends
with a "you'll know it works when..." checklist — don't move on until that
passes.


---

## Phase 0 — Tools you need before starting

Install these once, on your machine:

| Tool | Why | Check it's installed |
|---|---|---|
| [Node.js 18+](https://nodejs.org) | Runs both backend and frontend | `node -v` |
| [Git](https://git-scm.com) | Version control | `git -v` |
| [VS Code](https://code.visualstudio.com) (or any editor) | Editing code | — |
| [MongoDB Compass](https://www.mongodb.com/products/compass) (optional but recommended for a beginner) | Lets you *see* your database visually instead of only through code | — |
| [Postman](https://www.postman.com/downloads/) or the VS Code "Thunder Client" extension | Testing API endpoints directly, without the frontend | — |

You'll also need free accounts for:

1. **MongoDB Atlas** (database) — https://www.mongodb.com/cloud/atlas/register
2. **Google AI Studio** (Gemini API key, for the AI trip planner) — https://ai.google.dev
3. **Google Cloud Console** (Maps API key) — https://console.cloud.google.com
4. **Cloudinary** (image uploads — profile photos, ID documents) — https://cloudinary.com
5. A Gmail account with an **App Password** for sending emails — https://myaccount.google.com/apppasswords

You don't need all of these immediately — each phase below tells you exactly
when you'll need which key. Get them as you go, not all upfront.

---

## Phase 1 — Requirement Analysis (already done)

This is your uploaded SRS document. Keep it open in a tab — every phase below
maps to a numbered section in it (e.g. Phase 9 "Expense Management" maps to
SRS section 3.9). If a requirement changes as you build (it will — that's
normal), update the SRS to match reality so it stays a useful reference.

---

## Phase 2 — Project setup (already done in this scaffold)

What's already been created for you, and why it's structured this way:

- **`backend/` and `frontend/` are separate npm projects.** This mirrors how
  they'll actually deploy (different hosts, different lifecycles) and lets you
  restart one without restarting the other during development.
- **`backend/config/db.js`** centralizes the MongoDB connection so it's called
  once at startup, not scattered across files.
- **`backend/middleware/errorHandler.js`** exports an `asyncHandler` wrapper.
  Every controller function is wrapped in it — this means you can `await`
  freely inside controllers and any thrown error automatically becomes a
  proper HTTP error response, instead of crashing the server or hanging the
  request.
- **Sessions, not JWT.** The SRS calls for "Session Authentication" — this
  scaffold uses `express-session` with MongoDB-backed session storage
  (`connect-mongo`), which is simpler to reason about as a beginner (no token
  refresh logic, no client-side token storage) and matches the requirement
  exactly.

**Run it now** (if you haven't): follow the Quickstart in `README.md`. Confirm
`http://localhost:5000/api/health` returns `{"status":"ok"}` and
`http://localhost:5173` loads the TripMate homepage before continuing.

---

## Phase 3 — Authentication & User Management (scaffolded — verify it)

**SRS section 3.1.** Already implemented: register, email verification, login,
logout, forgot/reset password, session-based `requireAuth` middleware.

### Your task: test every path manually

Using the running app (or Postman against `http://localhost:5000/api/auth/...`):

1. Register a new user. Check your **backend terminal** — since SMTP isn't
   configured yet, you'll see `[email skipped — no SMTP config]` with the
   verification link logged instead of emailed.
2. Copy that link, visit it — confirm you get "Email verified."
3. Try logging in with the wrong password — confirm you get a 401 with a
   generic "Invalid email or password" message (not "wrong password", which
   would leak that the email exists).
4. Log in correctly — open MongoDB Compass, look at the `sessions` collection
   that `connect-mongo` created — you should see your session document there.
5. Refresh the frontend page while logged in — confirm you stay logged in
   (this is `AuthContext.jsx` calling `GET /api/auth/me` on mount).

### Wire up real email (do this now, it's needed for Phase 12 too)

1. Get a Gmail App Password (link in Phase 0).
2. In `backend/.env`, set `SMTP_USER` and `SMTP_PASS`.
3. Register a new test account — you should now receive a real email.

**You'll know Phase 3 works when:** register, then the verify-email link,
then login, then refresh-stays-logged-in, then logout — all work end-to-end
with a real email arriving.

---

## Phase 4 — User Profile & Identity Verification

**SRS sections 3.2 and 3.3.** Partially scaffolded (the `User` model already
has every profile field and a `verificationStatus` enum). What's missing:

1. **A route to update the profile.** `frontend/src/pages/Profile.jsx` already
   calls `PUT /api/users/me` — but that route doesn't exist yet. Add it:
   - `backend/controllers/userController.js` (new file): an `updateProfile`
     handler that does `User.findByIdAndUpdate(req.session.userId, req.body, { new: true })`.
     Only allow the profile fields from the SRS (name, age, gender, bloodGroup,
     phoneNumber, emergencyContact, medicalConditions, vehicleInformation) —
     don't let the request body overwrite `role` or `password` this way.
   - `backend/routes/userRoutes.js` (new file): `router.put("/me", requireAuth, updateProfile)`.
   - Mount it in `server.js`: `app.use("/api/users", userRoutes)` — put this
     line **before** the existing `app.use("/api/users", userReviewRoutes)`
     line, or merge the two route files into one, since Express matches routes
     in registration order.

2. **Identity verification upload flow.** This is the more involved part:
   - Sign up for Cloudinary (free tier), get your cloud name / API key / secret
     from the dashboard, put them in `backend/.env`.
   - `npm install cloudinary multer` in `backend/`.
   - Add a route `POST /api/users/me/verification-documents` that accepts a
     file upload (via `multer`), uploads it to Cloudinary, and creates a
     `VerificationDocument` record with `status: "pending"`.
   - Add an admin-only route `PATCH /api/admin/verification-documents/:id`
     that sets `status` to `"verified"` or `"rejected"` and, if verified,
     updates the corresponding `User.verificationStatus` to `"verified"` and
     `trustedTraveler` to `true`. Protect it with the existing `requireAdmin`
     middleware in `middleware/auth.js`.
   - On the frontend, add a simple file `<input type="file">` to
     `Profile.jsx` with its own submit button that posts to that endpoint.

**You'll know Phase 4 works when:** you can edit your profile fields and see
them persist after a refresh, and you can upload a document image and see a
`VerificationDocument` row appear in MongoDB Compass with `status: "pending"`.

---

## Phase 5 — Trip Planning & Collaboration (scaffolded — extend it)

**SRS sections 3.4 and 3.6.** Create/read/update/delete trips, join requests,
accept/reject, leave — all implemented in `tripController.js`. What's left is
finishing the **organizer's view of pending requests**, which the frontend
currently stubs out with a placeholder message (see the "Overview" tab in
`TripDetails.jsx`).

1. Change `getTripById` in `backend/controllers/tripController.js` to also
   return members with `status: "requested"` when the requester is the
   organizer (right now it only returns `status: "accepted"` members).
2. In `TripDetails.jsx`, replace the placeholder text in the organizer's
   "Pending join requests" box with a list of those requested members, each
   with **Accept** / **Reject** buttons calling
   `respondToRequest(member._id, "accepted")` / `"rejected"` — that function
   already exists in the component, just isn't rendered yet.

**You'll know Phase 5 works when:** log in as User A, create a trip. Log in
as User B (different browser/incognito window), request to join. Back as User
A, see the request and accept it. Confirm User B now shows up in the Members
list.

---

## Phase 6 — AI Trip Planner (Gemini) (scaffolded — extend it)

**SRS section 3.5.** `backend/controllers/aiController.js` already calls
Gemini and caches the result on the trip. Get it fully working:

1. Get a free Gemini API key from https://ai.google.dev (click "Get API key").
2. Put it in `backend/.env` as `GEMINI_API_KEY`.
3. Restart the backend, open a trip, click **Generate itinerary** in the AI
   tab.

### Making the output structured instead of free text

Right now Gemini returns one big block of text. For a nicer UI (separate
cards for packing list, hotels, etc. — matching the SRS's itemized list), ask
Gemini to return JSON:

1. In `buildPrompt()`, add a line asking it to respond with ONLY valid JSON
   matching the shape of the `aiItinerary` sub-document (itinerary,
   budgetEstimation, packingChecklist, foodSuggestions, hotelRecommendations,
   travelTips, safetyRecommendations).
2. In `generateItinerary`, wrap the `JSON.parse(text)` in a try/catch — Gemini
   sometimes wraps JSON in markdown code fences, so strip those first before
   parsing.
3. Store the parsed fields directly into `trip.aiItinerary` (the schema
   already has `packingChecklist`, `foodSuggestions`, etc. as array fields,
   ready for this).
4. Update the AI tab in `TripDetails.jsx` to render each field as its own
   section instead of one block of preformatted text.

**You'll know Phase 6 works when:** clicking Generate returns a real,
destination-specific itinerary within a few seconds, and regenerating updates
it.

---

## Phase 7 — Map Integration

**SRS section 3.8.** Not yet in the frontend. Two ways to do this — pick
Google Maps if you want richer place data (hotels, hospitals, etc. via Places
API), pick OpenStreetMap/Leaflet if you want a fully free option with no
billing setup.

### Option A: Google Maps (matches SRS's primary listed choice)

1. In Google Cloud Console, enable the **Maps JavaScript API** and **Places
   API**, create an API key, restrict it to your domain.
2. Put it in `frontend/.env` as `VITE_GOOGLE_MAPS_API_KEY`.
3. `npm install @react-google-maps/api` in `frontend/`.
4. Create `frontend/src/components/TripMap.jsx` that renders a map centered
   on the trip's destination (you'll need to geocode the destination string
   to lat/lng — the Geocoding API, or have `CreateTrip.jsx` capture lat/lng
   directly using the Places Autocomplete widget instead of a plain text
   input).
5. Add it as a new "Map" tab in `TripDetails.jsx`, alongside overview/ai/chat/expenses.
6. For "nearby hotels / hospitals / petrol pumps" etc., use the Places API's
   nearby-search with the appropriate place type, triggered by buttons above
   the map.

### Option B: OpenStreetMap + Leaflet (free, no API key needed)

1. `npm install leaflet react-leaflet` in `frontend/`.
2. Same `TripMap.jsx` idea, but using react-leaflet's map container with an
   OpenStreetMap tile layer — no billing account needed.
3. For "nearby" searches, use the free Overpass API instead of Places API.

**You'll know Phase 7 works when:** opening a trip's Map tab shows a pin at
the destination, and at least one "nearby" button (e.g. hospitals) shows
markers around it.

---

## Phase 8 — Real-Time Group Chat (scaffolded — extend it)

**SRS section 3.7.** Text chat already works end-to-end via Socket.IO. Two
pieces from the SRS remain:

1. **Media sharing.** Reuse the Cloudinary setup from Phase 4: add an image
   input next to the chat input in `TripDetails.jsx`, upload to Cloudinary
   (client-side or via a small backend endpoint), then send a socket message
   with `type: "image"` and the resulting `mediaUrl`. The `Message` model and
   `chatSocket.js` handler already support this shape — just render
   `msg.mediaUrl` as an image when `msg.type === "image"`.

2. **Live location sharing.** `chatSocket.js` already has a `shareLocation`
   event wired up (broadcast-only, not saved to the DB — location updates
   happen too often to persist each one). On the frontend, use the browser's
   geolocation watch API to periodically emit `shareLocation` events, and
   listen for `locationUpdate` events to plot other members' live positions
   on the Map tab from Phase 7.

**You'll know Phase 8 works when:** two logged-in users in the same trip's
chat can see each other's text messages, images, and (if you're testing on a
phone or with browser location permissions granted) live position on the map.

---

## Phase 9 — Expense Management (scaffolded — verify it)

**SRS section 3.9.** Adding expenses, even splitting, and balance summary are
all implemented (`expenseController.js`). "Payment History" from the SRS is
just the existing expense list, already shown.

**Optional extension — custom splits:** right now every expense splits
evenly across all accepted members. To let the person adding an expense
choose who it's split between, add a multi-select of trip members to the
"Add an expense" form in `TripDetails.jsx` and pass the selected user IDs as
`splitBetween` in the POST body — the backend already accepts and uses this
field, it's just not exposed in the UI yet.

**You'll know Phase 9 works when:** adding a few expenses across 2+ trip
members produces a balance summary where the numbers actually make sense
(the person who paid the most shows a positive "is owed" balance).

---

## Phase 10 — Emergency Module

**SRS section 3.10.** Backend routes for nearby emergency resources exist
(`emergencyController.js`) but there's no frontend page yet, and no data in
the `EmergencyResource` collection to query.

1. **Seed some data.** Write a one-off script `backend/scripts/seedEmergencyResources.js`
   that connects to MongoDB and inserts a handful of `EmergencyResource`
   documents (hospitals, police stations) with real lat/lng for your test
   region — or, better, pull real data from the Overpass API (same free OSM
   data source as Phase 7 Option B) for hospitals/police near a city and
   bulk-insert it.
2. **Build the SOS page.** Create `frontend/src/pages/Emergency.jsx`:
   - A big red **SOS** button that, on click, gets the browser's current
     location and calls `GET /api/emergency/nearby?lat=..&lng=..` to show the
     closest hospital, police station, etc.
   - A static "First Aid Guide" section — this can just be hardcoded
     content (bleeding, burns, choking, CPR basics) since it doesn't need to
     be dynamic.
   - A list of the user's own emergency contact (from their profile, Phase 4)
     with a click-to-call link for one-tap calling on mobile.
3. Add a route for it in `App.jsx` and a link in the `Navbar`.

**You'll know Phase 10 works when:** clicking SOS on a device with location
enabled shows real nearby hospitals/police sorted by distance.

---

## Phase 11 — Offline Support (PWA)

**SRS section 3.11.** This is the most involved remaining module — it turns
the SPA into an installable Progressive Web App that caches critical data.

1. `npm install vite-plugin-pwa -D` in `frontend/`.
2. In `vite.config.js`, add the plugin to the plugins array with
   `registerType: "autoUpdate"`.
3. Configure a **service worker caching strategy**: cache-first for static
   assets (JS/CSS/images), network-first-with-fallback for API calls to
   `/api/emergency/*` and the current trip's details, so they're available
   offline after the first successful fetch.
4. For structured data that needs to be queryable offline (trip details,
   emergency contacts, first aid guide), use **IndexedDB** via the `idb`
   package rather than just the Cache API — write it once whenever a trip
   loads successfully, read from it when a fetch fails.
5. Test it: open the app, view a trip and the Emergency page once (to
   populate the cache), then use your browser's dev tools to simulate being
   offline, and confirm those pages still render.

**You'll know Phase 11 works when:** after visiting a trip once online, you
can go offline (airplane mode or dev-tools throttling) and still see that
trip's cached details and the emergency contacts/first aid guide.

---

## Phase 12 — Notifications Module

**SRS section 3.12.** The `Notification` model and creation calls already
exist inside `tripController.js` (join requests/approvals create notification
records). Two things remain:

1. **Email notifications** — reuse `utils/sendEmail.js` (already wired up
   from Phase 3) and call it from the same places that currently create a
   `Notification` document, e.g. in `respondToJoinRequest`, also send an
   email using the same message text.
2. **In-app notification bell** — add a route to list a user's notifications
   (sorted newest-first) and a route to mark one read, then a bell icon in
   `Navbar.jsx` that polls the list endpoint every 30 seconds (or, for a
   nicer experience, listen on the existing Socket.IO connection — emit a
   notification event server-side alongside creating the DB record).

**You'll know Phase 12 works when:** requesting to join a trip both creates a
`Notification` row for the organizer AND sends them a real email; reading it
in-app marks it read.

---

## Phase 13 — Reviews & Ratings

**SRS section 3.13.** Backend done (`reviewController.js`, mounted at
`/api/trips/:tripId/reviews` and `/api/users/:userId/reviews`). Add a simple
frontend: on a completed trip's page, show each fellow member with a 1–5 star
picker and a comment box that posts to the trip-scoped reviews endpoint; on a
user's profile, fetch and display their average rating and review list from
the user-scoped endpoint. The `isReport` flag on the model already supports
"Report Misconduct" — add a separate "Report" button that posts with
`isReport: true` and a required comment, and treat those as a different (e.g.
admin-only) view rather than public reviews, since `getReviewsForUser`
already filters those out.

---

## Phase 14 — Non-functional requirements

**SRS section 4.** Most of these are configuration, not new features:

- **Performance (4.1):** add indexes for fields you filter/sort by often —
  consider one on `Trip.destination` if search gets slow with more data. Use
  your browser's Network tab to confirm typical requests return in well
  under 2 seconds.
- **Security (4.2):** already largely in place (helmet, bcrypt password
  hashing, rate limiting, httpOnly session cookies). Before deploying, double
  check the secure-cookie setting only activates in production — this
  requires your production deployment to actually serve over HTTPS, which
  Vercel and Render do by default.
- **Reliability (4.3):** the asyncHandler + errorHandler pattern already
  gives you consistent error responses instead of crashes. The Socket.IO
  handlers already log and emit an error event on failure rather than
  crashing the connection.
- **Scalability (4.4):** for local development this doesn't matter; when you
  deploy, MongoDB Atlas's free tier and Render's free web service tier are
  both fine for a demo/portfolio project but won't hold 10,000 concurrent
  users — that's a "when you actually need it" upgrade (paid tiers), not
  something to build for now.
- **Compatibility (4.7):** test the deployed site in Chrome, Firefox, and on
  your phone's browser before considering a phase "done."

---

## Phase 15 — Deployment

1. **Database:** already on MongoDB Atlas if you followed Phase 0. Make sure
   your Atlas cluster's Network Access allows connections from anywhere, or
   specifically from Render's IPs, since your backend will run there, not on
   your laptop.
2. **Backend to Render:**
   - Push `backend/` to a GitHub repo (or the whole `tripmate/` folder with
     Render's root directory setting pointed at `backend`).
   - On Render, create a new Web Service, connect the repo, set build
     command `npm install`, start command `npm start`.
   - Add all your `.env` values as environment variables in Render's
     dashboard — never commit `.env` to git (it's already in `.gitignore`).
   - Set `CLIENT_URL` to your eventual Vercel URL (you'll update this after
     the next step) and note your Render URL.
3. **Frontend to Vercel:**
   - Push `frontend/` (same repo, different root directory).
   - On Vercel, import the repo, set root directory to `frontend`, framework
     preset "Vite".
   - Add environment variable `VITE_API_URL` set to your Render backend URL
     plus `/api`.
   - Deploy, note your Vercel URL.
4. Go back to Render, update `CLIENT_URL` to your actual Vercel URL, redeploy
   the backend so CORS/session cookies allow requests from it.
5. Visit your Vercel URL and run through the Phase 3 checklist again, now
   against the deployed system.

**You'll know Phase 15 works when:** the full register, login, create trip,
chat, AI itinerary flow works from your live Vercel URL, with no localhost
references anywhere.

---

## Phase 16 — Future enhancements (SRS section 8)

Once everything above is solid, the SRS's future-enhancements list is a good
backlog: voice assistant, multi-language support, hotel/ticket booking,
blockchain identity verification, wearable integration, and so on. Treat each
as its own mini-project using the same pattern you've now practiced
repeatedly: add a Mongoose model if it needs new data, add a
controller/route, add a frontend page or component, test end-to-end.

---

## Suggested order recap

If you only remember one thing from this guide: **build vertically, not
horizontally.** Get one full user journey (register, create a trip, see it
in AI plus chat plus expenses) rock solid before adding the modules around
the edges (maps, offline, notifications, reviews). That's why Phases 3–9
come before 10–13 — they're the spine of the app; everything else hangs off
it.
