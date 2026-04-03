import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { FileText } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API}/auth/forgot-password`, {
        email: email.trim(),
      });

      toast.success("If an account exists, a reset link has been sent.");
    } catch (error) {
      console.error("Forgot password failed:", error);
      toast.error("Could not send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-3">
  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 glow-button flex items-center justify-center">
    <div className="relative w-5 h-5">
      <div className="absolute w-2 h-2 bg-white rounded-full top-0 left-1.5" />
      <div className="absolute w-2 h-2 bg-white rounded-full bottom-0 left-0" />
      <div className="absolute w-2 h-2 bg-white rounded-full bottom-0 right-0" />
      <div className="absolute w-full h-full border border-white/30 rounded-full" />
    </div>
  </div>
  <span
    className="font-semibold text-xl"
    style={{ fontFamily: "Outfit, sans-serif" }}
  >
    Simplifile AI
  </span>
</Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: "Outfit, sans-serif" }}>
              Reset your password
            </CardTitle>
            <CardDescription>
              Enter your email and we’ll send you a password reset link.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="forgot-password-email-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="forgot-password-submit-btn"
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
