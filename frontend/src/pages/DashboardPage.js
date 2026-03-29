import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  FileText,
  MessageSquare,
  Calculator,
  BarChart3,
  Link2,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const auth = useAuth() || {};
  const user = auth.user || null;
  const token = auth.token || null;
  const checkPlanAccess = auth.checkPlanAccess;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const safeCheckPlanAccess = (plan) => {
    if (typeof checkPlanAccess !== "function") {
      return true;
    }

    try {
      return checkPlanAccess(plan);
    } catch (error) {
      console.error("checkPlanAccess error:", error);
      return true;
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setStats(response.data || {});
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        setStats({});
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const getTrialDaysLeft = () => {
    if (!user?.trial_ends_at) return 0;

    const trialEnd = new Date(user.trial_ends_at);
    const now = new Date();
    const diff = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

    return Math.max(0, diff);
  };

  const quickActions = [
    { label: "Upload Document", icon: FileText, path: "/dashboard/documents", plan: "basic" },
    { label: "AI Chat", icon: MessageSquare, path: "/dashboard/chat", plan: "basic" },
    { label: "Bookkeeping", icon: Calculator, path: "/dashboard/bookkeeping", plan: "premium" },
    { label: "Reports", icon: BarChart3, path: "/dashboard/reports", plan: "enterprise" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Welcome back, {user?.name?.split(" ")?.[0] || "there"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your finances today.
          </p>
        </div>

        {user?.subscription_status === "trial" && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm">
              <span className="font-medium">{getTrialDaysLeft()} days</span> left in trial
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const hasAccess = safeCheckPlanAccess(action.plan);

          return (
            <Link
              key={action.label}
              to={hasAccess ? action.path : "#"}
              className={!hasAccess ? "cursor-not-allowed" : ""}
              onClick={(e) => {
                if (!hasAccess) {
                  e.preventDefault();
                }
              }}
            >
              <Card className={`card-hover ${hasAccess ? "hover:border-primary/50" : "opacity-50"}`}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-3xl font-bold"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {stats?.documents_count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Chats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-3xl font-bold"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {stats?.chats_count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Conversations</p>
          </CardContent>
        </Card>

        {safeCheckPlanAccess("premium") && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="text-3xl font-bold text-green-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  ${(stats?.total_income || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>All time</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="text-3xl font-bold text-red-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  ${(stats?.total_expenses || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                  <TrendingDown className="h-3 w-3" />
                  <span>All time</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {!safeCheckPlanAccess("premium") && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3
                    className="font-semibold text-lg"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Unlock AI Bookkeeping
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Upgrade to Premium for automated transaction categorization, P&amp;L
                    reports, and financial insights.
                  </p>
                </div>
              </div>

              <Link to="/dashboard/settings">
                <Button className="glow-button">
                  Upgrade Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle
              className="text-lg"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Getting Started
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">Upload your first document</p>
                <p className="text-sm text-muted-foreground">Get AI-powered analysis</p>
              </div>
              <Link to="/dashboard/documents">
                <Button size="sm" variant="outline">
                  Start
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">Chat with AI about your documents</p>
                <p className="text-sm text-muted-foreground">Ask questions, get answers</p>
              </div>
              <Link to="/dashboard/chat">
                <Button size="sm" variant="outline">
                  Start
                </Button>
              </Link>
            </div>

            {safeCheckPlanAccess("premium") && (
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Import transactions</p>
                  <p className="text-sm text-muted-foreground">Upload bank statements or CSV</p>
                </div>
                <Link to="/dashboard/bookkeeping">
                  <Button size="sm" variant="outline">
                    Start
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {safeCheckPlanAccess("enterprise") && (
          <Card>
            <CardHeader>
              <CardTitle
                className="text-lg"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Integrations
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Connected platforms</span>
                <span className="font-medium">
                  {stats?.integrations_connected || 0} / 3
                </span>
              </div>

              <Progress
                value={(stats?.integrations_connected || 0) * 33.33}
                className="h-2 mb-4"
              />

              <Link to="/dashboard/integrations">
                <Button variant="outline" className="w-full">
                  <Link2 className="mr-2 h-4 w-4" />
                  Manage Integrations
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
