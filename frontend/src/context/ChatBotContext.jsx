import { createContext, useContext, useState } from "react";

// Lets pages (e.g. TripDetails) tell the floating AI assistant which trip
// the user is looking at, so answers can be tailored to that trip.
const ChatBotContext = createContext(null);

export function ChatBotProvider({ children }) {
  // { tripId, destination } | null
  const [tripContext, setTripContext] = useState(null);

  return (
    <ChatBotContext.Provider value={{ tripContext, setTripContext }}>
      {children}
    </ChatBotContext.Provider>
  );
}

export function useChatBot() {
  const ctx = useContext(ChatBotContext);
  if (!ctx) throw new Error("useChatBot must be used within a ChatBotProvider");
  return ctx;
}
