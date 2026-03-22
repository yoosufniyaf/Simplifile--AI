import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import DocumentsPage from "./pages/DocumentsPage";
import ChatPage from "./pages/ChatPage";
import BookkeepingPage from "./pages/BookkeepingPage";
import ReportsPage from "./pages/ReportsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import TaxInsightsPage from "./pages/TaxInsightsPage";
import SettingsPage from "./pages/SettingsPage";
import PricingPage from "./pages/PricingPage";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
 useEffect(() => {
  const killEmergentBadge = () => {
    document.querySelectorAll("*").forEach((el) => {
      const text = (el.textContent || "").trim();
      const href = el.getAttribute?.("href") || "";
      const cls = typeof el.className === "string" ? el.className : "";
      const id = el.id || "";
      const style = window.getComputedStyle(el);

      const looksLikeBadge =
        text.includes("Made with Emergent") ||
        href.includes("emergent") ||
        cls.toLowerCase().includes("emergent") ||
        id.toLowerCase().includes("emergent");

      const fixedBottomRight =
        style.position === "fixed" &&
        (style.right === "0px" || parseInt(style.right || "0", 10) >= 0) &&
        (style.bottom === "0px" || parseInt(style.bottom || "0", 10) >= 0);

      if (looksLikeBadge || (fixedBottomRight && text.includes("Emergent"))) {
        el.remove();
      }
    });

    document.querySelectorAll("iframe").forEach((iframe) => {
      const src = iframe.getAttribute("src") || "";
      const title = iframe.getAttribute("title") || "";
      if (
        src.toLowerCase().includes("emergent") ||
        title.toLowerCase().includes("emergent")
      ) {
        iframe.remove();
      }
    });
  };

  killEmergentBadge();

  const observer = new MutationObserver(() => {
    killEmergentBadge();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  const interval = setInterval(killEmergentBadge, 500);

  return () => {
    observer.disconnect();
    clearInterval(interval);
  };
}, []);
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="bookkeeping" element={<BookkeepingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="tax-insights" element={<TaxInsightsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: 'hsl(240 10% 7%)',
              border: '1px solid hsl(240 5% 17%)',
              color: 'hsl(0 0% 98%)',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
