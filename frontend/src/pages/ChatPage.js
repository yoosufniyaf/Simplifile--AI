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
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User,
  FileText,
  Loader2,
  Sparkles
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ChatPage = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState("none");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data.filter(d => d.analyzed));
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  }, [token]);

  const fetchChatHistory = useCallback(async () => {
    try {
      const params = selectedDocument && selectedDocument !== "none" ? `?document_id=${selectedDocument}` : "";
      const response = await axios.get(`${API}/chat/history${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Reverse to show oldest first
      setMessages(response.data.reverse());
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Add user message immediately
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      user_message: userMessage,
      ai_response: null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await axios.post(
        `${API}/chat`,
        {
          message: userMessage,
          document_id: selectedDocument && selectedDocument !== "none" ? selectedDocument : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Replace temp message with actual response
      setMessages(prev => prev.map(m => 
        m.id === tempUserMsg.id ? response.data : m
      ));
    } catch (error) {
      toast.error("Failed to send message");
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
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
    "What are the key risks in this document?",
    "Explain the payment terms simply",
    "What are my obligations?",
    "Are there any hidden fees?"
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="chat-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            AI Chat
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask questions about your documents or get financial advice
          </p>
        </div>
        <Select value={selectedDocument} onValueChange={setSelectedDocument}>
          <SelectTrigger className="w-64 bg-muted/30" data-testid="document-select">
            <SelectValue placeholder="Select a document (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No document selected</SelectItem>
            {documents.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {doc.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            {historyLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Start a conversation
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Ask me anything about your documents, finances, or business operations. 
                  Select a document above for context-aware responses.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg">
                  {suggestedQuestions.map((question, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-left justify-start h-auto py-2 px-3"
                      onClick={() => setInput(question)}
                      data-testid={`suggested-question-${i}`}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-4">
                    {/* User Message */}
                    <div className="flex items-start gap-3 justify-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                        <p className="text-sm">{msg.user_message}</p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    </div>

                    {/* AI Response */}
                    {msg.ai_response && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {msg.ai_response}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-12 bg-muted/30"
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
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {selectedDocument && selectedDocument !== "none" && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Chatting in context of: {documents.find(d => d.id === selectedDocument)?.name}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatPage;
