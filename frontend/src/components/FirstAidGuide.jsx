import { useState } from "react";

const firstAidData = [
  {
    title: "Severe Bleeding",
    icon: "🩸",
    category: "Common Emergencies",
    steps: [
      "Apply firm, continuous pressure with clean cloth or dressing.",
      "Keep pressure on the wound and add more dressing if blood soaks through.",
      "Seek emergency medical help immediately for severe or uncontrolled bleeding.",
    ],
  },
  {
    title: "Minor Cuts & Wounds",
    icon: "🩹",
    category: "Common Emergencies",
    steps: [
      "Wash your hands before helping.",
      "Rinse the wound with clean running water.",
      "Cover with a clean dressing or bandage.",
      "Seek medical care if the wound is deep, heavily contaminated, or will not stop bleeding.",
    ],
  },
  {
    title: "Burns",
    icon: "🔥",
    category: "Common Emergencies",
    steps: [
      "Move away from the source of heat.",
      "Cool the burn under cool running water for about 20 minutes.",
      "Remove jewelry or tight items near the burn if they are not stuck.",
      "Do not apply ice, butter, toothpaste, or other substances to the burn.",
      "Get urgent medical help for large, deep, electrical, chemical, or facial burns.",
    ],
  },
  {
    title: "Choking",
    icon: "🫁",
    category: "Common Emergencies",
    steps: [
      "If the person can cough or speak, encourage them to keep coughing.",
      "If they cannot breathe, cough, or speak normally, call emergency services.",
      "Give appropriate first-aid choking assistance if trained to do so.",
      "If the person becomes unresponsive, begin CPR and follow emergency-dispatch instructions.",
    ],
  },
  {
    title: "CPR Basics",
    icon: "❤️",
    category: "Common Emergencies",
    steps: [
      "Check whether the person responds and is breathing normally.",
      "Call emergency services and ask someone to get an AED if available.",
      "If trained, begin CPR and follow the emergency dispatcher's instructions.",
      "Use an AED as soon as one becomes available and follow its voice instructions.",
    ],
  },
  {
    title: "Fainting",
    icon: "😵",
    category: "Common Emergencies",
    steps: [
      "Help the person lie down safely.",
      "Check that they are breathing normally.",
      "Do not give food or drink while they are unconscious.",
      "Seek medical help if they do not recover quickly or have other concerning symptoms.",
    ],
  },
  {
    title: "Shock",
    icon: "⚠️",
    category: "Common Emergencies",
    steps: [
      "Call emergency services immediately.",
      "Lay the person down if safe to do so.",
      "Keep them warm and comfortable.",
      "Do not give food or drink.",
      "Monitor breathing and responsiveness until help arrives.",
    ],
  },

  {
    title: "Sprain",
    icon: "🦶",
    category: "Injuries",
    steps: [
      "Stop the activity and rest the injured area.",
      "Apply a wrapped cold pack for short periods.",
      "Elevate the injured limb when practical.",
      "Seek medical assessment if there is severe pain, deformity, or inability to use the limb.",
    ],
  },
  {
    title: "Suspected Fracture",
    icon: "🦴",
    category: "Injuries",
    steps: [
      "Keep the injured area as still as possible.",
      "Do not try to straighten or push a bone back into place.",
      "Support the injured area in the position found.",
      "Get medical attention promptly.",
    ],
  },
  {
    title: "Head Injury",
    icon: "🧠",
    category: "Injuries",
    steps: [
      "Keep the person still and monitor them.",
      "Do not move them unnecessarily if a serious neck or spine injury is suspected.",
      "Seek urgent medical help for loss of consciousness, repeated vomiting, seizure, confusion, or worsening headache.",
    ],
  },
  {
    title: "Nosebleed",
    icon: "👃",
    category: "Injuries",
    steps: [
      "Sit upright and lean slightly forward.",
      "Pinch the soft part of the nose continuously for about 10–15 minutes.",
      "Do not tilt the head backward.",
      "Seek medical help if bleeding is heavy or does not stop.",
    ],
  },
  {
    title: "Eye Injury",
    icon: "👁️",
    category: "Injuries",
    steps: [
      "Do not rub or press the injured eye.",
      "If a small particle is present, gently rinse with clean water.",
      "Do not attempt to remove an embedded object.",
      "Seek urgent medical care for penetrating injuries, severe pain, or vision changes.",
    ],
  },
  {
    title: "Animal Bite",
    icon: "🐕",
    category: "Injuries",
    steps: [
      "Wash the wound thoroughly with soap and running water.",
      "Control bleeding with clean pressure if necessary.",
      "Seek medical care promptly for infection and rabies assessment.",
      "Do not wait for symptoms after a potentially rabid animal exposure.",
    ],
  },
  {
    title: "Snake Bite",
    icon: "🐍",
    category: "Injuries",
    steps: [
      "Move away from the snake and keep the person calm and still.",
      "Call emergency medical services immediately.",
      "Keep the bitten limb still and below heart level when practical.",
      "Do not cut the wound, suck out venom, or apply a tight tourniquet.",
      "Do not attempt to capture the snake.",
    ],
  },

  {
    title: "Heat Exhaustion",
    icon: "☀️",
    category: "Travel Emergencies",
    steps: [
      "Move the person to a cool or shaded place.",
      "Loosen unnecessary clothing and cool the body.",
      "If fully alert, give small amounts of cool water.",
      "Seek medical help if symptoms worsen or do not improve.",
    ],
  },
  {
    title: "Heat Stroke",
    icon: "🌡️",
    category: "Travel Emergencies",
    steps: [
      "Heat stroke is a medical emergency.",
      "Call emergency medical services immediately.",
      "Move the person to a cool place and begin rapid cooling.",
      "Do not give fluids if the person is confused, unconscious, or unable to swallow safely.",
    ],
  },
  {
    title: "Dehydration",
    icon: "💧",
    category: "Travel Emergencies",
    steps: [
      "Move to a cool location and rest.",
      "Drink fluids gradually if the person is alert and able to swallow.",
      "Oral rehydration solution can help replace fluids and electrolytes.",
      "Seek medical help for severe dehydration, confusion, fainting, or inability to keep fluids down.",
    ],
  },
  {
    title: "Sunburn",
    icon: "🌞",
    category: "Travel Emergencies",
    steps: [
      "Move out of direct sunlight.",
      "Cool the skin with a cool shower or damp cloth.",
      "Drink fluids to stay hydrated.",
      "Seek medical help for extensive blistering, severe pain, or signs of heat illness.",
    ],
  },
  {
    title: "Hypothermia",
    icon: "🥶",
    category: "Travel Emergencies",
    steps: [
      "Move the person to a warm, dry location.",
      "Remove wet clothing and gently warm them.",
      "Wrap them in dry blankets or clothing.",
      "Seek emergency medical help for significant hypothermia or altered consciousness.",
    ],
  },

  {
    title: "Allergic Reaction",
    icon: "🤧",
    category: "Other",
    steps: [
      "Move away from the suspected allergen if possible.",
      "For a known severe allergy, help the person use their prescribed emergency medication.",
      "Call emergency services immediately if there is difficulty breathing, swelling of the throat, or collapse.",
      "Monitor breathing and responsiveness.",
    ],
  },
  {
    title: "Electric Shock",
    icon: "⚡",
    category: "Other",
    steps: [
      "Do not touch the person while they are still connected to the electrical source.",
      "Switch off the power if it can be done safely.",
      "Call emergency services for significant electric shocks.",
      "Check breathing and responsiveness once the person is safe.",
    ],
  },
  {
    title: "Seizure",
    icon: "⚕️",
    category: "Other",
    steps: [
      "Move dangerous objects away from the person.",
      "Protect their head with something soft if possible.",
      "Do not restrain them or put anything in their mouth.",
      "After the seizure, place them on their side if they are breathing normally.",
      "Call emergency services if the seizure lasts unusually long, repeats, or causes serious injury.",
    ],
  },
];

const categories = [
  "All",
  "Common Emergencies",
  "Injuries",
  "Travel Emergencies",
  "Other",
];

export default function FirstAidGuide() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selected, setSelected] = useState(null);

  const filteredData =
    activeCategory === "All"
      ? firstAidData
      : firstAidData.filter(
          (item) => item.category === activeCategory
        );

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          🩺 First Aid Guide
        </h2>

        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Basic first-aid information for common travel emergencies.
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-3 mb-8">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setActiveCategory(category);
              setSelected(null);
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeCategory === category
                ? "bg-brand-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {filteredData.map((item) => (
          <button
            key={item.title}
            onClick={() => setSelected(item)}
            className="text-left p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:shadow-md hover:-translate-y-1 transition"
          >
            <div className="text-3xl mb-3">
              {item.icon}
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {item.title}
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
              {item.category}
            </p>

            <p className="mt-3 text-brand-600 font-semibold">
              View first-aid steps →
            </p>
          </button>
        ))}

      </div>

      {/* Selected Topic */}
      {selected && (
        <div className="mt-8 p-6 rounded-xl border-2 border-brand-500 bg-brand-50 dark:bg-gray-700">

          <div className="flex justify-between items-start gap-4">

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selected.icon} {selected.title}
              </h3>

              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                {selected.category}
              </p>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-xl"
            >
              ✕
            </button>

          </div>

          <ol className="mt-5 space-y-3 list-decimal list-inside">
            {selected.steps.map((step, index) => (
              <li
                key={index}
                className="text-gray-700 dark:text-gray-200 text-base leading-relaxed"
              >
                {step}
              </li>
            ))}
          </ol>

          <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
            <p className="text-red-700 dark:text-red-300 font-semibold">
              ⚠️ First aid is not a substitute for professional medical
              care. For serious or life-threatening situations, contact
              emergency medical services immediately.
            </p>
          </div>

        </div>
      )}

    </section>
  );
}