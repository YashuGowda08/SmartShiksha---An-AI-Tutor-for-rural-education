"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useLanguage } from "@/contexts/LanguageContext";
import { aiTutorAPI } from "@/lib/api";
import { Brain, Send, Sparkles, Globe, Trash2 } from "lucide-react";
import { Language } from "@/lib/i18n";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AITutorPage() {
  const { getToken } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm **Shiksha AI** 🎓, your personal tutor. Ask me anything about your subjects and I'll explain in simple language!\n\nYou can ask me to:\n- 📖 Explain a concept\n- 📝 Give practice questions\n- 💡 Share exam tips\n- 🌐 Answer in your preferred language" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatLanguage, setChatLanguage] = useState<Language>(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) return;

      const res = await aiTutorAPI.chat(
        {
          message: userMessage,
          session_id: sessionId || undefined,
          language: chatLanguage,
        },
        token
      );

      setSessionId(res.data.session_id);
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please check that the backend is running and your Groq API key is configured. 🙏" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      { role: "assistant", content: "Chat cleared! Ask me anything about your subjects 📚" },
    ]);
    setSessionId(null);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("ai_tutor")}</h1>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Powered by AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={chatLanguage}
            onChange={(e) => setChatLanguage(e.target.value as Language)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="English">🌐 English</option>
            <option value="Hindi">🇮🇳 Hindi</option>
            <option value="Kannada">ಕ Kannada</option>
            <option value="Telugu">త Telugu</option>
            <option value="Tamil">த Tamil</option>
          </select>
          <button onClick={handleClearChat} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={msg.role === "user" ? "chat-user" : "chat-ai"}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content.split("**").map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="chat-ai">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("type_message")}
            rows={1}
            className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition text-sm"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="btn-primary px-4 py-3 rounded-2xl disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
