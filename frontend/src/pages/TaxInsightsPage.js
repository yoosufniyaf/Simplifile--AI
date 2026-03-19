import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { 
  Receipt, 
  Lock,
  Loader2,
  Upload,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Lightbulb,
  Building2
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TaxInsightsPage = () => {
  const { token, checkPlanAccess } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const hasEnterpriseAccess = checkPlanAccess("enterprise");

  const fetchInsights = useCallback(async () => {
    if (!hasEnterpriseAccess) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/tax/insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsights(response.data);
    } catch (error) {
      console.error("Failed to fetch tax insights:", error);
    } finally {
      setLoading(false);
    }
  }, [token, hasEnterpriseAccess]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const response = await axios.post(`${API}/tax/analyze`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setInsights(prev => [response.data, ...prev]);
      toast.success("Tax analysis complete");
    } catch (error) {
      toast.error("Analysis failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!hasEnterpriseAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center" data-testid="tax-locked">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Enterprise Feature
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Upgrade to Enterprise for AI-powered tax insights, deduction suggestions, and planning advice.
        </p>
        <Button className="glow-button" onClick={() => window.location.href = "/dashboard/settings"}>
          Upgrade to Enterprise
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const latestInsight = insights[0];

  return (
    <div className="space-y-6" data-testid="tax-insights-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Tax Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered tax analysis and planning suggestions
          </p>
        </div>
        <Button className="glow-button" disabled={uploading} asChild>
          <label className="cursor-pointer">
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Analyze Receipt/Document
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleUpload}
              data-testid="tax-upload-input"
            />
          </label>
        </Button>
      </div>

      {/* Disclaimer */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-500">Important Notice</p>
            <p className="text-muted-foreground">
              These insights are for informational purposes only and do not constitute tax advice. 
              Simplifile AI does not file taxes. Consult a qualified tax professional for official guidance.
            </p>
          </div>
        </CardContent>
      </Card>

      {insights.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              No tax insights yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Upload receipts or documents to get AI-powered tax deduction suggestions and planning insights.
            </p>
            <Button className="glow-button" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleUpload}
                />
              </label>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estimated Taxes */}
          {latestInsight?.estimated_taxes && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Federal Tax (Est.)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    ${latestInsight.estimated_taxes.federal?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">~22% effective rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">State Tax (Est.)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    ${latestInsight.estimated_taxes.state?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">~5% effective rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Self-Employment Tax</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    ${latestInsight.estimated_taxes.self_employment?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">15.3% SE tax</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Deductions */}
          {latestInsight?.deductions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Potential Deductions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {latestInsight.deductions.map((deduction, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium capitalize">{deduction.category}</p>
                          <p className="text-sm text-muted-foreground">{deduction.description}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">
                        ${Math.abs(deduction.amount).toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Planning Insights */}
          {latestInsight?.planning_insights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Planning Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {latestInsight.planning_insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-500 shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-muted-foreground">{insight}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Structure Advice */}
          {latestInsight?.structure_advice && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Building2 className="h-5 w-5 text-primary" />
                  Business Structure Advice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {latestInsight.structure_advice.map((advice, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">{advice}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Generated Date */}
          {latestInsight?.generated_at && (
            <p className="text-sm text-muted-foreground text-center">
              Last analyzed: {new Date(latestInsight.generated_at).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default TaxInsightsPage;
