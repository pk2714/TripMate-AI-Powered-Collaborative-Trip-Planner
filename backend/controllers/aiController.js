const Trip = require("../models/Trip");
const { asyncHandler } = require("../middleware/errorHandler");

// Calls Google's Gemini API with fallback models.
// Docs: https://ai.google.dev/gemini-api/docs
// `input` is either a plain prompt string, or { contents, systemInstruction }
// for multi-turn conversations (see chatWithAI).
async function callGemini(input, model = "gemini-3.5-flash-lite") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY is not set on the server."), { statusCode: 500 });
  }

  const requestBody =
    typeof input === "string"
      ? { contents: [{ role: "user", parts: [{ text: input }] }] }
      : {
          contents: input.contents,
          ...(input.systemInstruction && {
            systemInstruction: { parts: [{ text: input.systemInstruction }] },
          }),
        };

  const tryModels = [model, "gemini-3.8-flash", "gemini-flash-latest"];
  let lastErr = null;

  for (const m of tryModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastErr = new Error(`Gemini (${m}) error: ${errText}`);
        continue;
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply;
    } catch (err) {
      lastErr = err;
    }
  }

  throw Object.assign(lastErr || new Error("Failed to communicate with Gemini API."), { statusCode: 502 });
}

function buildPrompt(trip, preferences) {
  return `
You are an expert travel planner.

Create a detailed trip plan for:

Destination: ${trip.destination}
Budget: ${trip.budget}
Duration: ${trip.duration} days
Difficulty Level: ${trip.difficultyLevel}
Traveler Preferences: ${preferences || "None"}

IMPORTANT RULES:
- Return ONLY valid JSON.
- Do NOT use markdown.
- Do NOT use \`\`\`json.
- Do NOT add explanations.
- Make the recommendations destination-specific.

Return exactly in this format:

{
  "itinerary": "Detailed day-by-day itinerary.",
  "budgetEstimation": "Detailed budget breakdown including travel, food, hotel, sightseeing and miscellaneous.",

  "packingChecklist": [
    "Clothes",
    "Comfortable Shoes",
    "Jacket",
    "Raincoat",
    "Umbrella",
    "Water Bottle",
    "Power Bank",
    "Phone Charger",
    "Medicines",
    "First Aid Kit",
    "Identity Proof",
    "Cash",
    "Sunscreen",
    "Sunglasses",
    "Torch",
    "Camera"
  ],

  "foodSuggestions": [
    "Local Dish 1",
    "Local Dish 2",
    "Local Dish 3",
    "Popular Restaurant 1",
    "Popular Restaurant 2"
  ],

  "hotelRecommendations": [
    "Budget Hotel 1",
    "Budget Hotel 2",
    "Budget Hotel 3",
    "Mid-range Hotel 1",
    "Mid-range Hotel 2",
    "Luxury Hotel 1",
    "Luxury Hotel 2"
  ],

  "travelTips": [
    "Tip 1",
    "Tip 2",
    "Tip 3",
    "Tip 4",
    "Tip 5"
  ],

  "safetyRecommendations": [
    "Safety Tip 1",
    "Safety Tip 2",
    "Safety Tip 3",
    "Emergency Contact Advice",
    "Weather Precaution"
  ]
}
`;
}
// POST /api/ai/trips/:id/itinerary
// Generates (or regenerates) the AI itinerary for a trip and caches it on the Trip doc
// so we don't re-call the API every time someone views the trip.
const generateItinerary = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: "Trip not found." });

  const { preferences } = req.body;
  const prompt = buildPrompt(trip, preferences);
const text = await callGemini(prompt);

let aiData;

try {
  const cleanText = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  aiData = JSON.parse(cleanText);
} catch (error) {
  return res.status(500).json({
    message: "Gemini returned invalid JSON.",
    rawResponse: text,
  });
}

trip.aiItinerary = {
  itinerary: aiData.itinerary,
  budgetEstimation: aiData.budgetEstimation,
  packingChecklist: aiData.packingChecklist,
  foodSuggestions: aiData.foodSuggestions,
  hotelRecommendations: aiData.hotelRecommendations,
  travelTips: aiData.travelTips,
  safetyRecommendations: aiData.safetyRecommendations,
  generatedAt: new Date(),
};

await trip.save();

res.json({
  aiItinerary: trip.aiItinerary,
});

});

// POST /api/ai/chat
// Conversational AI travel assistant. Body: { message, history?, tripId? }
// history: [{ role: "user" | "assistant", content }] — most recent turns last.
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_TURNS = 10;

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;
}

const chatWithAI = asyncHandler(async (req, res) => {
  const { message, history = [], tripId } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ message: "A message is required." });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({ message: `Message is too long (max ${MAX_MESSAGE_CHARS} characters).` });
  }

  // Look the trip up server-side rather than trusting client-sent details.
  let tripLine = "";
  if (tripId && /^[a-f\d]{24}$/i.test(tripId)) {
    const trip = await Trip.findById(tripId).select(
      "title destination budget startDate endDate duration vehicle difficultyLevel maxMembers"
    );
    if (trip) {
      const dates = trip.startDate ? `${formatDate(trip.startDate)} to ${formatDate(trip.endDate)}` : "flexible dates";
      tripLine = `\nThe user is currently viewing their trip "${trip.title}" to ${trip.destination} (${dates}, budget ₹${trip.budget}, difficulty: ${trip.difficultyLevel}${trip.vehicle ? `, travelling by ${trip.vehicle}` : ""}, up to ${trip.maxMembers} members). Tailor answers to this trip when relevant.`;
    }
  }

  const systemInstruction = `You are "TripMate AI", a friendly, knowledgeable travel companion inside TripMate — a collaborative trip planning app for travellers in India and beyond.
- Help with destination ideas, itineraries, budget breakdowns (in ₹ unless asked otherwise), packing lists, local food, transport and safety tips.
- Use concise Markdown: short paragraphs, **bold** for key points, bullet or numbered lists. A few travel emojis are fine.
- Keep answers focused; prefer under 250 words unless the user asks for detail.
- If asked about something unrelated to travel, answer briefly and steer back to trip planning.
- For emergencies, tell the user to contact local emergency services (112 in India) and mention the app's Emergency page.${tripLine}`;

  // Gemini requires alternating user/model turns starting with "user".
  const contents = [];
  const turns = Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : [];
  for (const h of turns) {
    if (!h || typeof h.content !== "string" || !h.content.trim()) continue;
    const role = h.role === "user" ? "user" : "model";
    if (contents.length === 0 && role !== "user") continue;
    const text = h.content.slice(0, MAX_MESSAGE_CHARS);
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }
  if (contents.length && contents[contents.length - 1].role === "user") {
    // Previous user turn got no reply (e.g. an error) — merge into this one.
    contents[contents.length - 1].parts[0].text += `\n\n${message.trim()}`;
  } else {
    contents.push({ role: "user", parts: [{ text: message.trim() }] });
  }

  const reply = await callGemini({ contents, systemInstruction });

  res.json({ reply: reply.trim() });
});

module.exports = { generateItinerary, chatWithAI };
