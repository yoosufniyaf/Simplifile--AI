import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
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
  const { user, loading, token } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (
    user?.subscription_status !== "trial" &&
    user?.subscription_status !== "active"
  ) {
    return <Navigate to="/pricing" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="bookkeeping" element={<BookkeepingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="tax-insights" element={<TaxInsightsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(240 10% 7%)",
              border: "1px solid hsl(240 5% 17%)",
              color: "hsl(0 0% 98%)",
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
