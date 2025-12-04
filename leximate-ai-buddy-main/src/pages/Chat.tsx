import { useState,useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Sidebar from "@/components/layout/Sidebar";
import AIAssistant from "@/components/ai/AIAssistant";
import { Send, Plus, Clock } from "lucide-react";
import api from "@/api/axiosInstance";
import { Trash2 } from "lucide-react";

interface BackendMessage {
  session_id: string;
  user_id: string;
  sender: "user" | "assistant";
  message: string;
  timestamp?: string | null; // ISO string from backend
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}
interface ChatSession {
  _id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}
const Chat = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
   const suggestedQuestions = [
    "What should I include in an NDA?",
    "How do I protect intellectual property?",
    "What are standard contract terms?",
    "Explain liability clauses",
  ];
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);


    const loadChatHistory = async () => {
    try {
      const res = await api.get("/chatHistory");
      if (res.data.success) {
        const sorted = res.data.chats.sort(
        (a: ChatSession, b: ChatSession) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
        setChatHistory(res.data.chats);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, []);
  const deleteChat = async (sessionId: string) => {
  if (!confirm("Are you sure you want to delete this chat?")) return;

  try {
    const res = await api.delete(`/deleteChat/${sessionId}`,{
  withCredentials: true
});
    if (res.data.success) {
      setChatHistory((prev) => prev.filter((c) => c._id !== sessionId));

      // If currently viewing deleted chat → auto-start a new one
      if (currentSessionId === sessionId) {
        startNewChat();
      }
    }
  } catch (error) {
    console.error("Delete chat error:", error);
  }
};

  const startNewChat = async () => {
    try {
      const res = await api.post("/startChat");
      if (res.data.success) {
        setCurrentSessionId(res.data.session_id);
        setMessages([
          {
            id: "1",
            content:
              "Hello! I'm your LexiMate AI assistant. I'm here to help you with legal questions. How can I assist you with today?",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
        loadChatHistory();
      }
    } catch (error) {
      console.error("Cannot start chat:", error);
    }
  };

  // Auto-start a chat on first load
  useEffect(() => {
    startNewChat();
  }, []);

  const loadMessages = async (sessionId: string) => {
    try {
      const res = await api.get(`/getMessages/${sessionId}`);
      if (res.data.success) {
        const loadedMsgs = res.data.messages.map((msg: BackendMessage) => ({
          id: Math.random().toString(36).substring(2)
,
          content: msg.message,
          isUser: msg.sender === "user",
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
,
        }));

        setMessages(loadedMsgs);
        setCurrentSessionId(sessionId);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentSessionId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      content: message,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);

    const userMessageCopy = message;
    setMessage("");

    try {
      const res = await api.post("/chat", {
        session_id: currentSessionId,
        message: userMessageCopy,
      });

      const botReply = res.data.reply || "Sorry, something went wrong.";

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        content: botReply,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
      loadChatHistory();
    } catch (error) {
      console.error("Chat error:", error);
    }
  };
  
  return (
    <div className="flex h-screen bg-gradient-soft overflow-hidden">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Chat History Sidebar */}
        <div className="w-64 bg-white border-r border-border p-4 shadow-soft overflow-y-auto h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-foreground">Chat History</h2>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={startNewChat}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {chatHistory.map((chat) => (
             <div
  key={chat._id}
  className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-smooth"
>
  {/* LEFT SIDE - CLICK TO OPEN CHAT */}
  <div
    className="flex-1 cursor-pointer"
    onClick={() => loadMessages(chat._id)}
  >
    <p className="font-medium text-foreground text-sm">{chat.title}</p>
    <p className="text-xs text-muted-foreground flex items-center mt-1">
      <Clock className="w-3 h-3 mr-1" />
      {new Date(chat.updatedAt).toLocaleString()}
    </p>
  </div>

  {/* RIGHT SIDE - DELETE BUTTON */}
  <button
    onClick={(e) => {
      e.stopPropagation();  // ← prevents triggering the left div
      deleteChat(chat._id);
    }}
    className="p-1 text-red-500 hover:bg-red-100 rounded"
  >
    <Trash2 className="w-4 h-4" />
  </button>
</div>

              
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="bg-white border-b border-border p-4 shadow-soft">
            <div className="flex items-center space-x-3">
              <AIAssistant size="sm" />
              <div>
                <h1 className="font-semibold text-foreground">LexiMate AI Assistant</h1>
                <p className="text-sm text-muted-foreground">Online • Ready to help</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-3 max-w-3xl ${msg.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {!msg.isUser && (
                      <AIAssistant size="sm" showGlow={false} />
                    )}
                    <div
                      className={`px-4 py-3 rounded-lg ${
                        msg.isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white border border-border shadow-soft'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-2 ${msg.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested Questions */}
           {/* Suggested Questions */}
{messages.length === 1 && (
  <div className="max-w-4xl mx-auto mt-8">
    <p className="text-sm text-muted-foreground mb-4">Suggested questions:</p>
    <div className="grid md:grid-cols-2 gap-3">
      {suggestedQuestions.map((question, index) => (
        <button
          key={index}
          onClick={() => setMessage(question)}
          className="p-3 text-left bg-white border border-border rounded-lg hover:shadow-medium transition-smooth"
        >
          <p className="text-sm text-foreground">{question}</p>
        </button>
      ))}
    </div>
  </div>
)}

          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-border p-4 shadow-soft sticky bottom-0">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
              <div className="flex space-x-3">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me anything about legal matters..."
                  className="flex-1 border-border focus:ring-primary"
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                LexiMate AI can make mistakes. Always verify important legal information with a qualified attorney.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;