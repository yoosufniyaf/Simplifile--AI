import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Loader2, CheckCircle2, Store, FileText, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OnboardingPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    completed: false,
    integrations_count: 0,
    documents_count: 0,
    transactions_count: 0,
  });

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API}/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(response.data || {});
    } catch (error) {
      console.error("Failed to fetch onboarding status:", error);
      toast.error("Failed to load onboarding");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStatus();
    }
  }, [token]);

  const hasIntegration = status.integrations_count > 0;
  const hasDocuments = status.documents_count > 0;
  const hasTransactions = status.transactions_count > 0;

  const progressCount = [hasIntegration, hasDocuments || hasTransactions].filter(Boolean).length;
  const progressPercent = progressCount === 0 ? 10 : progressCount === 1 ? 60 : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="onboarding-page">
      <div className="space-y-2">
        <Badge className="px-3 py-1 text-sm">Welcome to Simplifile AI</Badge>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Let’s get your workspace ready
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Connect your store or add data so Simplifile AI can start tracking transactions,
          generating insights, and powering your dashboard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup progress</CardTitle>
          <CardDescription>{progressPercent}% complete</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={hasIntegration ? "border-green-500/30" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Store className="h-6 w-6 text-primary" />
              {hasIntegration && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
            <CardTitle>Connect a store</CardTitle>
            <CardDescription>
              Connect Shopify or Whop to start importing business transactions automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard/integrations")} className="w-full">
              {hasIntegration ? "Manage Integrations" : "Connect Store"}
            </Button>
          </CardContent>
        </Card>

        <Card className={hasDocuments ? "border-green-500/30" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <FileText className="h-6 w-6 text-primary" />
              {hasDocuments && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
            <CardTitle>Upload a document</CardTitle>
            <CardDescription>
              Add invoices, receipts, or business documents so your workspace has context from day one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard/documents")} variant="outline" className="w-full">
              {hasDocuments ? "View Documents" : "Upload Documents"}
            </Button>
          </CardContent>
        </Card>

        <Card className={hasTransactions ? "border-green-500/30" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <BarChart3 className="h-6 w-6 text-primary" />
              {hasTransactions && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
            <CardTitle>Add or sync transactions</CardTitle>
            <CardDescription>
              Sync live store data or import a CSV to unlock bookkeeping and financial insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard/bookkeeping")} variant="outline" className="w-full">
              {hasTransactions ? "View Bookkeeping" : "Add Transactions"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Skip for now
        </Button>
        <Button onClick={() => navigate("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default OnboardingPage;
