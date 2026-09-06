import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import TripMap from "../components/TripMap";
import { saveTrip, getTrip} from "../utils/db";



// One socket per mounted TripDetails page. In dev, Vite's proxy only covers
// HTTP requests, so Socket.IO connects straight to the backend origin.
// In production the frontend is served by Express from the same origin,
// so Socket.IO connects to window.location.origin. In dev, fall back to
// the local backend server.
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
  : import.meta.env.DEV
    ? "http://localhost:5000"
    : window.location.origin;

export default function TripDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [tab, setTab] = useState("overview"); // overview | ai | chat | expenses

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [liveLocations, setLiveLocations] = useState({});
  const [socket, setSocket] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "" });

  const [customExpenseForm, setCustomExpenseForm] = useState({
  description: "",
  amount: "",
});

const [selectedMembers, setSelectedMembers] = useState([]);

const [customExpenses, setCustomExpenses] = useState([]);

const [customSummary, setCustomSummary] = useState([]);

const loadTrip = useCallback(async () => {
  try {
    // First try the server
    const res = await api.get(`/trips/${id}`);

    const tripData = {
      id: res.data.trip._id,
      trip: res.data.trip,
      members: res.data.members,
      myMembership: res.data.myMembership,
    };

    // Save successful response for offline use
    await saveTrip(tripData);

    setTrip(res.data.trip);
    setMembers(res.data.members);
    setMyMembership(res.data.myMembership);
  } catch (err) {
    console.error("Failed to load trip from server:", err);

    // Internet/API failed → try IndexedDB
    try {
      const cachedTrip = await getTrip(id);

      if (cachedTrip) {
        console.log("Loading trip from IndexedDB");

        setTrip(cachedTrip.trip);
        setMembers(cachedTrip.members || []);
        setMyMembership(cachedTrip.myMembership || null);
      } else {
        console.error("No cached trip available");
      }
    } catch (dbErr) {
      console.error("Failed to load cached trip:", dbErr);
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

 useEffect(() => {
  loadTrip();
}, [loadTrip]);

useEffect(() => {
  if (tab === "chat") {
    loadMessages();
  }
}, [tab, loadMessages]);

  // --- Chat: connect socket once we know who we are ---
  useEffect(() => {
    if (!user) return;
    const s = io(SOCKET_URL, { withCredentials: true });

    s.on("connect", () => {
  console.log("✅ Socket Connected:", s.id);
});
     s.emit("joinTrip", {
    tripId: id,
     userId: user._id,
   });
    s.on("newMessage", (msg) => setMessages((prev) => [...prev, msg]));
     s.on("locationUpdate", (data) => {
  console.log("LOCATION RECEIVED:", data);

  setLiveLocations((prev) => ({
    ...prev,
    [data.userId]: {
      lat: data.lat,
      lng: data.lng,
    },
  }));
});
    setSocket(s);
    return () => {
      s.emit("leaveTrip", {
        tripId: id,
        userId: user._id,
      });
      s.disconnect();
    };
  }, [id, user]);

  const sendMessage = async (e) => {
  e.preventDefault();

   const formData = new FormData();

  let imageUrl = "";

 if (selectedImage) {
   formData.append("image", selectedImage);
 
   const res = await api.post(
    "/chat/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  imageUrl = res.data.imageUrl;

  console.log(imageUrl);
}

  console.log("sendMessage called");

  if ((!messageText.trim() && !selectedImage) || !socket) return;

  console.log("Socket:", socket);
console.log("Connected:", socket?.connected);

  socket.emit("sendMessage", {
    tripId: id,
    senderId: user._id,
    text: messageText,
    type: imageUrl ? "image" : "text",
    mediaUrl: imageUrl,
  });

  setMessageText("");
  setSelectedImage(null);
};

const shareLocation = () => {
  if (!navigator.geolocation || !socket) return;

  navigator.geolocation.watchPosition((position) => {
    socket.emit("shareLocation", {
      tripId: id,
      userId: user._id,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
  });
};


  // --- AI itinerary ---
  const generateItinerary = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await api.post(`/ai/trips/${id}/itinerary`, {});
      setTrip((prev) => ({ ...prev, aiItinerary: res.data.aiItinerary }));
    } catch (err) {
      setAiError(
        err.response?.data?.message ||
          "Could not generate itinerary. Make sure GEMINI_API_KEY is set on the backend."
      );
    } finally {
      setAiLoading(false);
    }
  };

  // --- Join requests (organizer only) ---
  const respondToRequest = async (memberId, status) => {
    await api.patch(`/trips/${id}/members/${memberId}`, { status });
    loadTrip();
  };

 const requestToJoin = async () => {
  console.log("Button clicked");

  try {
    const res = await api.post(`/trips/${id}/join`);

    console.log(res.data);

    alert("Join request sent");

    loadTrip();
  } catch (err) {
    console.error(err);

    alert(err.response?.data?.message || "Something went wrong");
  }
};

  // --- Expenses ---
 const loadExpenses = useCallback(async () => {
  const [
    commonExp,
    commonSummary,
    customExp,
    customSummaryRes,
  ] = await Promise.all([
    api.get(`/trips/${id}/expenses?expenseType=common`),
    api.get(`/trips/${id}/expenses/summary?expenseType=common`),
    api.get(`/trips/${id}/expenses?expenseType=custom`),
    api.get(`/trips/${id}/expenses/summary?expenseType=custom`),
  ]);

  setExpenses(commonExp.data.expenses);
  setSummary(commonSummary.data.summary);

  setCustomExpenses(customExp.data.expenses);
  setCustomSummary(customSummaryRes.data.summary);
}, [id]);

  useEffect(() => {
    if (tab === "expenses") loadExpenses();
  }, [tab, loadExpenses]);

 const addExpense = async (e) => {
  e.preventDefault();

  await api.post(`/trips/${id}/expenses`, {
    description: expenseForm.description,
    amount: Number(expenseForm.amount),
    expenseType: "common",
  });

  setExpenseForm({ description: "", amount: "" });
        await loadExpenses();
};


      const addCustomExpense = async (e) => {
  e.preventDefault();

  if (selectedMembers.length === 0) {
  alert("Select at least one member");
  return;
}

  await api.post(`/trips/${id}/expenses`, {
    description: customExpenseForm.description,
    amount: Number(customExpenseForm.amount),
    splitBetween: selectedMembers,
    expenseType: "custom",
  });

  setCustomExpenseForm({
    description: "",
    amount: "",
  });

  setSelectedMembers([]);

  await loadExpenses();
};

  if (!trip) return <p className="p-8 text-center">Loading trip...</p>;

  const isOrganizer = user && trip.organizer?._id === user._id;
  const isMember =  myMembership?.status === "accepted";
  const pendingRequests = members.filter(
  (member) => member.status === "requested"
);

const acceptedMembers = members.filter(
  (member) => member.status === "accepted"
);

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <p className="text-gray-500">📍 {trip.destination}</p>
          </div>
          {!isOrganizer && !isMember && user && (
            <button
              onClick={requestToJoin}
              className="px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700"
            >
              Request to join
            </button>
          )}
   {myMembership?.status === "requested" && (
      <span className="text-yellow-600 font-medium">
        ⏳ Join Request Pending
      </span>
    )}

    {myMembership?.status === "rejected" && (
      <span className="text-red-600 font-medium">
        ❌ Join Request Rejected
      </span>
    )}
           
        </div>

        <div className="flex gap-4 mt-3 text-sm text-gray-500">
          <span>{new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}</span>
          <span>Budget ₹{trip.budget}</span>
         <span>{acceptedMembers.length}/{trip.maxMembers} members</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mt-6 border-b dark:border-gray-700">
        {[
         "overview",
            "ai",
  ...(isMember ? ["chat", "expenses", "map"] : ["map"]),
   ].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 capitalize ${
              tab === t ? "border-b-2 border-brand-600 text-brand-600" : "text-gray-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview: members + join requests */}
      {tab === "overview" && (
        <div className="mt-4 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="font-semibold mb-3">Members</h2>
            <ul className="space-y-2">
              {acceptedMembers.map((m) => (
                <li key={m._id} className="flex items-center justify-between">
                  <span>{m.user?.name}</span>
                  {m.role === "organizer" && (
                    <span className="text-xs text-brand-600">Organizer</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

         {isOrganizer && (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
    <h2 className="font-semibold mb-3">
      Pending Join Requests
    </h2>

    {pendingRequests.length === 0 ? (
      <p className="text-gray-500 text-sm">
        No pending requests.
      </p>
    ) : (
      <ul className="space-y-3">
        {pendingRequests.map((member) => (
          <li
            key={member._id}
            className="flex items-center justify-between"
          >
            <span>{member.user?.name}</span>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  respondToRequest(member._id, "accepted")
                }
                className="px-3 py-1 rounded bg-green-600 text-white"
              >
                Accept
              </button>

              <button
                onClick={() =>
                  respondToRequest(member._id, "rejected")
                }
                className="px-3 py-1 rounded bg-red-600 text-white"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
)}
        </div>
      )}

      {/* AI itinerary */}
      {tab === "ai" && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">AI-generated itinerary</h2>
            <button
              onClick={generateItinerary}
              disabled={aiLoading}
              className="px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {aiLoading ? "Generating..." : trip.aiItinerary?.itinerary ? "Regenerate" : "Generate itinerary"}
            </button>
          </div>
          {aiError && <p className="text-sm text-red-600 mb-3">{aiError}</p>}
         {trip.aiItinerary?.itinerary ? (
  <div className="space-y-6">

    <div>
      <h3 className="text-lg font-semibold">📅 Day-wise Itinerary</h3>
      <p className="whitespace-pre-wrap">
        {trip.aiItinerary.itinerary}
      </p>
    </div>

    <div>
      <h3 className="text-lg font-semibold">💰 Budget Estimation</h3>
      <p className="whitespace-pre-wrap">
  {trip.aiItinerary.budgetEstimation}
</p>
    </div>

    <div>
      <h3 className="text-lg font-semibold">🎒 Packing Checklist</h3>
      <ul className="list-disc ml-6">
        {trip.aiItinerary.packingChecklist?.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-semibold">🍜 Food Suggestions</h3>
      <ul className="list-disc ml-6">
        {trip.aiItinerary.foodSuggestions?.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-semibold">🏨 Hotel Recommendations</h3>
      <ul className="list-disc ml-6">
        {trip.aiItinerary.hotelRecommendations?.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-semibold">💡 Travel Tips</h3>
      <ul className="list-disc ml-6">
        {trip.aiItinerary.travelTips?.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-semibold">🛡 Safety Recommendations</h3>
      <ul className="list-disc ml-6">
        {trip.aiItinerary.safetyRecommendations?.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>

  </div>
) : (
  <p className="text-gray-500 text-sm">
    No itinerary yet — click Generate Itinerary.
  </p>
)}
        </div>
      )}

      {/* Chat */}
      {tab === "chat" && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col h-96">
          <div className="flex-1 overflow-y-auto space-y-2 mb-3">
               {messages.map((m) => (
  <div key={m._id} className="text-sm">
    <span className="font-semibold">
      {m.sender?.name}:
    </span>

    {m.type === "image" ? (
      <img
        src={m.mediaUrl}
        alt="chat"
        className="mt-2 max-w-xs rounded-lg"
      />
    ) : (
      <span> {m.text}</span>
    )}
  </div>
))}
          </div>
           <form onSubmit={sendMessage} className="flex flex-col gap-2">

  <input
    type="file"
    accept="image/*"
    onChange={(e) => setSelectedImage(e.target.files[0])}
  />

   <button
    type="button"
    onClick={shareLocation}
    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
  >
    📍 Share Live Location
  </button>

  <div className="flex gap-2">
    <input
      value={messageText}
      onChange={(e) => setMessageText(e.target.value)}
      placeholder="Type a message..."
      className="flex-1 px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
    />

    <button className="px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700">
      Send
    </button>
  </div>

</form>
        </div>
      )}

      {/* Expenses */}
      {tab === "expenses" && (
        <div className="mt-4 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="font-semibold mb-3">Add an expense</h2>
            <form onSubmit={addExpense} className="flex gap-2">
              <input
                placeholder="Description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                required
                className="flex-1 px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
              />
              <input
                type="number"
                placeholder="Amount"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                required
                className="w-32 px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
              />


              <button className="px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700">
                Add
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="font-semibold mb-3">Expenses</h2>
            <ul className="space-y-2 text-sm">
              {expenses.map((e) => (
                <li key={e._id} className="flex justify-between">
                  <span>{e.description} — paid by {e.paidBy?.name}</span>
                  <span>₹{e.amount}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="font-semibold mb-3">Balance summary</h2>
            <ul className="space-y-2 text-sm">
              {summary.map((s) => (
                <li key={s.userId} className="flex justify-between">
                  <span>{s.name}</span>
                  <span className={s.netBalance >= 0 ? "text-green-600" : "text-red-600"}>
                    {s.netBalance >= 0 ? `is owed ₹${s.netBalance}` : `owes ₹${Math.abs(s.netBalance)}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

             
      {/* ---------- CUSTOM EXPENSES ---------- */}

<div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
  <h2 className="font-semibold mb-3">Add Custom Expense</h2>

  <form
    onSubmit={addCustomExpense}
    className="flex flex-col gap-3"
  >
    <input
      placeholder="Description"
      value={customExpenseForm.description}
      onChange={(e) =>
        setCustomExpenseForm({
          ...customExpenseForm,
          description: e.target.value,
        })
      }
      className="px-3 py-2 border rounded"
      required
    />

    <input
      type="number"
      placeholder="Amount"
      value={customExpenseForm.amount}
      onChange={(e) =>
        setCustomExpenseForm({
          ...customExpenseForm,
          amount: e.target.value,
        })
      }
      className="px-3 py-2 border rounded"
      required
    />

    <div>
      <p className="font-medium mb-2">Split Between</p>

      {acceptedMembers.map((member) => (
        <label key={member.user._id} className="block">
          <input
            type="checkbox"
            checked={selectedMembers.includes(member.user._id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedMembers((prev) => [
                  ...prev,
                  member.user._id,
                ]);
              } else {
                setSelectedMembers((prev) =>
                  prev.filter((id) => id !== member.user._id)
                );
              }
            }}
          />
          {" "}
          {member.user.name}
        </label>
      ))}
    </div>

    <button className="px-4 py-2 rounded-md bg-brand-600 text-white">
      Add Custom Expense
    </button>
  </form>
</div>

<div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
  <h2 className="font-semibold mb-3">Custom Expenses</h2>

  <ul className="space-y-2">
    {customExpenses.map((e) => (
      <li key={e._id} className="flex justify-between">
        <span>{e.description} — paid by {e.paidBy?.name}</span>
        <span>₹{e.amount}</span>
      </li>
    ))}
  </ul>
</div>

<div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
  <h2 className="font-semibold mb-3">
    Custom Balance Summary
  </h2>

  <ul className="space-y-2">
    {customSummary.map((s) => (
      <li key={s.userId} className="flex justify-between">
        <span>{s.name}</span>

        <span
          className={
            s.netBalance >= 0
              ? "text-green-600"
              : "text-red-600"
          }
        >
          {s.netBalance >= 0
            ? `is owed ₹${s.netBalance}`
            : `owes ₹${Math.abs(s.netBalance)}`}
        </span>
      </li>
    ))}
  </ul>
</div>

        </div>
      )}

      {/* Map */}
      {tab === "map" && (
        <div className="mt-4">
          <TripMap destination={trip.destination} liveLocations={liveLocations} />
        </div>
      )}

    </div>
  );
}
