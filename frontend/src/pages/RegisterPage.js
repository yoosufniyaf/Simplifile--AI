import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { FileText, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success("Welcome to Simplifile AI! Your 3-day trial has started.");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-20">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-12 w-fit">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to home</span>
        </Link>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary glow-button flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-xl" style={{ fontFamily: 'Outfit, sans-serif' }}>Simplifile AI</span>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Start your free trial
          </h1>
          <p className="text-muted-foreground mb-8">
            3-day free trial • Cancel anytime
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12 bg-muted/30"
                  required
                  data-testid="register-name-input"
                />
              </div>
            </div>

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
                  data-testid="register-email-input"
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
                  minLength={6}
                  data-testid="register-password-input"
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 glow-button" 
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? "Creating account..." : "Start Free Trial"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline" data-testid="login-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-1 bg-card items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
        <div className="relative text-center max-w-md">
          <h2 className="text-3xl font-semibold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Join 10,000+ businesses
          </h2>
          <p className="text-muted-foreground mb-8">
            Start your free trial and experience the power of AI-driven financial management.
          </p>
          <div className="space-y-4 text-left">
            {[
              "Instant document analysis",
              "Automated bookkeeping",
              "Real-time financial reports",
              "AI-powered tax insights"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
