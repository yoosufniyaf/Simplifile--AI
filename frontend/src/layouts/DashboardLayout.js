import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Calculator,
  BarChart3,
  Link2,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
  Crown,
  Zap,
  Lock
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, plan: "basic" },
  { path: "/dashboard/documents", label: "Documents", icon: FileText, plan: "basic" },
  { path: "/dashboard/chat", label: "AI Chat", icon: MessageSquare, plan: "basic" },
  { path: "/dashboard/bookkeeping", label: "Bookkeeping", icon: Calculator, plan: "premium" },
  { path: "/dashboard/reports", label: "Reports", icon: BarChart3, plan: "enterprise" },
  { path: "/dashboard/integrations", label: "Integrations", icon: Link2, plan: "enterprise" },
  { path: "/dashboard/tax-insights", label: "Tax Insights", icon: Receipt, plan: "enterprise" },
  { path: "/dashboard/settings", label: "Settings", icon: Settings, plan: "basic" },
];

const DashboardLayout = () => {
  const auth = useAuth() || {};
  const { user, logout, checkPlanAccess } = auth;

  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const safeCheckPlanAccess = (plan) => {
    if (typeof checkPlanAccess !== "function") return true; // 🔥 FIX
    return checkPlanAccess(plan);
  };

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    }
    navigate("/");
  };

  const getPlanBadge = (plan) => {
    switch (plan) {
      case "enterprise":
        return <Crown className="h-3 w-3 text-amber-400" />;
      case "premium":
        return <Zap className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  const NavItem = ({ item, mobile = false }) => {
    const isActive = location.pathname === item.path;
    const hasAccess = safeCheckPlanAccess(item.plan);

    return (
      <Link
        to={hasAccess ? item.path : "#"}
        onClick={(e) => {
          if (!hasAccess) e.preventDefault();
          if (mobile) setSidebarOpen(false);
        }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium",
          isActive
            ? "bg-primary/10 text-primary border border-primary/20"
            : hasAccess
            ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            : "text-muted-foreground/50 cursor-not-allowed"
        )}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.label}</span>
        {!hasAccess && <Lock className="h-3 w-3 ml-auto" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full">

          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg">Simplifile</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-border">
            <Button onClick={handleLogout} className="w-full">
              Logout
            </Button>
          </div>

        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
