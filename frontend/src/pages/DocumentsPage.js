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
  FileText, 
  Upload, 
  Search, 
  Trash2, 
  Eye,
  AlertTriangle,
  CheckCircle,
  FileIcon,
  Loader2
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
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleUpload}
                data-testid="document-upload-input"
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              No documents yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Upload your first document to get AI-powered analysis, summaries, and risk identification.
            </p>
            <Button className="glow-button" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleUpload}
                />
              </label>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="card-hover" data-testid={`document-card-${doc.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                      {getFileIcon(doc.file_type)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate" title={doc.name}>
                        {doc.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={doc.analyzed ? "default" : "secondary"}>
                    {doc.analyzed ? "Analyzed" : "Pending"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {doc.analyzed && doc.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileIcon className="mr-2 h-4 w-4" />
                      )}
                      Analyze
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
                    data-testid={`delete-btn-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Analysis Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
              {selectedDoc?.name}
            </DialogTitle>
            <DialogDescription>
              AI-powered document analysis
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoc && (
            <div className="space-y-6 mt-4">
              {/* Summary */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Summary
                </h4>
                <p className="text-muted-foreground text-sm bg-muted/30 p-4 rounded-lg">
                  {selectedDoc.summary}
                </p>
              </div>

              {/* Simple Explanation */}
              {selectedDoc.simple_explanation && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    In Simple Terms
                  </h4>
                  <p className="text-muted-foreground text-sm bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                    {selectedDoc.simple_explanation}
                  </p>
                </div>
              )}

              {/* Key Points */}
              {selectedDoc.key_points && (
                <div>
                  <h4 className="font-semibold mb-2">Key Points</h4>
                  <ul className="space-y-2">
                    {selectedDoc.key_points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {selectedDoc.risks && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Potential Risks
                  </h4>
                  <ul className="space-y-2">
                    {selectedDoc.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Obligations */}
              {selectedDoc.obligations && (
                <div>
                  <h4 className="font-semibold mb-2">Your Obligations</h4>
                  <ul className="space-y-2">
                    {selectedDoc.obligations.map((obligation, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {obligation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
