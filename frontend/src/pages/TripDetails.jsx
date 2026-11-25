import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import { useChatBot } from "../context/ChatBotContext.jsx";
import TripMap from "../components/TripMap";
import TripStatusBadge from "../components/TripStatusBadge.jsx";
import { saveTrip, getTrip } from "../utils/db";
import { formatDate, formatDateRange, formatINR, getTripPhase, tripDays } from "../utils/trip.js";

// One socket per mounted TripDetails page. In dev, Vite's proxy only covers
// HTTP requests, so Socket.IO connects straight to the backend origin.
// In production the frontend is served by Express from the same origin.
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
  : import.meta.env.DEV
    ? "http://localhost:5000"
    : window.location.origin;

const LOCATION_MIN_INTERVAL_MS = 4000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_EXPENSE = 10_000_000;

const TABS = [
  { key: "overview", label: "Overview", icon: "🧭" },
  { key: "ai", label: "AI Plan", icon: "✨" },
  { key: "chat", label: "Chat", icon: "💬", membersOnly: true },
  { key: "expenses", label: "Expenses", icon: "💰", membersOnly: true },
  { key: "map", label: "Map", icon: "🗺️" },
];

function validateExpense(form, { needsMembers = false, selected = [] } = {}) {
  const description = form.description.trim();
  const amount = Number(form.amount);
  if (description.length < 2) return "Description must be at least 2 characters.";
  if (description.length > 120) return "Description must be at most 120 characters.";
  if (form.amount === "" || !Number.isFinite(amount) || amount < 1) return "Amount must be at least ₹1.";
  if (amount > MAX_EXPENSE) return "Amount looks too large.";
  if (needsMembers && selected.length === 0) return "Select at least one member to split with.";
  return null;
}

const Avatar = ({ name, size = "h-9 w-9 text-sm" }) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-400 font-bold text-white ${size}`}
  >
    {(name || "?").charAt(0).toUpperCase()}
  </span>
);

export default function TripDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { setTripContext } = useChatBot();

  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [tab, setTab] = useState("overview");
  const [notice, setNotice] = useState(null); // { type, text }
  const [busy, setBusy] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [chatError, setChatError] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [liveLocations, setLiveLocations] = useState({});
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);
  const lastPositionRef = useRef(null);

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "" });
  const [expenseError, setExpenseError] = useState("");
  const [customExpenseForm, setCustomExpenseForm] = useState({ description: "", amount: "" });
  const [customExpenseError, setCustomExpenseError] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [customExpenses, setCustomExpenses] = useState([]);
  const [customSummary, setCustomSummary] = useState([]);

  // --- Loading ---
  const loadTrip = useCallback(async () => {
    try {
      const res = await api.get(`/trips/${id}`);
      await saveTrip({
        id: res.data.trip._id,
        trip: res.data.trip,
        members: res.data.members,
        myMembership: res.data.myMembership,
      }).catch(() => {});
      setTrip(res.data.trip);
      setMembers(res.data.members);
      setMyMembership(res.data.myMembership);
      setFromCache(false);
      setLoadError("");
    } catch (err) {
      console.error("Failed to load trip from server:", err);
      const status = err.response?.status;
      if (status === 404 || status === 400) {
        setLoadError("This trip doesn't exist or has been deleted.");
        return;
      }
      // Network problem → fall back to the copy saved for offline use.
      const cached = await getTrip(id).catch(() => null);
      if (cached) {
        setTrip(cached.trip);
        setMembers(cached.members || []);
        setMyMembership(cached.myMembership || null);
        setFromCache(true);
      } else {
        setLoadError("Couldn't load this trip. Check your connection and try again.");
      }
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.get(`/chat/${id}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  }, [id]);

  const loadExpenses = useCallback(async () => {
    try {
      const [commonExp, commonSummary, customExp, customSummaryRes] = await Promise.all([
        api.get(`/trips/${id}/expenses?expenseType=common`),
        api.get(`/trips/${id}/expenses/summary?expenseType=common`),
        api.get(`/trips/${id}/expenses?expenseType=custom`),
        api.get(`/trips/${id}/expenses/summary?expenseType=custom`),
      ]);
      setExpenses(commonExp.data.expenses);
      setSummary(commonSummary.data.summary);
      setCustomExpenses(customExp.data.expenses);
      setCustomSummary(customSummaryRes.data.summary);
    } catch (err) {
      console.error("Failed to load expenses", err);
    }
  }, [id]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  useEffect(() => {
    if (tab === "chat") loadMessages();
    if (tab === "expenses") loadExpenses();
  }, [tab, loadMessages, loadExpenses]);

  useEffect(() => {
    if (tab === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, tab]);

  // Give the floating AI assistant context about the trip being viewed.
  useEffect(() => {
    if (trip?._id) setTripContext({ tripId: trip._id, destination: trip.destination });
    return () => setTripContext(null);
  }, [trip?._id, trip?.destination, setTripContext]);

  // --- Chat + live location: one socket per trip page ---
  // The server identifies us from the session cookie, so no userId is sent.
  useEffect(() => {
    if (!user) return;
    const s = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = s;

    // Rooms are lost on disconnect, so (re)join on every connect.
    s.on("connect", () => s.emit("joinTrip", { tripId: id }));

    s.on("newMessage", (msg) => setMessages((prev) => [...prev, msg]));

    // Arrives once joinTrip succeeds. If we were sharing before a reconnect,
    // the server dropped our location, so resend the last known position.
    s.on("locationSnapshot", (list) => {
      setLiveLocations(Object.fromEntries((list || []).map((loc) => [loc.userId, loc])));
      if (watchIdRef.current !== null && lastPositionRef.current) {
        s.emit("shareLocation", { tripId: id, ...lastPositionRef.current });
      }
    });

    s.on("locationUpdate", (loc) => {
      setLiveLocations((prev) => ({ ...prev, [loc.userId]: loc }));
    });

    s.on("locationStopped", ({ userId }) => {
      setLiveLocations((prev) => {
        if (!prev[userId]) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    s.on("errorMessage", (msg) => console.warn("Socket:", msg));

    return () => {
      s.emit("leaveTrip", { tripId: id });
      s.disconnect();
      socketRef.current = null;
      setLiveLocations({});
    };
  }, [id, user]);

  const clearLocationWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Stop the GPS watch when leaving the page (the socket cleanup above
  // tells the server, which notifies the other members).
  useEffect(() => {
    return () => {
      clearLocationWatch();
      setIsSharingLocation(false);
    };
  }, [id]);

  const startSharingLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    if (!socketRef.current?.connected) {
      setLocationError("Still connecting to the server. Please try again in a moment.");
      return;
    }
    if (watchIdRef.current !== null) return; // already watching

    setIsSharingLocation(true);
    lastSentRef.current = 0;
    lastPositionRef.current = null;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        lastPositionRef.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        const now = Date.now();
        if (now - lastSentRef.current < LOCATION_MIN_INTERVAL_MS) return;
        lastSentRef.current = now;
        socketRef.current?.emit("shareLocation", { tripId: id, ...lastPositionRef.current });
      },
      (error) => {
        console.error("Location watch error:", error);
        // TIMEOUT is transient (e.g. weak GPS indoors) — keep watching.
        if (error.code === error.TIMEOUT) return;
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Allow location access in your browser settings."
            : `Location error: ${error.message}`
        );
        stopSharingLocation();
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );
  };

  const stopSharingLocation = () => {
    clearLocationWatch();
    setIsSharingLocation(false);
    socketRef.current?.emit("stopSharingLocation", { tripId: id });
    if (user?._id) {
      setLiveLocations((prev) => {
        const next = { ...prev };
        delete next[user._id];
        return next;
      });
    }
  };

  const toggleLocationSharing = () => (isSharingLocation ? stopSharingLocation() : startSharingLocation());

  // --- Chat ---
  const handleImagePick = (e) => {
    const file = e.target.files[0] || null;
    setChatError("");
    if (file && !file.type.startsWith("image/")) {
      setChatError("Only image files can be shared.");
      e.target.value = "";
      return;
    }
    if (file && file.size > MAX_IMAGE_BYTES) {
      setChatError("Image must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }
    setSelectedImage(file);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    setChatError("");
    const text = messageText.trim();
    if (!text && !selectedImage) return;
    if (text.length > 2000) return setChatError("Messages can be at most 2000 characters.");
    if (!socketRef.current?.connected) return setChatError("Not connected to chat. Please wait a moment.");

    setSending(true);
    let imageUrl = "";
    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append("image", selectedImage);
        const res = await api.post("/chat/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        imageUrl = res.data?.imageUrl || "";
      }

      socketRef.current.emit("sendMessage", { tripId: id, text, mediaUrl: imageUrl });
      setMessageText("");
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setChatError(err.response?.data?.message || "Image upload failed. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // --- AI itinerary ---
  const generateItinerary = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await api.post(`/ai/trips/${id}/itinerary`, {});
      setTrip((prev) => ({ ...prev, aiItinerary: res.data.aiItinerary }));
    } catch (err) {
      setAiError(err.response?.data?.message || "Could not generate the itinerary. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- Join requests ---
  const respondToRequest = async (memberId, status) => {
    setNotice(null);
    setBusy(true);
    try {
      await api.patch(`/trips/${id}/members/${memberId}`, { status });
      setNotice({ type: "success", text: status === "accepted" ? "Request accepted." : "Request declined." });
      await loadTrip();
    } catch (err) {
      setNotice({ type: "error", text: err.response?.data?.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  const requestToJoin = async () => {
    setNotice(null);
    setBusy(true);
    try {
      await api.post(`/trips/${id}/join`);
      setNotice({ type: "success", text: "Join request sent! The organizer will review it." });
      await loadTrip();
    } catch (err) {
      setNotice({ type: "error", text: err.response?.data?.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  // --- Expenses ---
  const addExpense = async (e) => {
    e.preventDefault();
    const error = validateExpense(expenseForm);
    setExpenseError(error || "");
    if (error) return;
    try {
      await api.post(`/trips/${id}/expenses`, {
        description: expenseForm.description.trim(),
        amount: Number(expenseForm.amount),
        expenseType: "common",
      });
      setExpenseForm({ description: "", amount: "" });
      await loadExpenses();
    } catch (err) {
      setExpenseError(err.response?.data?.message || "Could not add the expense.");
    }
  };

  const addCustomExpense = async (e) => {
    e.preventDefault();
    const error = validateExpense(customExpenseForm, { needsMembers: true, selected: selectedMembers });
    setCustomExpenseError(error || "");
    if (error) return;
    try {
      await api.post(`/trips/${id}/expenses`, {
        description: customExpenseForm.description.trim(),
        amount: Number(customExpenseForm.amount),
        splitBetween: selectedMembers,
        expenseType: "custom",
      });
      setCustomExpenseForm({ description: "", amount: "" });
      setSelectedMembers([]);
      await loadExpenses();
    } catch (err) {
      setCustomExpenseError(err.response?.data?.message || "Could not add the expense.");
    }
  };

  // --- Render ---
  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="text-5xl">🧭</div>
        <h1 className="mt-4 text-2xl font-bold">Trip not available</h1>
        <p className="mt-2 text-slate-500">{loadError}</p>
        <Link to="/dashboard" className="btn-primary mt-6">
          Back to trips
        </Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-4 py-10">
        <div className="card h-48" />
        <div className="mt-6 h-10 w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="card mt-6 h-64" />
      </div>
    );
  }

  const phase = getTripPhase(trip);
  const days = tripDays(trip);
  const isOrganizer = user && trip.organizer?._id === user._id;
  const isMember = myMembership?.status === "accepted";
  const pendingRequests = members.filter((m) => m.status === "requested");
  const acceptedMembers = members.filter((m) => m.status === "accepted");
  const isFull = acceptedMembers.length >= trip.maxMembers;
  const canRequestJoin =
    user && !isOrganizer && (!myMembership || myMembership.status === "left") && phase.isActive && !isFull;
  const visibleTabs = TABS.filter((t) => !t.membersOnly || isMember);
  const total = (list) => list.reduce((sum, e) => sum + e.amount, 0);

  const heroGradient =
    phase.key === "completed"
      ? "from-red-700 via-rose-600 to-orange-500"
      : phase.key === "cancelled"
      ? "from-slate-700 via-slate-600 to-slate-500"
      : "from-brand-700 via-brand-600 to-teal-500";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-brand-600">
        ← All trips
      </Link>

      {fromCache && (
        <div className="alert-info mt-4">📴 You're viewing a saved copy of this trip. Some data may be out of date.</div>
      )}

      {/* Hero */}
      <section className={`mt-4 overflow-hidden rounded-3xl bg-gradient-to-br ${heroGradient} text-white shadow-xl`}>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-white/20 text-white backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${phase.isActive ? "bg-emerald-300" : "bg-white"}`} />
              {phase.label}
            </span>
            <span className="text-sm font-medium text-white/80">{phase.detail}</span>
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{trip.title}</h1>
          <p className="mt-1 text-lg text-white/90">📍 {trip.destination}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Dates", formatDateRange(trip.startDate, trip.endDate)],
              ["Duration", `${days} day${days > 1 ? "s" : ""}`],
              ["Budget", formatINR(trip.budget)],
              ["Members", `${acceptedMembers.length}/${trip.maxMembers}${isFull ? " · Full" : ""}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{k}</dt>
                <dd className="mt-0.5 font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm text-white/80">
              Organized by <strong className="text-white">{trip.organizer?.name || "Unknown"}</strong>
              {trip.organizer?.verificationStatus === "verified" && " ✔"}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              {canRequestJoin && (
                <button onClick={requestToJoin} disabled={busy} className="btn bg-white text-brand-700 shadow hover:bg-brand-50">
                  {busy ? "Sending…" : "🙋 Request to join"}
                </button>
              )}
              {!user && phase.isActive && (
                <Link to="/login" state={{ from: `/trips/${id}` }} className="btn bg-white text-brand-700 hover:bg-brand-50">
                  Log in to join
                </Link>
              )}
              {myMembership?.status === "requested" && (
                <span className="badge bg-amber-100 px-3 py-2 text-amber-800">⏳ Join request pending</span>
              )}
              {myMembership?.status === "rejected" && (
                <span className="badge bg-white/90 px-3 py-2 text-red-700">✖ Join request declined</span>
              )}
              {isMember && !isOrganizer && <span className="badge bg-white/20 px-3 py-2 text-white">✔ You're a member</span>}
              {isOrganizer && <span className="badge bg-white/20 px-3 py-2 text-white">★ You're the organizer</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Outdated / full banners */}
      {phase.key === "completed" && (
        <div className="alert-error mt-4">
          ⛔ <span>
            This trip ended on <strong>{formatDate(trip.endDate)}</strong>. It's marked as completed and no longer
            accepts new members.
          </span>
        </div>
      )}
      {phase.key === "cancelled" && <div className="alert mt-4 border-slate-200 bg-slate-100 text-slate-700">This trip was cancelled.</div>}
      {phase.isActive && isFull && !isMember && !isOrganizer && (
        <div className="alert mt-4 border-orange-200 bg-orange-50 text-orange-800">👥 This trip is full.</div>
      )}
      {notice && (
        <div className={`mt-4 ${notice.type === "success" ? "alert-success" : "alert-error"}`}>
          {notice.type === "success" ? "✅" : "⚠️"} {notice.text}
        </div>
      )}

      {/* Tabs */}
      <div className="sticky top-16 z-30 -mx-4 mt-6 bg-slate-50/90 px-4 py-2 backdrop-blur dark:bg-slate-950/90 sm:mx-0 sm:px-0">
        <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-brand-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span aria-hidden>{t.icon}</span>
              {t.label}
              {t.key === "overview" && isOrganizer && pendingRequests.length > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-950">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Members</h2>
              <span className="text-sm text-slate-500">
                {acceptedMembers.length}/{trip.maxMembers}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${isFull ? "bg-orange-500" : "bg-brand-500"}`}
                style={{ width: `${Math.min(100, (acceptedMembers.length / trip.maxMembers) * 100)}%` }}
              />
            </div>
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {acceptedMembers.map((m) => (
                <li key={m._id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={m.user?.name} />
                  <span className="flex-1 font-medium">
                    {m.user?.name}
                    {m.user?._id === user?._id && <span className="text-slate-400"> (you)</span>}
                  </span>
                  {m.user?.verificationStatus === "verified" && (
                    <span className="badge bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">✔ Verified</span>
                  )}
                  {m.role === "organizer" && (
                    <span className="badge bg-brand-600 px-2 py-0.5 text-white">Organizer</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="card card-pad">
              <h2 className="section-title">Trip details</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                {[
                  ["Status", <TripStatusBadge key="s" phase={phase} />],
                  ["Starts", formatDate(trip.startDate)],
                  ["Ends", formatDate(trip.endDate)],
                  ["Difficulty", <span key="d" className="capitalize">{trip.difficultyLevel}</span>],
                  ["Travelling by", trip.vehicle || "Not decided"],
                  [
                    "Budget per person",
                    formatINR(Math.round(trip.budget / Math.max(1, acceptedMembers.length || trip.maxMembers))),
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {isOrganizer && (
              <div className="card card-pad">
                <h2 className="section-title">Join requests</h2>
                {pendingRequests.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No pending requests.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {pendingRequests.map((m) => (
                      <li key={m._id} className="flex items-center gap-3">
                        <Avatar name={m.user?.name} />
                        <span className="flex-1 font-medium">
                          {m.user?.name}
                          {m.user?.verificationStatus === "verified" && (
                            <span className="ml-1 text-xs text-emerald-600">✔ verified</span>
                          )}
                        </span>
                        <button
                          onClick={() => respondToRequest(m._id, "accepted")}
                          disabled={busy || isFull || !phase.isActive}
                          title={isFull ? "Trip is full" : !phase.isActive ? "Trip has ended" : ""}
                          className="btn-primary px-3 py-1.5"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondToRequest(m._id, "rejected")}
                          disabled={busy}
                          className="btn-secondary px-3 py-1.5"
                        >
                          Decline
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {isFull && pendingRequests.length > 0 && (
                  <p className="hint mt-3">The trip is full — you can't accept more members.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI itinerary */}
      {tab === "ai" && (
        <div className="card card-pad mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title">✨ AI-generated plan</h2>
              {trip.aiItinerary?.generatedAt && (
                <p className="hint">Generated {formatDate(trip.aiItinerary.generatedAt)}</p>
              )}
            </div>
            {isMember && (
              <button onClick={generateItinerary} disabled={aiLoading} className="btn-primary">
                {aiLoading ? "Generating… (≈20s)" : trip.aiItinerary?.itinerary ? "🔄 Regenerate" : "✨ Generate itinerary"}
              </button>
            )}
          </div>
          {aiError && <div className="alert-error mt-4">⚠️ {aiError}</div>}

          {trip.aiItinerary?.itinerary ? (
            <div className="mt-6 space-y-6">
              <section className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50">
                <h3 className="font-bold">📅 Day-wise itinerary</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {trip.aiItinerary.itinerary}
                </p>
              </section>
              <section className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50">
                <h3 className="font-bold">💰 Budget estimation</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {trip.aiItinerary.budgetEstimation}
                </p>
              </section>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["🎒 Packing checklist", trip.aiItinerary.packingChecklist],
                  ["🍜 Food suggestions", trip.aiItinerary.foodSuggestions],
                  ["🏨 Hotel recommendations", trip.aiItinerary.hotelRecommendations],
                  ["💡 Travel tips", trip.aiItinerary.travelTips],
                  ["🛡️ Safety recommendations", trip.aiItinerary.safetyRecommendations],
                ].map(([title, items]) =>
                  items?.length ? (
                    <section key={title} className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                      <h3 className="font-bold">{title}</h3>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                        {items.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-brand-500">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
              <div className="text-4xl">🗺️</div>
              <p className="mt-2 text-slate-500">
                {isMember ? "No itinerary yet — generate one with AI." : "The organizer hasn't generated an itinerary yet."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chat */}
      {tab === "chat" && isMember && (
        <div className="card mt-4 flex h-[600px] flex-col overflow-hidden">
          {/* Live location bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-sm">
              <span className="relative flex h-3 w-3">
                {isSharingLocation && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" />}
                <span className={`relative inline-flex h-3 w-3 rounded-full ${isSharingLocation ? "bg-emerald-500" : "bg-slate-300"}`} />
              </span>
              <span className="font-semibold">{isSharingLocation ? "Sharing live location" : "Live location"}</span>
              <span className="text-slate-500">· {Object.keys(liveLocations).length} active</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleLocationSharing}
                className={`btn px-3 py-1.5 text-xs ${isSharingLocation ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
              >
                {isSharingLocation ? "Stop sharing" : "📍 Share location"}
              </button>
              <button type="button" onClick={() => setTab("map")} className="btn-secondary px-3 py-1.5 text-xs">
                🗺️ Map
              </button>
            </div>
            {locationError && <p className="w-full text-xs text-red-600 dark:text-red-400">{locationError}</p>}
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <div className="text-4xl">💬</div>
                <p className="mt-2 text-sm">No messages yet — say hi to your travel group!</p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.sender?._id === user?._id;
              return (
                <div key={m._id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {!mine && <Avatar name={m.sender?.name} size="h-7 w-7 text-xs" />}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      mine
                        ? "rounded-br-md bg-brand-600 text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {!mine && <p className="mb-0.5 text-xs font-semibold text-brand-700 dark:text-brand-300">{m.sender?.name}</p>}
                    {m.mediaUrl && (
                      <a href={m.mediaUrl} target="_blank" rel="noreferrer">
                        <img src={m.mediaUrl} alt="Shared in chat" className="mb-1 max-h-64 rounded-xl" loading="lazy" />
                      </a>
                    )}
                    {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                    <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form onSubmit={sendMessage} className="border-t border-slate-100 p-3 dark:border-slate-800">
            {chatError && <p className="field-error mb-2">{chatError}</p>}
            {selectedImage && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs dark:bg-slate-800">
                🖼️ <span className="flex-1 truncate">{selectedImage.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="font-bold text-slate-500 hover:text-red-600"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="btn-ghost cursor-pointer px-3" title="Attach image">
                📎
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
              </label>
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message…"
                maxLength={2000}
                className="input flex-1"
              />
              <button disabled={sending || (!messageText.trim() && !selectedImage)} className="btn-primary">
                {sending ? "…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses */}
      {tab === "expenses" && isMember && (
        <div className="mt-4 space-y-6">
          {/* Common */}
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="card card-pad">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Shared expenses</h2>
                <span className="text-sm font-semibold text-slate-500">Total {formatINR(total(expenses))}</span>
              </div>
              <p className="hint">Split equally between all {acceptedMembers.length} members.</p>

              <form onSubmit={addExpense} noValidate className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  placeholder="What was it for? e.g. Fuel"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  maxLength={120}
                  className="input flex-1"
                />
                <input
                  type="number"
                  placeholder="₹ Amount"
                  min={1}
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="input sm:w-36"
                />
                <button className="btn-primary">Add</button>
              </form>
              {expenseError && <p className="field-error">{expenseError}</p>}

              <ExpenseList expenses={expenses} />
            </div>
            <BalanceCard title="Balances" summary={summary} />
          </div>

          {/* Custom */}
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="card card-pad">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Custom split</h2>
                <span className="text-sm font-semibold text-slate-500">Total {formatINR(total(customExpenses))}</span>
              </div>
              <p className="hint">Split an expense between selected members only.</p>

              <form onSubmit={addCustomExpense} noValidate className="mt-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    placeholder="Description"
                    value={customExpenseForm.description}
                    onChange={(e) => setCustomExpenseForm({ ...customExpenseForm, description: e.target.value })}
                    maxLength={120}
                    className="input flex-1"
                  />
                  <input
                    type="number"
                    placeholder="₹ Amount"
                    min={1}
                    value={customExpenseForm.amount}
                    onChange={(e) => setCustomExpenseForm({ ...customExpenseForm, amount: e.target.value })}
                    className="input sm:w-36"
                  />
                </div>
                <div>
                  <p className="label">Split between</p>
                  <div className="flex flex-wrap gap-2">
                    {acceptedMembers.map((member) => {
                      const uid = member.user?._id;
                      const checked = selectedMembers.includes(uid);
                      return (
                        <label
                          key={uid}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            checked
                              ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedMembers((prev) =>
                                e.target.checked ? [...prev, uid] : prev.filter((x) => x !== uid)
                              )
                            }
                          />
                          {checked ? "✓ " : ""}
                          {member.user?.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <button className="btn-primary">Add custom expense</button>
                {customExpenseError && <p className="field-error">{customExpenseError}</p>}
              </form>

              <ExpenseList expenses={customExpenses} showSplit />
            </div>
            <BalanceCard title="Custom balances" summary={customSummary} />
          </div>
        </div>
      )}

      {/* Map */}
      {tab === "map" && (
        <div className="mt-4">
          <TripMap
            destination={trip.destination}
            liveLocations={liveLocations}
            isSharingLocation={isSharingLocation}
            toggleLocationSharing={toggleLocationSharing}
            currentUser={user}
            isMember={isMember}
            locationError={locationError}
          />
        </div>
      )}
    </div>
  );
}

function ExpenseList({ expenses, showSplit = false }) {
  if (!expenses.length) {
    return <p className="mt-6 text-center text-sm text-slate-400">No expenses yet.</p>;
  }
  return (
    <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
      {expenses.map((e) => (
        <li key={e._id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{e.description}</p>
            <p className="text-xs text-slate-500">
              Paid by {e.paidBy?.name || "Former member"} · {formatDate(e.date || e.createdAt)}
              {showSplit && e.splitBetween?.length > 0 && <> · Split: {e.splitBetween.map((s) => s?.name).filter(Boolean).join(", ")}</>}
            </p>
          </div>
          <span className="shrink-0 font-bold">{formatINR(e.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function BalanceCard({ title, summary }) {
  return (
    <div className="card card-pad h-fit">
      <h2 className="section-title">{title}</h2>
      {summary.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">Nothing to settle yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {summary.map((s) => {
            const settled = Math.abs(s.netBalance) < 0.01;
            return (
              <li key={s.userId} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Avatar name={s.name} size="h-7 w-7 text-xs" />
                  {s.name}
                </span>
                <span
                  className={`badge ${
                    settled
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      : s.netBalance > 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                  }`}
                >
                  {settled ? "Settled" : s.netBalance > 0 ? `gets ${formatINR(s.netBalance)}` : `owes ${formatINR(Math.abs(s.netBalance))}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
