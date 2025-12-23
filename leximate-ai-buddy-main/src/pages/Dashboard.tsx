// src/pages/Dashboard.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  MessageSquare,
  PlusCircle,
  Clock,
  Download,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/layout/Sidebar";
import AIAssistant from "@/components/ai/AIAssistant";
import api from "@/api/axiosInstance";

type RawDoc = Record<string, unknown>;

type Doc = {
  _id: string;
  name: string; // display name (we set to type uppercase)
  type?: string;
  createdAtIso?: string | null;
  updatedAtIso?: string | null;
  dateDisplay: string;
  status: string;
  raw: RawDoc;
};

type Stat = {
  label: string;
  value: string;
  icon: React.ElementType;
  change?: string;
};

type QuickAction = {
  icon?: React.ElementType;
  title: string;
  description?: string;
  color?: string;
  action?: string | (() => void);
  href?: string;
};

const getErrorMessage = (err: unknown): string => {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  const e = err as { response?: { data?: { error?: string } }; message?: string };
  return e.response?.data?.error || e.message || "Unknown error";
};

const Dashboard: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<Stat[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Doc[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const defaultQuickActions: QuickAction[] = [
    {
      icon: FileText,
      title: "Generate Document",
      description: "Create any type of document",
      color: "bg-gradient-primary",
      action: () => navigate("/generate"),
    },
    {
      icon: MessageSquare,
      title: "Ask AI Assistant",
      description: "Get legal guidance",
      color: "bg-gradient-accent",
      action: () => navigate("/chat"),
    },
  ];

  // Helper: compute stats from full docs array
  const computeStatsFromRaw = (docs: RawDoc[]): Stat[] => {
    const total = docs.length;
    const pending = docs.filter((d) => String(d.status) === "pending").length;
    const completed = docs.filter((d) => String(d.status) === "completed").length;
    const drafts = docs.filter((d) => String(d.status) === "draft").length;

    return [
      { label: "Contracts Created", value: String(total), icon: FileText, change: total ? `+${Math.min(50, Math.round(total / 5))}%` : "0%" },
      { label: "Pending Downloads", value: String(pending), icon: Download, change: pending ? `-${Math.min(20, Math.round(pending))}%` : "0%" },
      { label: "AI Consultations", value: String(completed), icon: MessageSquare, change: completed ? `+${Math.min(30, Math.round(completed / 2))}%` : "0%" },
      { label: "Active Templates", value: String(drafts), icon: Users, change: drafts ? `+${Math.min(40, Math.round(drafts))}%` : "0%" },
    ];
  };

  // Fetch / normalize documents, show only latest 3 in UI
  const fetchDocuments = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/documents");
      // shape-safely read documents array
      const data = res as unknown as { data?: { documents?: RawDoc[] } };
      const docs: RawDoc[] = Array.isArray(data?.data?.documents) ? (data.data.documents as RawDoc[]) : [];

      // Stats computed from full set (so we don't lose metrics)
      setStats(computeStatsFromRaw(docs));

      // Normalize: set display 'name' to the document type FIRST (uppercase)
      const normalized: Doc[] = docs.map((d) => {
        const typeVal = d.type ? String(d.type) : (d.documentType ? String(d.documentType) : "");
        const createdAtIso = typeof d.createdAt === "string" ? d.createdAt : (d.createdAt instanceof Date ? d.createdAt.toISOString() : null);
        const updatedAtIso = typeof d.updatedAt === "string" ? d.updatedAt : (d.updatedAt instanceof Date ? d.updatedAt.toISOString() : null);
        const dateDisplay =
          (typeof d.createdAt === "string" && d.createdAt) ? new Date(d.createdAt).toLocaleString() :
            (d.updatedAt ? (typeof d.updatedAt === "string" ? new Date(d.updatedAt).toLocaleString() : String(d.updatedAt)) : (d.date ? String(d.date) : "-"));

        // IMPORTANT: name is TYPE, as requested
        const displayName = typeVal ? typeVal.toUpperCase() : "DOCUMENT";

        return {
          _id: String((d as { _id?: unknown })._id || (d as { documentId?: unknown }).documentId || (d as { id?: unknown }).id || ""),
          name: displayName,
          type: typeVal || undefined,
          createdAtIso,
          updatedAtIso,
          dateDisplay,
          status: String(d.status || "draft"),
          raw: d,
        };
      });

      // sort descending by createdAtIso -> updatedAtIso -> fallback
      normalized.sort((a, b) => {
        const aTime = new Date(a.createdAtIso || a.updatedAtIso || 0).getTime();
        const bTime = new Date(b.createdAtIso || b.updatedAtIso || 0).getTime();
        return bTime - aTime;
      });

      // Keep only the 3 most recent for display
      setRecentDocuments(normalized.slice(0, 3));
      setQuickActions(defaultQuickActions);
    } catch (err: unknown) {
      console.error("fetchDocuments error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      await api.post("/logout");
      // Clear frontend storage if you store tokens
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      navigate("/"); // Redirect to login page
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Poll every 10s to auto-update (no SSE provided by backend)
    pollRef.current = window.setInterval(fetchDocuments, 10000) as unknown as number;
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDocumentPage = (docId: string): void => {
    if (!docId) return;
    navigate(`/documents/${docId}`);
  };

  return (
    <div className="flex min-h-screen bg-gradient-soft">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
    
      <main className="flex-1 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              
              {loading && <p className="text-xs text-muted-foreground mt-1">Updating…</p>}
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>

            <div className="flex items-center space-x-4">
              <AIAssistant size="sm" />
              <div className="flex justify-end mb-4">
  <button
    onClick={handleLogout}
    className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
  >
    Logout
  </button>
</div>
            </div>
            

          </div>
          
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card className="border-border shadow-soft" key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className={`text-xs ${String(stat.change || "").startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                        {stat.change ?? "0%"} from last month
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      {Icon && <Icon className="w-6 h-6 text-primary" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-2 border-border shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-primary" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {(quickActions.length ? quickActions : defaultQuickActions).map((action, idx) => {
                  const Icon = action.icon || FileText;
                  const onClick = (): void => {
                    if (typeof action.action === "function") {
                      action.action();
                      return;
                    }
                    if (action.href) {
                      navigate(action.href);
                      return;
                    }
                    if (action.action === "generate") {
                      navigate("/generate");
                      return;
                    }
                    navigate("/generate");
                  };

                  return (
                    <button
                      key={idx}
                      onClick={onClick}
                      className="p-6 border border-border rounded-xl hover:shadow-elegant transition-smooth text-left group bg-gradient-soft flex flex-col items-start"
                    >
                      <div className={`w-12 h-12 rounded-xl ${action.color || "bg-primary"} flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth shadow-glow`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <h3 className="font-semibold text-foreground mb-2">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Documents (top 3) */}
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-primary" />
                <span>Recent Documents</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDocuments.length === 0 && !loading && (
                  <div className="p-6 text-center text-sm text-muted-foreground">No recent documents available.</div>
                )}

                {recentDocuments.map((doc, idx) => (
                  <div
                    key={doc._id || idx}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/90 transition"
                    onClick={() => openDocumentPage(doc._id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">Type: {doc.type?.toUpperCase() ?? "DOCUMENT"}</p>
                        <p className="text-xs text-muted-foreground">{doc.dateDisplay}</p>
                      </div>
                    </div>

                    <div className={`px-2 py-1 rounded text-xs ${doc.status === "completed" ? "bg-green-100 text-green-800" : doc.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                      {doc.status}
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="ghost" className="w-full mt-4 text-primary hover:bg-primary/5" onClick={() => navigate("/documents")}>
                View All Documents
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* AI assistant CTA */}
        <Card className="mt-6 border-primary/20 bg-primary/5 shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <AIAssistant size="sm" />
                <div>
                  <h3 className="font-semibold text-foreground">Need Legal Guidance?</h3>
                  <p className="text-muted-foreground">Ask our AI assistant any legal question - available 24/7</p>
                </div>
              </div>
              <Button onClick={() => navigate("/chat")} className="bg-primary hover:bg-primary/90 text-primary-foreground">Start Chat</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
