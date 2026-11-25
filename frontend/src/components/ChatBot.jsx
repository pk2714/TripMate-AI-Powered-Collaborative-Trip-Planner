import { useState, useRef, useEffect } from "react";
import api from "../api/axios";
import { useChatBot } from "../context/ChatBotContext.jsx";

// Renders inline markdown: **bold**, *italic*, `code`.
function renderInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} className="px-1 rounded bg-gray-100 dark:bg-gray-700 text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// Lightweight markdown renderer for chatbot replies (headings, bullet and
// numbered lists, inline formatting). Avoids pulling in a markdown library.
function renderFormattedText(text) {
  return text.split(/\r?\n/).map((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    const key = `l-${idx}`;

    if (!trimmed) return <div key={key} className="h-2" />;

    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      return (
        <div key={key} className="font-semibold mt-2 mb-0.5">
          {renderInline(heading[1], key)}
        </div>
      );
    }

    const indent = line.length - line.trimStart().length >= 2 ? "ml-8" : "ml-4";

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      return (
        <div key={key} className={`${indent} my-0.5 flex gap-1.5 leading-relaxed`}>
          <span>•</span>
          <span>{renderInline(bullet[1], key)}</span>
        </div>
      );
    }

    const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      return (
        <div key={key} className={`${indent} my-0.5 flex gap-1.5 leading-relaxed`}>
          <span>{numbered[1]}.</span>
          <span>{renderInline(numbered[2], key)}</span>
        </div>
      );
    }

    return (
      <div key={key} className="my-0.5 leading-relaxed">
        {renderInline(trimmed, key)}
      </div>
    );
  });
}

export default function ChatBot() {
  const { tripContext } = useChatBot();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hi there! I'm **TripMate AI**, your personal travel companion. Ask me anything about destination ideas, itineraries, packing checklists, local cuisine, or budget travel tips!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  const quickPrompts = [
    "🏖️ Top places to visit in Goa",
    "🎒 Weekend packing essentials",
    "💰 Budget travel hacks",
    "🏔️ Best trekking spots in Himalayas",
  ];

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter((m) => m.id !== "welcome" && !m.isError)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.post("/ai/chat", {
        message: text,
        history,
        tripId: tripContext?.tripId,
      });

      const aiReply = res.data?.reply || "I couldn't generate a response. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.error("AI chat error:", err);
      const errMsg =
        err.response?.data?.message ||
        "Sorry, I had trouble connecting to the AI service. Please check your internet connection or verify your GEMINI_API_KEY.";

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "✨ Chat cleared! Where would you like to explore next? Feel free to ask about any place or travel question.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans">
      {/* Floating Action Button when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3 bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-700 hover:to-teal-600 text-white rounded-full shadow-2xl shadow-brand-600/30 transition-all duration-300 transform hover:scale-105"
          aria-label="Open TripMate AI Assistant"
        >
          <span className="text-2xl animate-pulse">🤖</span>
          <span className="hidden sm:inline font-semibold text-sm tracking-wide">
            Ask TripMate AI
          </span>
          <span className="hidden sm:block w-2.5 h-2.5 bg-green-300 rounded-full animate-ping mr-0.5" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 transition-all duration-200 overflow-hidden ${
            isMinimized
              ? "w-80 h-16"
              : "w-[92vw] sm:w-[420px] h-[580px] max-h-[82vh]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-brand-700 via-brand-600 to-teal-500 text-white select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-wide">TripMate AI</h3>
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] bg-green-400/30 text-green-200 rounded-full border border-green-300/40 font-medium">
                    Online
                  </span>
                </div>
                <p className="text-xs text-brand-50 opacity-90">
                  {tripContext?.destination
                    ? `Trip context: ${tripContext.destination}`
                    : "Your 24/7 AI Travel Companion"}
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1 text-white/80">
              <button
                onClick={clearChat}
                title="Clear Chat"
                className="p-1.5 rounded-lg hover:bg-white/20 hover:text-white transition text-xs"
              >
                🧹
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                className="p-1.5 rounded-lg hover:bg-white/20 hover:text-white transition"
              >
                {isMinimized ? "🔼" : "➖"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg hover:bg-white/20 hover:text-white transition text-sm font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-950/40">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        m.role === "user"
                          ? "bg-brand-600 text-white rounded-br-none"
                          : m.isError
                          ? "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-bl-none"
                          : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none"
                      }`}
                    >
                      {m.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-brand-600 dark:text-brand-300">
                          <span>✨ TripMate AI</span>
                        </div>
                      )}
                      <div>{renderFormattedText(m.content)}</div>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-start gap-2">
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
                        <span className="text-xs text-gray-400 ml-2">TripMate is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick suggestion chips */}
              {messages.length <= 2 && !loading && (
                <div className="px-3 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5">
                  {quickPrompts.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition border border-gray-200 dark:border-gray-700"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about destinations, budget, packing..."
                    disabled={loading}
                    className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 disabled:hover:bg-brand-600 shadow-md transition transform active:scale-95"
                    title="Send Message"
                  >
                    <svg
                      className="w-4 h-4 transform rotate-90"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
