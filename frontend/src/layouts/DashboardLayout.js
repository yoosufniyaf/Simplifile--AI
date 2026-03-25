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
  Lock,
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
    if (typeof checkPlanAccess !== "function") return true;
    try {
      return checkPlanAccess(plan);
    } catch (error) {
      console.error("checkPlanAccess failed:", error);
      return true;
    }
  };

  const handleLogout = () => {
    try {
      if (typeof logout === "function") {
        logout();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      navigate("/");
    }
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
          if (!hasAccess) {
            e.preventDefault();
          }
          if (mobile) {
            setSidebarOpen(false);
          }
        }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary border border-primary/20"
            : hasAccess
              ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              : "text-muted-foreground/50 cursor-not-allowed"
        )}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.label}</span>
        {!hasAccess && <Lock className="h-3 w-3 ml-auto" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden glass-nav sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg font-heading">Simplifile</span>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen((prev) => !prev)}
          data-testid="mobile-menu-toggle"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary glow-button flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <span
                  className="font-semibold text-lg block"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Simplifile
                </span>
                <span className="text-xs text-muted-foreground">AI CFO Platform</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-2 py-2 mb-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                {getPlanBadge(user?.plan)}
                <span className="text-xs font-medium capitalize">
                  {user?.plan || "Basic"} Plan
                </span>
              </div>

              {user?.subscription_status === "trial" && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-auto">
                  Trial
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 px-2"
                  data-testid="user-menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || ""}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive cursor-pointer"
                  data-testid="logout-btn"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
