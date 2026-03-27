import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  AISection,
  AIBulletList,
  AIAnalysisCard,
  AILoadingState,
  AIEmptyState,
  RiskItem,
} from "../components/ui/ai-components";
import {
  Receipt,
  Lock,
  Loader2,
  Upload,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Lightbulb,
  Building2,
  Zap,
  Calculator,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TaxMetricCard = ({ label, value, sublabel, color = "primary" }) => {
  const colors = {
    primary: "bg-primary/10 border-primary/20 text-primary",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    green: "bg-green-500/10 border-green-500/20 text-green-500",
  };

  return (
    <Card className={colors[color].split(" ").slice(0, 2).join(" ")}>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p
          className={`text-2xl font-bold ${colors[color].split(" ")[2]}`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {value}
        </p>
        {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
      </CardContent>
    </Card>
  );
};

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
        headers: { Authorization: `Bearer ${token}` },
      });
      setInsights(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch tax insights:", error);
      setInsights([]);
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

    const uploadData = new FormData();
    uploadData.append("file", file);

    setUploading(true);
    try {
      const response = await axios.post(`${API}/tax/analyze`, uploadData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setInsights((prev) => [response.data, ...prev]);
      toast.success("Tax analysis complete");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Analysis failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!hasEnterpriseAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center" data-testid="tax-locked">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
          Enterprise Feature
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md text-sm">
          Upgrade to Enterprise for AI-powered tax insights, deduction suggestions, and planning
          advice.
        </p>
        <Button className="glow-button" onClick={() => (window.location.href = "/dashboard/settings")}>
          <Zap className="mr-2 h-4 w-4" />
          Upgrade to Enterprise
        </Button>
      </div>
    );
  }

  if (loading) {
    return <AILoadingState message="Loading tax insights..." />;
  }

  const latestInsight = insights[0];

  return (
    <div className="space-y-6" data-testid="tax-insights-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Tax Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered tax analysis and planning suggestions
          </p>
        </div>

        <Button className="glow-button" disabled={uploading} asChild>
          <label className="cursor-pointer">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Analyze Receipt/Document
              </>
            )}
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

      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-amber-500 mb-1">Important Notice</p>
            <p className="text-muted-foreground leading-relaxed">
              These insights are for informational purposes only and do not constitute tax advice.
              Simplifile AI does not file taxes. Consult a qualified tax professional for official guidance.
            </p>
          </div>
        </CardContent>
      </Card>

      {insights.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <AIEmptyState
              icon={Receipt}
              title="No tax insights yet"
              description="Upload receipts or documents to get AI-powered tax deduction suggestions and planning insights."
              action={
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
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {latestInsight?.estimated_taxes && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TaxMetricCard
                label="Federal Tax (Est.)"
                value={`$${Number(latestInsight.estimated_taxes.federal || 0).toLocaleString()}`}
                sublabel="~22% effective rate"
                color="primary"
              />
              <TaxMetricCard
                label="State Tax (Est.)"
                value={`$${Number(latestInsight.estimated_taxes.state || 0).toLocaleString()}`}
                sublabel="~5% effective rate"
                color="primary"
              />
              <TaxMetricCard
                label="Self-Employment Tax"
                value={`$${Number(latestInsight.estimated_taxes.self_employment || 0).toLocaleString()}`}
                sublabel="15.3% SE tax"
                color="amber"
              />
            </div>
          )}

          {Number(latestInsight?.total_deductible || 0) > 0 && (
            <Card className="bg-green-500/5 border-green-500/20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <DollarSign className="h-7 w-7 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Potentially Deductible</p>
                    <p className="text-3xl font-bold text-green-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                      ${Number(latestInsight.total_deductible || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {latestInsight?.deductions?.length > 0 && (
            <AISection title="Potential Deductions" icon={CheckCircle} iconColor="text-green-500">
              <div className="space-y-3">
                {latestInsight.deductions.map((item, index) => (
                  <RiskItem
                    key={index}
                    title={item.title || item.category || `Deduction ${index + 1}`}
                    description={
                      item.description ||
                      `Estimated deductible amount: $${Number(item.amount || 0).toLocaleString()}`
                    }
                    severity="low"
                  />
                ))}
              </div>
            </AISection>
          )}

          {latestInsight?.planning_insights?.length > 0 && (
            <AISection title="Planning Insights" icon={Lightbulb} iconColor="text-amber-500">
              <AIBulletList items={latestInsight.planning_insights} />
            </AISection>
          )}

          {latestInsight?.structure_advice?.length > 0 && (
            <AISection title="Entity Structure Advice" icon={Building2} iconColor="text-primary">
              <AIBulletList items={latestInsight.structure_advice} />
            </AISection>
          )}

          {latestInsight?.ai_analysis && (
            <AIAnalysisCard title="AI Tax Analysis" content={latestInsight.ai_analysis} />
          )}

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calculator className="h-5 w-5 text-primary" />
                <h3 className="font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Previous Analyses
                </h3>
              </div>

              <div className="space-y-3">
                {insights.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium">
                        Tax analysis from {new Date(item.generated_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.deductions?.length || 0} deductions found • $
                        {Number(item.total_deductible || 0).toLocaleString()} potentially deductible
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TaxInsightsPage;
