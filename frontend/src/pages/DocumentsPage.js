import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  AISection,
  AIBulletList,
  WhatThisMeansSection,
  AILoadingState,
  AIEmptyState,
  RiskItem
} from "../components/ui/ai-components";
import { 
  FileText, 
  Upload, 
  Search, 
  Trash2, 
  Eye,
  AlertTriangle,
  CheckCircle,
  FileIcon,
  Loader2,
  Sparkles,
  ListChecks,
  Shield
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DocumentsPage = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      await axios.post(`${API}/documents/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      toast.success("Document uploaded successfully");
      fetchDocuments();
    } catch (error) {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAnalyze = async (docId) => {
    setAnalyzing(docId);
    try {
      const response = await axios.post(`${API}/documents/${docId}/analyze`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(docs => docs.map(d => d.id === docId ? response.data : d));
      toast.success("Document analyzed successfully");
    } catch (error) {
      toast.error("Failed to analyze document");
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await axios.delete(`${API}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(docs => docs.filter(d => d.id !== docId));
      toast.success("Document deleted");
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const handleView = (doc) => {
    setSelectedDoc(doc);
    setViewDialogOpen(true);
  };

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (fileType) => {
    if (fileType?.includes("pdf")) return "📄";
    if (fileType?.includes("image")) return "🖼️";
    return "📁";
  };

  return (
    <div className="space-y-6" data-testid="documents-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload and analyze your legal documents with AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-muted/30"
              data-testid="document-search"
            />
          </div>
          <Button className="glow-button" disabled={uploading} asChild>
            <label className="cursor-pointer">
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                onChange={handleUpload}
                data-testid="document-upload-input"
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <AILoadingState message="Loading your documents..." />
      ) : filteredDocs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <AIEmptyState
              icon={FileText}
              title="No documents yet"
              description="Upload your first document to get AI-powered analysis, summaries, and risk identification."
              action={
                <Button className="glow-button" asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                      onChange={handleUpload}
                    />
                  </label>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="group hover:border-primary/50 transition-all duration-300" data-testid={`document-card-${doc.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                      {getFileIcon(doc.file_type)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate" title={doc.name}>
                        {doc.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={doc.analyzed ? "default" : "secondary"}
                    className={doc.analyzed ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                  >
                    {doc.analyzed ? (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Analyzed
                      </span>
                    ) : "Pending"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {doc.analyzed && doc.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                    {doc.summary}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {!doc.analyzed ? (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAnalyze(doc.id)}
                      disabled={analyzing === doc.id}
                      data-testid={`analyze-btn-${doc.id}`}
                    >
                      {analyzing === doc.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analyze with AI
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleView(doc)}
                      data-testid={`view-btn-${doc.id}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Analysis
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(doc.id)}
                    className="hover:bg-red-500/10 hover:text-red-500"
                    data-testid={`delete-btn-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Analysis Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }} className="text-lg">
                  {selectedDoc?.name}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  AI-powered document analysis
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedDoc && (
            <div className="p-6 space-y-5">
              {/* Summary */}
              <AISection 
                title="Summary" 
                icon={FileText}
                iconColor="text-primary"
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedDoc.summary}
                </p>
              </AISection>

              {/* Simple Explanation */}
              {selectedDoc.simple_explanation && (
                <AISection 
                  title="In Simple Terms" 
                  icon={CheckCircle}
                  iconColor="text-green-500"
                  variant="success"
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedDoc.simple_explanation}
                  </p>
                </AISection>
              )}

              {/* Key Points */}
              {selectedDoc.key_points && selectedDoc.key_points.length > 0 && (
                <AISection 
                  title="Key Points" 
                  icon={ListChecks}
                  iconColor="text-primary"
                >
                  <AIBulletList items={selectedDoc.key_points} variant="default" />
                </AISection>
              )}

              {/* Risks */}
              {selectedDoc.risks && selectedDoc.risks.length > 0 && (
                <AISection 
                  title="Potential Risks" 
                  icon={AlertTriangle}
                  iconColor="text-amber-500"
                  variant="warning"
                >
                  <div className="space-y-2">
                    {selectedDoc.risks.map((risk, i) => (
                      <RiskItem key={i}>{risk}</RiskItem>
                    ))}
                  </div>
                </AISection>
              )}

              {/* Obligations */}
              {selectedDoc.obligations && selectedDoc.obligations.length > 0 && (
                <AISection 
                  title="Your Obligations" 
                  icon={Shield}
                  iconColor="text-primary"
                >
                  <AIBulletList 
                    items={selectedDoc.obligations} 
                    icon={CheckCircle}
                    iconColor="text-primary"
                  />
                </AISection>
              )}

              {/* What This Means For You */}
              <WhatThisMeansSection content={selectedDoc.what_this_means} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
