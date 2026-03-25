import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { AIEmptyState } from "../components/ui/ai-components";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  FileText,
  Loader2,
  Sparkles,
  ArrowDown
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Chat Message Component
const ChatMessage = ({ message, isUser }) => {
  const formatMessage = (text) => {
    if (isUser) return text;

    const lines = String(text || "").split("\n");
    const elements = [];
    let currentList = [];
    let inList = false;

    lines.forEach((line, i) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("## ")) {
        if (inList && currentList.length > 0) {
          elements.push(
            <ul key={`list-${i}`} className="space-y-1.5 my-2">
              {currentList.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
          currentList = [];
          inList = false;
        }

        elements.push(
          <h4
            key={i}
            className="font-semibold text-foreground mt-4 mb-2 first:mt-0"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {trimmed.substring(3)}
          </h4>
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        currentList.push(trimmed.substring(2));
      } else if (/^\d+\.\s/.test(trimmed)) {
        inList = true;
        currentList.push(trimmed.replace(/^\d+\.\s/, ""));
      } else if (trimmed) {
        if (inList && currentList.length > 0) {
          elements.push(
            <ul key={`list-${i}`} className="space-y-1.5 my-2">
              {currentList.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
          currentList = [];
          inList = false;
        }

        elements.push(
          <p key={i} className="text-sm leading-relaxed mb-2 last:mb-0">
            {trimmed}
          </p>
        );
      }
    });

    if (currentList.length > 0) {
      elements.push(
        <ul key="final-list" className="space-y-1.5 my-2">
          {currentList.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    return elements.length > 0 ? elements : text;
  };

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-primary/20 border border-primary/30"
            : "bg-card border border-border"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className={`max-w-[80%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border rounded-tl-sm"
          }`}
        >
          <div className={isUser ? "text-sm" : "text-muted-foreground"}>
            {formatMessage(message)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Typing Indicator
const TypingIndicator = () => (
  <div className="flex items-start gap-3">
    <div className="h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
      <Bot className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <span className="text-sm text-muted-foreground ml-1">Thinking...</span>
      </div>
    </div>
  </div>
);

const ChatPage = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  const toArray = (value, possibleKeys = []) => {
    if (Array.isArray(value)) return value;

    for (const key of possibleKeys) {
      if (Array.isArray(value?.[key])) {
        return value[key];
      }
    }

    return [];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const docsArray = toArray(response.data, ["documents", "data"]);
      setDocuments(docsArray.filter((d) => d?.analyzed));
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      setDocuments([]);
    }
  }, [token]);

  const fetchChatHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);

      const params =
        selectedDocument && selectedDocument !== "none"
          ? `?document_id=${selectedDocument}`
          : "";

      const response = await axios.get(`${API}/chat/history${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const historyArray = toArray(response.data, ["history", "messages", "data"]);
      setMessages([...historyArray].reverse());
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      setMessages([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, selectedDocument]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      user_message: userMessage,
      ai_response: null,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await axios.post(
        `${API}/chat`,
        {
          message: userMessage,
          document_id:
            selectedDocument && selectedDocument !== "none"
              ? selectedDocument
              : null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessages((prev) =>
        prev.map((m) => (m.id === tempUserMsg.id ? response.data : m))
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "What are the main risks in this document?",
    "Explain the payment terms in simple language",
    "What are my key obligations?",
    "Are there any hidden fees or penalties?"
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="chat-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            AI Chat
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask questions about your documents or get financial advice
          </p>
        </div>

        <Select value={selectedDocument} onValueChange={setSelectedDocument}>
          <SelectTrigger
            className="w-64 bg-card border-border"
            data-testid="document-select"
          >
            <SelectValue placeholder="Select a document (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No document selected</SelectItem>
            {documents.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[180px]">{doc.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <ScrollArea className="flex-1 p-6" ref={scrollRef} onScroll={handleScroll}>
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">
                  Loading conversation...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Start a conversation
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md text-sm">
                  Ask me anything about your documents, finances, or business
                  operations. Select a document above for context-aware responses.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg w-full">
                  {suggestedQuestions.map((question, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-left justify-start h-auto py-2.5 px-3 text-xs hover:bg-primary/5 hover:border-primary/30"
                      onClick={() => setInput(question)}
                      data-testid={`suggested-question-${i}`}
                    >
                      <Sparkles className="h-3 w-3 mr-2 text-primary shrink-0" />
                      <span className="truncate">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-4">
                    <ChatMessage message={msg.user_message} isUser={true} />
                    {msg.ai_response && (
                      <ChatMessage message={msg.ai_response} isUser={false} />
                    )}
                  </div>
                ))}
                {loading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-24 right-8 h-10 w-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}

          <div className="p-4 border-t border-border bg-card/50">
            {selectedDocument && selectedDocument !== "none" && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Chatting about:{" "}
                  <span className="text-foreground">
                    {documents.find((d) => d.id === selectedDocument)?.name}
                  </span>
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Input
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-12 bg-muted/30 border-border focus:border-primary/50"
                disabled={loading}
                data-testid="chat-input"
              />
              <Button
                size="lg"
                className="h-12 px-6 glow-button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                data-testid="chat-send-btn"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatPage;
