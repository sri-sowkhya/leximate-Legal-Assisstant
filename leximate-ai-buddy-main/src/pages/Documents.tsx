import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Sidebar from "@/components/layout/Sidebar";
import { useEffect } from "react";
import DocumentPreview from "@/components/DocumentPreview";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


import api from "@/api/axiosInstance";

import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Calendar,
  MoreVertical,
  Grid3X3,
  List
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Documents = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // preview modal state
const [previewOpen, setPreviewOpen] = useState(false);
const [previewContent, setPreviewContent] = useState<string | null>(null);
const [previewTitle, setPreviewTitle] = useState<string>("Preview");
  // Full doc type returned by GET /documents/:id
type BackendDocumentFull = {
  _id: string;
  type?: string;
  companyName?: string;
  counterpartyName?: string;
  effectiveDate?: string | null;
  duration?: string | null;
  governingLaw?: string | null;
  confidentialityLevel?: string | null;
  purpose?: string | null;
  additionalTerms?: string | null;
  generatedText?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

// Edit modal state
const [editModalOpen, setEditModalOpen] = useState(false);
const [editDocId, setEditDocId] = useState<string | null>(null);
const [editingLoading, setEditingLoading] = useState(false);

const [editForm, setEditForm] = useState({
  type: "",
  companyName: "",
  counterpartyName: "",
  effectiveDate: "",
  duration: "",
  governingLaw: "",
  confidentialityLevel: "",
  purpose: "",
  additionalTerms: "",
  status: ""
});

  interface DocumentItem {
  id: string;
  name: string;
  type: string;
  status: string;
  createdDate: string;
  lastModified: string;
  size: string;
  parties: string[];
  
}
const [documents, setDocuments] = useState<DocumentItem[]>([]);
// Type returned by backend for each document
type DocFromAPI = {
  _id: string;
  user_id?: string | null;
  type?: string;
  companyName?: string;
  counterpartyName?: string;
  generatedText?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  status?: string | null;
  disclosingParty?: string | null;
  receivingParty?: string | null;
  clientName?: string | null;
  freelancerName?: string | null;
};

// View handler: fetch documents endpoint and open modal with generatedText
const handleViewDocument = async (docId: string): Promise<void> => {
  try {
    // Fetch all documents (your backend returns documents list)
    const res = await api.get<{ success: boolean; documents: DocFromAPI[] }>("/documents", { withCredentials: true });

    if (!res.data || !res.data.success) {
      alert("Failed to fetch document for preview");
      return;
    }

    const docs = res.data.documents || [];
    const found = docs.find((d) => String(d._id) === docId);

    if (!found) {
      alert("Document not found");
      return;
    }

    const text = typeof found.generatedText === "string" ? found.generatedText : null;
    setPreviewContent(text || "No preview available for this document.");
    setPreviewTitle(`${found.type ?? "Document"} - ${found.companyName ?? ""}`);
    setPreviewOpen(true);
  } catch (err) {
    console.error("Failed to fetch document for preview:", err);
    alert("Failed to fetch document for preview");
  }
};

// Download handler: open backend download route
const handleDownloadDocument = async (docId: string): Promise<void> => {
  if (!docId) {
    alert("No document selected");
    return;
  }

  try {
    const res = await api.get(`/download-document/${docId}`, {
      responseType: "blob", // 🔑 REQUIRED for files
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `document_${docId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download failed:", err);
    alert("Failed to download document");
  }
};

// Delete handler
const handleDeleteDocument = async (docId: string): Promise<void> => {
  const ok = confirm("Are you sure you want to delete this document? This cannot be undone.");
  if (!ok) return;
  try {
    const res = await api.delete<{ success: boolean; message?: string }>(`/documents/${docId}`, { withCredentials: true });
    if (res.data?.success) {
      // remove from local state
      setDocuments(prev => prev.filter(d => d.id !== docId));
      alert("Document deleted");
    } else {
      console.error("Delete failed:", res.data);
      alert("Failed to delete document");
    }
  } catch (err) {
    console.error("Delete error:", err);
    alert("Failed to delete document");
  }
};
// Helper: set a single field in editForm
const setEditField = (key: keyof typeof editForm, value: string): void => {
  setEditForm(prev => ({ ...prev, [key]: value }));
};

// Open modal and load single document from backend
const openEditModal = async (docId: string): Promise<void> => {
  try {
    setEditingLoading(true);
    const res = await api.get<{ success: boolean; document: BackendDocumentFull }>(`/documents/${docId}`, { withCredentials: true });
    if (!res.data?.success || !res.data.document) {
      alert("Failed to load document for editing");
      setEditingLoading(false);
      return;
    }

    const doc = res.data.document;
    setEditForm({
      type: doc.type ?? "",
      companyName: doc.companyName ?? "",
      counterpartyName: doc.counterpartyName ?? "",
      effectiveDate: doc.effectiveDate ?? "",
      duration: doc.duration ?? "",
      governingLaw: doc.governingLaw ?? "",
      confidentialityLevel: doc.confidentialityLevel ?? "",
      purpose: doc.purpose ?? "",
      additionalTerms: doc.additionalTerms ?? "",
      status: doc.status ?? ""
    });

    setEditDocId(String(doc._id));
    setEditModalOpen(true);
  } catch (err) {
    console.error("openEditModal error:", err);
    alert("Failed to load document for editing");
  } finally {
    setEditingLoading(false);
  }
};

// Submit the update (PUT /documents/:id)
const submitDocumentUpdate = async (): Promise<void> => {
  if (!editDocId) return alert("No document selected to update");
  try {
    setEditingLoading(true);
    // Build a payload only with allowed fields
    const payload: Record<string, string | undefined> = {
      type: editForm.type || undefined,
      companyName: editForm.companyName || undefined,
      counterpartyName: editForm.counterpartyName || undefined,
      effectiveDate: editForm.effectiveDate || undefined,
      duration: editForm.duration || undefined,
      governingLaw: editForm.governingLaw || undefined,
      confidentialityLevel: editForm.confidentialityLevel || undefined,
      purpose: editForm.purpose || undefined,
      additionalTerms: editForm.additionalTerms || undefined,
      status: editForm.status || undefined
    };

    const res = await api.put<{ success: boolean; documentId?: string }>(`/documents/${editDocId}`, payload, { withCredentials: true });

    if (res.data?.success) {
      // update local state so UI reflects changes
      setDocuments(prev => prev.map(d => {
        if (d.id !== editDocId) return d;
        const parties = [
          payload.companyName ?? d.parties[0] ?? "",
          payload.counterpartyName ?? d.parties[1] ?? ""
        ].filter(Boolean);
        return {
          ...d,
          name: `${payload.type ?? d.type ?? "Document"} - ${payload.companyName ?? d.parties[0] ?? "Document"}`,
          type: payload.type ?? d.type,
          status: payload.status ?? d.status,
          parties,
          lastModified: (new Date()).toLocaleDateString()
        } as DocumentItem;
      }));

      alert("Document updated");
      setEditModalOpen(false);
      setEditDocId(null);
    } else {
      console.error("Update failed:", res.data);
      alert("Failed to update document");
    }
  } catch (err) {
    console.error("submitDocumentUpdate error:", err);
    alert("Failed to update document");
  } finally {
    setEditingLoading(false);
  }
};


  
  useEffect(() => {
  // Open preview modal for a document (fetch full document if needed)
  const loadDocuments = async () => {
    try {
      const res = await api.get("/documents", { withCredentials: true });
      if (res.data.success) {
        
        const formatted = res.data.documents.map((doc: DocFromAPI) => {
  const parties: string[] = [];

  // Prefer explicit parties for each document type
  if (doc.type === "nda") {
    if (doc.disclosingParty) parties.push(doc.disclosingParty);
    if (doc.receivingParty) parties.push(doc.receivingParty);
  } else if (doc.type === "contract") {
    if (doc.clientName) parties.push(doc.clientName);
    if (doc.freelancerName) parties.push(doc.freelancerName);
  } else if (doc.type === "service") {
    if (doc.companyName) parties.push(doc.companyName);
    if (doc.counterpartyName) parties.push(doc.counterpartyName);
  }

  // Fallback — include any valid string fields
  if (parties.length === 0) {
    const fallbackFields: (string | null | undefined)[] = [
      doc.companyName,
      doc.counterpartyName,
      doc.disclosingParty,
      doc.receivingParty,
      doc.clientName,
      doc.freelancerName
    ];

    fallbackFields
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      .forEach((p) => parties.push(p));
  }

  return {
    id: String(doc._id),
    name: `${doc.type || "Document"}${doc.companyName ? ` - ${doc.companyName}` : ""}`,
    type: doc.type || "Unknown",
    status: doc.status || (doc.generatedText ? "completed" : "pending"),
    createdDate: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "",
    lastModified: doc.updatedAt
      ? new Date(doc.updatedAt).toLocaleDateString()
      : (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ""),
    size: `${Math.floor((doc.generatedText?.length || 0) / 2)} KB`,
    parties
  } as DocumentItem;
});




setDocuments(formatted);
      }
    } catch (e) {
      console.error("Failed to load docs:", e);
    }
  };

  loadDocuments();
}, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "draft": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    return <FileText className="w-4 h-4" />;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.parties.some(party => party.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || doc.type === filterType;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const DocumentCard = ({ doc }: { doc: DocumentItem }) => (
    <Card className="border-border shadow-soft hover:shadow-medium transition-smooth">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {getTypeIcon(doc.type)}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{doc.name}</h3>
              <p className="text-xs text-muted-foreground">{doc.type}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => handleViewDocument(doc.id)}>
    <Eye className="w-4 h-4 mr-2" />
    View
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => openEditModal(doc.id)}>
    <Edit className="w-4 h-4 mr-2" />
    Edit
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => handleDownloadDocument(doc.id)}>
    <Download className="w-4 h-4 mr-2" />
    Download
  </DropdownMenuItem>
  <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteDocument(doc.id)}>
    <Trash2 className="w-4 h-4 mr-2" />
    Delete
  </DropdownMenuItem>
</DropdownMenuContent>

          </DropdownMenu>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Created</span>
            <span>{doc.createdDate}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Size</span>
            <span>{doc.size}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Badge className={getStatusColor(doc.status)}>
            {doc.status}
          </Badge>
          <div className="flex space-x-2">
           <Button
  variant="ghost"
  size="sm"
  className="h-8 w-8 p-0"
  onClick={() => handleViewDocument(doc.id)}
  title="View document"
>
  <Eye className="w-4 h-4" />
</Button>
<Button
  variant="ghost"
  size="sm"
  className="h-8 w-8 p-0"
  onClick={() => handleDownloadDocument(doc.id)}
  title="Download document"
>
  <Download className="w-4 h-4" />
</Button>

          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Parties:</strong> {doc.parties.join(", ")}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen bg-gradient-soft">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Document History
                </h1>
                <p className="text-muted-foreground">
                  Manage and access all your generated documents
                </p>
              </div>
              <Button 
  className="bg-primary hover:bg-primary/90 text-primary-foreground"
  onClick={() => (window.location.href = "/generate")}
>
  <Plus className="w-4 h-4 mr-2" />
  New Document
</Button>

            </div>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6 border-border shadow-soft">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Document Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="NDA">NDA</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="service">Service Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredDocuments.length} of {documents.length} documents
            </p>
          </div>

          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <Card className="border-border shadow-soft">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                              {getTypeIcon(doc.type)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.parties.join(", ")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{doc.type}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(doc.status)}>
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{doc.createdDate}</TableCell>
                        <TableCell>{doc.size}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                           <Button
  variant="ghost"
  size="sm"
  className="h-8 w-8 p-0"
  onClick={() => handleViewDocument(doc.id)}
  title="View document"
>
  <Eye className="w-4 h-4" />
</Button>

<Button
  variant="ghost"
  size="sm"
  className="h-8 w-8 p-0"
  onClick={() => handleDownloadDocument(doc.id)}
  title="Download document"
>
  <Download className="w-4 h-4" />
</Button>

                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {filteredDocuments.length === 0 && (
            <Card className="border-border shadow-soft">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No documents found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || filterType !== "all" || filterStatus !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Create your first document to get started"}
                </p>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground"  onClick={() => (window.location.href = "/generate")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Document
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      <div>{filteredDocuments.length === 0 && (
            <Card className="border-border shadow-soft">
              <CardContent className="p-12 text-center">
                ...
              </CardContent>
            </Card>
          )}

          {/* Document preview modal (used for View) */}
          <DocumentPreview
            open={previewOpen}
            onClose={() => {
              setPreviewOpen(false);
              setPreviewContent(null);
              setPreviewTitle("Preview");
            }}
            content={previewContent || "No preview available"}
            title={previewTitle}
          />

        </div>
        {/* Edit Document Modal */}
{editModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <Card className="max-w-2xl w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Document</h3>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => { setEditModalOpen(false); setEditDocId(null); }}>
              Close
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Document Type</Label>
            <Input value={editForm.type} onChange={(e) => setEditField("type", e.target.value)} placeholder="nda | contract | service" />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={editForm.status} onValueChange={(v) => setEditField("status", v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Company</Label>
            <Input value={editForm.companyName} onChange={(e) => setEditField("companyName", e.target.value)} />
          </div>

          <div>
            <Label>Counterparty</Label>
            <Input value={editForm.counterpartyName} onChange={(e) => setEditField("counterpartyName", e.target.value)} />
          </div>

          <div>
            <Label>Effective Date</Label>
            <Input type="date" value={editForm.effectiveDate} onChange={(e) => setEditField("effectiveDate", e.target.value)} />
          </div>

          <div>
            <Label>Duration</Label>
            <Input value={editForm.duration} onChange={(e) => setEditField("duration", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Purpose</Label>
            <Textarea rows={3} value={editForm.purpose} onChange={(e) => setEditField("purpose", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Additional Terms</Label>
            <Textarea rows={3} value={editForm.additionalTerms} onChange={(e) => setEditField("additionalTerms", e.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => { setEditModalOpen(false); setEditDocId(null); }}>
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={submitDocumentUpdate}
            disabled={editingLoading}
          >
            {editingLoading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
)}

      </main>
    </div>
  );
};

export default Documents;