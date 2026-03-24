import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { FileText, Mail, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await login(email, password);

      if (error) {
        toast.error(error.message || "Invalid credentials");
        return;
      }

      if (data?.user || data?.session) {
        toast.success("Welcome back!");
        navigate("/dashboard");
        return;
      }

      toast.error("Login failed");
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-20">
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-12 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to home</span>
        </Link>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary glow-button flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span
              className="font-semibold text-xl"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Simplifile AI
            </span>
          </Link>

          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Welcome back
          </h1>
          <p className="text-muted-foreground mb-8">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-muted/30"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-muted/30"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 glow-button"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-primary hover:underline"
              data-testid="register-link"
            >
              Start free trial
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-card items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
        <div className="relative text-center max-w-md">
          <h2
            className="text-3xl font-semibold mb-4"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Your AI CFO awaits
          </h2>
          <p className="text-muted-foreground">
            Simplify legal documents, automate bookkeeping, and get financial
            insights powered by AI.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
