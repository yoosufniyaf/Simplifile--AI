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
  Zap
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DashboardPage = () => {
  const { user, token, checkPlanAccess } = useAuth() || {};
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      if (!token) return;
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const safeCheckPlanAccess = (plan) => {
    if (typeof checkPlanAccess !== "function") return true; // prevent crash
    return checkPlanAccess(plan);
  };

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
    <div className="space-y-8">
      
      <h1 style={{ color: "white", fontSize: "24px" }}>
        Dashboard Loaded ✅
      </h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const hasAccess = safeCheckPlanAccess(action.plan);

          return (
            <Link key={action.label} to={hasAccess ? action.path : "#"}>
              <Card>
                <CardContent className="p-4 text-center">
                  <action.icon className="h-5 w-5 mx-auto mb-2" />
                  <span>{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      <Card>
        <CardContent>
          Documents: {stats?.documents_count || 0}
        </CardContent>
      </Card>

    </div>
  );
};

export default DashboardPage;
