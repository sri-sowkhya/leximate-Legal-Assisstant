import { useState,useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Sidebar from "@/components/layout/Sidebar";
import AIAssistant from "@/components/ai/AIAssistant";
import { ArrowLeft, ArrowRight, FileText, Download, Save, Eye } from "lucide-react";
import api from "@/api/axiosInstance";
import DocumentPreview from "../components/DocumentPreview";
interface GeneratedDocument {
  success: boolean;
  documentId: string;
  documentText: string;
}

const DocumentGenerator = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [documentType, setDocumentType] = useState("");
  const [formData, setFormData] = useState({
  // NDA fields
  disclosingParty: "",
  receivingParty: "",

  // Contract fields
  clientName: "",
  freelancerName: "",
  projectTitle: "",
  startDate: "",
  endDate: "",
  paymentAmount: "",
  paymentMethod: "",

  // Service agreement fields
  companyName: "",
  counterpartyName: "",

  // Common fields
  effectiveDate: "",
  duration: "",
  governingLaw: "",
  confidentialityLevel: "",
  purpose: "",
  additionalTerms: ""
});
interface GeneratePayload {
  // required
  documentType: string;

  // NDA fields
  disclosingParty?: string;
  receivingParty?: string;

  // Contract fields
  clientName?: string;
  freelancerName?: string;
  projectTitle?: string;
  startDate?: string;
  endDate?: string;
  paymentAmount?: string;
  paymentMethod?: string;

  // Service agreement fields
  companyName?: string;
  counterpartyName?: string;

  // Common fields
  effectiveDate?: string;
  duration?: string;
  governingLaw?: string;
  confidentialityLevel?: string;
  purpose?: string;
  additionalTerms?: string;

  // control flags
  generateNow?: boolean;
  saveAsDraft?: boolean;
  currentPage?: number;

  // optional to update existing record
  documentId?: string | null;
}

  
  const steps = [
    { number: 1, title: "Document Type", description: "Choose your document type" },
    { number: 2, title: "Basic Information", description: "Enter party details" },
    { number: 3, title: "Terms & Conditions", description: "Define specific terms" },
    { number: 4, title: "Review & Generate", description: "Preview and download" }
  ];

  const documentTypes = [
    { value: "nda", label: "Non-Disclosure Agreement (NDA)", description: "Protect confidential information" },
    { value: "contract", label: "Freelancer Contract", description: "Define work terms and payment" },
    { value: "service", label: "Service Agreement", description: "Outline service delivery terms" }
  ];
 const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
 const [pendingDocId, setPendingDocId] = useState<string | null>(null);
 // Backend document shape
interface BackendDocument {
  _id: string;
  disclosingParty?: string;
  receivingParty?: string;
  clientName?: string;
  freelancerName?: string;
  projectTitle?: string;
  startDate?: string;
  endDate?: string;
  paymentAmount?: string;
  paymentMethod?: string;
  companyName?: string;
  counterpartyName?: string;
  effectiveDate?: string;
  duration?: string;
  governingLaw?: string;
  confidentialityLevel?: string;
  purpose?: string;
  additionalTerms?: string;
}

// helper: read query param
const getQueryParam = (name: string): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
};

useEffect(() => {
  const documentId = getQueryParam("documentId");
  if (!documentId) return;

  const loadForEdit = async () => {
    try {
      // GET /documents returns { success, documents }
      const res = await api.get<{ success: boolean; documents: BackendDocument[] }>(
        "/documents",
        { withCredentials: true }
      );

      if (res.data?.success) {
        const docs: BackendDocument[] = res.data.documents;

        const found = docs.find((doc) => String(doc._id) === documentId);
        if (!found) return;

        // Map backend fields → your formData
        setFormData((prev) => ({
          ...prev,
          disclosingParty: found.disclosingParty ?? prev.disclosingParty,
          receivingParty: found.receivingParty ?? prev.receivingParty,
          clientName: found.clientName ?? prev.clientName,
          freelancerName: found.freelancerName ?? prev.freelancerName,
          projectTitle: found.projectTitle ?? prev.projectTitle,
          startDate: found.startDate ?? prev.startDate,
          endDate: found.endDate ?? prev.endDate,
          paymentAmount: found.paymentAmount ?? prev.paymentAmount,
          paymentMethod: found.paymentMethod ?? prev.paymentMethod,
          companyName: found.companyName ?? prev.companyName,
          counterpartyName: found.counterpartyName ?? prev.counterpartyName,
          effectiveDate: found.effectiveDate ?? prev.effectiveDate,
          duration: found.duration ?? prev.duration,
          governingLaw: found.governingLaw ?? prev.governingLaw,
          confidentialityLevel: found.confidentialityLevel ?? prev.confidentialityLevel,
          purpose: found.purpose ?? prev.purpose,
          additionalTerms: found.additionalTerms ?? prev.additionalTerms,
        }));

        // Ensure future generate updates same record
        setPendingDocId(String(found._id));
      }
    } catch (err) {
      console.error("Failed to load document for edit", err);
    }
  };

  loadForEdit();
}, []);

const generateDocument = async () => {
  try {
    const payload: GeneratePayload = {
      documentType,
      // spread the form fields explicitly so payload matches GeneratePayload
      disclosingParty: formData.disclosingParty,
      receivingParty: formData.receivingParty,
      clientName: formData.clientName,
      freelancerName: formData.freelancerName,
      projectTitle: formData.projectTitle,
      startDate: formData.startDate,
      endDate: formData.endDate,
      paymentAmount: formData.paymentAmount,
      paymentMethod: formData.paymentMethod,
      companyName: formData.companyName,
      counterpartyName: formData.counterpartyName,
      effectiveDate: formData.effectiveDate,
      duration: formData.duration,
      governingLaw: formData.governingLaw,
      confidentialityLevel: formData.confidentialityLevel,
      purpose: formData.purpose,
      additionalTerms: formData.additionalTerms,
      generateNow: true,
    };

    if (pendingDocId) payload.documentId = pendingDocId;
    const response = await api.post<GeneratedDocument & { status?: string }>("/generate-document", payload);

    if (response.data.success) {
      setGeneratedDoc({
        success: true,
        documentId: response.data.documentId,
        documentText: response.data.documentText
      });
      setPendingDocId(response.data.documentId || null);
      alert("Document generated successfully!");
    }
     else {
      console.error("Generate response error:", response.data);
      alert("Failed to generate document.");
    }
  } catch (err) {
    console.error("Error generating document:", err);
    alert("Failed to generate document.");
  }
};
const downloadPDF = async () => {
  try {
    const documentId = generatedDoc?.documentId ?? pendingDocId;

    if (!documentId) {
      alert("Please generate the document first!");
      return;
    }

    const response = await api.get(
      `/download-document/${documentId}`,
      {
        responseType: "blob", // 🔑 required for file downloads
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    const pdfBlob = new Blob([response.data], {
      type: "application/pdf",
    });

    const downloadUrl = window.URL.createObjectURL(pdfBlob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `document_${documentId}.pdf`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

  } catch (error) {
    console.error("Download failed:", error);
    alert("Failed to download document. Please try again.");
  }
};



const [previewOpen, setPreviewOpen] = useState(false);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <AIAssistant size="lg" />
              <h3 className="text-xl font-semibold text-foreground mt-4 mb-2">
                What type of document would you like to create?
              </h3>
              <p className="text-muted-foreground">
                I'll guide you through the process step by step
              </p>
            </div>
            
            <div className="grid gap-4">
              {documentTypes.map((type) => (
                <div
                  key={type.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-smooth hover:shadow-medium ${
                    documentType === type.value 
                      ? "border-primary bg-primary/5 shadow-medium" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setDocumentType(type.value)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      documentType === type.value 
                        ? "bg-primary border-primary" 
                        : "border-muted-foreground"
                    }`} />
                    <div>
                      <h4 className="font-medium text-foreground">{type.label}</h4>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
  return (
    <div className="space-y-6">

      <div className="flex items-center space-x-3 mb-6">
        <AIAssistant size="sm" />
        <div>
          <h3 className="font-semibold text-foreground">Basic Information</h3>
          <p className="text-sm text-muted-foreground">Enter the details</p>
        </div>
      </div>

      {/* NDA FIELDS */}
      {documentType === "nda" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Disclosing Party</Label>
              <Input
                value={formData.disclosingParty}
                onChange={(e) =>
                  setFormData({ ...formData, disclosingParty: e.target.value })
                }
                placeholder="Person/Company sharing confidential info"
              />
            </div>

            <div>
              <Label>Receiving Party</Label>
              <Input
                value={formData.receivingParty}
                onChange={(e) =>
                  setFormData({ ...formData, receivingParty: e.target.value })
                }
                placeholder="Person/Company receiving info"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveDate: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Confidentiality Level</Label>
              <Select
                value={formData.confidentialityLevel}
                onValueChange={(value) =>
                  setFormData({ ...formData, confidentialityLevel: value })
                }
              >
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="mutual">Mutual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* CONTRACT FIELDS */}
      {documentType === "contract" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Client Name</Label>
              <Input
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                placeholder="Name of the client"
              />
            </div>

            <div>
              <Label>Freelancer Name</Label>
              <Input
                value={formData.freelancerName}
                onChange={(e) =>
                  setFormData({ ...formData, freelancerName: e.target.value })
                }
                placeholder="Name of the freelancer"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Project Title</Label>
              <Input
                value={formData.projectTitle}
                onChange={(e) =>
                  setFormData({ ...formData, projectTitle: e.target.value })
                }
                placeholder="Title of the project"
              />
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* SERVICE AGREEMENT FIELDS */}
      {documentType === "service" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                placeholder="Service Provider"
              />
            </div>

            <div>
              <Label>Client Name</Label>
              <Input
                value={formData.counterpartyName}
                onChange={(e) =>
                  setFormData({ ...formData, counterpartyName: e.target.value })
                }
                placeholder="Client receiving service"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveDate: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Governing Law</Label>
              <Select
                value={formData.governingLaw}
                onValueChange={(value) =>
                  setFormData({ ...formData, governingLaw: value })
                }
              >
                <SelectTrigger><SelectValue placeholder="Select law" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="india">India</SelectItem>
                  <SelectItem value="usa">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

    </div>
  );


      case 3:
        
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <AIAssistant size="sm" />
        <div>
          <h3 className="font-semibold text-foreground">Terms & Conditions</h3>
          <p className="text-sm text-muted-foreground">
            Define the specific terms for this document
          </p>
        </div>
      </div>

      {/* -------------------- NDA Fields -------------------- */}
      {documentType === "nda" && (
        <div className="space-y-4">
          <div>
            <Label>Confidentiality Level</Label>
            <Select
              value={formData.confidentialityLevel}
              onValueChange={(value) =>
                setFormData({ ...formData, confidentialityLevel: value })
              }
            >
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="mutual">Mutual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Duration</Label>
            <Input
              placeholder="e.g., 1 year, 6 months"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            />
          </div>

          <div>
            <Label>Purpose</Label>
            <Textarea
              rows={4}
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            />
          </div>

          <div>
            <Label>Additional Terms</Label>
            <Textarea
              rows={4}
              value={formData.additionalTerms}
              onChange={(e) =>
                setFormData({ ...formData, additionalTerms: e.target.value })
              }
            />
          </div>
        </div>
      )}

      {/* -------------------- CONTRACT Fields -------------------- */}
      {documentType === "contract" && (
        <div className="space-y-4">
          <div>
            <Label>Project Title</Label>
            <Input
              placeholder="e.g., Website Development"
              onChange={(e) =>
                setFormData({ ...formData, projectTitle: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Payment Amount</Label>
            <Input
              placeholder="e.g., 500 USD"
              onChange={(e) =>
                setFormData({ ...formData, paymentAmount: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Payment Method</Label>
            <Input
              placeholder="e.g., Bank Transfer, UPI"
              onChange={(e) =>
                setFormData({ ...formData, paymentMethod: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
            />
          </div>

          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Additional Terms</Label>
            <Textarea
              rows={4}
              onChange={(e) =>
                setFormData({ ...formData, additionalTerms: e.target.value })
              }
            />
          </div>
        </div>
      )}

      {/* -------------------- SERVICE AGREEMENT Fields -------------------- */}
      {documentType === "service" && (
        <div className="space-y-4">
          <div>
            <Label>Purpose of Services</Label>
            <Textarea
              rows={4}
              onChange={(e) =>
                setFormData({ ...formData, purpose: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Duration</Label>
            <Input
              placeholder="e.g., 6 months"
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Governing Law</Label>
            <Select
              onValueChange={(value) =>
                setFormData({ ...formData, governingLaw: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usa">USA</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="india">India</SelectItem>
                <SelectItem value="australia">Australia</SelectItem>
                <SelectItem value="canada">Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Confidentiality Level</Label>
            <Select
              onValueChange={(value) =>
                setFormData({ ...formData, confidentialityLevel: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="mutual">Mutual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Additional Terms</Label>
            <Textarea
              rows={4}
              onChange={(e) =>
                setFormData({ ...formData, additionalTerms: e.target.value })
              }
            />
          </div>
        </div>
      )}
    </div>
  );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <AIAssistant size="sm" />
              <div>
                <h3 className="font-semibold text-foreground">Document Ready!</h3>
                <p className="text-sm text-muted-foreground">Review and download your document</p>
              </div>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {documentTypes.find(t => t.value === documentType)?.label}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Between {formData.companyName} and {formData.counterpartyName}
                      </p>
                    </div>
                  </div>
                 <button
  onClick={() => {
    if (!generatedDoc?.documentText) {
      alert("Please generate the document first!");
      return;
    }
    setPreviewOpen(true);
  }}
>
  <Eye className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary transition" />
</button>

                </div>
                
                <div className="space-y-2 text-sm">
                  <p><strong>Effective Date:</strong> {formData.effectiveDate}</p>
                  <p><strong>Duration:</strong> {formData.duration}</p>
                  <p><strong>Governing Law:</strong> {formData.governingLaw}</p>
                </div>
              </CardContent>
            </Card>

          <div className="flex space-x-4">
     <Button 
    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
    onClick={generateDocument}
  >
    <FileText className="w-4 h-4 mr-2" />
    Generate
  </Button>

              <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"  onClick={downloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
    <Button
  variant="outline"
  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
  onClick={async () => {
    try {
      const payload: GeneratePayload = {
        documentType,
        disclosingParty: formData.disclosingParty,
        receivingParty: formData.receivingParty,
        clientName: formData.clientName,
        freelancerName: formData.freelancerName,
        projectTitle: formData.projectTitle,
        startDate: formData.startDate,
        endDate: formData.endDate,
        paymentAmount: formData.paymentAmount,
        paymentMethod: formData.paymentMethod,
        companyName: formData.companyName,
        counterpartyName: formData.counterpartyName,
        effectiveDate: formData.effectiveDate,
        duration: formData.duration,
        governingLaw: formData.governingLaw,
        confidentialityLevel: formData.confidentialityLevel,
        purpose: formData.purpose,
        additionalTerms: formData.additionalTerms,
        saveAsDraft: true,
      };

      if (pendingDocId) payload.documentId = pendingDocId;

      const res = await api.post<{ success: boolean; documentId: string; status?: string }>("/generate-document", payload);
      if (res.data?.success) {
        setPendingDocId(res.data.documentId || null);
        alert("Draft saved");
      } else {
        console.error("Save draft failed:", res.data);
        alert("Failed to save draft");
      }
    } catch (err) {
      console.error("Save draft error:", err);
      alert("Failed to save draft");
    }
  }}
>
  <Save className="w-4 h-4 mr-2" />
  Save Template
</Button>
         
   
</div>

          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-soft">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" className="mb-4" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Document Generator
            </h1>
            <p className="text-muted-foreground">
              Create professional legal documents with AI assistance
            </p>
          </div>

          {/* Progress Steps */}
          <Card className="mb-8 border-border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        currentStep >= step.number 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {step.number}
                      </div>
                      <div className="text-center mt-2">
                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-0.5 mx-4 ${
                        currentStep > step.number ? "bg-primary" : "bg-border"
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          <Card className="border-border shadow-soft">
            <CardContent className="p-8">
              {renderStepContent()}
            </CardContent>
          </Card>
           <DocumentPreview
  open={previewOpen}
  onClose={() => setPreviewOpen(false)}
  content={generatedDoc?.documentText || "Generate the document to preview it."}
  title={`Preview - ${documentTypes.find(t => t.value === documentType)?.label}`}
/>


          {/* Navigation */}
                <div className="flex justify-between mt-6">

  {/* Previous Button — Show ONLY if NOT Step 1 */}
  {currentStep !== 1 && (
    <Button 
      variant="outline" 
      onClick={() => setCurrentStep(currentStep - 1)}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Previous
    </Button>
  )}

  {/* Spacer to keep layout aligned when Previous is hidden */}
  {currentStep === 1 && <div></div>}

  {/* Next Button — Show ONLY if NOT Step 4 */}
  {currentStep !== 4 && (
    <Button 
      onClick={async () => {
  const next = currentStep + 1;

  if (next === 4) {
    try {
      if (!generatedDoc?.documentId && !pendingDocId) {
        const payload: GeneratePayload = {
          documentType,
          disclosingParty: formData.disclosingParty,
          receivingParty: formData.receivingParty,
          clientName: formData.clientName,
          freelancerName: formData.freelancerName,
          projectTitle: formData.projectTitle,
          startDate: formData.startDate,
          endDate: formData.endDate,
          paymentAmount: formData.paymentAmount,
          paymentMethod: formData.paymentMethod,
          companyName: formData.companyName,
          counterpartyName: formData.counterpartyName,
          effectiveDate: formData.effectiveDate,
          duration: formData.duration,
          governingLaw: formData.governingLaw,
          confidentialityLevel: formData.confidentialityLevel,
          purpose: formData.purpose,
          additionalTerms: formData.additionalTerms,
          currentPage: 4,
        };

        const res = await api.post<{ success: boolean; documentId: string; status?: string }>("/generate-document", payload);
        if (res.data?.success) {
          setPendingDocId(res.data.documentId || null);
        } else {
          console.error("Mark pending failed:", res.data);
        }
      }
    } catch (err) {
      console.error("Error marking pending on page 4:", err);
    }
  }

  setCurrentStep(next);
}}

      disabled={currentStep === 1 && !documentType}
      className="bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      Next
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  )}

</div>

        </div>
      </main>
    </div>
  );
};

export default DocumentGenerator;