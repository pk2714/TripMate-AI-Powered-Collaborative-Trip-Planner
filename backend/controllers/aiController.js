const Trip = require("../models/Trip");
const { asyncHandler } = require("../middleware/errorHandler");

// Calls Google's Gemini API to turn trip details + preferences into an itinerary.
// Docs: https://ai.google.dev/gemini-api/docs
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY is not set on the server."), { statusCode: 500 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw Object.assign(new Error(`Gemini API error: ${errText}`), { statusCode: 502 });
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
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

module.exports = { generateItinerary };
